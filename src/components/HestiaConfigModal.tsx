import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Applicant, Language } from '../types';
import {
  Server,
  Download,
  Copy,
  Check,
  X,
  Globe,
  FileCode,
  Terminal,
  Layers,
  Sparkles,
  Package,
  Cpu,
  Zap,
  Database,
} from 'lucide-react';
import {
  HestiaConfigOptions,
  generateHestiaNginxConf,
  generateHestiaDockerProxyConf,
  generateHestiaApacheConf,
  generateHestiaJsonPackage,
  generateHestiaWebTemplateTpl,
  generateHestiaWebTemplateStpl,
  generateHestiaUserPackage,
  generateHestiaTemplateInstallerBash,
  generateHestiaQuickAppPhp,
  generateHestiaQuickAppInstallerBash,
  generateHestiaDockerComposeContent,
  generateHestiaDockerNginxTpl,
  generateHestiaDockerNginxStpl,
  generateHestiaDvHelpQuickAppPhp,
  generateHestiaDvHelpQuickAppRegisterBash,
  generateDeployHestiaBash,
} from '../utils/hestiaConfigGenerator';
import {
  generateHestiaDbConnectionStrings,
  generateHestiaPostgresSchema,
  exportApplicantsToSqlInserts,
  replaceDockerEnvWithHestiaLocal,
  HestiaDbConfig,
} from '../utils/hestiaDbConnector';

interface HestiaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicants: Applicant[];
  language: Language;
}

