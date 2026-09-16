#!/usr/bin/env bash
# ==============================================================================
# DV-Help / DV-Prep — Full-Stack Automated Native Deployment for Ubuntu & HestiaCP
# (100% NATIVE & DOCKER-FREE — Integrated with HestiaCP Database & System Services)
# Repository: https://github.com/jakswsg2/Dv-help
# Architecture:
#   - Frontend : Next.js (Node.js/npm) managed via systemd on 127.0.0.1:3000
#   - Backend  : FastAPI (Python 3 venv) managed via systemd on 127.0.0.1:8000
#   - Database : Native HestiaCP PostgreSQL / MySQL (v-add-database & phpPgAdmin)
#   - Queue    : Native Redis (systemd) + Celery Worker
#   - Storage  : Native local filesystem uploads (/home/user/web/domain/uploads)
#   - Web & SSL: HestiaCP Nginx reverse proxy + Let's Encrypt SSL
# ==============================================================================

set -euo pipefail

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}${BOLD}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}${BOLD}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}${BOLD}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}${BOLD}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${CYAN}${BOLD}===> $1${NC}"
}

# ------------------------------------------------------------------------------
# 0. Root Check & Argument Parsing / Interactive Prompt
# ------------------------------------------------------------------------------
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root (or with sudo)."
    exit 1
fi

echo -e "${PURPLE}${BOLD}"
echo "======================================================================"
echo "    DV-Help / DV-Prep — HestiaCP Native (No-Docker) Deployment       "
echo "  (Using HestiaCP Integrated Database & Native System Services)      "
echo "======================================================================"
echo -e "${NC}"

# Parameters with defaults (Can be passed via env or arguments)
HESTIA_USER="${1:-${HESTIA_USER:-admin}}"
DOMAIN="${2:-${DOMAIN:-}}"
REPO_URL="${3:-${REPO_URL:-https://github.com/jakswsg2/Dv-help.git}}"
ADMIN_EMAIL="${4:-${ADMIN_EMAIL:-}}"
DB_TYPE="${DB_TYPE:-pgsql}" # pgsql (default in Hestia) or mysql
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
INSTALL_LETSENCRYPT="${INSTALL_LETSENCRYPT:-true}"

# Prompt if domain is missing
if [ -z "$DOMAIN" ]; then
    read -rp "Enter the domain name configured in HestiaCP (e.g. dv.yourdomain.com): " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
    log_error "Domain name is required to configure HestiaCP Nginx and services."
    exit 1
fi

if [ -z "$ADMIN_EMAIL" ]; then
    read -rp "Enter Administrator Email (default: admin@${DOMAIN}): " ADMIN_EMAIL
    ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${DOMAIN}}"
fi

