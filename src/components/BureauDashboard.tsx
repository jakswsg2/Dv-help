import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Applicant, ApplicantStatus, AppStep, Language } from '../types';
import { translations } from '../translations';
import {
  Users,
  Search,
  Plus,
  FileCheck,
  CheckCircle2,
  Clock,
  Trash2,
  Download,
  Upload,
  Camera,
  CloudOff,
  RefreshCw,
  ShieldCheck,
  TableProperties,
  LayoutGrid,
  X,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { calculateApplicantProgress } from './BureauStats';
import { calculateApplicantProgress as calculateDetailedProgress } from '../utils/applicantProgress';
import { DataIntegrityDashboard } from './DataIntegrityDashboard';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { WhatsAppSendButton } from './WhatsAppSendButton';
import { DEFAULT_WHATSAPP_CONFIG } from '../utils/whatsappProvider';
import { DEFAULT_TEMPLATES } from '../utils/whatsappTemplates';

interface BureauDashboardProps {
  applicants: Applicant[];
  activeId: string;
  onSelectApplicant: (id: string, step?: AppStep) => void;
  onNewApplicant: () => void;
  onDeleteApplicant: (id: string) => void;
  onImportApplicants: (imported: Applicant[]) => void;
  language: Language;
  isOnline?: boolean;
  onSyncAllPending?: () => void;
  /**
   * Capability gate. The parent resolves the current session's permissions so
   * the dashboard can hide/disable actions the user may not perform. Defaults
   * to all-allowed for backwards compatibility with guest/local usage.
   */
  permissions?: {
    canCreate: boolean;
    canDelete: boolean;
    canImport: boolean;
    canExport: boolean;
    canSendWhatsApp: boolean;
  };
  /** Workspace id, forwarded to the WhatsApp composer for scoped config. */
  workspaceId?: string;
  /**
   * When set, the dashboard should auto-open the WhatsApp composer for this
   * applicant on mount (used by status-change notifications). The parent
   * clears it via onNotificationHandled afterwards.
   */
  autoOpenWhatsAppFor?: string | null;
  onNotificationHandled?: () => void;
  /**
   * Authoritative count of mutations still waiting in the offline sync queue.
   * Overrides the legacy per-applicant `hasPendingSync` heuristic now that
   * persistence is owned by the local database + queue.
   */
  pendingSyncCount?: number;
  /** ISO timestamp of the last successful remote sync. */
  lastSyncAt?: string;
  /** True while a sync run is in flight. */
  isSyncingNow?: boolean;
}

export const BureauDashboard: React.FC<BureauDashboardProps> = ({
  applicants,
  activeId,
  onSelectApplicant,
  onNewApplicant,
  onDeleteApplicant,
  onImportApplicants,
  language,
  isOnline = true,
  onSyncAllPending,
  permissions = {
    canCreate: true,
    canDelete: true,
    canImport: true,
    canExport: true,
    canSendWhatsApp: true,
  },
  workspaceId = '',
  autoOpenWhatsAppFor = null,
  onNotificationHandled,
  pendingSyncCount: pendingSyncCountProp,
  lastSyncAt,
  isSyncingNow = false,
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilterType, setSearchFilterType] = useState<'ALL' | 'NAME' | 'PASSPORT'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [bureauViewMode, setBureauViewMode] = useState<'INTEGRITY' | 'REGISTRY' | 'COMBINED'>('INTEGRITY');
  const [applicantToDelete, setApplicantToDelete] = useState<Applicant | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // When a status-change notification asks us to surface WhatsApp for a given
  // applicant, switch to the registry table (where the send button lives) and
  // scroll the matching row into view.
  useEffect(() => {
    if (!autoOpenWhatsAppFor) return;
    setBureauViewMode('REGISTRY');
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-applicant-row="${autoOpenWhatsAppFor}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onNotificationHandled?.();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenWhatsAppFor]);

  // Keyboard shortcut: Press '/' or 'Ctrl+K' / 'Cmd+K' to focus the search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;

      if ((e.key === '/' && !isInputActive) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Stats
  const totalCount = applicants.length;
  const submittedCount = applicants.filter((a) => a.status === 'SUBMITTED').length;
  const readyCount = applicants.filter((a) => a.status === 'READY_FOR_SUBMISSION').length;
  const draftCount = applicants.filter((a) => a.status === 'DRAFT').length;
  // Prefer the authoritative queue depth when the parent supplies it; fall
  // back to the legacy per-record flag only if it was not provided.
  const legacyPendingCount = applicants.filter((a) => a.hasPendingSync).length;
  const pendingSyncCount =
    typeof pendingSyncCountProp === 'number' ? pendingSyncCountProp : legacyPendingCount;

  // Filter with comprehensive name and passport matching
  const filteredWithMatchInfo = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return applicants
      .map((a) => {
        const primaryPassport = (a.passportNumber || a.mrzData?.documentNumber || '').toLowerCase();
        const primaryFirst = (a.firstName || '').toLowerCase();
        const primaryMiddle = (a.middleName || '').toLowerCase();
        const primaryLast = (a.lastName || '').toLowerCase();
        const primaryFullName1 = `${primaryFirst} ${primaryMiddle} ${primaryLast}`.toLowerCase();
        const primaryFullName2 = `${primaryLast} ${primaryFirst}`.toLowerCase();

        // Check family members
        const familyPassports: { id: string; name: string; passport: string }[] = [];
        const familyNames: string[] = [];
        (a.familyMembers || []).forEach((m) => {
          const fName = `${m.firstName || ''} ${m.lastName || ''}`.trim();
          if (fName) familyNames.push(fName.toLowerCase());
          if (m.passportNumber) {
            familyPassports.push({
              id: m.id,
              name: fName || 'Derivative',
              passport: m.passportNumber.toLowerCase(),
            });
          }
        });

        const confirmation = (a.confirmationNumber || '').toLowerCase();
        const birthCountry = (a.birthCountry || '').toLowerCase();
        const birthCity = (a.birthCity || '').toLowerCase();
        const email = (a.email || '').toLowerCase();

        let matchesQuery = true;
        let matchReason: 'NAME' | 'PASSPORT' | 'FAMILY_PASSPORT' | 'CONFIRMATION' | 'OTHER' | null = null;
        let matchedSnippet = '';

        if (query) {
          const matchesPassport = primaryPassport.includes(query);
          const matchedFamilyPassport = familyPassports.find((fp) => fp.passport.includes(query));
          const matchesName =
            primaryFirst.includes(query) ||
            primaryMiddle.includes(query) ||
            primaryLast.includes(query) ||
            primaryFullName1.includes(query) ||
            primaryFullName2.includes(query) ||
            familyNames.some((fn) => fn.includes(query));
          const matchesConfirmation = confirmation.includes(query);
          const matchesOther = birthCountry.includes(query) || birthCity.includes(query) || email.includes(query);

          if (searchFilterType === 'NAME') {
            matchesQuery = matchesName;
            if (matchesName) matchReason = 'NAME';
          } else if (searchFilterType === 'PASSPORT') {
            matchesQuery = matchesPassport || Boolean(matchedFamilyPassport);
            if (matchesPassport) {
              matchReason = 'PASSPORT';
              matchedSnippet = a.passportNumber || a.mrzData?.documentNumber || '';
            } else if (matchedFamilyPassport) {
              matchReason = 'FAMILY_PASSPORT';
              matchedSnippet = `${matchedFamilyPassport.name}: ${matchedFamilyPassport.passport.toUpperCase()}`;
            }
          } else {
            // ALL search filter
            if (matchesPassport) {
              matchesQuery = true;
              matchReason = 'PASSPORT';
              matchedSnippet = a.passportNumber || a.mrzData?.documentNumber || '';
            } else if (matchedFamilyPassport) {
              matchesQuery = true;
              matchReason = 'FAMILY_PASSPORT';
              matchedSnippet = `${matchedFamilyPassport.name}: ${matchedFamilyPassport.passport.toUpperCase()}`;
            } else if (matchesName) {
              matchesQuery = true;
              matchReason = 'NAME';
            } else if (matchesConfirmation) {
              matchesQuery = true;
              matchReason = 'CONFIRMATION';
              matchedSnippet = a.confirmationNumber || '';
            } else if (matchesOther) {
              matchesQuery = true;
              matchReason = 'OTHER';
            } else {
              matchesQuery = false;
            }
          }
        }

        let matchesStatus = true;
        if (filterStatus === 'PENDING_SYNC') {
          matchesStatus = Boolean(a.hasPendingSync);
        } else if (filterStatus !== 'ALL') {
          matchesStatus = a.status === filterStatus;
        }

        return {
          applicant: a,
          isVisible: matchesQuery && matchesStatus,
          matchReason,
          matchedSnippet,
        };
      })
      .filter((item) => item.isVisible);
  }, [applicants, searchQuery, searchFilterType, filterStatus]);

  const filtered = filteredWithMatchInfo.map((item) => item.applicant);

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(applicants, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DV_PREP_ALL_APPLICANTS_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (Array.isArray(parsed)) {
            onImportApplicants(parsed);
          } else if (parsed && parsed.id) {
            onImportApplicants([parsed]);
          }
        } catch {
          alert('ملف غير صالح');
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

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
    <div className="space-y-6">
      {/* Top View Mode Selector & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setBureauViewMode('INTEGRITY')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              bureauViewMode === 'INTEGRITY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{language === 'ar' ? 'لوحة سلامة واكتمال البيانات' : 'Data Integrity Dashboard'}</span>
          </button>

          <button
            type="button"
            onClick={() => setBureauViewMode('REGISTRY')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              bureauViewMode === 'REGISTRY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <TableProperties className="w-4 h-4" />
            <span>{language === 'ar' ? 'سجل وجدول المتقدمين' : 'Applicant Registry'}</span>
            <span className="font-mono text-[11px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-md text-slate-800 dark:text-slate-200">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBureauViewMode('COMBINED')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              bureauViewMode === 'COMBINED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>{language === 'ar' ? 'العرض الشامل' : 'Full Overview'}</span>
          </button>
        </div>

        {/* Global Bureau Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onNewApplicant}
            disabled={!permissions.canCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newApplicant}</span>
          </button>
        </div>
      </div>

      {/* Render Data Integrity Dashboard */}
      {(bureauViewMode === 'INTEGRITY' || bureauViewMode === 'COMBINED') && (
        <DataIntegrityDashboard
          applicants={applicants}
          language={language}
          onSelectApplicant={onSelectApplicant}
        />
      )}

      {/* Render Registry Section */}
      {(bureauViewMode === 'REGISTRY' || bureauViewMode === 'COMBINED') && (
        <div className="space-y-6">
          {/* Metric Cards Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span>{language === 'ar' ? 'إجمالي المتقدمين' : 'Total Entrants'}</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{totalCount}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span>{language === 'ar' ? 'تم الإدخال وحفظ الرقم' : 'Submitted'}</span>
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-extrabold text-teal-700">{submittedCount}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span>{language === 'ar' ? 'جاهز للإدخال الرسمي' : 'Ready to Submit'}</span>
                <FileCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-700">{readyCount}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span>{language === 'ar' ? 'مسودات قيد الإعداد' : 'Drafts'}</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-extrabold text-amber-700">{draftCount}</div>
            </div>

            {/* Pending Network Sync Metric Card */}
            <button
              type="button"
              onClick={() =>
                setFilterStatus(filterStatus === 'PENDING_SYNC' ? 'ALL' : 'PENDING_SYNC')
              }
              className={`text-right rtl:text-right ltr:text-left rounded-xl p-4 shadow-xs transition-all border ${
                pendingSyncCount > 0
                  ? 'bg-amber-50/70 border-amber-300 dark:border-amber-800/80 hover:bg-amber-100/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span className={pendingSyncCount > 0 ? 'text-amber-900 font-bold' : ''}>
                  {t.pendingSync}
                </span>
                <CloudOff
                  className={`w-4 h-4 ${
                    pendingSyncCount > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'
                  }`}
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-extrabold ${
                    pendingSyncCount > 0 ? 'text-amber-800' : 'text-slate-700'
                  }`}
                >
                  {pendingSyncCount}
                </span>
                {pendingSyncCount > 0 && (
                  <span className="text-[10px] text-amber-700 font-medium">
                    {language === 'ar' ? 'يحتاج مزامنة' : 'Needs Sync'}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Action Bar & Enhanced Search Engine */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Main Search Input */}
              <div className="relative flex-1 min-w-[280px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 rtl:right-3.5 ltr:left-3.5 top-3 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  id="bureau-applicant-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchApplicants}
                  className="w-full pr-10 rtl:pr-10 ltr:pr-20 rtl:pl-20 ltr:pl-10 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />

                {/* Right side inside input: Shortcut hint & Clear button */}
                <div className="absolute left-3 rtl:left-3 ltr:right-3 top-2.5 flex items-center gap-1.5">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title={t.clearSearch}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-slate-700/60 rounded border border-slate-300 dark:border-slate-600">
                      /
                    </kbd>
                  )}
                </div>
              </div>

              {/* Status Filter with Pending Sync Option */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="ALL">
                  {language === 'ar' ? 'جميع الحالات' : 'All Statuses'}
                </option>
                <option value="PENDING_SYNC">
                  ⚠️ {t.filterPendingOnly} ({pendingSyncCount})
                </option>
                <option value="DRAFT">{t.status.DRAFT}</option>
                <option value="REVIEWING">{t.status.REVIEWING}</option>
                <option value="PHOTOS_VERIFIED">{t.status.PHOTOS_VERIFIED}</option>
                <option value="READY_FOR_SUBMISSION">{t.status.READY_FOR_SUBMISSION}</option>
                <option value="SUBMITTED">{t.status.SUBMITTED}</option>
              </select>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Sync status: last sync time + live syncing indicator */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-semibold ${
                    isSyncingNow
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300'
                      : pendingSyncCount > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300'
                  }`}
                  title={t.auth.lastSync}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingNow
                      ? t.auth.syncing
                      : pendingSyncCount > 0
                      ? `${pendingSyncCount} ${t.auth.pendingOps}`
                      : lastSyncAt
                      ? `${t.auth.lastSync}: ${new Date(lastSyncAt).toLocaleTimeString()}`
                      : t.auth.neverSynced}
                  </span>
                </div>

                {/* Sync All Pending Changes Button */}
                {pendingSyncCount > 0 && onSyncAllPending && (
                  <button
                    type="button"
                    disabled={!isOnline}
                    onClick={onSyncAllPending}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      isOnline
                        ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-75'
                    }`}
                    title={
                      isOnline
                        ? t.syncAllPending
                        : language === 'ar'
                        ? 'ستتم المزامنة تلقائياً عند استعادة الاتصال'
                        : 'Will auto-sync once connection is restored'
                    }
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isOnline ? 'animate-spin' : ''}`} />
                    <span>{t.syncAllPending}</span>
                    <span className="bg-amber-800/80 px-1.5 py-0.2 rounded-full text-[10px]">
                      {pendingSyncCount}
                    </span>
                  </button>
                )}

                <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t.importData}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleExportAll}
                  disabled={!permissions.canExport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.exportData}</span>
                </button>

                <button
                  type="button"
                  onClick={onNewApplicant}
                  disabled={!permissions.canCreate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.newApplicant}</span>
                </button>
              </div>
            </div>

            {/* Search Type Filter Chips & Match Count Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium text-[11px]">
                  {language === 'ar' ? 'نطاق البحث:' : 'Search Scope:'}
                </span>

                <button
                  type="button"
                  onClick={() => setSearchFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    searchFilterType === 'ALL'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {language === 'ar' ? 'الكل (الاسم والجواز)' : 'All (Name & Passport)'}
                </button>

                <button
                  type="button"
                  onClick={() => setSearchFilterType('NAME')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    searchFilterType === 'NAME'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <UserCheck className="w-3 h-3" />
                  <span>{language === 'ar' ? 'الاسم فقط' : 'Name only'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchFilterType('PASSPORT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    searchFilterType === 'PASSPORT'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <CreditCard className="w-3 h-3" />
                  <span>{language === 'ar' ? 'رقم جواز السفر' : 'Passport #'}</span>
                </button>
              </div>

              {/* Match Counter Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? language === 'ar'
                      ? `تم العثور على ${filtered.length} من إجمالي ${applicants.length} متقدم`
                      : `Showing ${filtered.length} of ${applicants.length} entrants`
                    : language === 'ar'
                    ? `إجمالي السجلات: ${applicants.length}`
                    : `Total records: ${applicants.length}`}
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[11px] text-blue-600 hover:underline font-bold"
                  >
                    {t.clearSearch}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table of Applicants with Sync & Search Match Indicators */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <tr>
                    <th className="py-3 px-4">
                      {language === 'ar' ? 'المتقدم وجواز السفر' : 'Entrant & Passport'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'ar' ? 'تاريخ الميلاد والبلد' : 'Birth & Country'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'ar' ? 'أفراد الأسرة' : 'Family'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'ar' ? 'فحص الصورة' : 'Photo Validation'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'ar' ? 'نسبة الإنجاز' : 'Completion'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'ar' ? 'حالة الملف' : 'Status'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'ar' ? 'المزامنة' : 'Sync Status'}
                    </th>
                    <th className="py-3 px-4">
                      {language === 'ar' ? 'رقم التأكيد الرسمي' : 'Confirmation #'}
                    </th>
                    <th className="py-3 px-4 text-center">
                      {language === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredWithMatchInfo.map(({ applicant: app, matchReason, matchedSnippet }) => {
                    const isActive = app.id === activeId;
                    const isPendingSync = Boolean(app.hasPendingSync);
                    const fullName =
                      `${app.lastName || ''} ${app.firstName || ''} ${app.middleName || ''}`.trim() ||
                      (language === 'ar' ? 'بدون اسم' : 'Unnamed Entrant');

                    return (
                      <tr
                        key={app.id}
                        data-applicant-row={app.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isActive ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        } ${
                          isPendingSync
                            ? 'border-r-4 rtl:border-r-4 ltr:border-l-4 border-amber-500 bg-amber-50/20'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isPendingSync && (
                              <span
                                className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"
                                title={t.pendingSyncNotice}
                              />
                            )}
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                <span>{fullName}</span>
                                {matchReason === 'PASSPORT' && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                                    🛂 {t.searchMatchPassport}
                                  </span>
                                )}
                                {matchReason === 'FAMILY_PASSPORT' && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                    👨‍👩‍👦 {t.searchMatchFamilyPassport} ({matchedSnippet})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span>
                                  {app.passportNumber || app.mrzData?.documentNumber
                                    ? `Pass: ${app.passportNumber || app.mrzData?.documentNumber}`
                                    : app.email || '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          <div>{app.birthDate || '—'}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <span>{app.birthCity ? `${app.birthCity}, ` : ''}{app.birthCountry}</span>
                            {(app.birthCountry?.toLowerCase() === 'yemen' || app.country?.toLowerCase() === 'yemen') && (
                              <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1 rounded">YE</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">
                            {app.familyMembers.length}{' '}
                            {language === 'ar' ? 'مرافق' : 'derivatives'}
                          </span>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {app.numberOfChildren}{' '}
                            {language === 'ar' ? 'أطفال' : 'children'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {app.photo ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                {language === 'ar' ? '600×600 معتمدة' : '600x600 Verified'}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <Camera className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'لم تُرفع' : 'No Photo'}</span>
                            </span>
                          )}
                        </td>

                        {/* Progress Percentage Bar */}
                        <td className="py-3 px-4 min-w-[110px]">
                          {(() => {
                            const { percentage } = calculateApplicantProgress(app);
                            const progressColor =
                              percentage === 100
                                ? 'bg-emerald-500'
                                : percentage >= 75
                                ? 'bg-blue-500'
                                : percentage >= 50
                                ? 'bg-sky-500'
                                : 'bg-amber-500';

                            return (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className={percentage === 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}>
                                    {percentage}%
                                  </span>
                                  {percentage === 100 && (
                                    <span className="text-[10px] text-emerald-600 font-semibold">
                                      {language === 'ar' ? 'جاهز' : 'Ready'}
                                    </span>
                                  )}
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full transition-all duration-300 ${progressColor}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(
                              app.status
                            )}`}
                          >
                            {t.status[app.status]}
                          </span>
                        </td>

                        {/* Network Sync Visual Status Column */}
                        <td className="py-3 px-4">
                          {isPendingSync ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs"
                              title={t.pendingSyncNotice}
                            >
                              <CloudOff className="w-3 h-3 text-amber-600" />
                              <span>{t.pendingSyncBadge}</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium"
                              title={
                                app.lastSyncedAt
                                  ? `${
                                      language === 'ar' ? 'آخر مزامنة:' : 'Last synced:'
                                    } ${new Date(app.lastSyncedAt).toLocaleTimeString()}`
                                  : t.allSynced
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{language === 'ar' ? 'متزامن' : 'Synced'}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {app.confirmationNumber ? (
                            <span className="font-mono font-bold text-teal-800 dark:text-teal-300 text-[11px] bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                              {app.confirmationNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              {language === 'ar' ? 'قيد التجهيز' : 'In Prep'}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {permissions.canSendWhatsApp && (
                            <WhatsAppSendButton
                              applicant={app}
                              language={language}
                              workspaceId={workspaceId}
                              bureauName={t.appTitle}
                              config={DEFAULT_WHATSAPP_CONFIG}
                              templates={DEFAULT_TEMPLATES}
                              missingCount={
                                calculateDetailedProgress(app).totalFields -
                                calculateDetailedProgress(app).completedFields
                              }
                              completionPercent={calculateDetailedProgress(app).percentage}
                              defaultEvent={
                                calculateDetailedProgress(app).percentage >= 100
                                  ? 'READY_FOR_SUBMISSION'
                                  : 'MISSING_DOCUMENTS'
                              }
                            />
                            )}
                            <button
                              type="button"
                              onClick={() => onSelectApplicant(app.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              {language === 'ar' ? 'فتح الاستمارة' : 'Open'}
                            </button>
                            {applicants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setApplicantToDelete(app)}
                                disabled={!permissions.canDelete}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title={language === 'ar' ? 'حذف الملف' : 'Delete profile'}
                                aria-label={language === 'ar' ? `حذف ملف ${fullName}` : `Delete entrant profile ${fullName}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {t.noSearchResults}
                          </div>
                          <p className="text-xs text-slate-500">
                            {language === 'ar'
                              ? `لم يتم العثور على أي متقدم يطابق "${searchQuery}"`
                              : `No entrant records matched "${searchQuery}"`}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{t.clearSearch}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationModal
        isOpen={applicantToDelete !== null}
        applicant={applicantToDelete}
        onClose={() => setApplicantToDelete(null)}
        onConfirm={(id) => {
          onDeleteApplicant(id);
          setApplicantToDelete(null);
        }}
        language={language}
      />

    </div>
  );
};