export const HestiaConfigModal: React.FC<HestiaConfigModalProps> = ({
  isOpen,
  onClose,
  applicants,
  language,
}) => {
  const isAr = language === 'ar';

  // Default server settings prefilled with user's Oracle Cloud instance details
  const [domain, setDomain] = useState('dv.example.com');
  const [user, setUser] = useState('admin');
  const [ip, setIp] = useState('129.151.138.90');
  const [dbNameShort, setDbNameShort] = useState('dvhelp');
  const [dbUserShort, setDbUserShort] = useState('dvhelp');
  const [dbPassword, setDbPassword] = useState('dvhelp_secure_pass_2026');
  const [mode, setMode] = useState<
    | 'hestia_native_db'
    | 'hestia_docker_app'
    | 'hestia_quick_app'
    | 'hestia_template_tpl'
    | 'hestia_bash_installer'
    | 'hestia_package_pkg'
    | 'spa_nginx'
    | 'proxy_docker'
    | 'apache_spa'
    | 'json_package'
  >('hestia_native_db');
  const [dbSubtype, setDbSubtype] = useState<
    'connection_strings' | 'schema_sql' | 'inserts_sql' | 'env_converter'
  >('connection_strings');
  const [dockerSubtype, setDockerSubtype] = useState<
    'deploy_script' | 'register_script' | 'compose' | 'php_class' | 'nginx_stpl' | 'nginx_tpl'
  >('deploy_script');
  const [gitRepo, setGitRepo] = useState('https://github.com/jakswsg2/Dv-help.git');
  const [backendPort, setBackendPort] = useState<number>(8000);
  const [quickAppSubtype, setQuickAppSubtype] = useState<'installer_script' | 'php_class'>('installer_script');
  const [templateType, setTemplateType] = useState<'tpl' | 'stpl'>('tpl');
  const [dockerPort, setDockerPort] = useState<number>(3000);
  const [sslEnabled, setSslEnabled] = useState(true);
  const [exportApplicantsData, setExportApplicantsData] = useState(true);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentOptions: HestiaConfigOptions = {
    domain: domain.trim() || 'dv.example.com',
    user: user.trim() || 'admin',
    ip: ip.trim() || '129.151.138.90',
    mode,
    dockerPort: Number(dockerPort) || 3000,
    backendPort: Number(backendPort) || 8000,
    gitRepo: gitRepo.trim() || 'https://github.com/jakswsg2/Dv-help.git',
    sslEnabled,
    exportApplicantsData,
  };

  const currentDbConfig: HestiaDbConfig = {
    host: '127.0.0.1',
    port: 5432,
    hestiaUser: user.trim() || 'admin',
    dbNameShort: dbNameShort.trim() || 'dvhelp',
    dbUserShort: dbUserShort.trim() || 'dvhelp',
    password: dbPassword.trim(),
    sslMode: 'prefer',
    dbEngine: 'pgsql',
  };

  // Generate preview content based on selected mode
  let generatedContent = '';
  let filename = '';
  let mimeType = 'text/plain';

  if (mode === 'hestia_native_db') {
    const conn = generateHestiaDbConnectionStrings(currentDbConfig);
    if (dbSubtype === 'connection_strings') {
      filename = 'hestia_postgresql_connections.txt';
      mimeType = 'text/plain';
      generatedContent = `# ==============================================================================
# HestiaCP Native PostgreSQL Local Connection Strings & Direct Access
# Server: ${ip} | User: ${currentDbConfig.hestiaUser} | Host: 127.0.0.1:5432
# (Replaces Docker container hostnames with standard local connection URIs)
# ==============================================================================

# 1. Standard libpq / DSN Connection URI:
${conn.standardUri}

# 2. Async SQLAlchemy (FastAPI / asyncpg):
DATABASE_URL=${conn.asyncSqlAlchemy}

# 3. Sync SQLAlchemy / Psycopg2 (Celery / Migrations):
DATABASE_SYNC_URL=${conn.syncSqlAlchemy}

# 4. HestiaCP CLI Command to create this database & user (Run as root):
${conn.hestiaCliCreateCommand}

# 5. Direct psql CLI Terminal Command (Local / SSH):
${conn.psqlCliCommand}

# 6. Node.js (pg / Drizzle / Prisma / TypeORM) JSON Config:
${JSON.stringify(conn.nodePgConfig, null, 2)}

# 7. Web Management:
# Access phpPgAdmin in your Hestia Control Panel:
# URL: https://${ip}:8083/phppgadmin/
# Username: ${conn.fullDbUser}
# Database: ${conn.fullDbName}
`;
    } else if (dbSubtype === 'schema_sql') {
      generatedContent = generateHestiaPostgresSchema(currentDbConfig);
      filename = 'hestia_schema.sql';
      mimeType = 'application/sql';
    } else if (dbSubtype === 'inserts_sql') {
      generatedContent = exportApplicantsToSqlInserts(applicants, currentDbConfig);
      filename = `applicants_export_${domain.replace(/[^a-zA-Z0-9_-]/g, '_')}.sql`;
      mimeType = 'application/sql';
    } else {
      // env_converter
      const sampleDockerEnv = `POSTGRES_HOST=postgres\nPOSTGRES_PORT=5432\nPOSTGRES_DB=dvprep_db\nPOSTGRES_USER=dvprep_user\nPOSTGRES_PASSWORD=${dbPassword}\nDATABASE_URL=postgresql://dvprep_user:${dbPassword}@postgres:5432/dvprep_db\nREDIS_HOST=redis\nREDIS_URL=redis://redis:6379/0\nS3_ENDPOINT_URL=http://minio:9000`;
      generatedContent = `# ==============================================================================
# Converted Production .env for Native HestiaCP (No Docker)
# Generated for: ${domain} | User: ${user}
# ==============================================================================
PROJECT_NAME="DV-Help Bureau Suite"
APP_ENV=production
ENV=production
DEBUG=false
PRODUCTION_URL=https://${domain}
DOMAIN=${domain}
DOMAIN_SLUG=${domain.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}
API_V1_PREFIX=/api/v1
FRONTEND_PORT=${dockerPort}
BACKEND_PORT=${backendPort}
PORT=${dockerPort}

${replaceDockerEnvWithHestiaLocal(sampleDockerEnv, currentDbConfig)}
`;
      filename = '.env.hestia';
      mimeType = 'text/plain';
    }
  } else if (mode === 'hestia_docker_app') {
    if (dockerSubtype === 'deploy_script') {
      generatedContent = generateDeployHestiaBash(currentOptions);
      filename = 'deploy-hestia.sh';
      mimeType = 'text/x-shellscript';
    } else if (dockerSubtype === 'compose') {
      generatedContent = generateHestiaDockerComposeContent(currentOptions);
      filename = 'docker-compose.hestia.yml';
      mimeType = 'text/yaml';
    } else if (dockerSubtype === 'php_class') {
      generatedContent = generateHestiaDvHelpQuickAppPhp(currentOptions);
      filename = 'DVHelpSetup.php';
      mimeType = 'application/x-httpd-php';
    } else if (dockerSubtype === 'nginx_stpl') {
      generatedContent = generateHestiaDockerNginxStpl('dv-help-native', currentOptions.dockerPort, currentOptions.backendPort);
      filename = 'dv-help-native.stpl';
      mimeType = 'text/plain';
    } else if (dockerSubtype === 'nginx_tpl') {
      generatedContent = generateHestiaDockerNginxTpl('dv-help-native', currentOptions.dockerPort, currentOptions.backendPort);
      filename = 'dv-help-native.tpl';
      mimeType = 'text/plain';
    } else {
      generatedContent = generateHestiaDvHelpQuickAppRegisterBash(currentOptions);
      filename = 'register-hestia-native.sh';
      mimeType = 'text/x-shellscript';
    }
  } else if (mode === 'hestia_quick_app') {
    if (quickAppSubtype === 'php_class') {
      generatedContent = generateHestiaQuickAppPhp();
      filename = 'DVPrepSetup.php';
      mimeType = 'application/x-httpd-php';
    } else {
      generatedContent = generateHestiaQuickAppInstallerBash(currentOptions);
      filename = 'register-hestia-quick-install.sh';
      mimeType = 'text/x-shellscript';
    }
  } else if (mode === 'hestia_template_tpl') {
    if (templateType === 'stpl') {
      generatedContent = generateHestiaWebTemplateStpl('dv-prep');
      filename = 'dv-prep.stpl';
    } else {
      generatedContent = generateHestiaWebTemplateTpl('dv-prep');
      filename = 'dv-prep.tpl';
    }
    mimeType = 'text/plain';
  } else if (mode === 'hestia_bash_installer') {
    generatedContent = generateHestiaTemplateInstallerBash(currentOptions);
    filename = 'install-hestia-dvprep.sh';
    mimeType = 'text/x-shellscript';
  } else if (mode === 'hestia_package_pkg') {
    generatedContent = generateHestiaUserPackage(currentOptions);
    filename = 'DV-Prep.pkg';
    mimeType = 'text/plain';
  } else if (mode === 'spa_nginx') {
    generatedContent = generateHestiaNginxConf(currentOptions, applicants);
    filename = `hestia_${domain.replace(/[^a-zA-Z0-9_-]/g, '_')}_nginx.conf`;
    mimeType = 'text/plain';
  } else if (mode === 'proxy_docker') {
    generatedContent = generateHestiaDockerProxyConf(currentOptions, applicants);
    filename = `hestia_${domain.replace(/[^a-zA-Z0-9_-]/g, '_')}_docker_proxy.conf`;
    mimeType = 'text/plain';
  } else if (mode === 'apache_spa') {
    generatedContent = generateHestiaApacheConf(currentOptions, applicants);
    filename = '.htaccess';
    mimeType = 'text/plain';
  } else {
    generatedContent = generateHestiaJsonPackage(currentOptions, applicants);
    filename = `hestiacp_deployment_${domain.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    mimeType = 'application/json';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Special full package bundle download
  const handleDownloadFullBundle = () => {
    let script = '';
    let name = 'install-hestia-dvprep.sh';
    if (mode === 'hestia_docker_app') {
      script = generateHestiaDvHelpQuickAppRegisterBash(currentOptions);
      name = 'register-hestia-dvhelp.sh';
    } else if (mode === 'hestia_quick_app') {
      script = generateHestiaQuickAppInstallerBash(currentOptions);
      name = 'register-hestia-quick-install.sh';
    } else {
      script = generateHestiaTemplateInstallerBash(currentOptions);
      name = 'install-hestia-dvprep.sh';
    }
    const blob = new Blob([script], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>
                    {isAr
                      ? 'تصدير وضبط قوالب لوحة تحكم هيستيا (HestiaCP Templates)'
                      : 'HestiaCP Web Templates & Hosting Configurator'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                    HestiaCP Web Templates
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? 'تصدير قوالب الويب الرسمية (tpl / stpl) وباقات المستخدمين وسكريبتات التثبيت الآلي للوحة تحكم HestiaCP'
                    : 'Export native Nginx web templates (.tpl/.stpl), user packages (.pkg), and single-command installers for HestiaCP'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Quick Oracle Instance Info Banner */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-start justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  <strong>{isAr ? 'خادم أوراكل كلاود المجاني:' : 'Target Host:'}</strong> {ip} (Ubuntu) • Hestia Control Panel
                </span>
              </div>
              <span className="text-[11px] font-mono bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded font-semibold text-blue-800 dark:text-blue-200">
                {applicants.length} {isAr ? 'ملفات متقدمين مجهزة' : 'Entrants Ready'}
              </span>
            </div>

            {/* Input Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'اسم النطاق (Domain):' : 'Domain Name:'}
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="dv.yourdomain.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'مستخدم HestiaCP (User):' : 'HestiaCP User:'}
                </label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'عنوان IP الخادم:' : 'Server Public IP:'}
                </label>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="129.151.138.90"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'اختر نمط تصدير قوالب وقواعد بيانات هيستيا (HestiaCP):' : 'Select HestiaCP Export & Template Mode:'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {/* Mode 0: HestiaCP Native PostgreSQL Database Connector */}
                <button
                  type="button"
                  onClick={() => setMode('hestia_native_db')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'hestia_native_db'
                      ? 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100 shadow-xs ring-2 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{isAr ? 'قاعدة بيانات هيستيا (PostgreSQL محلي)' : 'HestiaCP Native PostgreSQL'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr
                      ? 'ربط مباشر بقاعدة بيانات هيستيا المحلية بدون دوكر (v-add-database + DDL + .env محلي)'
                      : 'Direct local PostgreSQL connection strings, schema DDL & local .env converter (No Docker)'}
                  </p>
                </button>

                {/* Mode 1: DV-Help Full-Stack Native App */}
                <button
                  type="button"
                  onClick={() => setMode('hestia_docker_app')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'hestia_docker_app'
                      ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 shadow-xs ring-2 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{isAr ? 'نشر التطبيق الكامل (Systemd + Nginx)' : 'DV-Help Full-Stack (Native)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr
                      ? 'خدمات Systemd مستقلة + Nginx Reverse Proxy + شهادة Hestia SSL تلقائياً'
                      : 'Native Systemd services + Nginx Reverse Proxy with Hestia SSL certificate'}
                  </p>
                </button>

                {/* Mode 2: Hestia Quick Install WebApp */}
                <button
                  type="button"
                  onClick={() => setMode('hestia_quick_app')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'hestia_quick_app'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 shadow-xs ring-1 ring-amber-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>{isAr ? 'تطبيق SPA سريع (Quick Install)' : 'Static SPA Quick App'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr ? 'كلاس PHP + سكريبت تسجيل لتثبيت ملفات الـ SPA مباشرة في public_html' : 'HestiaCP WebApp installer for direct static deployment'}
                  </p>
                </button>

                {/* Mode 3: Hestia Native Template (.tpl / .stpl) */}
                <button
                  type="button"
                  onClick={() => setMode('hestia_template_tpl')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'hestia_template_tpl'
                      ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 text-orange-950 dark:text-orange-100 shadow-xs ring-1 ring-orange-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <span>{isAr ? 'قالب هيستيا (tpl / stpl)' : 'Hestia Template'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr ? 'قالب Nginx رسمي يوضع في مجلد templates بلوحة هيستيا ويظهر في القائمة' : 'Native HestiaCP web template for /data/templates/web/nginx/'}
                  </p>
                </button>

                {/* Mode 4: Automated One-Click Bash Script */}
                <button
                  type="button"
                  onClick={() => setMode('hestia_bash_installer')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'hestia_bash_installer'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Terminal className="w-4 h-4 text-blue-600" />
                    <span>{isAr ? 'سكريبت التثبيت الآلي (Bash)' : 'Auto Installer (.sh)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr ? 'أمر واحد يثبت القالب والنطاق وشهادة SSL ويعيد تشغيل هيستيا' : 'Single root script that creates domain, applies template & sets SSL'}
                  </p>
                </button>

                {/* Mode 5: Hestia Package (.pkg) */}
                <button
                  type="button"
                  onClick={() => setMode('hestia_package_pkg')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'hestia_package_pkg'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>{isAr ? 'باقة هيستيا (DV-Prep.pkg)' : 'Hestia Package (.pkg)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr ? 'باقة مستخدم جاهزة لـ Packages بخصائص مهيأة للقالب مباشرة' : 'Hestia user package configuration with dv-prep template preassigned'}
                  </p>
                </button>

                {/* Mode 6: Standalone Nginx conf */}
                <button
                  type="button"
                  onClick={() => setMode('spa_nginx')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'spa_nginx'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <FileCode className="w-4 h-4 text-cyan-600" />
                    <span>Nginx vHost (.conf)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr ? 'ملف إعدادات مباشر للمجال في /conf/web/{domain}/' : 'Direct domain vHost file for conf/web/ directory'}
                  </p>
                </button>

                {/* Mode 7: JSON Bundle */}
                <button
                  type="button"
                  onClick={() => setMode('json_package')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'json_package'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <span>Hestia JSON Bundle</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr ? 'حزمة شاملة تحوي كافة القوالب وبيانات المتقدمين' : 'Full JSON bundle with all configs'}
                  </p>
                </button>
              </div>
            </div>

            {/* Extra Options for Selected Mode */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
              {mode === 'hestia_native_db' && (
                <div className="w-full flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {isAr ? 'ملف قاعدة البيانات:' : 'Database Export View:'}
                      </span>
                      <div className="inline-flex flex-wrap rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => setDbSubtype('connection_strings')}
                          className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                            dbSubtype === 'connection_strings'
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                          }`}
                        >
                          Connection Strings & CLI
                        </button>
                        <button
                          type="button"
                          onClick={() => setDbSubtype('schema_sql')}
                          className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                            dbSubtype === 'schema_sql'
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                          }`}
                        >
                          schema.sql (DDL)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDbSubtype('inserts_sql')}
                          className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                            dbSubtype === 'inserts_sql'
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                          }`}
                        >
                          applicants_export.sql ({applicants.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDbSubtype('env_converter')}
                          className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                            dbSubtype === 'env_converter'
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                          }`}
                        >
                          .env.hestia (Local Config)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Database Credentials Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        {isAr ? 'اسم قاعدة البيانات (اللاحقة):' : 'DB Name Suffix:'}
                      </label>
                      <input
                        type="text"
                        value={dbNameShort}
                        onChange={(e) => setDbNameShort(e.target.value)}
                        placeholder="dvhelp"
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                      />
                      <span className="text-[10px] text-slate-400">
                        {user}_{dbNameShort}
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        {isAr ? 'مستخدم قاعدة البيانات (اللاحقة):' : 'DB User Suffix:'}
                      </label>
                      <input
                        type="text"
                        value={dbUserShort}
                        onChange={(e) => setDbUserShort(e.target.value)}
                        placeholder="dvhelp"
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                      />
                      <span className="text-[10px] text-slate-400">
                        {user}_{dbUserShort}
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        {isAr ? 'كلمة مرور قاعدة البيانات:' : 'DB Password:'}
                      </label>
                      <input
                        type="text"
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        placeholder="secure_password"
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                      />
                      <span className="text-[10px] text-slate-400">
                        Host: 127.0.0.1:5432
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'hestia_docker_app' && (
                <div className="w-full flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{isAr ? 'الملف المعروض:' : 'View / Export File:'}</span>
                    <div className="inline-flex flex-wrap rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => setDockerSubtype('deploy_script')}
                        className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                          dockerSubtype === 'deploy_script'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        deploy-hestia.sh (Automated Deploy)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDockerSubtype('register_script')}
                        className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                          dockerSubtype === 'register_script'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        register-hestia-native.sh
                      </button>
                      <button
                        type="button"
                        onClick={() => setDockerSubtype('php_class')}
                        className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                          dockerSubtype === 'php_class'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        DVHelpSetup.php
                      </button>
                      <button
                        type="button"
                        onClick={() => setDockerSubtype('nginx_stpl')}
                        className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                          dockerSubtype === 'nginx_stpl'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        dv-help-docker.stpl (SSL Proxy)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDockerSubtype('nginx_tpl')}
                        className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                          dockerSubtype === 'nginx_tpl'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        dv-help-docker.tpl (HTTP Proxy)
                      </button>
                    </div>
                  </div>

                  {/* Ports & Git Repo Configuration */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-semibold">{isAr ? 'مستودع GitHub:' : 'Git Repo:'}</span>
                      <input
                        type="text"
                        value={gitRepo}
                        onChange={(e) => setGitRepo(e.target.value)}
                        className="w-64 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-semibold">{isAr ? 'منفذ الواجهة (Next.js):' : 'Frontend Port:'}</span>
                      <input
                        type="number"
                        value={dockerPort}
                        onChange={(e) => setDockerPort(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-semibold">{isAr ? 'منفذ الواجهة البرمجية (FastAPI):' : 'Backend Port:'}</span>
                      <input
                        type="number"
                        value={backendPort}
                        onChange={(e) => setBackendPort(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {mode === 'hestia_quick_app' && (
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <span>{isAr ? 'الملف المعروض:' : 'View / Export File:'}</span>
                  <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setQuickAppSubtype('installer_script')}
                      className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                        quickAppSubtype === 'installer_script'
                          ? 'bg-amber-500 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      register-hestia-quick-install.sh (Bash)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAppSubtype('php_class')}
                      className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                        quickAppSubtype === 'php_class'
                          ? 'bg-amber-500 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      DVPrepSetup.php (Hestia WebApp Class)
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {quickAppSubtype === 'installer_script'
                      ? (isAr ? 'أمر واحد لتسجيل التطبيق باللوحة' : '1-Click Registration Script')
                      : '/usr/local/hestia/web/src/app/WebApp/Installers/DVPrep/DVPrepSetup.php'}
                  </span>
                </div>
              )}

              {mode === 'hestia_template_tpl' && (
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <span>{isAr ? 'نوع القالب:' : 'Template Type:'}</span>
                  <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setTemplateType('tpl')}
                      className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                        templateType === 'tpl'
                          ? 'bg-orange-500 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      dv-prep.tpl (HTTP)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateType('stpl')}
                      className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer ${
                        templateType === 'stpl'
                          ? 'bg-orange-500 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      dv-prep.stpl (HTTPS SSL)
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {isAr
                      ? 'المسار في هيستيا: /usr/local/hestia/data/templates/web/nginx/'
                      : 'Hestia path: /usr/local/hestia/data/templates/web/nginx/'}
                  </span>
                </div>
              )}

              {mode !== 'hestia_template_tpl' && mode !== 'hestia_package_pkg' && (
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={sslEnabled}
                    onChange={(e) => setSslEnabled(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{isAr ? 'تضمين شهادة الأمان Let\'s Encrypt SSL (HTTPS:443)' : 'Include Let\'s Encrypt SSL Block (HTTPS:443)'}</span>
                </label>
              )}

              {mode === 'proxy_docker' && (
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <span>{isAr ? 'منفذ الحاوية الداخلي:' : 'Docker Internal Port:'}</span>
                  <input
                    type="number"
                    value={dockerPort}
                    onChange={(e) => setDockerPort(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  />
                </div>
              )}

              {mode === 'json_package' && (
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={exportApplicantsData}
                    onChange={(e) => setExportApplicantsData(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{isAr ? `تضمين سجلات المتقدمين (${applicants.length} ملف)` : `Include Entrant Profiles (${applicants.length} records)`}</span>
                </label>
              )}

              <button
                type="button"
                onClick={handleDownloadFullBundle}
                className="mr-auto rtl:mr-0 rtl:ml-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تصدير حزمة التثبيت الآلي الشاملة (.sh)' : 'Download Full Auto Installer Script (.sh)'}</span>
              </button>
            </div>

            {/* Code Output Viewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-blue-600" />
                  {filename}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isAr ? 'نسخ الكود' : 'Copy'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تحميل الملف' : 'Download'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre
                  dir="ltr"
                  className="w-full p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-72 border border-slate-800 selection:bg-blue-600 selection:text-white leading-relaxed text-left"
                >
                  <code>{generatedContent}</code>
                </pre>
              </div>
            </div>

            {/* Quick HestiaCP CLI Instructions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>
                  {isAr
                    ? 'أوامر تطبيق القالب في لوحة تحكم هيستيا (SSH كمسؤول Root):'
                    : 'HestiaCP Shell Commands (Run as Root via SSH):'}
                </span>
              </h4>
              <div dir="ltr" className="space-y-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                {mode === 'hestia_native_db' ? (
                  <>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-emerald-600 dark:text-emerald-400 font-semibold">
                      # 1. إنشاء قاعدة بيانات PostgreSQL والمستخدم في لوحة هيستيا بأمر واحد كمسؤول root:
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all font-bold text-slate-800 dark:text-slate-100">
                      v-add-database {user} {dbNameShort} {dbUserShort} '{dbPassword}' pgsql
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-slate-600 dark:text-slate-400">
                      # 2. استيراد جداول ومخطط DV-Help إلى قاعدة بيانات هيستيا المحلية:
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all font-bold text-slate-800 dark:text-slate-100">
                      PGPASSWORD='{dbPassword}' psql -h 127.0.0.1 -U {user}_{dbUserShort} -d {user}_{dbNameShort} -f schema.sql
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-blue-600 dark:text-blue-400">
                      # 3. حفظ إعدادات الاتصال في ملف .env الخاص بالتطبيق بدون الحاجة إلى Docker.
                    </p>
                  </>
                ) : mode === 'hestia_docker_app' ? (
                  <>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-indigo-600 dark:text-indigo-400 font-semibold">
                      # الخيار A: نشر فوري تلقائي بالكامل (استنساخ Git + تجهيز .env + إنشاء خدمات Systemd + إعداد Nginx Reverse Proxy):
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all font-bold text-slate-800 dark:text-slate-100">
                      sudo bash deploy-hestia.sh {user} {domain}
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-slate-600 dark:text-slate-400">
                      # الخيار B: التسجيل في متجر هيستيا للتثبيت بالنقرة الواحدة (Quick Install App):
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all font-bold text-slate-800 dark:text-slate-100">
                      sudo bash register-hestia-native.sh
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-emerald-600 dark:text-emerald-400">
                      # ميزة البنية: خدمات Systemd محلية ترتبط مباشرة بقاعدة بيانات هيستيا 127.0.0.1:5432 بدون Docker
                    </p>
                  </>
                ) : mode === 'hestia_quick_app' ? (
                  <>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-amber-600 dark:text-amber-400 font-semibold">
                      # 1. شغّل سكريبت تسجيل Quick Install كمسؤول root على سيرفر هيستيا:
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all">
                      sudo bash register-hestia-quick-install.sh
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-slate-500">
                      # 2. افتح لوحة هيستيا (https://{ip}:8083) → WEB → اختر أي دومين → انقر 'Quick Install App' وستجد DV-Prep جاهزاً!
                    </p>
                  </>
                ) : mode === 'hestia_bash_installer' ? (
                  <>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-emerald-600 dark:text-emerald-400 font-semibold">
                      # احفظ السكريبت وشغّله بأمر واحد لتثبيت القالب وتهيئة النطاق تلقائياً:
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all">
                      sudo bash install-hestia-dvprep.sh
                    </p>
                  </>
                ) : mode === 'hestia_template_tpl' ? (
                  <>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-slate-500">
                      # 1. نسخ القالب لمجلد قوالب Nginx في هيستيا:
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all">
                      cp dv-prep.tpl dv-prep.stpl /usr/local/hestia/data/templates/web/nginx/
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all text-slate-500">
                      # 2. تطبيق قالب dv-prep على النطاق من التيرمينال أو من لوحة التحكم مباشرة:
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all">
                      v-change-web-domain-tpl {user} {domain} dv-prep restart
                    </p>
                  </>
                ) : mode === 'hestia_package_pkg' ? (
                  <>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all">
                      cp DV-Prep.pkg /usr/local/hestia/data/packages/
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all">
                      v-change-user-package {user} DV-Prep
                    </p>
                  </>
                ) : (
                  <>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all">
                      v-add-web-domain {user} {domain} {ip}
                    </p>
                    <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all">
                      v-add-letsencrypt-domain {user} {domain}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'متوافق مع لوحة تحكم HestiaCP، وإعدادات Nginx / Apache / PHP-FPM'
                : 'Compatible with HestiaCP v1.8+, Nginx Reverse Proxy, and SPA architectures.'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
