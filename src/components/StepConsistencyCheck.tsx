import React from 'react';
import { Applicant, Language } from '../types';
import { translations } from '../translations';
import { validateApplicantConsistency } from '../utils/consistencyValidator';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface StepConsistencyCheckProps {
  applicant: Applicant;
  language: Language;
  onNavigateToStep: (stepKey: string) => void;
}

export const StepConsistencyCheck: React.FC<StepConsistencyCheckProps> = ({
  applicant,
  language,
  onNavigateToStep,
}) => {
  const t = translations[language];
  const c = t.consistency;

  const issues = validateApplicantConsistency(applicant);
  const critical = issues.filter((i) => i.severity === 'CRITICAL');
  const warnings = issues.filter((i) => i.severity === 'WARNING');

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-blue-600" />
          <span>{c.title}</span>
        </h2>
        <p className="text-xs sm:text-sm text-blue-800 mt-1 leading-relaxed">
          {c.subtitle}
        </p>
      </div>

      {/* Zero Issues Success State */}
      {issues.length === 0 ? (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-emerald-950">{c.noIssues}</h3>
            <p className="text-xs sm:text-sm text-emerald-800 max-w-lg mx-auto leading-relaxed">
              {language === 'ar'
                ? 'تم تدقيق كافة الحقول والأسماء وتواريخ الميلاد والصور وتطابق شريط الجواز، ملف المتقدم جاهز تماماً للانتقال إلى وضع الإدخال الرسمي في الموقع الحكومي.'
                : 'All fields, passport spelling, birth dates, derivatives, and photo guidelines have passed automated cross-checks. You are ready for official submission prep.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToStep('OFFICIAL_PREP')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-xs transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {language === 'ar'
                ? 'الانتقال إلى وضع الإدخال الرسمي والخزنة الآمنة'
                : 'Proceed to Official Submission Prep & Vault'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Critical Issues */}
          {critical.length > 0 && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <h3>{c.criticalFound} ({critical.length})</h3>
              </div>

              <div className="space-y-3 pt-1">
                {critical.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 bg-white border border-rose-200 rounded-lg shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-900">
                        {issue.title}
                      </span>
                      <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                        حرج / Critical
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {issue.description}
                    </p>
                    <p className="text-xs text-emerald-800 font-medium pt-1">
                      💡 <strong>الإجراء المقترح:</strong> {issue.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <h3>{c.warningsFound} ({warnings.length})</h3>
              </div>

              <div className="space-y-3 pt-1">
                {warnings.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 bg-white border border-amber-200 rounded-lg shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-950">
                        {issue.title}
                      </span>
                      <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        تنبيه / Warning
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {issue.description}
                    </p>
                    <p className="text-xs text-blue-800 font-medium pt-1">
                      💡 <strong>توصية:</strong> {issue.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
