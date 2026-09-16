import { Applicant } from '../types';

export interface HestiaConfigOptions {
  domain: string;
  user: string;
  ip: string;
  mode:
    | 'hestia_docker_app'
    | 'hestia_quick_app'
    | 'hestia_template_tpl'
    | 'hestia_package_pkg'
    | 'hestia_bash_installer'
    | 'spa_nginx'
    | 'proxy_docker'
    | 'apache_spa'
    | 'json_package';
  dockerPort: number;
  backendPort?: number;
  sslEnabled: boolean;
  exportApplicantsData: boolean;
  templateName?: string;
  gitRepo?: string;
}

export interface HestiaBundleOutput {
  filename: string;
  mimeType: string;
  content: string;
}

/**
 * Generate Nginx vHost configuration tailored for HestiaCP SPA mode
 * Path in HestiaCP: /home/{user}/conf/web/{domain}/nginx.conf
 */
export function generateHestiaNginxConf(
  options: HestiaConfigOptions,
  applicants: Applicant[]
): string {
  const { domain, user, ip, sslEnabled } = options;
  const count = applicants.length;
  const timestamp = new Date().toISOString();

  return `# ==============================================================================
# HestiaCP Nginx Domain Configuration (SPA & Static Optimization)
# Generated for: ${domain}
# Server IP: ${ip}
# System Entrant Profiles Count: ${count}
# Generation Time: ${timestamp}
# HestiaCP Target Paths:
#   - HTTP:  /home/${user}/conf/web/${domain}/nginx.conf
#   - HTTPS: /home/${user}/conf/web/${domain}/nginx.ssl.conf
#   - Root:  /home/${user}/web/${domain}/public_html
# ==============================================================================

server {
    listen      ${ip}:80;
    server_name ${domain} www.${domain};
    root        /home/${user}/web/${domain}/public_html;
    index       index.html index.htm;
    access_log  /var/log/nginx/domains/${domain}.log combined;
    access_log  /var/log/nginx/domains/${domain}.bytes bytes;
    error_log   /var/log/nginx/domains/${domain}.error.log error;

    # Security Headers for DV Applicant Data Protection
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression for High-Speed Static Delivery
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/x-javascript
        image/svg+xml;

    # Static Assets & Vite Bundles Caching
    location ~* \\.(?:ico|css|js|gif|jpe?g|png|svg|woff2?|webp|mp4|webm)$ {
        expires 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }

    # SPA Fallback: Route all client navigation to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # HestiaCP Error Page Bindings
    location /error/ {
        alias /home/${user}/web/${domain}/document_errors/;
    }

    # Deny access to hidden configuration files (.env, .git, etc.)
    location ~ /\\.(?!well-known).* {
        deny all;
        access_log off;
        log_not_found off;
    }
}
${
  sslEnabled
    ? `
# --- HTTPS VirtualHost Configuration ---
server {
    listen      ${ip}:443 ssl http2;
    server_name ${domain} www.${domain};
    root        /home/${user}/web/${domain}/public_html;
    index       index.html index.htm;
    access_log  /var/log/nginx/domains/${domain}.log combined;
    access_log  /var/log/nginx/domains/${domain}.bytes bytes;
    error_log   /var/log/nginx/domains/${domain}.error.log error;

    # SSL Certificates (Let's Encrypt managed by HestiaCP)
    ssl_certificate      /home/${user}/conf/web/${domain}/ssl/${domain}.pem;
    ssl_certificate_key  /home/${user}/conf/web/${domain}/ssl/${domain}.key;
    ssl_protocols        TLSv1.2 TLSv1.3;
    ssl_ciphers          ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static Assets & Vite Bundles Caching
    location ~* \\.(?:ico|css|js|gif|jpe?g|png|svg|woff2?|webp|mp4|webm)$ {
        expires 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }

    # SPA Fallback: Route all client navigation to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # HestiaCP Error Page Bindings
    location /error/ {
        alias /home/${user}/web/${domain}/document_errors/;
    }

    # Deny access to hidden configuration files (.env, .git, etc.)
    location ~ /\\.(?!well-known).* {
        deny all;
        access_log off;
        log_not_found off;
    }
}
`
    : ''
}
`;
}

/**
 * Generate Nginx Reverse Proxy configuration for Docker container on HestiaCP
 */
