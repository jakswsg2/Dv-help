import React from 'react';
import { Applicant, Language } from '../types';
import { translations } from '../translations';
import {
  GraduationCap,
  Briefcase,
  Globe2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface StepEligibilityProps {
  applicant: Applicant;
  onChange: (updated: Partial<Applicant>) => void;
  language: Language;
}

export const StepEligibility: React.FC<StepEligibilityProps> = ({
  applicant,
  onChange,
  language,
}) => {
  const t = translations[language];
  const e = t.eligibility;

  // Determine eligibility status
  const hasQualifyingEducation =
    applicant.highestEducation !== 'PRIMARY_ONLY' &&
    applicant.highestEducation !== 'HIGH_SCHOOL_NO_DEGREE';

  const isEligible = hasQualifyingEducation || applicant.qualifyingWorkExperience;

  return (
    <div className="space-y-8">
      {/* Intro Box */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          <span>{e.title}</span>
        </h2>
        <p className="text-xs sm:text-sm text-blue-800 mt-1 leading-relaxed">
          {e.ruleIntro}
        </p>
      </div>

      {/* Two Pillars of Eligibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Country */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Globe2 className="w-5 h-5 text-blue-600" />
            <h3>{e.rule1Title}</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{e.rule1Desc}</p>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">
                {applicant.isEligibleBasedOnBirthCountry
                  ? `دولة الميلاد المعتمدة: ${applicant.birthCountry || 'مصر'}`
                  : `الدولة البديلة: ${applicant.alternateCountryOfEligibility}`}
              </span>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                تعد من الدول المؤهلة قانونياً لبرنامج تأشيرة التنوع.
              </p>
            </div>
          </div>
        </div>

        {/* Pillar 2: Education or Work Experience */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <h3>{e.rule2Title}</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{e.rule2Desc}</p>

          <div className="space-y-3 pt-1">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
              <span className="font-bold text-slate-700 block">
                المؤهل التعليمي المسجل:
              </span>
              <span className="font-semibold text-blue-800">
                {t.educationOptions[applicant.highestEducation]}
              </span>
              {hasQualifyingEducation ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px] mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  مستوفٍ لشرط التعليم المطلوب (شهادة ثانوية فما فوق)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-[11px] mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  غير كافٍ بمفرده — يلزم إثبات خبرة عمل مؤهلة
                </span>
              )}
            </div>

            {/* Work Experience Toggle for those with vocational or no high school degree */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applicant.qualifyingWorkExperience}
                  onChange={(e) =>
                    onChange({ qualifyingWorkExperience: e.target.checked })
                  }
                  className="rounded text-blue-600 mt-0.5"
                />
                <span className="font-bold text-slate-800">
                  لدي سنتان من الخبرة المهنية المؤهلة خلال آخر 5 سنوات (O*NET Job Zone 4/5)
                </span>
              </label>

              {applicant.qualifyingWorkExperience && (
                <div className="pt-2 space-y-2">
                  <input
                    type="text"
                    value={applicant.occupationTitle}
                    onChange={(e) => onChange({ occupationTitle: e.target.value })}
                    placeholder="المسمى المهني الوظيفي (e.g. Mechanical Engineer / Software Developer)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  />
                  <a
                    href="https://www.onetonline.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 underline"
                  >
                    <span>فحص المهنة في قاعدة بيانات وزارة العمل الأمريكية O*NET</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Evaluation Card */}
      <div
        className={`p-5 rounded-xl border flex items-center justify-between gap-4 ${
          isEligible
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-3">
          {isEligible ? (
            <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-7 h-7 text-amber-600 shrink-0" />
          )}
          <div>
            <h3 className="font-bold text-sm">
              {isEligible ? e.checkStatusEligible : e.checkStatusNeedsReview}
            </h3>
            <p className="text-xs opacity-90 mt-0.5">
              {isEligible
                ? 'البيانات المدخلة تستوفي المعايير القانونية الصادرة عن مكتب الشؤون القنصلية الأمريكي.'
                : 'يرجى التأكد من الحصول على شهادة الثانوية العامة أو مهنة مؤهلة لتفادي رفض التأشيرة.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