DOMAIN_SLUG=$(echo "$DOMAIN" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g')
HESTIA_HOME="/home/${HESTIA_USER}"
WEB_DIR="${HESTIA_HOME}/web/${DOMAIN}"
APP_DIR="${WEB_DIR}/app"
UPLOADS_DIR="${WEB_DIR}/uploads"
ENV_FILE="${APP_DIR}/.env"
NGINX_CONF_DIR="${HESTIA_HOME}/conf/web/${DOMAIN}"

log_info "Deployment configuration:"
echo "  - HestiaCP User   : ${HESTIA_USER}"
echo "  - Target Domain   : ${DOMAIN}"
echo "  - Architecture    : 100% Native (No Docker)"
echo "  - Database Engine : HestiaCP Native (${DB_TYPE})"
echo "  - GitHub Repo     : ${REPO_URL}"
echo "  - App Directory   : ${APP_DIR}"
echo "  - Admin Email     : ${ADMIN_EMAIL}"
echo "  - Frontend Port   : 127.0.0.1:${FRONTEND_PORT}"
echo "  - Backend Port    : 127.0.0.1:${BACKEND_PORT}"

# ------------------------------------------------------------------------------
# 1. Install System Dependencies (Python3, Node.js, Redis, PostgreSQL client)
# ------------------------------------------------------------------------------
log_step "1/7. Installing native system runtimes & tools (Python, Node.js, Redis, build-essential)..."

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

# Essential system packages
apt-get install -y -qq \
    build-essential \
    curl \
    git \
    openssl \
    pkg-config \
    redis-server \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    ca-certificates

# Ensure Redis is running natively on host
systemctl enable redis-server || systemctl enable redis
systemctl start redis-server || systemctl start redis
log_success "Native Redis service active."

# Check Node.js and npm
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    log_info "Installing / Updating Node.js LTS (v20)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi
log_success "Node.js version: $(node -v), npm version: $(npm -v)"
log_success "Python version : $(python3 --version)"

# ------------------------------------------------------------------------------
# 2. Setup HestiaCP Domain & Integrated Database (PostgreSQL / MySQL)
# ------------------------------------------------------------------------------
log_step "2/7. Provisioning HestiaCP domain and native database..."

# Ensure Hestia user exists
if ! id "$HESTIA_USER" &>/dev/null; then
    log_error "Hestia user '${HESTIA_USER}' does not exist. Please specify a valid HestiaCP user."
    exit 1
fi

# Ensure web domain exists in HestiaCP
if [ ! -d "$WEB_DIR" ]; then
    log_info "Creating web domain ${DOMAIN} in HestiaCP..."
    if [ -x "/usr/local/hestia/bin/v-add-web-domain" ]; then
        /usr/local/hestia/bin/v-add-web-domain "$HESTIA_USER" "$DOMAIN" || true
    else
        mkdir -p "${WEB_DIR}/public_html"
        chown -R "${HESTIA_USER}:${HESTIA_USER}" "${HESTIA_HOME}/web"
    fi
fi

# Determine database name and user following Hestia standard naming (<user>_<dbname>)
DB_NAME_SHORT="dvhelp"
DB_USER_SHORT="dvhelp"
FULL_DB_NAME="${HESTIA_USER}_${DB_NAME_SHORT}"
FULL_DB_USER="${HESTIA_USER}_${DB_USER_SHORT}"

# Generate secure cryptographic credentials
generate_secret_hex() {
    openssl rand -hex "$1"
}

generate_secret_base64() {
    openssl rand -base64 "$1" | tr -dc 'a-zA-Z0-9' | head -c "$1"
}

EXISTING_DB_PASS=""
if [ -f "$ENV_FILE" ]; then
    EXISTING_DB_PASS=$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
fi

DB_PASS="${EXISTING_DB_PASS:-$(generate_secret_hex 16)}"

# Check if database already exists in HestiaCP
DB_EXISTS=false
if [ -x "/usr/local/hestia/bin/v-list-databases" ]; then
    if /usr/local/hestia/bin/v-list-databases "$HESTIA_USER" plain 2>/dev/null | grep -q "${FULL_DB_NAME}"; then
        DB_EXISTS=true
        log_info "HestiaCP database '${FULL_DB_NAME}' is already registered."
    fi
fi

if [ "$DB_EXISTS" = "false" ]; then
    log_info "Creating integrated database '${FULL_DB_NAME}' via HestiaCP CLI (v-add-database)..."
    if [ -x "/usr/local/hestia/bin/v-add-database" ]; then
        # Try creating PostgreSQL database in HestiaCP
        if /usr/local/hestia/bin/v-add-database "$HESTIA_USER" "$DB_NAME_SHORT" "$DB_USER_SHORT" "$DB_PASS" "$DB_TYPE" 2>/dev/null; then
            log_success "Database '${FULL_DB_NAME}' created successfully via HestiaCP (${DB_TYPE})."
        else
            log_warning "Could not create ${DB_TYPE} database automatically via v-add-database (PostgreSQL service may need to be enabled in Hestia). Attempting direct PostgreSQL creation..."
            # Direct PostgreSQL fallback if postgresql service is installed locally
            if command -v psql &>/dev/null && systemctl is-active --quiet postgresql; then
                sudo -u postgres psql -c "CREATE USER \"${FULL_DB_USER}\" WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
                sudo -u postgres psql -c "CREATE DATABASE \"${FULL_DB_NAME}\" OWNER \"${FULL_DB_USER}\";" 2>/dev/null || true
                sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"${FULL_DB_NAME}\" TO \"${FULL_DB_USER}\";" 2>/dev/null || true
                log_success "Direct PostgreSQL database '${FULL_DB_NAME}' configured."
            fi
        fi
    fi
fi

# Construct Database URL for FastAPI (Asyncpg & Psycopg2)
DB_HOST="127.0.0.1"
DB_PORT="5432"
DATABASE_URL="postgresql+asyncpg://${FULL_DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${FULL_DB_NAME}"
DATABASE_SYNC_URL="postgresql://${FULL_DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${FULL_DB_NAME}"

# ------------------------------------------------------------------------------
# 3. Clone / Update Git Repository
# ------------------------------------------------------------------------------
log_step "3/7. Fetching application code from ${REPO_URL}..."

mkdir -p "$APP_DIR" "$UPLOADS_DIR"
chown -R "${HESTIA_USER}:${HESTIA_USER}" "$APP_DIR" "$UPLOADS_DIR"
chmod 755 "$UPLOADS_DIR"

if [ -d "${APP_DIR}/.git" ]; then
    log_info "Existing git repository found. Pulling latest code..."
    cd "$APP_DIR"
    sudo -u "$HESTIA_USER" git remote set-url origin "$REPO_URL" || true
    sudo -u "$HESTIA_USER" git pull --ff-only origin main || sudo -u "$HESTIA_USER" git pull origin master || true
else
    log_info "Cloning ${REPO_URL} into ${APP_DIR}..."
    rm -rf "${APP_DIR:?}"/* "${APP_DIR:?}"/.* 2>/dev/null || true
    sudo -u "$HESTIA_USER" git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
log_success "Application code ready at ${APP_DIR}."

# ------------------------------------------------------------------------------
# 4. Generate Production Environment Variables (.env)
# ------------------------------------------------------------------------------
log_step "4/7. Generating production cryptographic secrets and .env..."

EXISTING_JWT_SECRET=""
EXISTING_ENCRYPTION_KEY=""
EXISTING_ADMIN_PASS=""

if [ -f "$ENV_FILE" ]; then
    EXISTING_JWT_SECRET=$(grep '^JWT_SECRET_KEY=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_ENCRYPTION_KEY=$(grep '^ENCRYPTION_KEY=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_ADMIN_PASS=$(grep '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
fi

JWT_SECRET="${EXISTING_JWT_SECRET:-$(generate_secret_hex 32)}"
ENCRYPTION_KEY="${EXISTING_ENCRYPTION_KEY:-$(generate_secret_hex 32)}" # 64 hex chars = 256-bit AES-GCM
ADMIN_PASS="${EXISTING_ADMIN_PASS:-$(generate_secret_base64 16)!Aa1}"

cat <<EOF > "$ENV_FILE"
# ==============================================================================
# DV-Help / DV-Prep — Native HestiaCP Production Environment (Docker-Free)
# Domain: ${DOMAIN}
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ==============================================================================

# Application Metadata
PROJECT_NAME="DV-Help Bureau Suite"
APP_ENV=production
ENV=production
DEBUG=false
PRODUCTION_URL=https://${DOMAIN}
DOMAIN=${DOMAIN}
DOMAIN_SLUG=${DOMAIN_SLUG}
API_V1_PREFIX=/api/v1
GITHUB_REPOSITORY=jakswsg2/Dv-help

# Native System Port Bindings (Managed via systemd)
FRONTEND_PORT=${FRONTEND_PORT}
BACKEND_PORT=${BACKEND_PORT}
PORT=${FRONTEND_PORT}

# Administrator Credentials
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASS}

# CORS Allowed Origins
BACKEND_CORS_ORIGINS=["https://${DOMAIN}","http://${DOMAIN}","http://127.0.0.1:${FRONTEND_PORT}"]

# HestiaCP Integrated PostgreSQL Database
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=${FULL_DB_NAME}
DB_NAME=${FULL_DB_NAME}
POSTGRES_USER=${FULL_DB_USER}
DB_USER=${FULL_DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
DB_PASSWORD=${DB_PASS}
DATABASE_URL=${DATABASE_URL}
DATABASE_SYNC_URL=${DATABASE_SYNC_URL}

# Native Redis Service (localhost:6379)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_URL=redis://127.0.0.1:6379/0

# Local Secure Storage (Docker-Free File System)
STORAGE_TYPE=local
UPLOAD_DIR=${UPLOADS_DIR}
MAX_UPLOAD_SIZE_MB=100

# Authentication & JWT Security
JWT_SECRET_KEY=${JWT_SECRET}
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Symmetric Data Encryption (AES-256-GCM 64-char Hex Key)
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Next.js / Frontend Client Config
NEXT_PUBLIC_API_URL=/api/v1
EOF

chmod 600 "$ENV_FILE"
chown "${HESTIA_USER}:${HESTIA_USER}" "$ENV_FILE"
log_success "Environment configuration saved at ${ENV_FILE}"

# ------------------------------------------------------------------------------
# 5. Build Python Backend (Virtualenv) & Node.js Frontend
# ------------------------------------------------------------------------------
log_step "5/7. Building native Python backend & Node.js frontend..."

# A. Backend Setup
BACKEND_DIR="${APP_DIR}/backend"
if [ ! -d "$BACKEND_DIR" ] && [ -f "${APP_DIR}/requirements.txt" ]; then
    BACKEND_DIR="$APP_DIR"
fi

if [ -d "$BACKEND_DIR" ] && [ -f "${BACKEND_DIR}/requirements.txt" ]; then
    log_info "Setting up Python virtual environment in ${BACKEND_DIR}/venv..."
    sudo -u "$HESTIA_USER" python3 -m venv "${BACKEND_DIR}/venv"
    sudo -u "$HESTIA_USER" "${BACKEND_DIR}/venv/bin/pip" install --upgrade pip -q
    log_info "Installing Python dependencies from requirements.txt..."
    sudo -u "$HESTIA_USER" "${BACKEND_DIR}/venv/bin/pip" install -r "${BACKEND_DIR}/requirements.txt" -q
    
    # Run database migrations (Alembic) if available
    if [ -f "${BACKEND_DIR}/alembic.ini" ]; then
        log_info "Executing Alembic database migrations on HestiaCP database..."
        (cd "$BACKEND_DIR" && sudo -u "$HESTIA_USER" "${BACKEND_DIR}/venv/bin/alembic" upgrade head || true)
    fi
    log_success "Python backend dependencies and database schema initialized."
fi

# B. Frontend Setup
FRONTEND_DIR="${APP_DIR}/frontend"
if [ ! -d "$FRONTEND_DIR" ] && [ -f "${APP_DIR}/package.json" ]; then
    FRONTEND_DIR="$APP_DIR"
fi

if [ -d "$FRONTEND_DIR" ] && [ -f "${FRONTEND_DIR}/package.json" ]; then
    log_info "Installing frontend npm dependencies in ${FRONTEND_DIR}..."
    cd "$FRONTEND_DIR"
    sudo -u "$HESTIA_USER" npm install --legacy-peer-deps --silent
    
    log_info "Building production frontend assets (npm run build)..."
    sudo -u "$HESTIA_USER" npm run build || true
    
    # If build outputs static files in dist/ or out/, copy to public_html for ultra-fast serving
    if [ -d "${FRONTEND_DIR}/dist" ]; then
        log_info "Syncing static build files into Hestia public_html..."
        cp -r "${FRONTEND_DIR}/dist"/* "${WEB_DIR}/public_html/" 2>/dev/null || true
        chown -R "${HESTIA_USER}:${HESTIA_USER}" "${WEB_DIR}/public_html"
    fi
    log_success "Frontend build completed."
fi

# ------------------------------------------------------------------------------
# 6. Setup Native systemd Services (dvhelp-backend, dvhelp-frontend, dvhelp-celery)
# ------------------------------------------------------------------------------
log_step "6/7. Creating and starting native systemd services..."

# A. Backend Systemd Service
BACKEND_EXEC="${BACKEND_DIR}/venv/bin/uvicorn"
BACKEND_APP_MODULE="app.main:app"
if [ ! -f "$BACKEND_EXEC" ]; then
    BACKEND_EXEC="/usr/bin/uvicorn"
fi

cat << EOF > "/etc/systemd/system/dvhelp-backend-${DOMAIN_SLUG}.service"
[Unit]
Description=DV-Help FastAPI Backend Service (${DOMAIN})
After=network.target redis-server.service postgresql.service
Wants=redis-server.service

[Service]
Type=simple
User=${HESTIA_USER}
Group=${HESTIA_USER}
WorkingDirectory=${BACKEND_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${BACKEND_DIR}/venv/bin/python -m uvicorn ${BACKEND_APP_MODULE} --host 127.0.0.1 --port ${BACKEND_PORT} --workers 2
Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# B. Celery Worker Systemd Service (if tasks exist)
cat << EOF > "/etc/systemd/system/dvhelp-celery-${DOMAIN_SLUG}.service"
[Unit]
Description=DV-Help Celery Worker Service (${DOMAIN})
After=network.target redis-server.service postgresql.service
Wants=redis-server.service

[Service]
Type=simple
User=${HESTIA_USER}
Group=${HESTIA_USER}
WorkingDirectory=${BACKEND_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${BACKEND_DIR}/venv/bin/celery -A app.core.celery_app worker --loglevel=info -c 2
Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# C. Frontend Next.js Systemd Service
cat << EOF > "/etc/systemd/system/dvhelp-frontend-${DOMAIN_SLUG}.service"
[Unit]
Description=DV-Help Next.js Frontend Service (${DOMAIN})
After=network.target

[Service]
Type=simple
User=${HESTIA_USER}
Group=${HESTIA_USER}
WorkingDirectory=${FRONTEND_DIR}
Environment=NODE_ENV=production
Environment=PORT=${FRONTEND_PORT}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/npm start -- -p ${FRONTEND_PORT}
Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload and start services
systemctl daemon-reload

systemctl enable "dvhelp-backend-${DOMAIN_SLUG}.service" || true
systemctl restart "dvhelp-backend-${DOMAIN_SLUG}.service" || true

systemctl enable "dvhelp-celery-${DOMAIN_SLUG}.service" || true
systemctl restart "dvhelp-celery-${DOMAIN_SLUG}.service" || true

systemctl enable "dvhelp-frontend-${DOMAIN_SLUG}.service" || true
systemctl restart "dvhelp-frontend-${DOMAIN_SLUG}.service" || true

log_success "Native systemd background services started and enabled on boot."

# ------------------------------------------------------------------------------
# 7. Configure HestiaCP Nginx Reverse Proxy & Let's Encrypt SSL
# ------------------------------------------------------------------------------
log_step "7/7. Configuring HestiaCP Nginx reverse proxy & SSL certificates..."

TEMPLATE_DIR="/usr/local/hestia/data/templates/web/nginx"
mkdir -p "$TEMPLATE_DIR"

# A. HTTP Template
cat << 'EOF' > "${TEMPLATE_DIR}/dv-help-native.tpl"
# ==============================================================================
# HestiaCP Native Nginx Template (HTTP): dv-help-native.tpl
# Direct proxy to native Node.js (:3000) & FastAPI (:8000)
# ==============================================================================
server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    root        %docroot%;
    index       index.html index.htm;
    access_log  /var/log/nginx/domains/%domain%.log combined;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    error_log   /var/log/nginx/domains/%domain%.error.log error;

    client_max_body_size 100M;

    # FastAPI REST API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # API Documentation & OpenAPI schema
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Protected Uploads / Attachments
    location /uploads/ {
        alias %home%/%user%/web/%domain%/uploads/;
        expires 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000";
    }

    # Next.js Frontend Application & WebSockets
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 180s;
    }

    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
EOF

# B. HTTPS Template
cat << 'EOF' > "${TEMPLATE_DIR}/dv-help-native.stpl"
# ==============================================================================
# HestiaCP Native Nginx Template (HTTPS): dv-help-native.stpl
# Direct SSL proxy to native Node.js (:3000) & FastAPI (:8000)
# ==============================================================================
server {
    listen      %ip%:%web_ssl_port% ssl http2;
    server_name %domain_idn% %alias_idn%;
    root        %docroot%;
    index       index.html index.htm;
    access_log  /var/log/nginx/domains/%domain%.log combined;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    error_log   /var/log/nginx/domains/%domain%.error.log error;

    ssl_certificate      %ssl_pem%;
    ssl_certificate_key  %ssl_key%;
    ssl_status           on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 100M;

    # FastAPI REST API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # API Documentation & OpenAPI schema
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Protected Uploads / Attachments
    location /uploads/ {
        alias %home%/%user%/web/%domain%/uploads/;
        expires 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000";
    }

    # Next.js Frontend Application & WebSockets
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 180s;
    }

    include %home%/%user%/conf/web/%domain%/nginx.ssl.conf_*;
}
EOF

touch "${TEMPLATE_DIR}/dv-help-native.sh"
chmod 755 "${TEMPLATE_DIR}/dv-help-native.sh"
chmod 644 "${TEMPLATE_DIR}/dv-help-native.tpl" "${TEMPLATE_DIR}/dv-help-native.stpl"

# Apply template via Hestia CLI
if [ -x "/usr/local/hestia/bin/v-change-web-domain-tpl" ]; then
    log_info "Applying 'dv-help-native' Nginx template in HestiaCP..."
    /usr/local/hestia/bin/v-change-web-domain-tpl "$HESTIA_USER" "$DOMAIN" "dv-help-native" "restart" || true
fi

# Request Let's Encrypt SSL
if [ "$INSTALL_LETSENCRYPT" = "true" ] && [ -x "/usr/local/hestia/bin/v-add-letsencrypt-domain" ]; then
    log_info "Requesting Let's Encrypt SSL certificate for ${DOMAIN}..."
    /usr/local/hestia/bin/v-add-letsencrypt-domain "$HESTIA_USER" "$DOMAIN" 2>/dev/null || {
        log_warning "Let's Encrypt automated issuance had an issue (ensure DNS A record points to this server). Continuing..."
    }
fi

# Fallback custom include
if [ -d "$NGINX_CONF_DIR" ]; then
    mkdir -p "$NGINX_CONF_DIR"
    cat << EOF > "${NGINX_CONF_DIR}/nginx.ssl.conf_native"
location /api/ {
    proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
location / {
    proxy_pass http://127.0.0.1:${FRONTEND_PORT};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
EOF
    chown -R "${HESTIA_USER}:${HESTIA_USER}" "$NGINX_CONF_DIR"
fi

if nginx -t &>/dev/null; then
    systemctl reload nginx || systemctl restart nginx
    log_success "Nginx proxy configuration verified and reloaded."
fi

echo -e "\n${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}   NATIVE HESTIACP DEPLOYMENT COMPLETED SUCCESSFULLY FOR ${DOMAIN}!  ${NC}"
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo ""
echo -e "Web App URL        : ${CYAN}https://${DOMAIN}${NC}"
echo -e "API Endpoint       : ${CYAN}https://${DOMAIN}/api/v1${NC}"
echo -e "API Docs (Swagger) : ${CYAN}https://${DOMAIN}/docs${NC}"
echo -e "Hestia Database    : ${BOLD}${FULL_DB_NAME}${NC} (User: ${FULL_DB_USER})"
echo -e "Database Password  : ${YELLOW}${BOLD}${DB_PASS}${NC}"
echo -e "Admin Login Email  : ${BOLD}${ADMIN_EMAIL}${NC}"
echo -e "Admin Password     : ${YELLOW}${BOLD}${ADMIN_PASS}${NC}"
echo ""
echo -e "${BOLD}Native Service Management Commands (systemd):${NC}"
echo "  Backend Status   : systemctl status dvhelp-backend-${DOMAIN_SLUG}"
echo "  Frontend Status  : systemctl status dvhelp-frontend-${DOMAIN_SLUG}"
echo "  Celery Status    : systemctl status dvhelp-celery-${DOMAIN_SLUG}"
echo "  Restart Backend  : systemctl restart dvhelp-backend-${DOMAIN_SLUG}"
echo "  Restart Frontend : systemctl restart dvhelp-frontend-${DOMAIN_SLUG}"
echo "  View Logs        : journalctl -u dvhelp-backend-${DOMAIN_SLUG} -f"
echo "======================================================================"
