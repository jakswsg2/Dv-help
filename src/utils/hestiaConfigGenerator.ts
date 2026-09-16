import { Applicant } from '../types';

export interface HestiaConfigOptions {
  domain: string;
  user: string;
  ip: string;
  mode:
    | 'hestia_quick_app'
    | 'hestia_template_tpl'
    | 'hestia_package_pkg'
    | 'hestia_bash_installer'
    | 'spa_nginx'
    | 'proxy_docker'
    | 'apache_spa'
    | 'json_package';
  dockerPort: number;
  sslEnabled: boolean;
  exportApplicantsData: boolean;
  templateName?: string;
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


