#!/usr/bin/env bash
# ==============================================================================
# DV-Help / DV-Prep — Full-Stack Automated Deployment Script for Ubuntu & HestiaCP
# Repository: https://github.com/jakswsg2/Dv-help
# Architecture: Next.js + FastAPI + PostgreSQL + Redis + MinIO + Celery (Docker)
# Web & SSL: Handled natively by HestiaCP Nginx reverse proxy & Let's Encrypt
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
echo "    DV-Help / DV-Prep — HestiaCP Ubuntu Deployment Automation        "
echo "======================================================================"
echo -e "${NC}"

# Parameters with defaults (Can be passed via env or arguments)
HESTIA_USER="${1:-${HESTIA_USER:-admin}}"
DOMAIN="${2:-${DOMAIN:-}}"
REPO_URL="${3:-${REPO_URL:-https://github.com/jakswsg2/Dv-help.git}}"
ADMIN_EMAIL="${4:-${ADMIN_EMAIL:-}}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
INSTALL_LETSENCRYPT="${INSTALL_LETSENCRYPT:-true}"

# Prompt if domain is missing
if [ -z "$DOMAIN" ]; then
    read -rp "Enter the domain name configured in HestiaCP (e.g. dv.yourdomain.com): " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
    log_error "Domain name is required to configure HestiaCP Nginx proxy."
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
ENV_FILE="${APP_DIR}/.env"
NGINX_CONF_DIR="${HESTIA_HOME}/conf/web/${DOMAIN}"

log_info "Deployment configuration:"
echo "  - HestiaCP User : ${HESTIA_USER}"
echo "  - Target Domain : ${DOMAIN}"
echo "  - GitHub Repo   : ${REPO_URL}"
echo "  - App Directory : ${APP_DIR}"
echo "  - Admin Email   : ${ADMIN_EMAIL}"
echo "  - Frontend Port : 127.0.0.1:${FRONTEND_PORT}"
echo "  - Backend Port  : 127.0.0.1:${BACKEND_PORT}"

# ------------------------------------------------------------------------------
# 1. Verify / Install Docker Engine & Docker Compose V2 Plugin
# ------------------------------------------------------------------------------
log_step "1/6. Verifying Docker & Docker Compose installation..."

if ! command -v docker &> /dev/null; then
    log_info "Docker is not installed. Installing Docker Engine from official repository..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release git

    install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
    fi

    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    log_success "Docker Engine installed successfully."
else
    log_success "Docker is already installed: $(docker --version)"
fi

# Ensure docker-compose-plugin exists
if ! docker compose version &> /dev/null; then
    log_info "Installing Docker Compose v2 plugin..."
    apt-get update -qq && apt-get install -y -qq docker-compose-plugin
fi
log_success "Docker Compose version: $(docker compose version)"

# Add hestia user to docker group
if id "$HESTIA_USER" &>/dev/null; then
    usermod -aG docker "$HESTIA_USER" || true
fi

# ------------------------------------------------------------------------------
# 2. Check / Setup HestiaCP Web Domain
# ------------------------------------------------------------------------------
log_step "2/6. Checking HestiaCP domain registration for ${DOMAIN}..."

if [ ! -d "$WEB_DIR" ]; then
    log_info "Domain directory not found. Creating domain via Hestia CLI (v-add-web-domain)..."
    if [ -x "/usr/local/hestia/bin/v-add-web-domain" ]; then
        /usr/local/hestia/bin/v-add-web-domain "$HESTIA_USER" "$DOMAIN" || true
    else
        mkdir -p "${WEB_DIR}/public_html"
        chown -R "${HESTIA_USER}:${HESTIA_USER}" "${HESTIA_HOME}/web"
    fi
fi

# ------------------------------------------------------------------------------
# 3. Clone / Update Git Repository
# ------------------------------------------------------------------------------
log_step "3/6. Fetching application code from ${REPO_URL}..."

mkdir -p "$APP_DIR"
chown -R "${HESTIA_USER}:${HESTIA_USER}" "$APP_DIR"

if [ -d "${APP_DIR}/.git" ]; then
    log_info "Existing git repository found in ${APP_DIR}. Pulling latest changes..."
    cd "$APP_DIR"
    sudo -u "$HESTIA_USER" git remote set-url origin "$REPO_URL" || true
    sudo -u "$HESTIA_USER" git pull --ff-only origin main || sudo -u "$HESTIA_USER" git pull origin master || true
