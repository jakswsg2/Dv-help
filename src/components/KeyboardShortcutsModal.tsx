import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import { translations } from '../translations';
import {
  Keyboard,
  X,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Save,
  Users,
  UserPlus,
  SunMoon,
  Sparkles,
  HelpCircle,
  CornerDownLeft,
  Sliders,
  RotateCcw,
  Edit3,
  Check,
  AlertTriangle,
  Radio,
  BookmarkCheck,
} from 'lucide-react';
import {
  loadShortcutsConfig,
  saveShortcutsConfig,
  resetShortcutsConfig,
  formatKeyBindingParts,
  isDefaultBinding,
  findBindingConflicts,
  areBindingsEqual,
  formatKeyBinding,
  SHORTCUT_PRESETS,
  DEFAULT_SHORTCUTS,
  RebindableAction,
  CustomShortcutsConfig,
  KeyBinding,
  isMacOS,
} from '../utils/shortcutManager';

interface KeyboardShortcutsModalProps {
  language: Language;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  language,
  onClose,
}) => {
  const t = translations[language];
  const s = t.shortcuts;
  const isAr = language === 'ar';
  const isMac = isMacOS();
  const modKey = isMac ? '⌘ Cmd' : 'Ctrl';

  // Custom shortcuts state backed by localStorage
  const [shortcutsConfig, setShortcutsConfig] = useState<CustomShortcutsConfig>(() =>
    loadShortcutsConfig()
  );
  const [recordingAction, setRecordingAction] = useState<RebindableAction | null>(null);
  const [saveToast, setSaveToast] = useState(false);
  const [pendingConflict, setPendingConflict] = useState<{
    action: RebindableAction;
    binding: KeyBinding;
    conflictingAction: RebindableAction;
  } | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape key handler when NOT recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (recordingAction) {
          e.preventDefault();
          e.stopPropagation();
          setRecordingAction(null);
        } else if (pendingConflict) {
          e.preventDefault();
          e.stopPropagation();
          setPendingConflict(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, recordingAction, pendingConflict]);

  // Key recording listener
  useEffect(() => {
    if (!recordingAction) return;

    const handleRecordKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // If user pressed Escape, cancel recording
      if (e.key === 'Escape') {
        setRecordingAction(null);
        return;
      }

      // Ignore pure modifier presses
      if (
        e.key === 'Control' ||
        e.key === 'Meta' ||
        e.key === 'Alt' ||
        e.key === 'Shift'
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;
      const isShift = e.shiftKey;

      const newBinding: KeyBinding = {
        key: e.key,
        code: e.code,
        ctrlOrCmd: isCtrlOrCmd,
        alt: isAlt,
        shift: isShift,
      };

      const updated = {
        ...shortcutsConfig,
        [recordingAction]: newBinding,
      };

      // Check for conflicts with other actions
      const otherActions: RebindableAction[] = ['nextStep', 'prevStep', 'save'].filter(
        (a) => a !== recordingAction
      ) as RebindableAction[];

      let conflictingWith: RebindableAction | null = null;
      for (const act of otherActions) {
        if (areBindingsEqual(updated[act], newBinding)) {
          conflictingWith = act;
          break;
        }
      }

      setRecordingAction(null);

      if (conflictingWith) {
        setPendingConflict({
          action: recordingAction,
          binding: newBinding,
          conflictingAction: conflictingWith,
        });
      } else {
        setShortcutsConfig(updated);
        saveShortcutsConfig(updated);
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2000);
      }
    };

    window.addEventListener('keydown', handleRecordKey, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleRecordKey, { capture: true });
    };
  }, [recordingAction, shortcutsConfig]);

  // Conflict confirmation handlers
  const handleConfirmConflict = () => {
    if (!pendingConflict) return;
    const { action, binding } = pendingConflict;
    const updated = {
      ...shortcutsConfig,
      [action]: binding,
    };
    setShortcutsConfig(updated);
    saveShortcutsConfig(updated);
    setPendingConflict(null);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleCancelConflict = () => {
    setPendingConflict(null);
  };

  // Handle single action reset
  const handleResetSingle = (action: RebindableAction) => {
    const updated = {
      ...shortcutsConfig,
      [action]: DEFAULT_SHORTCUTS[action],
    };
    setShortcutsConfig(updated);
    saveShortcutsConfig(updated);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // Handle reset all
  const handleResetAll = () => {
    const reset = resetShortcutsConfig();
    setShortcutsConfig(reset);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // Handle applying a quick preset
  const handleApplyPreset = (presetKey: string) => {
    const preset = SHORTCUT_PRESETS[presetKey];
    if (!preset) return;
    setShortcutsConfig(preset.config);
    saveShortcutsConfig(preset.config);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const conflicts = findBindingConflicts(shortcutsConfig);

  const rebindableItems: Array<{
    action: RebindableAction;
    title: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      action: 'nextStep',
      title: s.nextStep,
      description: isAr ? 'الانتقال إلى الخطوة التالية' : 'Navigate forward to next step',
      icon: isAr ? (
        <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      ) : (
        <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      ),
    },
    {
      action: 'prevStep',
      title: s.prevStep,
      description: isAr ? 'الرجوع إلى الخطوة السابقة' : 'Navigate backward to previous step',
      icon: isAr ? (
        <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      ) : (
        <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      ),
    },
    {
      action: 'save',
      title: s.saveChanges,
      description: isAr ? 'حفظ فوري آمن لبيانات المتقدم' : 'Save all entries securely to vault',
      icon: <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    },
  ];

  return (
    <div
      id="keyboard-shortcuts-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !recordingAction) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-400 shadow-xs">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="shortcuts-dialog-title"
                  className="text-base sm:text-lg font-bold text-white tracking-tight"
                >
                  {s.modalTitle}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span>{s.badge}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {s.modalSubtitle}
              </p>
            </div>
          </div>

          <button
            id="close-shortcuts-modal-btn"
            type="button"
            onClick={onClose}
            aria-label={s.close}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section: Customization & Rebind Shortcuts */}
          <div
            id="shortcuts-rebind-section"
            className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-2 border-blue-200 dark:border-blue-900/60 shadow-xs space-y-4"
          >
            {/* Rebind Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs shrink-0 mt-0.5">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{s.rebindSectionTitle}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                      localStorage
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {s.rebindSectionSubtitle}
                  </p>
                </div>
              </div>

              <button
                id="reset-all-shortcuts-btn"
                type="button"
                onClick={handleResetAll}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{s.resetAllShortcuts}</span>
              </button>
            </div>

            {/* Conflict Warning */}
            {conflicts.hasConflict && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{s.conflictWarning}</span>
              </div>
            )}

            {/* Quick Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-blue-500" />
                <span>{s.presetsTitle}</span>
              </span>
              {Object.entries(SHORTCUT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleApplyPreset(key)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-colors shadow-2xs"
                >
                  {isAr ? preset.labelAr : preset.labelEn}
                </button>
              ))}
            </div>

            {/* Rebindable Actions List */}
            <div className="space-y-2.5 pt-1">
              {rebindableItems.map(({ action, title, description, icon }) => {
                const binding = shortcutsConfig[action];
                const isDefault = isDefaultBinding(action, binding);
                const isRecording = recordingAction === action;
                const { modifiers, mainKey } = formatKeyBindingParts(
                  binding,
                  language,
                  isMac
                );

                return (
                  <div
                    key={action}
                    id={`rebind-card-${action}`}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isRecording
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Action Info */}
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/60 shrink-0">
                          {icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {title}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                isDefault
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              }`}
                            >
                              {isDefault ? s.defaultBadge : s.customBadge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {description}
                          </p>
                        </div>
                      </div>

                      {/* Binding Display & Rebind Controls */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {isRecording ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                              <span>{s.recordingPrompt}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setRecordingAction(null)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg"
                            >
                              {s.cancelRecording}
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Key Badges */}
                            <div className="flex items-center gap-1">
                              {modifiers.map((mod, idx) => (
                                <React.Fragment key={idx}>
                                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-2xs">
                                    {mod}
                                  </kbd>
                                  <span className="text-slate-400 text-xs font-bold">+</span>
                                </React.Fragment>
                              ))}
                              <kbd className="px-2.5 py-1 text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-md shadow-2xs">
                                {mainKey}
                              </kbd>
                            </div>

                            {/* Rebind Button */}
                            <button
                              id={`rebind-btn-${action}`}
                              type="button"
                              onClick={() => setRecordingAction(action)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg text-xs transition-colors shadow-2xs"
                              title={s.rebindAction}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{s.pressToRecord}</span>
                            </button>

                            {/* Single Action Reset */}
                            {!isDefault && (
                              <button
                                type="button"
                                onClick={() => handleResetSingle(action)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title={s.resetSingleAction}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Storage Persistence Notice */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{s.storageNotice}</span>
              </div>
              <AnimatePresence>
                {saveToast && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold"
                  >
                    <Check className="w-3 h-3" />
                    <span>{isAr ? 'تم الحفظ' : 'Saved!'}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Group 1: Navigation & Steps Reference */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {s.navigationGroup}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Next Step */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {isAr ? (
                    <ArrowLeft className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span>{s.nextStep}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    {formatKeyBindingParts(shortcutsConfig.nextStep, language, isMac).fullDisplay}
                  </kbd>
                </div>
              </div>

              {/* Previous Step */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {isAr ? (
                    <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <ArrowLeft className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span>{s.prevStep}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    {formatKeyBindingParts(shortcutsConfig.prevStep, language, isMac).fullDisplay}
                  </kbd>
                </div>
              </div>

              {/* Vertical Arrows Alternative Next & Prev */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center text-blue-600">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <ArrowUp className="w-3.5 h-3.5 -ml-1" />
                  </div>
                  <span>{s.nextStep} / {s.prevStep}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    {modKey}
                  </kbd>
                  <span className="text-slate-400 text-xs">+</span>
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    ↓ / ↑
                  </kbd>
                </div>
              </div>

              {/* Direct Jump to Step 1..7 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center">
                    #
                  </span>
                  <span>{s.jumpStep}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    Alt
                  </kbd>
                  <span className="text-slate-400 text-xs">+</span>
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    1..7
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Group 2: Quick Actions & Controls */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {s.actionsGroup}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Save */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <Save className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{s.saveChanges}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="px-2.5 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-md shadow-xs">
                    {formatKeyBindingParts(shortcutsConfig.save, language, isMac).fullDisplay}
                  </kbd>
                </div>
              </div>

              {/* Toggle View (Wizard / Bureau) */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Users className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{s.toggleView}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    Alt
                  </kbd>
                  <span className="text-slate-400 text-xs">+</span>
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    B
                  </kbd>
                </div>
              </div>

              {/* New Applicant */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <UserPlus className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{s.newApplicant}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    Alt
                  </kbd>
                  <span className="text-slate-400 text-xs">+</span>
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    N
                  </kbd>
                </div>
              </div>

              {/* Toggle Theme */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <SunMoon className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{s.toggleTheme}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    Alt
                  </kbd>
                  <span className="text-slate-400 text-xs">+</span>
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    T
                  </kbd>
                </div>
              </div>

              {/* Open Shortcuts Help */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{s.openHelp}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    ?
                  </kbd>
                  <span className="text-slate-400 text-xs">{s.orKey}</span>
                  <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    {modKey}+/
                  </kbd>
                </div>
              </div>

              {/* Close Modal */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <CornerDownLeft className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{s.closeModal}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="px-2.5 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tip Footer */}
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{s.pressKeyHint}</span>
            </div>
            <span className="hidden sm:inline-block font-mono text-[11px] text-blue-600 dark:text-blue-400">
              {isMac ? 'Apple macOS Mappings Active' : 'Windows / Linux Mappings Active'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-end shrink-0">
          <button
            id="close-shortcuts-footer-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
          >
            {s.close}
          </button>
        </div>
      </motion.div>

      {/* Conflict Alert Modal */}
      <AnimatePresence>
        {pendingConflict && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {s.conflictPromptTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {formatKeyBinding(pendingConflict.binding, language, isMac)}
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                {s.conflictPromptDesc.replace(
                  '{action}',
                  pendingConflict.conflictingAction === 'nextStep'
                    ? s.nextStep
                    : pendingConflict.conflictingAction === 'prevStep'
                    ? s.prevStep
                    : s.saveChanges
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCancelConflict}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {s.cancelReassign}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConflict}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {s.confirmReassign}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KeyboardShortcutsModal;

