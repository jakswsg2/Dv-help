import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  ListChecks,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Applicant, AppStep, Language } from '../types';
import { translations } from '../translations';
import { calculateApplicantProgress } from '../utils/applicantProgress';

interface WizardProgressBarProps {
  applicant: Applicant;
  language: Language;
  currentStep?: AppStep;
  onNavigateStep?: (step: AppStep) => void;
}

export const WizardProgressBar: React.FC<WizardProgressBarProps> = ({
  applicant,
  language,
  currentStep,
  onNavigateStep,
}) => {
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [selectedStepFilter, setSelectedStepFilter] = useState<AppStep | 'ALL'>('ALL');
  const t = translations[language];
  const progress = calculateApplicantProgress(applicant);

  const getStatusBadge = () => {
    switch (progress.statusKey) {
      case 'complete':
        return {
          label: t.completionStatusComplete,
          color:
            'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          barColor: 'from-emerald-500 to-teal-500',
          textColor: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'almost':
        return {
          label: t.completionStatusAlmost,
          color:
            'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
          barColor: 'from-blue-600 to-cyan-500',
          textColor: 'text-blue-600 dark:text-blue-400',
        };
      case 'progressing':
        return {
          label: t.completionStatusProgressing,
          color:
            'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
          barColor: 'from-blue-600 to-indigo-600',
          textColor: 'text-indigo-600 dark:text-indigo-400',
        };
      default:
        return {
          label: t.completionStatusIncomplete,
          color:
            'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          barColor: 'from-amber-500 to-orange-500',
          textColor: 'text-amber-600 dark:text-amber-400',
        };
    }
  };

  const statusConfig = getStatusBadge();
  const missingFields = progress.details.filter((d) => !d.isCompleted);
  const timeRemainingLabel =
    language === 'ar' ? progress.formattedTimeRemainingAr : progress.formattedTimeRemainingEn;

  const filteredMissingFields =
    selectedStepFilter === 'ALL'
      ? missingFields
      : missingFields.filter((f) => f.stepKey === selectedStepFilter);

  return (
    <div
      id="wizard-progress-container"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-all"
    >
      {/* Top Header: Title, Status Pill, Field Count & Estimated Time Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
            <ListChecks className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.formCompletion}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {progress.completedFields} {t.fieldsCompleted} {progress.totalFields}
            </p>
          </div>
        </div>

        {/* Center/Right: Estimated Time Remaining Indicator Pill & Percentage */}
        <div className="flex items-center flex-wrap sm:flex-nowrap justify-between lg:justify-end gap-3 shrink-0">
          {/* Progress-Based Estimated Time Remaining Badge */}
          <div
            id="wizard-time-remaining-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-colors ${
              progress.percentage === 100
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                : progress.estimatedSecondsRemaining < 60
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/80'
                : progress.estimatedMinutesRemaining <= 3
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80'
            }`}
            title={t.estimatedTimeRemaining}
          >
            {progress.percentage === 100 ? (
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0 animate-pulse" />
            )}
            <div className="flex flex-col text-left rtl:text-right">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-tight">
                {t.estimatedTimeBadge}
              </span>
              <span className="font-bold leading-tight">{timeRemainingLabel}</span>
            </div>
          </div>

          {/* Missing Fields Toggle Button */}
          {missingFields.length > 0 ? (
            <button
              type="button"
              id="wizard-toggle-remaining-fields-btn"
              onClick={() => setShowMissingModal(!showMissingModal)}
              className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>
                {language === 'ar'
                  ? `${missingFields.length} حقول متبقية`
                  : `${missingFields.length} remaining`}
              </span>
              {showMissingModal ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.allCoreFieldsFilled}</span>
            </span>
          )}

          {/* Big Percentage Number */}
          <div className="flex items-baseline gap-1 pl-1 rtl:pl-0 rtl:pr-1">
            <span
              className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${statusConfig.textColor}`}
            >
              {progress.percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div
        className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/80 dark:border-slate-700/50"
        role="progressbar"
        aria-valuenow={progress.percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.formCompletion}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${statusConfig.barColor} transition-all duration-500 ease-out shadow-xs`}
          style={{ width: `${Math.max(progress.percentage, 2)}%` }}
        />
      </div>

      {/* Step Time Progress Bar Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
        {progress.stepSummariesList.map((step) => {
          const isCurrent = currentStep === step.stepKey;
          return (
            <button
              key={step.stepKey}
              type="button"
              onClick={() => onNavigateStep && onNavigateStep(step.stepKey)}
              className={`flex flex-col text-left rtl:text-right p-2 rounded-xl transition-all border text-xs cursor-pointer ${
                isCurrent
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 ring-1 ring-blue-400/40'
                  : step.isCompleted
                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                  : 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800 hover:bg-blue-50/40'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                  {step.stepNumber}. {language === 'ar' ? step.stepNameAr : step.stepNameEn}
                </span>
                {step.isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {step.percentage}%
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>
                  {step.isCompleted
                    ? t.stepDone
                    : language === 'ar'
                    ? step.formattedTimeRemainingAr
                    : step.formattedTimeRemainingEn}
                </span>
                <span className="font-mono text-[9px]">
                  {step.completedFields}/{step.totalFields}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Expandable Remaining Fields Breakdown & Step Navigation */}
      {showMissingModal && missingFields.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.missingRequiredFields}
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {missingFields.length} / {progress.totalFields}
              </span>
            </div>

            {/* Filter by Step */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedStepFilter('ALL')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  selectedStepFilter === 'ALL'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'All Steps'} ({missingFields.length})
              </button>
              {progress.stepSummariesList
                .filter((s) => s.missingFields > 0)
                .map((step) => (
                  <button
                    key={step.stepKey}
                    type="button"
                    onClick={() => setSelectedStepFilter(step.stepKey)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      selectedStepFilter === step.stepKey
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {step.stepNumber}. {language === 'ar' ? step.stepNameAr : step.stepNameEn} (
                    {step.missingFields})
                  </button>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filteredMissingFields.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => {
                  if (onNavigateStep) {
                    onNavigateStep(field.stepKey);
                    setShowMissingModal(false);
                  }
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 text-left rtl:text-right group transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 group-hover:scale-125 transition-transform" />
                  <div className="overflow-hidden">
                    <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium block truncate">
                      {language === 'ar' ? field.nameAr : field.nameEn}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      {language === 'ar'
                        ? `~${field.estimatedSeconds} ثانية`
                        : `~${field.estimatedSeconds}s est.`}
                    </span>
                  </div>
                </div>
                {language === 'ar' ? (
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

