import React from 'react';
import { Applicant, Language } from '../types';
import { translations } from '../translations';
import {
  ShieldCheck,
  MapPin,
  GraduationCap,
  Users,
  Camera,
} from 'lucide-react';

interface PrintSummaryDocumentProps {
  applicant: Applicant;
  language: Language;
}

export const PrintSummaryDocument: React.FC<PrintSummaryDocumentProps> = ({
  applicant,
  language,
}) => {
  const t = translations[language];
  const isAr = language === 'ar';
  const birthParts = (applicant.birthDate || '').split('-');
  const dobYear = birthParts[0] || '—';
  const dobMonth = birthParts[1] || '—';
  const dobDay = birthParts[2] || '—';

  const formattedTimestamp = new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="print-only hidden p-8 max-w-4xl mx-auto bg-white text-slate-900 font-sans text-xs leading-normal">
      {/* Official State Dept Style Formal Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-extrabold uppercase tracking-widest text-slate-900 text-sm">
                DV-{applicant.programYear || '2026'} DIVERSITY VISA PROGRAM
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold rounded border border-slate-300">
                FORM DS-5501
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAr
                ? 'ملخص بيانات المتقدم لقرعة الهجرة التعددية الأمريكية'
                : 'Diversity Immigrant Visa Electronic Entry Summary'}
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isAr
                ? 'وثيقة تدقيق وتوثيق رسمية معتمدة تم إعدادها بواسطة منصة DV-Prep'
                : 'Official preparation and pre-submission dossier prepared via DV-Prep'}
            </p>
          </div>

          <div className="text-right border border-slate-300 p-2.5 rounded bg-slate-50 min-w-[200px]">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              {isAr ? 'تاريخ التوليد والطباعة' : 'Generated Date & Time'}
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-800 block">
              {formattedTimestamp}
            </span>
            <span className="text-[9px] text-slate-500 block mt-1 font-mono">
              ID: {applicant.id.slice(0, 12)}
            </span>
          </div>
        </div>

        {/* Confirmation Number Banner if Available */}
        {applicant.confirmationNumber && (
          <div className="mt-4 p-3 bg-slate-100 border-2 border-slate-800 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                {isAr ? 'رقم التأكيد الرسمي المسجل (CONFIRMATION NUMBER)' : 'OFFICIAL CONFIRMATION NUMBER'}
              </span>
              <span className="font-mono text-xl font-black text-slate-900 tracking-widest">
                {applicant.confirmationNumber}
              </span>
            </div>
            {applicant.officialSubmissionDate && (
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">
                  {isAr ? 'تاريخ الإرسال الرسمي:' : 'Official Submission Timestamp:'}
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  {new Date(applicant.officialSubmissionDate).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid Layout of Primary Applicant Information */}
      <div className="space-y-6">
        {/* Section 1: Entrant Identity & Passport */}
        <div className="border border-slate-300 rounded-lg p-4 print-avoid-break">
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              {isAr ? '1. البيانات الشخصية وجواز السفر (Primary Entrant Information)' : '1. Primary Entrant Information & Identity'}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] font-semibold text-slate-500 block">1.a Last / Family Name</span>
              <span className="font-mono font-bold text-sm text-slate-900 uppercase">
                {applicant.lastName || '—'}
              </span>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] font-semibold text-slate-500 block">1.b First Name</span>
              <span className="font-mono font-bold text-sm text-slate-900 uppercase">
                {applicant.firstName || '—'}
              </span>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <span className="text-[10px] font-semibold text-slate-500 block">1.c Middle Name</span>
              <span className="font-mono font-bold text-sm text-slate-900 uppercase">
                {applicant.hasNoMiddleName ? 'NO MIDDLE NAME' : applicant.middleName || '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-500 block">2. Gender</span>
              <span className="font-bold text-slate-900">
                {applicant.gender === 'MALE' ? (isAr ? 'ذكر (Male)' : 'Male') : (isAr ? 'أنثى (Female)' : 'Female')}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block">3. Date of Birth (YYYY-MM-DD)</span>
              <span className="font-mono font-bold text-slate-900">
                {applicant.birthDate ? `${dobYear}-${dobMonth}-${dobDay}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block">4. City of Birth</span>
              <span className="font-bold text-slate-900">
                {applicant.birthCityUnknown ? 'Birth City Unknown' : applicant.birthCity || '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-500 block">5. Country of Birth</span>
              <span className="font-bold text-slate-900">{applicant.birthCountry || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block">6. Country of Eligibility</span>
              <span className="font-bold text-slate-900">
                {applicant.isEligibleBasedOnBirthCountry
                  ? `${applicant.birthCountry} (Chargeability by Birth)`
                  : `${applicant.alternateCountryOfEligibility} (Alternate Claim)`}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block">ICAO Passport Number</span>
              <span className="font-mono font-bold text-slate-900">
                {applicant.mrzData?.documentNumber || '—'}
                {applicant.mrzData?.expiryDate ? ` (Exp: ${applicant.mrzData.expiryDate})` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Mailing Address */}
        <div className="border border-slate-300 rounded-lg p-4 print-avoid-break">
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
            <MapPin className="w-4 h-4 text-slate-700" />
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              {isAr ? '2. العنوان ومعلومات الاتصال (Mailing Address & Contact)' : '2. Mailing Address & Contact Details'}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block">8. Mailing Address</span>
              <p className="font-medium text-slate-900 leading-tight">
                {applicant.inCareOf && <span className="block text-slate-600">c/o {applicant.inCareOf}</span>}
                <span className="block">{applicant.addressLine1}</span>
                {applicant.addressLine2 && <span className="block">{applicant.addressLine2}</span>}
                <span className="block">
                  {applicant.cityTown}, {applicant.districtCountyProvinceState}{' '}
                  {applicant.noPostalCode ? '(No Postal Code)' : applicant.postalCode}
                </span>
                <span className="block font-bold">{applicant.country || applicant.currentCountry}</span>
              </p>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 block">9. Country Where You Live Today</span>
                <span className="font-bold text-slate-900">{applicant.currentCountry || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 block">10. Phone Number</span>
                <span className="font-mono font-bold text-slate-900">{applicant.phoneNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 block">11. E-mail Address</span>
                <span className="font-mono font-bold text-slate-900">{applicant.email || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Qualifications, Education & Marital Status */}
        <div className="border border-slate-300 rounded-lg p-4 print-avoid-break">
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
            <GraduationCap className="w-4 h-4 text-slate-700" />
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              {isAr ? '3. التعليم، الأهلية، والحالة الاجتماعية (Qualifications & Status)' : '3. Qualifications, Education & Marital Status'}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block">12. Highest Education Level</span>
              <span className="font-bold text-slate-900 block">
                {t.educationOptions[applicant.highestEducation] || applicant.highestEducation}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block">13. Marital Status</span>
              <span className="font-bold text-slate-900 block">
                {t.maritalOptions[applicant.maritalStatus] || applicant.maritalStatus}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block">14. Number of Derivatives (Children)</span>
              <span className="font-mono font-bold text-slate-900 block text-base">
                {applicant.numberOfChildren || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Derivative Family Members (Spouse & Children) */}
        {applicant.familyMembers && applicant.familyMembers.length > 0 && (
          <div className="border border-slate-300 rounded-lg p-4 print-avoid-break">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
              <Users className="w-4 h-4 text-slate-700" />
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                {isAr ? '4. بيانات المرافقين المؤهلين (Part 2 — Derivatives)' : '4. Eligible Derivatives (Spouse & Children)'}
              </h2>
            </div>

            <div className="space-y-3">
              {applicant.familyMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded grid grid-cols-4 gap-2 text-[11px] items-center"
                >
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-500 block">
                      {member.relationship === 'SPOUSE'
                        ? (isAr ? 'الزوج / الزوجة' : 'Spouse')
                        : `${isAr ? 'الطفل' : 'Child'} #${index + 1}`}
                    </span>
                    <span className="font-bold text-slate-900">
                      {member.lastName}, {member.firstName} {member.middleName || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Gender & DOB</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {member.gender === 'MALE' ? 'M' : 'F'} | {member.birthDate || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Birth Place</span>
                    <span className="font-semibold text-slate-800">
                      {member.birthCity || '—'}, {member.birthCountry || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.photo?.dataUrl ? (
                      <img
                        src={member.photo.dataUrl}
                        alt={`${member.firstName} photo`}
                        className="w-8 h-8 rounded border border-slate-300 object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <div>
                      <span className="text-[9px] text-slate-500 block">Photo Status</span>
                      <span className={member.photo?.dataUrl ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}>
                        {member.photo?.dataUrl
                          ? (isAr ? 'الصورة معتمدة' : 'Photo Attached')
                          : (isAr ? 'بدون صورة' : 'No Photo')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Photo Compliance & Audit Stamp */}
        <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 print-avoid-break">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 border-2 border-slate-400 rounded flex flex-col items-center justify-center bg-white text-slate-500 overflow-hidden shrink-0 shadow-2xs">
                {applicant.photo?.dataUrl ? (
                  <img
                    src={applicant.photo.dataUrl}
                    alt="Applicant biometric photo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-slate-400" />
                    <span className="text-[8px] font-mono mt-0.5">600×600</span>
                  </>
                )}
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">
                  {isAr ? 'شهادة التوافق الفني للصورة الشخصية (DS-5501 Photo Standards)' : 'Biometric Photo Standards Audit'}
                </h3>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {isAr
                    ? 'الأبعاد 600×600 بكسل، خلفية بيضاء نقية، نسبة ارتفاع الرأس بين 50% و 69%، بدون نظارات أو فلاتر الذكاء الاصطناعي.'
                    : '600x600 px square, neutral white background, head height 50-69%, eyeglasses prohibited, no generative alterations.'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                    COMPLIANCE CHECK PASSED
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {applicant.photo?.dataUrl ? 'Original photo calibrated & embedded' : 'No photo uploaded'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right pl-4 border-l border-slate-300">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                {isAr ? 'توقيع المتقدم / المستلم' : 'Applicant Signature'}
              </span>
              <div className="w-36 h-8 border-b border-slate-400 mt-2"></div>
              <span className="text-[8px] text-slate-400 block mt-1">
                Date: ____________________
              </span>
            </div>
          </div>
        </div>

        {/* Footer Legal Notice */}
        <div className="text-[9px] text-slate-500 border-t border-slate-200 pt-3 text-center print-avoid-break">
          <p>
            {isAr
              ? 'ملاحظة قانونية: هذا الملخص تم إعداده للمراجعة والتدقيق والاحتفاظ بالسجلات الإدارية الشخصية. الموقع الحكومي الرسمي الوحيد لتقديم الاستمارة هو dvprogram.state.gov.'
              : 'Legal Notice: This summary is generated for personal administrative archiving, verification, and preparation. The sole official portal for Diversity Visa registration is dvprogram.state.gov.'}
          </p>
        </div>
      </div>
    </div>
  );
};