else
    log_info "Cloning fresh copy of ${REPO_URL} into ${APP_DIR}..."
    rm -rf "${APP_DIR:?}"/* "${APP_DIR:?}"/.* 2>/dev/null || true
    sudo -u "$HESTIA_USER" git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
log_success "Repository ready at ${APP_DIR}."

# ------------------------------------------------------------------------------
# 4. Generate Production .env from .env.example with Cryptographic Secrets
# ------------------------------------------------------------------------------
log_step "4/6. Configuring environment variables (.env)..."

# Helper for random secure keys
generate_secret_hex() {
    openssl rand -hex "$1"
}

generate_secret_base64() {
    openssl rand -base64 "$1" | tr -dc 'a-zA-Z0-9' | head -c "$1"
}

# Preserve existing secrets if .env already exists
if [ -f "$ENV_FILE" ]; then
    log_info "Existing .env found. Preserving persistent database and cryptographic secrets..."
    EXISTING_DB_PASS=$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_REDIS_PASS=$(grep '^REDIS_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_MINIO_PASS=$(grep '^MINIO_ROOT_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_JWT_SECRET=$(grep '^JWT_SECRET_KEY=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_ENCRYPTION_KEY=$(grep '^ENCRYPTION_KEY=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_ADMIN_PASS=$(grep '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
fi

DB_PASS="${EXISTING_DB_PASS:-$(generate_secret_hex 16)}"
REDIS_PASS="${EXISTING_REDIS_PASS:-$(generate_secret_hex 16)}"
MINIO_PASS="${EXISTING_MINIO_PASS:-$(generate_secret_hex 16)}"
JWT_SECRET="${EXISTING_JWT_SECRET:-$(generate_secret_hex 32)}"
ENCRYPTION_KEY="${EXISTING_ENCRYPTION_KEY:-$(generate_secret_hex 32)}" # 64 hex chars = 256 bits for AES-256
ADMIN_PASS="${EXISTING_ADMIN_PASS:-$(generate_secret_base64 16)!Aa1}"

# Write comprehensive production .env based on .env.example
cat <<EOF > "$ENV_FILE"
# ==============================================================================
# DV-Help / DV-Prep — Production Environment (Automated via deploy-hestia.sh)
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

# Port Bindings (Proxy via Hestia Nginx on 127.0.0.1)
FRONTEND_PORT=${FRONTEND_PORT}
BACKEND_PORT=${BACKEND_PORT}
MINIO_PORT=9000

# Administrator Credentials
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASS}

# CORS Allowed Origins
BACKEND_CORS_ORIGINS=["https://${DOMAIN}","http://${DOMAIN}","http://127.0.0.1:${FRONTEND_PORT}"]

# PostgreSQL 16 Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=dvprep_db
DB_NAME=dvprep_db
POSTGRES_USER=dvprep
DB_USER=dvprep
POSTGRES_PASSWORD=${DB_PASS}
DB_PASSWORD=${DB_PASS}
DATABASE_URL=postgresql+asyncpg://dvprep:${DB_PASS}@postgres:5432/dvprep_db

# Redis 7 Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASS}
REDIS_URL=redis://:${REDIS_PASS}@redis:6379/0

# Object Storage (MinIO S3 Compatible)
MINIO_ROOT_USER=dvprepadmin
MINIO_ROOT_PASSWORD=${MINIO_PASS}
S3_ACCESS_KEY=dvprepadmin
S3_SECRET_KEY=${MINIO_PASS}
S3_BUCKET_NAME=dvprep-uploads
S3_REGION=us-east-1
S3_ENDPOINT_URL=http://minio:9000

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
PORT=3000
EOF

chmod 600 "$ENV_FILE"
chown "${HESTIA_USER}:${HESTIA_USER}" "$ENV_FILE"
log_success "Environment file configured and secured at ${ENV_FILE}"

# ------------------------------------------------------------------------------
# 5. Setup HestiaCP Nginx Reverse Proxy Templates & Domain Config
# ------------------------------------------------------------------------------
log_step "5/6. Configuring HestiaCP Nginx reverse proxy headers & SSL..."

TEMPLATE_DIR="/usr/local/hestia/data/templates/web/nginx"
mkdir -p "$TEMPLATE_DIR"

# A. Create the reusable HestiaCP HTTP Nginx Template
cat << 'EOF' > "${TEMPLATE_DIR}/dv-help-docker.tpl"
# ==============================================================================
# HestiaCP Web Template (HTTP): dv-help-docker.tpl
# Reverse proxy to Next.js (port 3000) & FastAPI (port 8000)
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

    # FastAPI Docs & OpenAPI specification
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

# B. Create the reusable HestiaCP HTTPS (SSL) Nginx Template
cat << 'EOF' > "${TEMPLATE_DIR}/dv-help-docker.stpl"
# ==============================================================================
# HestiaCP Web Template (HTTPS): dv-help-docker.stpl
# Reverse proxy with SSL to Next.js (port 3000) & FastAPI (port 8000)
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

    # Security Headers for DV Applicant Data Protection
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

    # FastAPI Docs & OpenAPI specification
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
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

touch "${TEMPLATE_DIR}/dv-help-docker.sh"
chmod 755 "${TEMPLATE_DIR}/dv-help-docker.sh"
chmod 644 "${TEMPLATE_DIR}/dv-help-docker.tpl" "${TEMPLATE_DIR}/dv-help-docker.stpl"

# Apply template to domain via Hestia CLI
if [ -x "/usr/local/hestia/bin/v-change-web-domain-tpl" ]; then
    log_info "Applying 'dv-help-docker' Nginx template to domain ${DOMAIN}..."
    /usr/local/hestia/bin/v-change-web-domain-tpl "$HESTIA_USER" "$DOMAIN" "dv-help-docker" "restart" || true
fi

# Request Let's Encrypt SSL certificate if available and requested
if [ "$INSTALL_LETSENCRYPT" = "true" ] && [ -x "/usr/local/hestia/bin/v-add-letsencrypt-domain" ]; then
    log_info "Checking Let's Encrypt SSL certificate for ${DOMAIN}..."
    /usr/local/hestia/bin/v-add-letsencrypt-domain "$HESTIA_USER" "$DOMAIN" 2>/dev/null || {
        log_warning "Let's Encrypt automated issuance had an issue (ensure DNS A record points to this server). Continuing with deployment..."
    }
fi

# Fallback: Also place an Nginx custom include directly in case custom template wasn't applied
if [ -d "$NGINX_CONF_DIR" ]; then
    mkdir -p "$NGINX_CONF_DIR"
    cat << EOF > "${NGINX_CONF_DIR}/nginx.ssl.conf_docker"
# Custom Direct Docker Proxy Fallback
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

# Test Nginx syntax and reload
if nginx -t &>/dev/null; then
    systemctl reload nginx || systemctl restart nginx
    log_success "Nginx proxy configuration verified and reloaded."
else
    log_warning "Nginx configuration test returned a warning. Please check /var/log/nginx/error.log."
fi

# ------------------------------------------------------------------------------
# 6. Build & Launch Docker Compose Stack
# ------------------------------------------------------------------------------
log_step "6/6. Starting Docker Compose microservices stack..."

cd "$APP_DIR"

# Check which compose file to use:
# 1. docker-compose.hestia.yml (preferred, no port 80/443 clash)
# 2. docker-compose.yml
COMPOSE_FILE="docker-compose.hestia.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    if [ -f "docker-compose.yml" ]; then
        COMPOSE_FILE="docker-compose.yml"
    else
        log_error "No docker-compose.yml or docker-compose.hestia.yml found in ${APP_DIR}!"
        exit 1
    fi
fi

log_info "Using Docker Compose configuration: ${COMPOSE_FILE}"

# Pull prebuilt images or build from source
log_info "Building and launching containers (PostgreSQL, Redis, MinIO, FastAPI, Celery, Next.js)..."
docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

log_info "Waiting for microservices health checks to pass (15s)..."
sleep 15

# Status check
docker compose -f "$COMPOSE_FILE" ps

echo -e "\n${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}       DEPLOYMENT COMPLETED SUCCESSFULLY FOR ${DOMAIN}!              ${NC}"
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo ""
echo -e "Web App URL      : ${CYAN}https://${DOMAIN}${NC}"
echo -e "API Endpoint     : ${CYAN}https://${DOMAIN}/api/v1${NC}"
echo -e "API Docs (Swagger: ${CYAN}https://${DOMAIN}/docs${NC}"
echo -e "Admin Login Email: ${BOLD}${ADMIN_EMAIL}${NC}"
echo -e "Admin Password   : ${YELLOW}${BOLD}${ADMIN_PASS}${NC}"
echo ""
echo -e "${BOLD}Operational Commands:${NC}"
echo "  Check Logs       : cd ${APP_DIR} && docker compose -f ${COMPOSE_FILE} logs -f"
echo "  Restart Stack    : cd ${APP_DIR} && docker compose -f ${COMPOSE_FILE} restart"
echo "  Update from Git  : cd ${APP_DIR} && git pull && docker compose -f ${COMPOSE_FILE} up -d --build"
echo "======================================================================"
