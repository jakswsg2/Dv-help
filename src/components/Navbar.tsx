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
} from 'lucide-react';
import { Applicant, ApplicantStatus, Language, Theme } from '../types';
import { translations } from '../translations';
import { AutoSaveStatus } from '../hooks/useAutoSaveApplicant';

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  activeView: 'WIZARD' | 'BUREAU';
  onViewChange: (view: 'WIZARD' | 'BUREAU') => void;
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
}

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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Active Applicant Tag */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
              DV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  {t.appTitle}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  DV-{applicant.programYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Center: Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => onViewChange('WIZARD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'WIZARD'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.applicantFlow}</span>
            </button>
            <button
              onClick={() => onViewChange('BUREAU')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'BUREAU'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t.bureauMode}</span>
            </button>
          </div>

          {/* Right Actions: Applicant Status, New, Save, Language */}
          <div className="flex items-center gap-2">
            {/* Auto-Save Status Pill */}
            <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium">
              {saveStatus === 'saving' ? (
                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                  <span>{t.autoSaving}</span>
                </span>
              ) : saveStatus === 'saved' ? (
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{t.autoSaved}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <Check className="w-3 h-3 text-slate-400" />
                  <span>{t.allChangesSaved}</span>
                </span>
              )}
            </div>

            {/* Status Chip */}
            <div
              className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
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

            {/* Quick New Applicant */}
            <button
              onClick={onNewApplicant}
              title={`${t.newApplicant} (Alt+N)`}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Save Button */}
            <button
              onClick={onSave}
              title={`${t.saveChanges} (Ctrl+S / ⌘S)`}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{t.saveChanges}</span>
              <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.2 bg-black/20 text-[10px] font-mono rounded font-normal text-white/90">
                Ctrl+S
              </kbd>
              {hasUnsavedChanges && (
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>

            {/* Keyboard Shortcuts Trigger Button */}
            {onOpenShortcuts && (
              <button
                id="navbar-keyboard-shortcuts-btn"
                type="button"
                onClick={onOpenShortcuts}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title={`${t.shortcuts.openShortcutsHelp} (?)`}
                aria-label={t.shortcuts.openShortcutsHelp}
              >
                <Keyboard className="w-4 h-4 text-slate-600" />
                <span className="font-mono text-[11px] text-slate-500 font-bold">?</span>
              </button>
            )}

            {/* Auto-Sync Toggle for Power Users */}
            {onToggleAutoSync && (
              <button
                id="navbar-autosync-toggle-btn"
                type="button"
                onClick={onToggleAutoSync}
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
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

            {/* Language Switcher */}
            <button
              onClick={() => onLanguageChange(language === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="تغيير اللغة / Switch Language"
            >
              <Globe className="w-4 h-4 text-slate-500" />
              <span>{language === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* Theme Toggle (Light / Dark Mode) */}
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title={`${theme === 'dark' ? t.lightMode : t.darkMode} (Alt+T)`}
              aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