export function generateHestiaDockerProxyConf(
  options: HestiaConfigOptions,
  applicants: Applicant[]
): string {
  const { domain, user, ip, dockerPort, sslEnabled } = options;
  const count = applicants.length;
  const timestamp = new Date().toISOString();

  return `# ==============================================================================
# HestiaCP Nginx Reverse Proxy to Docker Container
# Domain: ${domain}
# Target Container Port: http://127.0.0.1:${dockerPort}
# Profiles Export Count: ${count}
# Generation Time: ${timestamp}
# ==============================================================================

server {
    listen      ${ip}:80;
    server_name ${domain} www.${domain};
    access_log  /var/log/nginx/domains/${domain}.log combined;
    error_log   /var/log/nginx/domains/${domain}.error.log error;

    location / {
        proxy_pass http://127.0.0.1:${dockerPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for large file uploads (photo scans / OCR)
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }
}
${
  sslEnabled
    ? `
server {
    listen      ${ip}:443 ssl http2;
    server_name ${domain} www.${domain};
    access_log  /var/log/nginx/domains/${domain}.log combined;
    error_log   /var/log/nginx/domains/${domain}.error.log error;

    ssl_certificate      /home/${user}/conf/web/${domain}/ssl/${domain}.pem;
    ssl_certificate_key  /home/${user}/conf/web/${domain}/ssl/${domain}.key;

    location / {
        proxy_pass http://127.0.0.1:${dockerPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }
}
`
    : ''
}
`;
}

/**
 * Generate Apache VirtualHost / .htaccess for HestiaCP servers using Nginx+Apache template
 */
export function generateHestiaApacheConf(
  options: HestiaConfigOptions,
  applicants: Applicant[]
): string {
  const { domain, user } = options;
  const count = applicants.length;

  return `# ==============================================================================
# HestiaCP Apache .htaccess / vHost for Single Page Application (SPA)
# Domain: ${domain}
# Profiles in Vault: ${count}
# Save as: /home/${user}/web/${domain}/public_html/.htaccess
# ==============================================================================

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Security: Block sensitive files
    RewriteRule ^\\.(env|git|lock) - [F,L]

    # SPA Routing: Send all non-existing files/directories to index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# Caching for Production Assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType font/woff2 "access plus 1 month"
</IfModule>

# Security Headers
<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
`;
}

/**
 * Generate Complete HestiaCP Deployment Package in JSON Format
 * Contains domain parameters, vhost templates, quick bash CLI commands, and applicant profiles
 */
export function generateHestiaJsonPackage(
  options: HestiaConfigOptions,
  applicants: Applicant[]
): string {
  const nginxConf = generateHestiaNginxConf(options, applicants);
  const apacheConf = generateHestiaApacheConf(options, applicants);
  const dockerConf = generateHestiaDockerProxyConf(options, applicants);

  const deploymentData = {
    metadata: {
      generator: 'DV-Prep HestiaCP Domain Provisioner',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      targetPlatform: 'HestiaCP / Ubuntu Oracle Cloud',
      serverIp: options.ip,
      domain: options.domain,
      user: options.user,
    },
    hestiaCliCommands: {
      addDomain: `v-add-web-domain ${options.user} ${options.domain} ${options.ip}`,
      enableSsl: `v-add-web-domain-ssl ${options.user} ${options.domain}`,
      enableLetsEncrypt: `v-add-letsencrypt-domain ${options.user} ${options.domain}`,
      restartWeb: `v-restart-web`,
    },
    paths: {
      documentRoot: `/home/${options.user}/web/${options.domain}/public_html`,
      nginxConfig: `/home/${options.user}/conf/web/${options.domain}/nginx.conf`,
      nginxSslConfig: `/home/${options.user}/conf/web/${options.domain}/nginx.ssl.conf`,
      apacheHtaccess: `/home/${options.user}/web/${options.domain}/public_html/.htaccess`,
      uploadPath: `/home/${options.user}/web/${options.domain}/public_html/dist`,
    },
    templates: {
      nginxSpaVHost: nginxConf,
      nginxDockerReverseProxy: dockerConf,
      apacheHtaccess: apacheConf,
    },
    bashSetupScript: `#!/bin/bash
# HestiaCP Automated Setup Script for ${options.domain}
# Run as root on Oracle Cloud instance (${options.ip})
set -e

echo ">>> Creating web domain in HestiaCP..."
v-add-web-domain ${options.user} ${options.domain} ${options.ip} || true

echo ">>> Setting up document root..."
mkdir -p /home/${options.user}/web/${options.domain}/public_html
chown -R ${options.user}:${options.user} /home/${options.user}/web/${options.domain}/public_html

echo ">>> Deploying SPA routing rules..."
cat << 'EOF' > /home/${options.user}/web/${options.domain}/public_html/.htaccess
${apacheConf}
EOF
chown ${options.user}:${options.user} /home/${options.user}/web/${options.domain}/public_html/.htaccess

echo ">>> Enabling Let's Encrypt SSL certificate..."
v-add-letsencrypt-domain ${options.user} ${options.domain} || echo "Please ensure DNS A-record points to ${options.ip} first"

echo ">>> Done! Domain ${options.domain} is ready on HestiaCP."
`,
    applicantProfiles: options.exportApplicantsData ? applicants : undefined,
    totalApplicants: applicants.length,
  };

  return JSON.stringify(deploymentData, null, 2);
}

/**
 * Generate official HestiaCP Web Template Files:
 * /usr/local/hestia/data/templates/web/nginx/dv-prep.tpl (HTTP)
 * /usr/local/hestia/data/templates/web/nginx/dv-prep.stpl (HTTPS)
 * /usr/local/hestia/data/templates/web/nginx/dv-prep.sh (Backend trigger script)
 * These appear directly in Hestia Control Panel UI under "Web Domain -> Advanced Options -> Web Template"!
 */
export function generateHestiaWebTemplateTpl(templateName: string = 'dv-prep'): string {
  return `# ==============================================================================
# HestiaCP Web Domain Template: ${templateName}.tpl (HTTP)
# Target Server Location: /usr/local/hestia/data/templates/web/nginx/${templateName}.tpl
# Allows selecting "${templateName}" directly in HestiaCP Web Domain -> Advanced -> Web Template
# ==============================================================================

server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    root        %docroot%;
    index       index.html index.htm;
    access_log  /var/log/nginx/domains/%domain%.log combined;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    error_log   /var/log/nginx/domains/%domain%.error.log error;

    # Security Headers for DV Administrative Platform
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Fast Gzip Compression for React / Vite Bundles
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/x-javascript
        image/svg+xml;

    # Static Assets & Vite Hashes Caching (1 Year Immutable)
    location ~* ^.+\\.(?:css|cur|js|jpe?g|gif|htc|ico|png|xml|otf|ttf|eot|woff|woff2|svg|mp4|webm)$ {
        expires 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }

    # SPA Client-Side Routing: fallback to index.html for all paths
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Standard Hestia Document Errors
    location /error/ {
        alias %home%/%user%/web/%domain%/document_errors/;
    }

    # Deny access to hidden / sensitive files
    location ~ /\\.(?!well-known).* {
        deny all;
        access_log off;
        log_not_found off;
    }

    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
`;
}

export function generateHestiaWebTemplateStpl(templateName: string = 'dv-prep'): string {
  return `# ==============================================================================
# HestiaCP Web Domain SSL Template: ${templateName}.stpl (HTTPS)
# Target Server Location: /usr/local/hestia/data/templates/web/nginx/${templateName}.stpl
# Automatically invoked when Let's Encrypt or Custom SSL is enabled in HestiaCP
# ==============================================================================

server {
    listen      %ip%:%web_ssl_port% ssl http2;
    server_name %domain_idn% %alias_idn%;
    root        %sdocroot%;
    index       index.html index.htm;
    access_log  /var/log/nginx/domains/%domain%.log combined;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    error_log   /var/log/nginx/domains/%domain%.error.log error;

    # SSL Certificates managed dynamically by HestiaCP
    ssl_certificate      %ssl_pem%;
    ssl_certificate_key  %ssl_key%;
    ssl_protocols        TLSv1.2 TLSv1.3;
    ssl_ciphers          ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security & HSTS Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Fast Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/x-javascript
        image/svg+xml;

    # Static Assets & Vite Hashes Caching
    location ~* ^.+\\.(?:css|cur|js|jpe?g|gif|htc|ico|png|xml|otf|ttf|eot|woff|woff2|svg|mp4|webm)$ {
        expires 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }

    # SPA Client-Side Routing: fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Standard Hestia Document Errors
    location /error/ {
        alias %home%/%user%/web/%domain%/document_errors/;
    }

    # Deny access to hidden / sensitive files
    location ~ /\\.(?!well-known).* {
        deny all;
        access_log off;
        log_not_found off;
    }

    include %home%/%user%/conf/web/%domain%/nginx.ssl.conf_*;
}
`;
}

/**
 * Generate HestiaCP User Package Template:
 * /usr/local/hestia/data/packages/DV-Prep.pkg
 * Creates an optimized user profile with Nginx Web Template set to 'dv-prep'
 */
export function generateHestiaUserPackage(options: HestiaConfigOptions): string {
  return `# ==============================================================================
# HestiaCP User Package Definition: DV-Prep.pkg
# Target Location: /usr/local/hestia/data/packages/DV-Prep.pkg
# Allows assigning new or existing clients to "DV-Prep" with predefined web templates
# ==============================================================================
WEB_TEMPLATE='dv-prep'
BACKEND_TEMPLATE='default'
PROXY_TEMPLATE='default'
DNS_TEMPLATE='default'
WEB_DOMAINS='unlimited'
WEB_ALIASES='unlimited'
DNS_DOMAINS='unlimited'
DNS_RECORDS='unlimited'
MAIL_DOMAINS='unlimited'
MAIL_ACCOUNTS='unlimited'
DATABASES='unlimited'
CRON_JOBS='unlimited'
DISK_QUOTA='unlimited'
BANDWIDTH='unlimited'
NS='ns1.${options.domain},ns2.${options.domain}'
SHELL='bash'
BACKUPS='3'
TIME='${Math.floor(Date.now() / 1000)}'
DATE='${new Date().toISOString().split('T')[0]}'
`;
}

/**
 * Generate One-Click Bash Installer to install the template into HestiaCP directly
 */
export function generateHestiaTemplateInstallerBash(options: HestiaConfigOptions): string {
  const tpl = generateHestiaWebTemplateTpl('dv-prep');
  const stpl = generateHestiaWebTemplateStpl('dv-prep');
  const pkg = generateHestiaUserPackage(options);

  return `#!/bin/bash
# ==============================================================================
# HestiaCP One-Click DV-Prep Template & Domain Provisioner
# For Server IP: ${options.ip} | Domain: ${options.domain} | User: ${options.user}
# Run this script on your server as ROOT:
#   sudo bash install-hestia-dvprep.sh
# ==============================================================================
set -e

echo "=========================================================="
echo ">>> [1/5] Installing DV-Prep Nginx Templates in HestiaCP..."
echo "=========================================================="
TEMPLATE_DIR="/usr/local/hestia/data/templates/web/nginx"
mkdir -p "$TEMPLATE_DIR"

cat << 'EOF' > "$TEMPLATE_DIR/dv-prep.tpl"
${tpl}
EOF

cat << 'EOF' > "$TEMPLATE_DIR/dv-prep.stpl"
${stpl}
EOF

# Create empty trigger script if needed by Hestia
touch "$TEMPLATE_DIR/dv-prep.sh"
chmod 755 "$TEMPLATE_DIR/dv-prep.sh"
chmod 644 "$TEMPLATE_DIR/dv-prep.tpl" "$TEMPLATE_DIR/dv-prep.stpl"

echo "=========================================================="
echo ">>> [2/5] Creating Hestia User Package (DV-Prep.pkg)..."
echo "=========================================================="
PACKAGE_DIR="/usr/local/hestia/data/packages"
mkdir -p "$PACKAGE_DIR"

cat << 'EOF' > "$PACKAGE_DIR/DV-Prep.pkg"
${pkg}
EOF
chmod 644 "$PACKAGE_DIR/DV-Prep.pkg"

echo "=========================================================="
echo ">>> [3/5] Checking / Adding Web Domain in HestiaCP..."
echo "=========================================================="
# Source HestiaCP environment binaries
export PATH=$PATH:/usr/local/hestia/bin

if ! v-list-web-domain "${options.user}" "${options.domain}" >/dev/null 2>&1; then
    echo "Creating domain ${options.domain} for user ${options.user}..."
    v-add-web-domain "${options.user}" "${options.domain}" "${options.ip}"
fi

echo "=========================================================="
echo ">>> [4/5] Applying 'dv-prep' Template to ${options.domain}..."
echo "=========================================================="
v-change-web-domain-tpl "${options.user}" "${options.domain}" "dv-prep" "restart"

echo "Setting up public_html permissions..."
mkdir -p "/home/${options.user}/web/${options.domain}/public_html"
chown -R ${options.user}:${options.user} "/home/${options.user}/web/${options.domain}/public_html"

echo "=========================================================="
echo ">>> [5/5] Requesting Let's Encrypt SSL Certificate..."
echo "=========================================================="
v-add-letsencrypt-domain "${options.user}" "${options.domain}" || echo "Note: If SSL fails, ensure DNS A-Record points to ${options.ip}"

echo "Rebuilding web configuration..."
v-rebuild-web-domain "${options.user}" "${options.domain}"
v-restart-web

echo ""
echo "=========================================================================="
echo " SUCCESS! The 'dv-prep' template is now installed in HestiaCP."
echo " - You can view and choose 'dv-prep' in Hestia Web Domain Settings!"
echo " - Simply copy your build files (dist/*) into:"
echo "   /home/${options.user}/web/${options.domain}/public_html/"
echo "=========================================================================="
`;
}

/**
 * Generate official HestiaCP Quick Install WebApp definition (PHP):
 * Target path in HestiaCP server:
 * /usr/local/hestia/web/src/app/WebApp/Installers/DVPrep/DVPrepSetup.php
 * This registers "DV-Prep Bureau Suite" directly inside HestiaCP's "Quick Install Apps" marketplace!
 */
export function generateHestiaQuickAppPhp(): string {
  return `<?php
namespace Hestia\\WebApp\\Installers\\DVPrep;

use Hestia\\WebApp\\Installers\\BaseSetup as BaseSetup;

/**
 * HestiaCP Quick Install App: DV-Prep Bureau Suite
 * Class DVPrepSetup
 *
 * Placed in: /usr/local/hestia/web/src/app/WebApp/Installers/DVPrep/DVPrepSetup.php
 * Displays under: HestiaCP -> Web -> [Domain] -> Quick Install App
 */
class DVPrepSetup extends BaseSetup {
    protected $appInfo = [
        'name' => 'DV-Prep Bureau Suite',
        'group' => 'applications',
        'version' => '1.0.0',
        'enabled' => true,
        'thumbnail' => 'dv-prep.png',
        'description' => 'Professional US Diversity Visa DS-5501 Application & Bureau Management Suite. Features real-time photo compliance, Yemen governorates/cities database, passport MRZ OCR, and instant DS-5501 pre-fill.',
    ];

    protected $appRequirements = [
        'php' => [
            'supported' => ['7.4', '8.0', '8.1', '8.2', '8.3', 'none'],
        ],
    ];

    public function __construct() {
        parent::__construct();
        $this->appInfo['form'] = [
            'bureau_name' => [
                'type' => 'text',
                'value' => 'Yemen DV Bureau Office',
                'label' => 'Bureau / Agency Name (اسم المكتب أو الوكالة)',
            ],
            'default_country' => [
                'type' => 'select',
                'value' => 'Yemen',
                'options' => ['Yemen', 'Egypt', 'Saudi Arabia', 'Jordan', 'Morocco'],
                'label' => 'Primary Applicant Country (الدولة الافتراضية للمتقدمين)',
            ],
            'apply_nginx_spa_template' => [
                'type' => 'boolean',
                'value' => true,
                'label' => 'Automatically configure Nginx SPA Web Template (dv-prep.tpl)',
            ],
        ];
    }

    public function info() {
        return $this->appInfo;
    }

    /**
     * Executes when the administrator or user clicks "Install" in HestiaCP WebApp UI
     */
    public function install(array $options = []): bool {
        $user = $this->domain['user'];
        $domain = $this->domain['domain'];
        $docroot = $this->domain['docroot'] ?? "/home/$user/web/$domain/public_html";

        // 1. Unpack or copy DV-Prep build assets into domain docroot
        $archivePath = '/usr/local/hestia/data/webapp/dv-prep.tar.gz';
        $sourceDir = '/usr/local/hestia/data/webapp/dv-prep';

        if (file_exists($archivePath)) {
            $cmd = 'tar -xzf ' . escapeshellarg($archivePath) . ' -C ' . escapeshellarg($docroot);
            exec($cmd, $output, $return_var);
        } elseif (is_dir($sourceDir)) {
            $cmd = 'cp -r ' . escapeshellarg($sourceDir) . '/* ' . escapeshellarg($docroot) . '/ 2>/dev/null || true';
            exec($cmd, $output, $return_var);
        }

        // 2. Adjust file permissions to belong to domain owner
        exec('chown -R ' . escapeshellarg($user) . ':' . escapeshellarg($user) . ' ' . escapeshellarg($docroot));
        exec('chmod -R 755 ' . escapeshellarg($docroot));

        // 3. Switch domain template to dv-prep for flawless Single Page Application routing
        if (!empty($options['apply_nginx_spa_template'])) {
            exec('/usr/local/hestia/bin/v-change-web-domain-tpl ' . escapeshellarg($user) . ' ' . escapeshellarg($domain) . ' dv-prep restart 2>/dev/null');
        }

        return true;
    }
}
`;
}

/**
 * Generate One-Click Bash Script to register DV-Prep as an official Quick Install App in HestiaCP
 */
export function generateHestiaQuickAppInstallerBash(options: HestiaConfigOptions): string {
  const phpClass = generateHestiaQuickAppPhp();
  const tpl = generateHestiaWebTemplateTpl('dv-prep');
  const stpl = generateHestiaWebTemplateStpl('dv-prep');

  return `#!/bin/bash
# ==============================================================================
# Register "DV-Prep Bureau Suite" as a Native HestiaCP Quick Install App
# Server IP: ${options.ip} | Target User: ${options.user}
# Run this script on your HestiaCP server as ROOT:
#   sudo bash register-hestia-quick-install.sh
# ==============================================================================
set -e

echo "=========================================================================="
echo ">>> [1/4] Creating Quick Install App directory in HestiaCP..."
echo "=========================================================================="
INSTALLER_DIR="/usr/local/hestia/web/src/app/WebApp/Installers/DVPrep"
mkdir -p "$INSTALLER_DIR"

# Write the PHP WebApp installer class
cat << 'EOF' > "$INSTALLER_DIR/DVPrepSetup.php"
${phpClass}
EOF
chmod 644 "$INSTALLER_DIR/DVPrepSetup.php"
chown -R root:root "$INSTALLER_DIR"

echo "=========================================================================="
echo ">>> [2/4] Installing DV-Prep Nginx SPA Web Templates..."
echo "=========================================================================="
TEMPLATE_DIR="/usr/local/hestia/data/templates/web/nginx"
mkdir -p "$TEMPLATE_DIR"

cat << 'EOF' > "$TEMPLATE_DIR/dv-prep.tpl"
${tpl}
EOF

cat << 'EOF' > "$TEMPLATE_DIR/dv-prep.stpl"
${stpl}
EOF

touch "$TEMPLATE_DIR/dv-prep.sh"
chmod 755 "$TEMPLATE_DIR/dv-prep.sh"
chmod 644 "$TEMPLATE_DIR/dv-prep.tpl" "$TEMPLATE_DIR/dv-prep.stpl"

echo "=========================================================================="
echo ">>> [3/4] Preparing App Distribution Repository in Hestia Storage..."
echo "=========================================================================="
DATA_DIR="/usr/local/hestia/data/webapp"
mkdir -p "$DATA_DIR/dv-prep"

# If current directory has dist files, archive them into Hestia webapp storage
if [ -d "./dist" ]; then
    echo "Bundling current ./dist files into $DATA_DIR/dv-prep.tar.gz..."
    tar -czf "$DATA_DIR/dv-prep.tar.gz" -C ./dist .
elif [ -f "./index.html" ]; then
    echo "Packaging current folder..."
    tar --exclude="./node_modules" --exclude="./.git" -czf "$DATA_DIR/dv-prep.tar.gz" .
fi

echo "=========================================================================="
echo ">>> [4/4] Refreshing HestiaCP WebApps Cache & Permissions..."
echo "=========================================================================="
# Rebuild web system and ensure permissions
chown -R root:root "$DATA_DIR"
find "$DATA_DIR" -type d -exec chmod 755 {} \\;
find "$DATA_DIR" -type f -exec chmod 644 {} \\;

echo ""
echo "=========================================================================="
echo " CONGRATULATIONS! DV-Prep is now an official Quick Install App in HestiaCP!"
echo " How to use it:"
echo " 1. Log into your Hestia Control Panel (https://${options.ip}:8083)"
echo " 2. Go to 'WEB' -> Hover over any domain -> Click 'Quick Install App' (أو تثبيت تطبيق سريع)"
echo " 3. Select 'DV-Prep Bureau Suite' from the list and click 'Setup' -> 'Install'!"
echo " 4. HestiaCP will automatically deploy the files and configure the Nginx SPA template!"
echo "=========================================================================="
`;
}

/**
 * Generate production-ready docker-compose.hestia.yml (Without Caddy, proxy-ready for Hestia Nginx)
 */
export function generateHestiaDockerComposeContent(options: HestiaConfigOptions): string {
  const fPort = options.dockerPort || 3000;
  const bPort = options.backendPort || 8000;

  return `# ==============================================================================
# DV-Help — HestiaCP Optimized Docker Compose (No Port 80/443 Conflicts)
# Compatible with HestiaCP Reverse Proxy & Let's Encrypt SSL
# Repository: ${options.gitRepo || 'jakswsg2/Dv-help'}
# Domain: ${options.domain}
# ==============================================================================

services:
  # ─────────────────────────────────────────────────────────────
  # PostgreSQL 16 — Internal Database (Encrypted fields support)
  # ─────────────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: dvhelp_postgres_\${DOMAIN_SLUG:-app}
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${DB_USER:-dvprep}
      POSTGRES_PASSWORD: \${DB_PASSWORD:?Database password is required}
      POSTGRES_DB: \${DB_NAME:-dvprep_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - backend_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER:-dvprep} -d \${DB_NAME:-dvprep_db}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  # ─────────────────────────────────────────────────────────────
  # Redis 7 — Session Cache & Celery Task Broker
  # ─────────────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: dvhelp_redis_\${DOMAIN_SLUG:-app}
    restart: unless-stopped
    command: >
      redis-server 
      --requirepass \${REDIS_PASSWORD:?Redis password is required}
      --maxmemory 256mb 
      --maxmemory-policy allkeys-lru 
      --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - backend_net
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 256M

  # ─────────────────────────────────────────────────────────────
  # MinIO — S3-Compatible Object Storage (Passports & DV Photos)
  # ─────────────────────────────────────────────────────────────
  minio:
    image: minio/minio:latest
    container_name: dvhelp_minio_\${DOMAIN_SLUG:-app}
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: \${MINIO_ROOT_USER:-dvprepadmin}
      MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD:?MinIO password is required}
    volumes:
      - minio_data:/data
    networks:
      - backend_net
    ports:
      - "127.0.0.1:\${MINIO_PORT:-9000}:9000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M

  # ─────────────────────────────────────────────────────────────
  # FastAPI Backend — REST API, OCR & Validation Engine
  # ─────────────────────────────────────────────────────────────
  backend:
    image: \${BACKEND_IMAGE:-ghcr.io/jakswsg2/dv-help-backend:latest}
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dvhelp_backend_\${DOMAIN_SLUG:-app}
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql+asyncpg://\${DB_USER:-dvprep}:\${DB_PASSWORD}@postgres:5432/\${DB_NAME:-dvprep_db}
      REDIS_URL: redis://:\${REDIS_PASSWORD}@redis:6379/0
      S3_ENDPOINT_URL: http://minio:9000
      S3_ACCESS_KEY: \${MINIO_ROOT_USER:-dvprepadmin}
      S3_SECRET_KEY: \${MINIO_ROOT_PASSWORD}
      S3_BUCKET_NAME: \${S3_BUCKET_NAME:-dvprep-uploads}
      ENCRYPTION_KEY: \${ENCRYPTION_KEY:?AES-256 encryption key required}
      JWT_SECRET_KEY: \${JWT_SECRET_KEY:?JWT secret key required}
      JWT_ACCESS_TOKEN_EXPIRE_MINUTES: \${JWT_ACCESS_TOKEN_EXPIRE_MINUTES:-60}
      BACKEND_CORS_ORIGINS: \${BACKEND_CORS_ORIGINS:-["*"]}
      ENV: production
      DEBUG: "false"
      ADMIN_EMAIL: \${ADMIN_EMAIL:-admin@example.com}
      ADMIN_PASSWORD: \${ADMIN_PASSWORD:-AdminPass2026!}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    ports:
      - "127.0.0.1:\${BACKEND_PORT:-${bPort}}:8000"
    networks:
      - backend_net
      - frontend_net
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 256M

  # ─────────────────────────────────────────────────────────────
  # Celery Worker — Async OCR, Photo Compliance & Document Tasks
  # ─────────────────────────────────────────────────────────────
  worker:
    image: \${BACKEND_IMAGE:-ghcr.io/jakswsg2/dv-help-backend:latest}
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dvhelp_worker_\${DOMAIN_SLUG:-app}
    restart: unless-stopped
    command: celery -A app.workers.celery_app worker --loglevel=info --concurrency=4
    environment:
      DATABASE_URL: postgresql+asyncpg://\${DB_USER:-dvprep}:\${DB_PASSWORD}@postgres:5432/\${DB_NAME:-dvprep_db}
      REDIS_URL: redis://:\${REDIS_PASSWORD}@redis:6379/0
      S3_ENDPOINT_URL: http://minio:9000
      S3_ACCESS_KEY: \${MINIO_ROOT_USER:-dvprepadmin}
      S3_SECRET_KEY: \${MINIO_ROOT_PASSWORD}
      S3_BUCKET_NAME: \${S3_BUCKET_NAME:-dvprep-uploads}
      ENCRYPTION_KEY: \${ENCRYPTION_KEY}
      JWT_SECRET_KEY: \${JWT_SECRET_KEY}
      ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - backend_net
    deploy:
      resources:
        limits:
          memory: 512M

  # ─────────────────────────────────────────────────────────────
  # Next.js / React Frontend — User & Bureau Web Interface
  # ─────────────────────────────────────────────────────────────
  frontend:
    image: \${FRONTEND_IMAGE:-ghcr.io/jakswsg2/dv-help-frontend:latest}
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: dvhelp_frontend_\${DOMAIN_SLUG:-app}
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: \${NEXT_PUBLIC_API_URL:-/api/v1}
      PORT: 3000
    depends_on:
      - backend
    ports:
      - "127.0.0.1:\${FRONTEND_PORT:-${fPort}}:3000"
    networks:
      - frontend_net
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 128M

  # ─────────────────────────────────────────────────────────────
  # PostgreSQL Automated Local Backup Service
  # ─────────────────────────────────────────────────────────────
  db-backup:
    image: prodrigestivill/postgres-backup-local:16
    container_name: dvhelp_backup_\${DOMAIN_SLUG:-app}
    restart: unless-stopped
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: \${DB_NAME:-dvprep_db}
      POSTGRES_USER: \${DB_USER:-dvprep}
      POSTGRES_PASSWORD: \${DB_PASSWORD}
      SCHEDULE: "@daily"
      BACKUP_KEEP_DAYS: 7
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 6
      BACKUP_SUFFIX: ".dump"
    volumes:
      - ./backups:/backups
    networks:
      - backend_net
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local

networks:
  frontend_net:
    driver: bridge
  backend_net:
    driver: bridge
    internal: true
`;
}

/**
 * Generate HestiaCP Nginx HTTP Template for Docker Reverse Proxy (Frontend:3000 + Backend:8000)
 */
export function generateHestiaDockerNginxTpl(
  templateName: string = 'dv-help-docker',
  frontendPort: number = 3000,
  backendPort: number = 8000
): string {
  return `# ==============================================================================
# HestiaCP Web Template (HTTP): ${templateName}.tpl
# Architecture: Docker Compose Microservices (Next.js + FastAPI + MinIO)
# Target: /usr/local/hestia/data/templates/web/nginx/${templateName}.tpl
# Frontend Proxy -> 127.0.0.1:${frontendPort}
# Backend API Proxy -> 127.0.0.1:${backendPort}
# ==============================================================================

server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    root        %docroot%;
    index       index.html index.htm;
    access_log  /var/log/nginx/domains/%domain%.log combined;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    error_log   /var/log/nginx/domains/%domain%.error.log error;

    # Allow high-res scans & passport documents up to 100MB
    client_max_body_size 100M;

    # FastAPI REST API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:${backendPort}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # FastAPI Interactive Documentation
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:${backendPort};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js / Frontend Application with WebSocket upgrade
    location / {
        proxy_pass http://127.0.0.1:${frontendPort};
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
`;
}

/**
 * Generate HestiaCP Nginx HTTPS (SSL) Template for Docker Reverse Proxy
 */
export function generateHestiaDockerNginxStpl(
  templateName: string = 'dv-help-docker',
  frontendPort: number = 3000,
  backendPort: number = 8000
): string {
  return `# ==============================================================================
# HestiaCP Web Template (HTTPS SSL): ${templateName}.stpl
# Architecture: Docker Compose Microservices (Next.js + FastAPI + MinIO)
# Target: /usr/local/hestia/data/templates/web/nginx/${templateName}.stpl
# Frontend Proxy -> 127.0.0.1:${frontendPort}
# Backend API Proxy -> 127.0.0.1:${backendPort}
# SSL Managed via HestiaCP Let's Encrypt (No Caddy needed!)
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

    # Security Headers for DV Applicant Privacy
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Allow high-res scans & passport documents up to 100MB
    client_max_body_size 100M;

    # FastAPI REST API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:${backendPort}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # FastAPI Interactive Documentation
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:${backendPort};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Next.js / Frontend Application with WebSocket upgrade
    location / {
        proxy_pass http://127.0.0.1:${frontendPort};
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
`;
}

/**
 * Generate official HestiaCP Quick Install WebApp Class for DV-Help (Full-Stack Docker)
 * Target: /usr/local/hestia/web/src/app/WebApp/Installers/DVHelp/DVHelpSetup.php
 */
export function generateHestiaDvHelpQuickAppPhp(options: HestiaConfigOptions): string {
  const repo = options.gitRepo || 'https://github.com/jakswsg2/Dv-help.git';
  const fPort = options.dockerPort || 3000;
  const bPort = options.backendPort || 8000;

  return `<?php
namespace Hestia\\WebApp\\Installers\\DVHelp;

use Hestia\\WebApp\\Installers\\BaseSetup as BaseSetup;

/**
 * HestiaCP Quick Install App: DV-Help Full-Stack Suite (Docker)
 * Class DVHelpSetup
 *
 * Placed in: /usr/local/hestia/web/src/app/WebApp/Installers/DVHelp/DVHelpSetup.php
 * Displays under: HestiaCP -> Web -> [Domain] -> Quick Install App -> DV-Help
 */
class DVHelpSetup extends BaseSetup {
    protected $appInfo = [
        'name' => 'DV-Help Full-Stack Suite (Docker)',
        'group' => 'applications',
        'version' => '1.0.0',
        'enabled' => true,
        'thumbnail' => 'dv-help.png',
        'description' => 'Full-stack DV Lottery Management System (Next.js + FastAPI + PostgreSQL + Redis + MinIO + Celery). Deployed seamlessly via Docker with HestiaCP native SSL and Nginx reverse proxy (No Caddy needed!).',
    ];

    protected $appRequirements = [
        'php' => [
            'supported' => ['7.4', '8.0', '8.1', '8.2', '8.3', 'none'],
        ],
    ];

    public function __construct() {
        parent::__construct();
        $this->appInfo['form'] = [
            'git_repo' => [
                'type' => 'text',
                'value' => '${repo}',
                'label' => 'GitHub Repository URL',
            ],
            'admin_email' => [
                'type' => 'text',
                'value' => 'admin@${options.domain}',
                'label' => 'Admin User Email',
            ],
            'admin_password' => [
                'type' => 'password',
                'value' => '',
                'label' => 'Admin User Password (Leave blank to generate secure password)',
            ],
            'frontend_port' => [
                'type' => 'text',
                'value' => '${fPort}',
                'label' => 'Frontend Internal Port (Default: ${fPort})',
            ],
            'backend_port' => [
                'type' => 'text',
                'value' => '${bPort}',
                'label' => 'Backend API Internal Port (Default: ${bPort})',
            ],
            'auto_ssl' => [
                'type' => 'boolean',
                'value' => true,
                'label' => 'Automatically request Let\\'s Encrypt SSL via HestiaCP',
            ],
        ];
    }

    public function info() {
        return $this->appInfo;
    }

    /**
     * Executes when user clicks "Install" in HestiaCP
     */
    public function install(array $options = []): bool {
        $user = $this->domain['user'];
        $domain = $this->domain['domain'];
        $docroot = $this->domain['docroot'] ?? "/home/$user/web/$domain/public_html";
        $appDir = "/home/$user/web/$domain/app";

        $gitRepo = !empty($options['git_repo']) ? escapeshellcmd($options['git_repo']) : '${repo}';
        $frontendPort = !empty($options['frontend_port']) ? intval($options['frontend_port']) : ${fPort};
        $backendPort = !empty($options['backend_port']) ? intval($options['backend_port']) : ${bPort};
        $adminEmail = !empty($options['admin_email']) ? escapeshellarg($options['admin_email']) : "'admin@$domain'";
        
        $adminPass = !empty($options['admin_password']) 
            ? escapeshellcmd($options['admin_password']) 
            : bin2hex(random_bytes(8)) . '!Aa1';

        // 1. Create target app directory and clone repository
        exec("mkdir -p " . escapeshellarg($appDir));
        if (!file_exists("$appDir/.git")) {
            exec("git clone --depth 1 " . escapeshellarg($gitRepo) . " " . escapeshellarg($appDir));
        } else {
            exec("cd " . escapeshellarg($appDir) . " && git pull origin main || true");
        }

        // 2. Generate cryptographically strong random secrets
        $dbPass = bin2hex(random_bytes(16));
        $redisPass = bin2hex(random_bytes(16));
        $minioPass = bin2hex(random_bytes(16));
        $jwtSecret = bin2hex(random_bytes(32));
        $aesKey = bin2hex(random_bytes(32)); // 64 hex chars = 256 bits

        // 3. Write customized .env file for the domain
        $envContent = "# Generated by HestiaCP Quick Install App for $domain\\n"
            . "PROJECT_NAME=DV-Help\\n"
            . "DOMAIN=$domain\\n"
            . "DOMAIN_SLUG=" . preg_replace('/[^a-z0-9]/i', '_', $domain) . "\\n"
            . "ENV=production\\n"
            . "DEBUG=false\\n"
            . "FRONTEND_PORT=$frontendPort\\n"
            . "BACKEND_PORT=$backendPort\\n"
            . "ADMIN_EMAIL=$adminEmail\\n"
            . "ADMIN_PASSWORD='$adminPass'\\n"
            . "DB_USER=dvprep\\n"
            . "DB_PASSWORD='$dbPass'\\n"
            . "DB_NAME=dvprep_db\\n"
            . "POSTGRES_USER=dvprep\\n"
            . "POSTGRES_PASSWORD='$dbPass'\\n"
            . "POSTGRES_DB=dvprep_db\\n"
            . "REDIS_PASSWORD='$redisPass'\\n"
            . "MINIO_ROOT_USER=dvprepadmin\\n"
            . "MINIO_ROOT_PASSWORD='$minioPass'\\n"
            . "S3_BUCKET_NAME=dvprep-uploads\\n"
            . "JWT_SECRET_KEY='$jwtSecret'\\n"
            . "ENCRYPTION_KEY='$aesKey'\\n"
            . "BACKEND_CORS_ORIGINS=['https://$domain','http://$domain']\\n"
            . "NEXT_PUBLIC_API_URL=https://$domain/api/v1\\n";

        file_put_contents("$appDir/.env", $envContent);
        exec("chown -R " . escapeshellarg($user) . ":" . escapeshellarg($user) . " " . escapeshellarg($appDir));

        // 4. Launch Docker Compose (prefer docker-compose.hestia.yml if exists, else docker-compose.yml)
        $composeFile = file_exists("$appDir/docker-compose.hestia.yml") ? "docker-compose.hestia.yml" : "docker-compose.yml";
        exec("cd " . escapeshellarg($appDir) . " && docker compose -f $composeFile up -d --build 2>&1", $dOutput, $dStatus);

        // 5. Apply Hestia Nginx Reverse Proxy template
        exec("/usr/local/hestia/bin/v-change-web-domain-tpl " . escapeshellarg($user) . " " . escapeshellarg($domain) . " dv-help-docker restart 2>/dev/null");

        // 6. Request Let's Encrypt SSL certificate if requested
        if (!empty($options['auto_ssl'])) {
            exec("/usr/local/hestia/bin/v-add-letsencrypt-domain " . escapeshellarg($user) . " " . escapeshellarg($domain) . " 2>/dev/null &");
        }

        return true;
    }
}
`;
}

/**
 * Generate One-Click Bash Script to register DV-Help Docker Quick App on the server
 */
export function generateHestiaDvHelpQuickAppRegisterBash(options: HestiaConfigOptions): string {
  const phpClass = generateHestiaDvHelpQuickAppPhp(options);
  const tpl = generateHestiaDockerNginxTpl('dv-help-docker', options.dockerPort || 3000, options.backendPort || 8000);
  const stpl = generateHestiaDockerNginxStpl('dv-help-docker', options.dockerPort || 3000, options.backendPort || 8000);

  return `#!/bin/bash
# ==============================================================================
# HestiaCP Quick Install App Register Script: DV-Help Full-Stack (Docker)
# Target Server: ${options.ip} | User: ${options.user}
# Run as ROOT on your HestiaCP Server via SSH:
#   sudo bash register-hestia-dvhelp.sh
# ==============================================================================
set -e

echo "=========================================================================="
echo ">>> [1/5] Checking Docker & Docker Compose Plugin on HestiaCP Server..."
echo "=========================================================================="
if ! command -v docker &> /dev/null; then
    echo "Docker not found! Installing Docker Engine & Compose plugin..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose v2 plugin..."
    apt-get update && apt-get install -y docker-compose-plugin || true
fi

echo "Docker status: OK ($(docker --version))"

echo "=========================================================================="
echo ">>> [2/5] Creating Quick Install App Installer Directory in HestiaCP..."
echo "=========================================================================="
INSTALLER_DIR="/usr/local/hestia/web/src/app/WebApp/Installers/DVHelp"
mkdir -p "$INSTALLER_DIR"

cat << 'EOF' > "$INSTALLER_DIR/DVHelpSetup.php"
${phpClass}
EOF
chmod 644 "$INSTALLER_DIR/DVHelpSetup.php"
chown -R root:root "$INSTALLER_DIR"

echo "=========================================================================="
echo ">>> [3/5] Installing HestiaCP Nginx Reverse Proxy Web Templates..."
echo "=========================================================================="
TEMPLATE_DIR="/usr/local/hestia/data/templates/web/nginx"
mkdir -p "$TEMPLATE_DIR"

cat << 'EOF' > "$TEMPLATE_DIR/dv-help-docker.tpl"
${tpl}
EOF

cat << 'EOF' > "$TEMPLATE_DIR/dv-help-docker.stpl"
${stpl}
EOF

touch "$TEMPLATE_DIR/dv-help-docker.sh"
chmod 755 "$TEMPLATE_DIR/dv-help-docker.sh"
chmod 644 "$TEMPLATE_DIR/dv-help-docker.tpl" "$TEMPLATE_DIR/dv-help-docker.stpl"

echo "=========================================================================="
echo ">>> [4/5] Placing App Icon and Packaging Quick Install Files..."
echo "=========================================================================="
ICON_DIR="/usr/local/hestia/web/images"
mkdir -p "$ICON_DIR"
if [ ! -f "$ICON_DIR/dv-help.png" ]; then
    touch "$ICON_DIR/dv-help.png" || true
fi

echo "=========================================================================="
echo ">>> [5/5] Rebuilding HestiaCP WebApp Registry..."
echo "=========================================================================="
/usr/local/hestia/bin/v-rebuild-web-domains ${options.user} || true

echo ""
echo "=========================================================================="
echo " SUCCESS! DV-Help is now registered in your HestiaCP Quick Install Marketplace!"
echo " How to install it on any domain:"
echo " 1. Open your Hestia Control Panel: https://${options.ip}:8083"
echo " 2. Navigate to 'WEB' -> Hover over your domain (${options.domain}) -> Click 'Quick Install App'"
echo " 3. Click 'DV-Help Full-Stack Suite (Docker)'"
echo " 4. Click 'Setup' -> Review settings -> Click 'Install'"
echo " 5. HestiaCP will clone https://github.com/jakswsg2/Dv-help.git, spin up Docker,"
echo "    connect PostgreSQL, Redis, MinIO, FastAPI, Celery, and configure SSL automatically!"
echo "=========================================================================="
`;
}
/**
 * Generate full deploy-hestia.sh automation script
 */
export function generateDeployHestiaBash(options: HestiaConfigOptions): string {
  const repo = options.gitRepo || 'https://github.com/jakswsg2/Dv-help.git';
  const fPort = options.dockerPort || 3000;
  const bPort = options.backendPort || 8000;
  const user = options.user || 'admin';
  const domain = options.domain || 'dv.example.com';

  return `#!/usr/bin/env bash
# ==============================================================================
# DV-Help / DV-Prep — Full-Stack Automated Deployment Script for Ubuntu & HestiaCP
# Repository: ${repo}
# Domain: ${domain} | Hestia User: ${user}
# Architecture: Next.js + FastAPI + PostgreSQL + Redis + MinIO + Celery (Docker)
# Web & SSL: Handled natively by HestiaCP Nginx reverse proxy & Let's Encrypt
# ==============================================================================

set -euo pipefail

# Text formatting
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
PURPLE='\\033[0;35m'
CYAN='\\033[0;36m'
BOLD='\\033[1m'
NC='\\033[0m'

log_info() { echo -e "\${BLUE}\${BOLD}[INFO]\${NC} \$1"; }
log_success() { echo -e "\${GREEN}\${BOLD}[SUCCESS]\${NC} \$1"; }
log_warning() { echo -e "\${YELLOW}\${BOLD}[WARNING]\${NC} \$1"; }
log_error() { echo -e "\${RED}\${BOLD}[ERROR]\${NC} \$1"; }
log_step() { echo -e "\\n\${CYAN}\${BOLD}===> \$1\${NC}"; }

if [ "\$EUID" -ne 0 ]; then
    log_error "This script must be run as root (or with sudo)."
    exit 1
fi

echo -e "\${PURPLE}\${BOLD}"
echo "======================================================================"
echo "    DV-Help / DV-Prep — HestiaCP Ubuntu Deployment Automation        "
echo "======================================================================"
echo -e "\${NC}"

HESTIA_USER="\${1:-\${HESTIA_USER:-${user}}}"
DOMAIN="\${2:-\${DOMAIN:-${domain}}}"
REPO_URL="\${3:-\${REPO_URL:-${repo}}}"
ADMIN_EMAIL="\${4:-\${ADMIN_EMAIL:-admin@\${DOMAIN}}}"
FRONTEND_PORT="\${FRONTEND_PORT:-${fPort}}"
BACKEND_PORT="\${BACKEND_PORT:-${bPort}}"
INSTALL_LETSENCRYPT="\${INSTALL_LETSENCRYPT:-true}"

DOMAIN_SLUG=\$(echo "\$DOMAIN" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g')
HESTIA_HOME="/home/\${HESTIA_USER}"
WEB_DIR="\${HESTIA_HOME}/web/\${DOMAIN}"
APP_DIR="\${WEB_DIR}/app"
ENV_FILE="\${APP_DIR}/.env"
NGINX_CONF_DIR="\${HESTIA_HOME}/conf/web/\${DOMAIN}"

log_info "Deployment configuration:"
echo "  - HestiaCP User : \${HESTIA_USER}"
echo "  - Target Domain : \${DOMAIN}"
echo "  - GitHub Repo   : \${REPO_URL}"
echo "  - App Directory : \${APP_DIR}"
echo "  - Admin Email   : \${ADMIN_EMAIL}"
echo "  - Frontend Port : 127.0.0.1:\${FRONTEND_PORT}"
echo "  - Backend Port  : 127.0.0.1:\${BACKEND_PORT}"

# 1. Install Docker & Docker Compose plugin
log_step "1/6. Verifying Docker & Docker Compose installation..."
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker Engine..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release git
    install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
    fi
    echo "deb [arch=\\"\$(dpkg --print-architecture)\\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \\
      \$(. /etc/os-release && echo \\"\$VERSION_CODENAME\\") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq && apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker && systemctl start docker
fi

if ! docker compose version &> /dev/null; then
    apt-get update -qq && apt-get install -y -qq docker-compose-plugin
fi
log_success "Docker Compose version: \$(docker compose version)"

if id "\$HESTIA_USER" &>/dev/null; then
    usermod -aG docker "\$HESTIA_USER" || true
fi

# 2. Check Hestia domain
log_step "2/6. Checking HestiaCP domain registration for \${DOMAIN}..."
if [ ! -d "\$WEB_DIR" ]; then
    if [ -x "/usr/local/hestia/bin/v-add-web-domain" ]; then
        /usr/local/hestia/bin/v-add-web-domain "\$HESTIA_USER" "\$DOMAIN" || true
    else
        mkdir -p "\${WEB_DIR}/public_html"
        chown -R "\${HESTIA_USER}:\${HESTIA_USER}" "\${HESTIA_HOME}/web"
    fi
fi

# 3. Clone Repository
log_step "3/6. Fetching application code from \${REPO_URL}..."
mkdir -p "\$APP_DIR"
chown -R "\${HESTIA_USER}:\${HESTIA_USER}" "\$APP_DIR"

if [ -d "\${APP_DIR}/.git" ]; then
    cd "\$APP_DIR"
    sudo -u "\$HESTIA_USER" git remote set-url origin "\$REPO_URL" || true
    sudo -u "\$HESTIA_USER" git pull origin main || true
else
    sudo -u "\$HESTIA_USER" git clone --depth 1 "\$REPO_URL" "\$APP_DIR"
fi

cd "\$APP_DIR"

# 4. Generate .env from .env.example
log_step "4/6. Generating cryptographic secrets and .env configuration..."
generate_secret_hex() { openssl rand -hex "\$1"; }
generate_secret_base64() { openssl rand -base64 "\$1" | tr -dc 'a-zA-Z0-9' | head -c "\$1"; }

if [ -f "\$ENV_FILE" ]; then
    EXISTING_DB_PASS=\$(grep '^DB_PASSWORD=' "\$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_REDIS_PASS=\$(grep '^REDIS_PASSWORD=' "\$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_MINIO_PASS=\$(grep '^MINIO_ROOT_PASSWORD=' "\$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_JWT_SECRET=\$(grep '^JWT_SECRET_KEY=' "\$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
    EXISTING_ENCRYPTION_KEY=\$(grep '^ENCRYPTION_KEY=' "\$ENV_FILE" | cut -d '=' -f2- | tr -d '"'"'" || true)
fi

DB_PASS="\${EXISTING_DB_PASS:-\$(generate_secret_hex 16)}"
REDIS_PASS="\${EXISTING_REDIS_PASS:-\$(generate_secret_hex 16)}"
MINIO_PASS="\${EXISTING_MINIO_PASS:-\$(generate_secret_hex 16)}"
JWT_SECRET="\${EXISTING_JWT_SECRET:-\$(generate_secret_hex 32)}"
ENCRYPTION_KEY="\${EXISTING_ENCRYPTION_KEY:-\$(generate_secret_hex 32)}"
ADMIN_PASS="\${ADMIN_PASSWORD:-\$(generate_secret_base64 16)!Aa1}"

cat <<EOF > "\$ENV_FILE"
PROJECT_NAME="DV-Help Bureau Suite"
APP_ENV=production
ENV=production
DEBUG=false
PRODUCTION_URL=https://\${DOMAIN}
DOMAIN=\${DOMAIN}
DOMAIN_SLUG=\${DOMAIN_SLUG}
API_V1_PREFIX=/api/v1
GITHUB_REPOSITORY=jakswsg2/Dv-help
FRONTEND_PORT=\${FRONTEND_PORT}
BACKEND_PORT=\${BACKEND_PORT}
ADMIN_EMAIL=\${ADMIN_EMAIL}
ADMIN_PASSWORD=\${ADMIN_PASS}
BACKEND_CORS_ORIGINS=["https://\${DOMAIN}","http://\${DOMAIN}","http://127.0.0.1:\${FRONTEND_PORT}"]
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=dvprep_db
DB_NAME=dvprep_db
POSTGRES_USER=dvprep
DB_USER=dvprep
POSTGRES_PASSWORD=\${DB_PASS}
DB_PASSWORD=\${DB_PASS}
DATABASE_URL=postgresql+asyncpg://dvprep:\${DB_PASS}@postgres:5432/dvprep_db
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=\${REDIS_PASS}
REDIS_URL=redis://:\${REDIS_PASS}@redis:6379/0
MINIO_ROOT_USER=dvprepadmin
MINIO_ROOT_PASSWORD=\${MINIO_PASS}
S3_ACCESS_KEY=dvprepadmin
S3_SECRET_KEY=\${MINIO_PASS}
S3_BUCKET_NAME=dvprep-uploads
S3_ENDPOINT_URL=http://minio:9000
JWT_SECRET_KEY=\${JWT_SECRET}
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
ENCRYPTION_KEY=\${ENCRYPTION_KEY}
NEXT_PUBLIC_API_URL=/api/v1
PORT=3000
EOF

chmod 600 "\$ENV_FILE"
chown "\${HESTIA_USER}:\${HESTIA_USER}" "\$ENV_FILE"

# 5. Setup Nginx Templates & Proxy
log_step "5/6. Configuring HestiaCP Nginx reverse proxy headers & SSL..."
TEMPLATE_DIR="/usr/local/hestia/data/templates/web/nginx"
mkdir -p "\$TEMPLATE_DIR"

cat << 'EOF' > "\${TEMPLATE_DIR}/dv-help-docker.tpl"
server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    root        %docroot%;
    index       index.html index.htm;
    client_max_body_size 100M;
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 180s;
    }
    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
EOF

cat << 'EOF' > "\${TEMPLATE_DIR}/dv-help-docker.stpl"
server {
    listen      %ip%:%web_ssl_port% ssl http2;
    server_name %domain_idn% %alias_idn%;
    root        %docroot%;
    index       index.html index.htm;
    ssl_certificate      %ssl_pem%;
    ssl_certificate_key  %ssl_key%;
    ssl_status           on;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    client_max_body_size 100M;
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300s;
    }
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 180s;
    }
    include %home%/%user%/conf/web/%domain%/nginx.ssl.conf_*;
}
EOF

touch "\${TEMPLATE_DIR}/dv-help-docker.sh"
chmod 755 "\${TEMPLATE_DIR}/dv-help-docker.sh"
chmod 644 "\${TEMPLATE_DIR}/dv-help-docker.tpl" "\${TEMPLATE_DIR}/dv-help-docker.stpl"

if [ -x "/usr/local/hestia/bin/v-change-web-domain-tpl" ]; then
    /usr/local/hestia/bin/v-change-web-domain-tpl "\$HESTIA_USER" "\$DOMAIN" "dv-help-docker" "restart" || true
fi

if [ "\$INSTALL_LETSENCRYPT" = "true" ] && [ -x "/usr/local/hestia/bin/v-add-letsencrypt-domain" ]; then
    /usr/local/hestia/bin/v-add-letsencrypt-domain "\$HESTIA_USER" "\$DOMAIN" 2>/dev/null || true
fi

if nginx -t &>/dev/null; then
    systemctl reload nginx || true
fi

# 6. Start Docker Stack
log_step "6/6. Starting Docker Compose microservices stack..."
COMPOSE_FILE="docker-compose.hestia.yml"
if [ ! -f "\$COMPOSE_FILE" ]; then
    COMPOSE_FILE="docker-compose.yml"
fi

docker compose -f "\$COMPOSE_FILE" up -d --build --remove-orphans

log_success "Deployment completed successfully for https://\${DOMAIN}!"
echo -e "Admin Email   : \${ADMIN_EMAIL}"
echo -e "Admin Password: \${ADMIN_PASS}"
`;
}
