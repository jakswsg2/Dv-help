import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Applicant, AppStep, Language } from './types';
import { translations } from './translations';
import {
  getStoredApplicants,
  saveStoredApplicants,
  getActiveApplicantId,
  saveActiveApplicantId,
  createNewApplicant,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { StepPersonalDetails } from './components/StepPersonalDetails';
import { StepFamilyMembers } from './components/StepFamilyMembers';
import { StepDocumentOcr } from './components/StepDocumentOcr';
import { StepPhotoValidator } from './components/StepPhotoValidator';
import { StepEligibility } from './components/StepEligibility';
import { StepConsistencyCheck } from './components/StepConsistencyCheck';
import { StepOfficialSubmissionPrep } from './components/StepOfficialSubmissionPrep';
import { BureauDashboard } from './components/BureauDashboard';
import { WizardProgressBar } from './components/WizardProgressBar';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { useAutoSaveApplicant } from './hooks/useAutoSaveApplicant';
import { useTheme } from './hooks/useTheme';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  loadShortcutsConfig,
  formatKeyBinding,
  SHORTCUTS_CHANGED_EVENT,
  CustomShortcutsConfig,
} from './utils/shortcutManager';
import { saveApplicantCloud, deleteApplicantCloud } from './utils/firebase';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import {
  User,
  Users,
  FileText,
  Camera,
  GraduationCap,
  ShieldAlert,
  Send,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle,
  CheckCircle2,
  Clock,
  Keyboard,
  Zap,
} from 'lucide-react';
import { calculateApplicantProgress } from './utils/applicantProgress';

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { isOnline, wasOffline } = useNetworkStatus();
  const [language, setLanguage] = useState<Language>('ar');
  const [activeView, setActiveView] = useState<'WIZARD' | 'BUREAU'>('WIZARD');
  const [currentStep, setCurrentStep] = useState<AppStep>('PERSONAL');
  const [applicants, setApplicants] = useState<Applicant[]>(() =>
    getStoredApplicants()
  );
  const [activeApplicantId, setActiveApplicantId] = useState<string>(() =>
    getActiveApplicantId()
  );
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dv_autosync_enabled') !== 'false';
  });

  const handleToggleAutoSync = () => {
    setAutoSyncEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('dv_autosync_enabled', String(next));
      return next;
    });
  };
  const [saveToast, setSaveToast] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [shortcutFeedback, setShortcutFeedback] = useState<{
    message: string;
    key: string;
  } | null>(null);
  const [shortcutsConfig, setShortcutsConfig] = useState<CustomShortcutsConfig>(() =>
    loadShortcutsConfig()
  );
  const shortcutFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync shortcuts when changed via custom event or storage
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CustomShortcutsConfig>;
      if (customEvent.detail) {
        setShortcutsConfig(customEvent.detail);
      } else {
        setShortcutsConfig(loadShortcutsConfig());
      }
    };

    window.addEventListener(SHORTCUTS_CHANGED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(SHORTCUTS_CHANGED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const triggerShortcutFeedback = (message: string, key: string) => {
    if (shortcutFeedbackTimer.current) {
      clearTimeout(shortcutFeedbackTimer.current);
    }
    setShortcutFeedback({ message, key });
    shortcutFeedbackTimer.current = setTimeout(() => {
      setShortcutFeedback(null);
    }, 2200);
  };

  const stepContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Smooth scroll into view whenever step changes, keeping content centered
  const scrollToStepContent = () => {
    if (stepContainerRef.current) {
      stepContainerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Defer slightly to let DOM layout settle
    const timer = setTimeout(() => {
      scrollToStepContent();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Sync document direction
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const activeApplicant =
    applicants.find((a) => a.id === activeApplicantId) ||
    applicants[0] ||
    createNewApplicant();

  // Auto-save hook with 500ms debounce when applicant fields change, automatically disabled when offline
  const {
    saveStatus,
    hasUnsavedChanges,
    saveNow,
  } = useAutoSaveApplicant(activeApplicant, {
    debounceMs: 500,
    enabled: isOnline && autoSyncEnabled,
    onSave: (appToSave) => {
      setApplicants((currentList) => {
        const updatedList = currentList.map((a) =>
          a.id === appToSave.id
            ? { ...appToSave, hasPendingSync: false, lastSyncedAt: new Date().toISOString() }
            : a
        );
        saveStoredApplicants(updatedList);
        saveActiveApplicantId(appToSave.id);
        return updatedList;
      });

      // Background cloud sync to Firestore
      if (isOnline) {
        saveApplicantCloud(appToSave).catch((err) => {
          console.warn('Background cloud sync warning:', err);
        });
      }
    },
  });

  // Automatically sync pending offline changes once connection is restored
  useEffect(() => {
    if (isOnline && wasOffline) {
      setApplicants((prev) => {
        const hasAnyPending = prev.some((a) => a.hasPendingSync);
        if (hasAnyPending) {
          const synced = prev.map((a) => ({
            ...a,
            hasPendingSync: false,
            lastSyncedAt: new Date().toISOString(),
          }));
          saveStoredApplicants(synced);
          synced.forEach((app) => {
            saveApplicantCloud(app).catch((err) => console.warn('Sync pending applicant error:', err));
          });
          return synced;
        }
        return prev;
      });
    }
  }, [isOnline, wasOffline]);

  const handleSyncAllPending = () => {
    if (!isOnline) return;
    setApplicants((prev) => {
      const synced = prev.map((a) => ({
        ...a,
        hasPendingSync: false,
        lastSyncedAt: new Date().toISOString(),
      }));
      saveStoredApplicants(synced);
      synced.forEach((app) => {
        saveApplicantCloud(app).catch((err) => console.warn('Sync pending applicant error:', err));
      });
      return synced;
    });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };


  const handleUpdateApplicant = (fields: Partial<Applicant>) => {
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === activeApplicant.id
          ? {
              ...a,
              ...fields,
              hasPendingSync: !isOnline ? true : a.hasPendingSync,
              updatedAt: new Date().toISOString(),
            }
          : a
      )
    );
  };

  const handleManualSave = () => {
    saveNow();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleNewApplicant = () => {
    const newApp = createNewApplicant();
    const updated = [newApp, ...applicants];
    setApplicants(updated);
    setActiveApplicantId(newApp.id);
    saveStoredApplicants(updated);
    saveActiveApplicantId(newApp.id);
    setActiveView('WIZARD');
    setCurrentStep('PERSONAL');
  };

  const handleDeleteApplicant = (id: string) => {
    if (applicants.length <= 1) return;
    const remaining = applicants.filter((a) => a.id !== id);
    setApplicants(remaining);
    saveStoredApplicants(remaining);
    if (activeApplicantId === id) {
      setActiveApplicantId(remaining[0].id);
      saveActiveApplicantId(remaining[0].id);
    }
    if (isOnline) {
      deleteApplicantCloud(id).catch((err) => {
        console.warn('Cloud delete error:', err);
      });
    }
  };

  const handleSelectApplicant = (id: string, step?: AppStep) => {
    setActiveApplicantId(id);
    saveActiveApplicantId(id);
    if (step) {
      setCurrentStep(step);
    }
    setActiveView('WIZARD');
  };

  const t = translations[language];

  const stepList: { key: AppStep; label: string; icon: React.ReactNode }[] = [
    {
      key: 'PERSONAL',
      label: t.steps.PERSONAL,
      icon: <User className="w-4 h-4" />,
    },
    {
      key: 'FAMILY',
      label: t.steps.FAMILY,
      icon: <Users className="w-4 h-4" />,
    },
    {
      key: 'DOCUMENTS',
      label: t.steps.DOCUMENTS,
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: 'PHOTO',
      label: t.steps.PHOTO,
      icon: <Camera className="w-4 h-4" />,
    },
    {
      key: 'ELIGIBILITY',
      label: t.steps.ELIGIBILITY,
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      key: 'CONSISTENCY',
      label: t.steps.CONSISTENCY,
      icon: <ShieldAlert className="w-4 h-4" />,
    },
    {
      key: 'OFFICIAL_PREP',
      label: t.steps.OFFICIAL_PREP,
      icon: <Send className="w-4 h-4" />,
    },
  ];

  const currentStepIndex = stepList.findIndex((s) => s.key === currentStep);

  const goNext = () => {
    if (currentStepIndex < stepList.length - 1) {
      setCurrentStep(stepList[currentStepIndex + 1].key);
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(stepList[currentStepIndex - 1].key);
    }
  };

  // Global Keyboard Shortcuts for Power Users
  useKeyboardShortcuts({
    language,
    enabled: true,
    onSave: () => {
      handleManualSave();
      triggerShortcutFeedback(
        language === 'ar' ? 'تم حفظ التعديلات' : 'Changes saved',
        formatKeyBinding(shortcutsConfig.save, language)
      );
    },
    onNextStep: () => {
      if (activeView === 'WIZARD') {
        if (currentStepIndex < stepList.length - 1) {
          const next = stepList[currentStepIndex + 1];
          setCurrentStep(next.key);
          triggerShortcutFeedback(
            `${language === 'ar' ? 'التالي:' : 'Next:'} ${next.label}`,
            formatKeyBinding(shortcutsConfig.nextStep, language)
          );
        }
      }
    },
    onPrevStep: () => {
      if (activeView === 'WIZARD') {
        if (currentStepIndex > 0) {
          const prev = stepList[currentStepIndex - 1];
          setCurrentStep(prev.key);
          triggerShortcutFeedback(
            `${language === 'ar' ? 'السابق:' : 'Previous:'} ${prev.label}`,
            formatKeyBinding(shortcutsConfig.prevStep, language)
          );
        }
      }
    },
    onJumpToStep: (stepIdx) => {
      if (stepIdx >= 0 && stepIdx < stepList.length) {
        const target = stepList[stepIdx];
        setCurrentStep(target.key);
        if (activeView !== 'WIZARD') setActiveView('WIZARD');
        triggerShortcutFeedback(
          `${language === 'ar' ? 'انتقال إلى:' : 'Jump to:'} ${target.label}`,
          `Alt+${stepIdx + 1}`
        );
      }
    },
    onToggleView: () => {
      setActiveView((prev) => {
        const next = prev === 'WIZARD' ? 'BUREAU' : 'WIZARD';
        triggerShortcutFeedback(
          next === 'WIZARD'
            ? (language === 'ar' ? 'استمارة المتقدم' : 'Applicant Wizard')
            : (language === 'ar' ? 'لوحة المتقدمين' : 'Applicants Dashboard'),
          'Alt+B'
        );
        return next;
      });
    },
    onNewApplicant: () => {
      handleNewApplicant();
      triggerShortcutFeedback(
        language === 'ar' ? 'متقدم جديد' : 'New Applicant',
        'Alt+N'
      );
    },
    onToggleTheme: () => {
      toggleTheme();
      triggerShortcutFeedback(
        theme === 'dark'
          ? (language === 'ar' ? 'الوضع النهاري' : 'Light Mode')
          : (language === 'ar' ? 'الوضع الليلي' : 'Dark Mode'),
        'Alt+T'
      );
    },
    onOpenShortcutsHelp: () => {
      setShowShortcutsModal((prev) => !prev);
    },
  });

  const activeApplicantProgress = calculateApplicantProgress(activeApplicant);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Network Offline / Status Banner */}
      <NetworkStatusBanner
        isOnline={isOnline}
        wasOffline={wasOffline}
        language={language}
      />

      {/* Navbar */}
      <Navbar
        language={language}
        onLanguageChange={setLanguage}
        activeView={activeView}
        onViewChange={setActiveView}
        applicant={activeApplicant}
        onSave={handleManualSave}
        saveStatus={saveStatus}
        hasUnsavedChanges={hasUnsavedChanges}
        onNewApplicant={handleNewApplicant}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
      />

      {/* Strict Ethics & Legal Notice Banner */}
      <DisclaimerBanner language={language} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        {activeView === 'BUREAU' ? (
          <BureauDashboard
            applicants={applicants}
            activeId={activeApplicant.id}
            onSelectApplicant={handleSelectApplicant}
            onNewApplicant={handleNewApplicant}
            onDeleteApplicant={handleDeleteApplicant}
            onImportApplicants={(imported) => {
              setApplicants(imported);
              saveStoredApplicants(imported);
              if (imported[0]) {
                setActiveApplicantId(imported[0].id);
                saveActiveApplicantId(imported[0].id);
              }
            }}
            language={language}
            isOnline={isOnline}
            onSyncAllPending={handleSyncAllPending}
          />
        ) : (
          <div className="space-y-6">
            {/* Dynamic Completion Progress Bar */}
            <WizardProgressBar
              applicant={activeApplicant}
              language={language}
              currentStep={currentStep}
              onNavigateStep={(step) => setCurrentStep(step)}
            />

            {/* Step Navigation Tabs Bar with Step-based Estimated Time Indicators */}
            <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs overflow-x-auto">
              <nav className="flex items-center gap-1.5 min-w-max">
                {stepList.map((step, idx) => {
                  const isActive = step.key === currentStep;
                  const isPassed = idx < currentStepIndex;
                  const stepSummary = activeApplicantProgress.stepSummaries[step.key];
                  const isStepDone = stepSummary?.isCompleted;

                  return (
                    <button
                      key={step.key}
                      onClick={() => setCurrentStep(step.key)}
                      className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all select-none cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isStepDone
                          ? 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-800'
                          : isPassed
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                      title={`${step.label} • ${
                        isStepDone
                          ? t.stepDone
                          : language === 'ar'
                          ? stepSummary?.formattedTimeRemainingAr
                          : stepSummary?.formattedTimeRemainingEn
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isActive
                            ? 'bg-blue-800 text-white'
                            : isStepDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPassed
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isStepDone && !isActive ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span>{step.label}</span>

                      {/* Mini Step-Specific Time Badge */}
                      {stepSummary && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-700/80 text-blue-100'
                              : isStepDone
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isStepDone
                            ? '✓'
                            : language === 'ar'
                            ? stepSummary.formattedTimeRemainingAr.replace('متبقي ', '')
                            : stepSummary.formattedTimeRemainingEn.replace(' left', '')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Step View Component with smooth entrance animation and centered scroll target */}
            <div
              ref={stepContainerRef}
              className="scroll-mt-24 sm:scroll-mt-28"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 14, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.995 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  {currentStep === 'PERSONAL' && (
                    <StepPersonalDetails
                      applicant={activeApplicant}
                      onChange={handleUpdateApplicant}
                      language={language}
                      onNavigateToStep={(step) => setCurrentStep(step as AppStep)}
                    />
                  )}

                  {currentStep === 'FAMILY' && (
                    <StepFamilyMembers
                      applicant={activeApplicant}
                      onChange={handleUpdateApplicant}
                      language={language}
                    />
                  )}

                  {currentStep === 'DOCUMENTS' && (
                    <StepDocumentOcr
                      applicant={activeApplicant}
                      onChange={handleUpdateApplicant}
                      language={language}
                    />
                  )}

                  {currentStep === 'PHOTO' && (
                    <StepPhotoValidator
                      applicant={activeApplicant}
                      onChange={handleUpdateApplicant}
                      language={language}
                    />
                  )}

                  {currentStep === 'ELIGIBILITY' && (
                    <StepEligibility
                      applicant={activeApplicant}
                      onChange={handleUpdateApplicant}
                      language={language}
                    />
                  )}

                  {currentStep === 'CONSISTENCY' && (
                    <StepConsistencyCheck
                      applicant={activeApplicant}
                      language={language}
                      onNavigateToStep={(s) => setCurrentStep(s as AppStep)}
                    />
                  )}

                  {currentStep === 'OFFICIAL_PREP' && (
                    <StepOfficialSubmissionPrep
                      applicant={activeApplicant}
                      onChange={handleUpdateApplicant}
                      language={language}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Action Bar for Wizard */}
      {activeView === 'WIZARD' && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 py-3 z-30 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <button
              id="bottom-bar-prev-step-btn"
              type="button"
              disabled={currentStepIndex === 0}
              onClick={goPrev}
              title={`${language === 'ar' ? 'السابق' : 'Previous'} (${
                language === 'ar' ? 'Ctrl+→' : 'Ctrl+←'
              })`}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              {language === 'ar' ? (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white text-slate-600 rounded border border-slate-300 shadow-xs">
                    Ctrl+→
                  </kbd>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white text-slate-600 rounded border border-slate-300 shadow-xs">
                    Ctrl+←
                  </kbd>
                </>
              )}
            </button>

            {/* Center: Estimated Time Indicator & Power User Shortcuts Guide Trigger */}
            <div className="flex items-center gap-3">
              <div
                id="bottom-bar-time-indicator"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs"
                title={t.estimatedTimeRemaining}
              >
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  {language === 'ar'
                    ? activeApplicantProgress.formattedTimeRemainingAr
                    : activeApplicantProgress.formattedTimeRemainingEn}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono font-normal">
                  ({activeApplicantProgress.completedFields}/{activeApplicantProgress.totalFields})
                </span>
              </div>

              <button
                id="bottom-bar-shortcuts-btn"
                type="button"
                onClick={() => setShowShortcutsModal(true)}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title={`${t.shortcuts.openShortcutsHelp} (?)`}
              >
                <Keyboard className="w-4 h-4 text-slate-500" />
                <span>{t.shortcuts.openShortcutsHelp}</span>
                <kbd className="px-1.5 py-0.5 bg-slate-200 text-[10px] font-mono rounded font-bold text-slate-700">
                  ?
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="bottom-bar-save-btn"
                type="button"
                onClick={handleManualSave}
                title={`${t.saveChanges} (${formatKeyBinding(shortcutsConfig.save, language)})`}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : saveStatus === 'saving'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {saveStatus === 'saving' ? (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                ) : saveStatus === 'saved' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {saveStatus === 'saving'
                    ? t.autoSaving
                    : saveStatus === 'saved'
                    ? t.autoSaved
                    : t.saveChanges}
                </span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white text-slate-600 rounded border border-slate-300 shadow-xs">
                  {formatKeyBinding(shortcutsConfig.save, language)}
                </kbd>
              </button>

              <button
                id="bottom-bar-next-step-btn"
                type="button"
                disabled={currentStepIndex === stepList.length - 1}
                onClick={goNext}
                title={`${language === 'ar' ? 'التالي' : 'Next'} (${formatKeyBinding(
                  shortcutsConfig.nextStep,
                  language
                )})`}
                className="flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {language === 'ar' ? (
                  <>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-800 text-blue-100 rounded shadow-xs">
                      {formatKeyBinding(shortcutsConfig.nextStep, language)}
                    </kbd>
                    <span>التالي</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-800 text-blue-100 rounded shadow-xs">
                      {formatKeyBinding(shortcutsConfig.nextStep, language)}
                    </kbd>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Feedback Toast */}
      {saveToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{t.savedSuccessfully}</span>
        </div>
      )}

      {/* Transient Keyboard Shortcut HUD Alert */}
      <AnimatePresence>
        {shortcutFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2.5 z-50 border border-slate-700/60 backdrop-blur-md"
          >
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[11px] font-mono text-amber-300 font-bold">
                {shortcutFeedback.key}
              </kbd>
            </div>
            <span className="text-slate-200">{shortcutFeedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Keyboard Shortcuts Guide Modal */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal
          language={language}
          onClose={() => setShowShortcutsModal(false)}
        />
      )}
    </div>
  );
};

export default App;
