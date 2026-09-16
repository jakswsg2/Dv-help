import React from 'react';
import {
  FileText,
  Users,
  Save,
  Globe,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Check,
  Loader2,
  Sun,
  Moon,
  Keyboard,
  RefreshCw,
  LogOut,
  CloudUpload,
  MessageCircle,
} from 'lucide-react';
import { Applicant, ApplicantStatus, Language, Theme } from '../types';
import { translations } from '../translations';
import { AutoSaveStatus } from '../hooks/useAutoSaveApplicant';

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  activeView: 'WIZARD' | 'BUREAU' | 'ROLES' | 'WHATSAPP';
  onViewChange: (view: 'WIZARD' | 'BUREAU' | 'ROLES' | 'WHATSAPP') => void;
  applicant: Applicant;
  onSave: () => void;
  hasUnsavedChanges?: boolean;
  saveStatus?: AutoSaveStatus;
  onNewApplicant: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenShortcuts?: () => void;
  autoSyncEnabled?: boolean;
  onToggleAutoSync?: () => void;
  /** When false, the Roles & Permissions tab is hidden entirely. */
  canViewRoles?: boolean;
  /** When false, the WhatsApp tab is hidden entirely. */
  canViewWhatsApp?: boolean;
  /** When false, the Applicant Dashboard tab is hidden (e.g. for guests). */
  canViewBureau?: boolean;
  /** Display name of the signed-in account (undefined for guests). */
  accountName?: string;
  /** Localised role label for the signed-in account. */
  accountRole?: string;
  /** Signs the current session out. */
  onSignOut?: () => void;
  /** Number of local mutations still waiting to reach the remote store. */
  pendingSyncCount?: number;
  /** True while a sync run is in flight. */
  isSyncingNow?: boolean;
}

