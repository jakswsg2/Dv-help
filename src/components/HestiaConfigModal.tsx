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
} from '../utils/hestiaConfigGenerator';

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
  const [mode, setMode] = useState<
    | 'hestia_quick_app'
    | 'hestia_template_tpl'
    | 'hestia_bash_installer'
    | 'hestia_package_pkg'
    | 'spa_nginx'
    | 'proxy_docker'
    | 'apache_spa'
    | 'json_package'
  >('hestia_quick_app');
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
    sslEnabled,
    exportApplicantsData,
  };

  // Generate preview content based on selected mode
  let generatedContent = '';
  let filename = '';
  let mimeType = 'text/plain';

  if (mode === 'hestia_quick_app') {
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
    const installer = generateHestiaTemplateInstallerBash(currentOptions);
    const blob = new Blob([installer], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'install-hestia-dvprep.sh';
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
                {isAr ? 'اختر نمط تصدير قوالب لوحة تحكم هيستيا (HestiaCP):' : 'Select HestiaCP Export & Template Mode:'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {/* Mode 0: Hestia Quick Install WebApp */}
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
                    <span>{isAr ? 'تطبيق تثبيت سريع (Quick Install)' : 'Quick Install WebApp'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr ? 'كلاس PHP + سكريبت تسجيل ليظهر التطبيق في متجر Quick Install بهيستيا' : 'HestiaCP WebApp installer class & 1-click registration'}
                  </p>
                </button>

                {/* Mode 1: Hestia Native Template (.tpl / .stpl) */}
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

                {/* Mode 2: Automated One-Click Bash Script */}
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

                {/* Mode 3: Hestia Package (.pkg) */}
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

                {/* Mode 4: Standalone Nginx conf */}
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

                {/* Mode 5: Docker Proxy */}
                <button
                  type="button"
                  onClick={() => setMode('proxy_docker')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'proxy_docker'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>Docker Proxy</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr ? 'ربط Nginx بحاوية دوكر على المنفذ 3000' : 'ProxyPass traffic to Docker container'}
                  </p>
                </button>

                {/* Mode 6: Apache .htaccess */}
                <button
                  type="button"
                  onClick={() => setMode('apache_spa')}
                  className={`p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                    mode === 'apache_spa'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <FileCode className="w-4 h-4 text-amber-600" />
                    <span>Apache (.htaccess)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {isAr ? 'لقوالب Nginx+Apache في public_html' : 'For Apache .htaccess in public_html'}
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
                {mode === 'hestia_quick_app' ? (
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
