import React from 'react';
import { Applicant, Language } from '../types';
import { translations } from '../translations';
import { CheckCircle2, Globe, AlertTriangle } from 'lucide-react';

interface OfficialRequirementsPrintDocumentProps {
  applicant: Applicant;
  language: Language;
}

export const OfficialRequirementsPrintDocument: React.FC<OfficialRequirementsPrintDocumentProps> = ({
  applicant,
  language,
}) => {
  const t = translations[language];
  const isAr = language === 'ar';

  const formattedTimestamp = new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="print-requirements-only hidden p-8 max-w-4xl mx-auto bg-white text-slate-900 font-sans text-xs leading-normal">
      {/* Official Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-extrabold uppercase tracking-widest text-slate-900 text-sm">
                DV-{applicant.programYear || '2026'} DIVERSITY VISA PROGRAM
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold rounded border border-slate-300">
                OFFICIAL SUBMISSION REQUIREMENTS & CHECKLIST
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAr
                ? 'قائمة متطلبات التقديم الرسمي لبرنامج تأشيرة التنوع (U.S. DOS Submission Checklist)'
                : 'U.S. Department of State Official Submission Requirements & Checklist'}
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isAr
                ? 'وثيقة التدقيق والمراجعة الرسمية قبل الإرسال عبر travel.state.gov'
                : 'Pre-submission verification checklist and statutory requirements dossier prepared via DV-Prep'}
            </p>
          </div>

          <div className="text-right border border-slate-300 p-2.5 rounded bg-slate-50 min-w-[200px]">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              {isAr ? 'تاريخ التوليد والطباعة' : 'Generated Timestamp'}
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-800 block">
              {formattedTimestamp}
            </span>
            <span className="text-[9px] text-slate-500 block mt-1 font-mono">
              Entrant: {applicant.firstName} {applicant.lastName} (ID: {applicant.id.slice(0, 8)})
            </span>
          </div>
        </div>
      </div>

      {/* Official Portal Notice */}
      <div className="mb-6 p-4 bg-slate-50 border border-slate-300 rounded-lg print-avoid-break">
        <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
          <Globe className="w-4 h-4 text-blue-700" />
          <span>{isAr ? 'الموقع الرسمي الوحيد المعتمد للإرسال' : 'Official Submission Portal & Domain'}</span>
        </div>
        <p className="text-slate-700 leading-relaxed text-[11px]">
          {isAr
            ? 'يتم تقديم طلبات برنامج تأشيرة التنوع (Diversity Visa) حصرياً عبر الموقع الحكومي الرسمي لوزارة الخارجية الأمريكية: travel.state.gov. تأكد دائماً من أن عنوان المتصفح ينتهي بنطاق .gov حصراً قبل إدخال بياناتك أو رفع صورك.'
            : 'All entries for the Diversity Immigrant Visa Program must be submitted exclusively through the official U.S. Department of State website at travel.state.gov. Always verify the browser address bar ends strictly in .gov.'}
        </p>
      </div>

      {/* Core Requirements Checklist */}
      <div className="space-y-4 print-avoid-break">
        <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">
          {isAr ? 'قائمة التدقيق الإلزامي لمتطلبات وزارة الخارجية' : 'Mandatory U.S. DOS Submission Requirements Checklist'}
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {/* Requirement 1 */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-slate-950 block">
                {isAr ? '1. الأهلية حسب دولة الميلاد (Chargeability)' : '1. Native Country of Eligibility (Chargeability)'}
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isAr
                  ? `المتقدم مولود في (${applicant.birthCountry || '—'}) وهي دولة مؤهلة ضمن برنامج تأشيرة التنوع للعام الحالي.`
                  : `Entrant is native of ${applicant.birthCountry || '—'}, which is eligible for the current program year diversity visa allocation.`}
              </p>
            </div>
          </div>

          {/* Requirement 2 */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-slate-950 block">
                {isAr ? '2. مؤهل التعليم أو الخبرة المهنية (Education / Work Experience)' : '2. Education or Qualifying Work Experience'}
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isAr
                  ? `المستوى التعليمي المسجل: ${t.educationOptions[applicant.highestEducation] || applicant.highestEducation}. يشترط إتمام 12 سنة من التعليم الابتدائي والثانوي أو خبرة عمل لا تقل عن سنتين في مهنة تصنف ضمن Job Zone 4 أو 5.`
                  : `Registered Education Level: ${t.educationOptions[applicant.highestEducation] || applicant.highestEducation}. Requires completion of a 12-year course of formal education or 2 years of qualifying work experience within the past 5 years.`}
              </p>
            </div>
          </div>

          {/* Requirement 3 */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-slate-950 block">
                {isAr ? '3. مواصفات الصورة الرقمية البيومترية (600x600 بكسل)' : '3. Biometric Digital Photograph Compliance (600x600 px)'}
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isAr
                  ? 'الصورة مربعة (600×600 بكسل)، بحجم أقل من 240 كيلوبايت، بخلفية بيضاء أو فاتحة محايدة، حديثة (خلال 6 أشهر)، بدون نظارات، وبإضاءة متوازنة.'
                  : 'Square aspect ratio (600x600 px), under 240 KB, neutral white/off-white background, taken within the last 6 months, no eyeglasses, and even facial illumination.'}
              </p>
            </div>
          </div>

          {/* Requirement 4 */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-slate-950 block">
                {isAr ? '4. بيانات جواز السفر الساري (ICAO Doc 9303 MRZ)' : '4. Valid Machine-Readable Passport Details'}
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isAr
                  ? `رقم الوثيقة: ${applicant.mrzData?.documentNumber || 'مسجل'} مع صلاحية سارية وتطابق تام للأسماء وتواريخ الميلاد والانتهاء.`
                  : `Document Number: ${applicant.mrzData?.documentNumber || 'Recorded'} with valid expiration window and exact conformance with biographical entries.`}
              </p>
            </div>
          </div>

          {/* Requirement 5 */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-slate-950 block">
                {isAr ? '5. إدراج كافة المرافقين المستوفين للشروط (Spouse & All Children)' : '5. Inclusion of All Eligible Spouse & Children'}
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isAr
                  ? `الحالة الاجتماعية: ${t.maritalOptions[applicant.maritalStatus] || applicant.maritalStatus} مع عدد أبناء مسجلين: ${applicant.numberOfChildren || 0}. تحذير صارم: عدم إدراج زوج/زوجة شرعي أو أي من الأبناء المؤهلين يؤدي إلى الإلغاء الفوري للطلب.`
                  : `Marital Status: ${t.maritalOptions[applicant.maritalStatus] || applicant.maritalStatus} with ${applicant.numberOfChildren || 0} children. Warning: Failure to list your eligible spouse or children results in immediate disqualification.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Warning Footer */}
      <div className="mt-8 p-4 bg-amber-50 border border-amber-300 rounded-lg print-avoid-break">
        <div className="flex items-center gap-2 mb-1 font-bold text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <span>{isAr ? 'تحذير هام بعد الإرسال (Confirmation Number Safekeeping)' : 'Post-Submission Safeguard Notice'}</span>
        </div>
        <p className="text-[11px] text-amber-900 leading-relaxed">
          {isAr
            ? 'بعد إتمام الإرسال الناجح على موقع travel.state.gov، سيظهر لك رقم تأكيد مكون من 16 خانة (مثل 20261O... الخ). احتفظ بهذا الرقم في مكان آمن ولا تفقده أبداً؛ فهو الوسيلة الوحيدة للتحقق من نتيجة الفوز اعتباراً من شهر مايو القادم.'
            : 'Upon successful submission on travel.state.gov, you will receive a unique 16-character confirmation number. Retain this number securely; it is the sole credential required to check your selection status starting next May.'}
        </p>
      </div>
    </div>
  );
};

export default OfficialRequirementsPrintDocument;