type ViewKey = 'WIZARD' | 'BUREAU' | 'ROLES' | 'WHATSAPP';

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  activeView,
  onViewChange,
  applicant,
  onSave,
  hasUnsavedChanges = false,
  saveStatus = 'idle',
  onNewApplicant,
  theme,
  onToggleTheme,
  onOpenShortcuts,
  autoSyncEnabled = true,
  onToggleAutoSync,
  canViewRoles = false,
  canViewWhatsApp = false,
  canViewBureau = true,
  accountName,
  accountRole,
  onSignOut,
  pendingSyncCount = 0,
  isSyncingNow = false,
}) => {
  const t = translations[language];

  const getStatusBadge = (status: ApplicantStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'REVIEWING':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PHOTOS_VERIFIED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'READY_FOR_SUBMISSION':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'SUBMITTED':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  /**
   * Tab descriptors. Order matters: the wizard is always first, and each
   * subsequent tab is included only when the session is permitted to see it.
   * The tab bar wraps on narrow screens so nothing is ever clipped.
   */
  const tabs: { key: ViewKey; label: string; short: string; icon: React.ReactNode }[] = [
    { key: 'WIZARD', label: t.applicantFlow, short: t.auth.tabs.wizard, icon: <FileText className="w-4 h-4 shrink-0" /> },
  ];
  if (canViewBureau) {
    tabs.push({ key: 'BUREAU', label: t.bureauMode, short: t.auth.tabs.bureau, icon: <Users className="w-4 h-4 shrink-0" /> });
  }
  if (canViewWhatsApp) {
    tabs.push({ key: 'WHATSAPP', label: t.whatsapp.title, short: t.auth.tabs.whatsapp, icon: <MessageCircle className="w-4 h-4 shrink-0" /> });
  }
  if (canViewRoles) {
    tabs.push({ key: 'ROLES', label: t.auth.permissionsPanelTitle, short: t.auth.tabs.roles, icon: <ShieldCheck className="w-4 h-4 shrink-0" /> });
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      {/*
        Two-row layout at ALL breakpoints. Putting the mode switcher and the
        action cluster on the same row as the brand made the header wider than
        the viewport on desktop (the action group alone measured >1000px). A
        dedicated second row lets both rows size independently.
      */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* ---------- Row 1: brand + essential actions ---------- */}
        <div className="flex items-center justify-between gap-2 h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0 shrink">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-base shrink-0">
              DV
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-extrabold text-base text-slate-900 tracking-tight truncate">
                  {t.appTitle}
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border-slate-200 shrink-0">
                  DV-{applicant.programYear}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block truncate">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Essential actions only — everything optional lives here behind
              tightened breakpoints so the row never exceeds the viewport. */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Status chip (wide screens only) */}
            <div
              className={`hidden xl:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                applicant.status
              )}`}
            >
              {applicant.status === 'SUBMITTED' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>{t.status[applicant.status]}</span>
            </div>

            {/* New applicant */}
            <button
              onClick={onNewApplicant}
              title={`${t.newApplicant} (Alt+N)`}
              aria-label={t.newApplicant}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Save */}
            <button
              onClick={onSave}
              title={`${t.saveChanges} (Ctrl+S)`}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0 ${
                hasUnsavedChanges
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              <span className="hidden md:inline">{t.saveChanges}</span>
              {hasUnsavedChanges && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </button>

            {/* Theme */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
              title={`${theme === 'dark' ? t.lightMode : t.darkMode} (Alt+T)`}
              aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Language */}
            <button
              onClick={() => onLanguageChange(language === 'ar' ? 'en' : 'ar')}
              className="p-2 lg:px-2.5 lg:py-1.5 rounded-lg border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
              title="تغيير اللغة / Switch Language"
            >
              <Globe className="w-4 h-4 text-slate-500 inline lg:hidden" />
              <span className="hidden lg:inline">{language === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* Sign out */}
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                title={t.auth.signOut}
                aria-label={t.auth.signOut}
                className="p-2 rounded-lg border-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ---------- Row 2: mode tabs + secondary status ---------- */}
        <div className="pb-2 flex-wrap items-center gap-2">
          <nav className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border-slate-200 min-w-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onViewChange(tab.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === tab.key
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.icon}
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.short}</span>
              </button>
            ))}
          </nav>

          {/* Secondary indicators: status, sync, shortcuts, autosync, account.
              These are informational and appear only when there is room. */}
          <div className="flex items-center gap-1.5 ml-auto rtl:ml-0 rtl:mr-auto">
            {/* Auto-save pill */}
            <div className="hidden 2xl:flex items-center gap-1 text-[11px] font-medium">
              {saveStatus === 'saving' ? (
                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border-amber-200 px-2 py-0.5 rounded-md">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                  <span>{t.autoSaving}</span>
                </span>
              ) : saveStatus === 'saved' ? (
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border-emerald-200 px-2 py-0.5 rounded-md">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{t.autoSaved}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500">
                  <Check className="w-3 h-3 text-slate-400" />
                  <span>{t.allChangesSaved}</span>
                </span>
              )}
            </div>

            {/* Pending-sync badge */}
            {(pendingSyncCount > 0 || isSyncingNow) && (
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                  isSyncingNow
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300'
                    : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300'
                }`}
                title={t.auth.pendingOps}
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-pulse' : ''}`} />
                <span>{isSyncingNow ? t.auth.syncing : `${pendingSyncCount}`}</span>
              </div>
            )}

            {/* Shortcuts help */}
            {onOpenShortcuts && (
              <button
                id="navbar-keyboard-shortcuts-btn"
                type="button"
                onClick={onOpenShortcuts}
                className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title={`${t.shortcuts.openShortcutsHelp} (?)`}
                aria-label={t.shortcuts.openShortcutsHelp}
              >
                <Keyboard className="w-4 h-4 text-slate-600" />
                <span className="font-mono text-[11px] text-slate-500 font-bold">?</span>
              </button>
            )}

            {/* Auto-sync toggle */}
            {onToggleAutoSync && (
              <button
                id="navbar-autosync-toggle-btn"
                type="button"
                onClick={onToggleAutoSync}
                className={`hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  autoSyncEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300'
                    : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300'
                }`}
                title={t.autoSync.tooltip}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoSyncEnabled ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span>{autoSyncEnabled ? t.autoSync.enabled : t.autoSync.disabled}</span>
              </button>
            )}

            {/* Account chip */}
            {(accountName || accountRole) && (
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <div className="text-right rtl:text-left leading-tight max-w-[9rem]">
                  {accountName && (
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                      {accountName}
                    </div>
                  )}
                  {accountRole && <div className="text-[10px] text-slate-500">{accountRole}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
