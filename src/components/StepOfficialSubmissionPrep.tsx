import React, { useState } from 'react';
import { Applicant, Language } from '../types';
import { translations } from '../translations';
import { PrintSummaryDocument } from './PrintSummaryDocument';
import { OfficialRequirementsPrintDocument } from './OfficialRequirementsPrintDocument';
import {
  Send,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
  Printer,
  Download,
  Key,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

interface StepOfficialSubmissionPrepProps {
  applicant: Applicant;
  onChange: (updated: Partial<Applicant>) => void;
  language: Language;
}

export const StepOfficialSubmissionPrep: React.FC<StepOfficialSubmissionPrepProps> = ({
  applicant,
  onChange,
  language,
}) => {
  const t = translations[language];
  const o = t.officialPrep;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmationInput, setConfirmationInput] = useState(
    applicant.confirmationNumber || ''
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const copyToClipboard = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveConfirmation = () => {
    const formatted = confirmationInput.trim().toUpperCase();
    onChange({
      confirmationNumber: formatted,
      officialSubmissionDate:
        applicant.officialSubmissionDate || new Date().toISOString(),
      status: formatted ? 'SUBMITTED' : applicant.status,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const [printDropdownOpen, setPrintDropdownOpen] = useState(false);

  const handlePrint = (mode: 'profile' | 'requirements') => {
    setPrintDropdownOpen(false);
    if (mode === 'profile') {
      document.body.classList.add('print-profile-mode');
      document.body.classList.remove('print-requirements-mode');
    } else {
      document.body.classList.add('print-requirements-mode');
      document.body.classList.remove('print-profile-mode');
    }

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('print-profile-mode', 'print-requirements-mode');
      }, 500);
    }, 100);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(applicant, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DV_${applicant.programYear}_${applicant.lastName || 'RECORD'}_VAULT.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Replicate exact official State Dept Form DS-5501 Part 1 Fields
  const birthParts = (applicant.birthDate || '').split('-');
  const dobYear = birthParts[0] || '';
  const dobMonth = birthParts[1] || '';
  const dobDay = birthParts[2] || '';

  const officialFields = [
    {
      id: 'field-1a',
      num: '1.a',
      label: 'Last / Family Name',
      value: applicant.lastName || '—',
    },
    {
      id: 'field-1b',
      num: '1.b',
      label: 'First Name',
      value: applicant.firstName || '—',
    },
    {
      id: 'field-1c',
      num: '1.c',
      label: 'Middle Name',
      value: applicant.hasNoMiddleName ? 'No Middle Name' : applicant.middleName || '—',
    },
    {
      id: 'field-2',
      num: '2',
      label: 'Gender',
      value: applicant.gender === 'MALE' ? 'Male' : 'Female',
    },
    {
      id: 'field-3a',
      num: '3.a',
      label: 'Birth Month',
      value: dobMonth,
    },
    {
      id: 'field-3b',
      num: '3.b',
      label: 'Birth Day',
      value: dobDay,
    },
    {
      id: 'field-3c',
      num: '3.c',
      label: 'Birth Year',
      value: dobYear,
    },
    {
      id: 'field-4',
      num: '4',
      label: 'City Where You Were Born',
      value: applicant.birthCityUnknown ? 'Birth City Unknown' : applicant.birthCity || '—',
    },
    {
      id: 'field-5',
      num: '5',
      label: 'Country Where You Were Born',
      value: applicant.birthCountry || '—',
    },
    {
      id: 'field-6',
      num: '6',
      label: 'Country of Eligibility for the DV Program',
      value: applicant.isEligibleBasedOnBirthCountry
        ? applicant.birthCountry
        : applicant.alternateCountryOfEligibility || '—',
    },
    {
      id: 'field-8a',
      num: '8.a',
      label: 'In Care Of (Optional)',
      value: applicant.inCareOf || 'N/A',
    },
    {
      id: 'field-8b',
      num: '8.b',
      label: 'Address Line 1',
      value: applicant.addressLine1 || '—',
    },
    {
      id: 'field-8c',
      num: '8.c',
      label: 'Address Line 2',
      value: applicant.addressLine2 || 'N/A',
    },
    {
      id: 'field-8d',
      num: '8.d',
      label: 'City / Town',
      value: applicant.cityTown || '—',
    },
    {
      id: 'field-8e',
      num: '8.e',
      label: 'District / County / Province / State',
      value: applicant.districtCountyProvinceState || '—',
    },
    {
      id: 'field-8f',
      num: '8.f',
      label: 'Postal Code / ZIP Code',
      value: applicant.noPostalCode ? 'No Postal Code' : applicant.postalCode || '—',
    },
    {
      id: 'field-8g',
      num: '8.g',
      label: 'Country',
      value: applicant.country || applicant.currentCountry || '—',
    },
    {
      id: 'field-9',
      num: '9',
      label: 'Country Where You Live Today',
      value: applicant.currentCountry || '—',
    },
    {
      id: 'field-10',
      num: '10',
      label: 'Phone Number (Optional)',
      value: applicant.phoneNumber || 'N/A',
    },
    {
      id: 'field-11',
      num: '11',
      label: 'E-mail Address',
      value: applicant.email || '—',
    },
    {
      id: 'field-12',
      num: '12',
      label: 'Highest Level of Education Achieved',
      value: t.educationOptions[applicant.highestEducation] || '—',
    },
    {
      id: 'field-13',
      num: '13',
      label: 'Current Marital Status',
      value: t.maritalOptions[applicant.maritalStatus] || '—',
    },
    {
      id: 'field-14',
      num: '14',
      label: 'Number of Children',
      value: String(applicant.numberOfChildren || 0),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner with Direct Portal Link */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-blue-300">
              <Send className="w-5 h-5" />
              <h2 className="text-base sm:text-lg font-bold text-white">
                {o.title}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {o.subtitle}
            </p>
          </div>

          <div className="relative flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <button
                id="top-print-summary-btn"
                type="button"
                onClick={() => setPrintDropdownOpen(!printDropdownOpen)}
                title={o.printSummary}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 shadow-xs transition-all shrink-0 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-300" />
                <span>{o.printSummary}</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {printDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 text-slate-900 dark:text-white">
                  <button
                    type="button"
                    onClick={() => handlePrint('profile')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="block font-bold">{o.printFullProfile}</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">Form DS-5501 full applicant dossier</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint('requirements')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="block font-bold">{o.printOfficialRequirements}</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">Official DOS submission checklist</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <a
              id="top-official-portal-link"
              href="https://dvprogram.state.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
            >
              <span>{o.officialPortalLink}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-blue-950/70 border border-blue-800/80 px-3.5 py-2 rounded-lg text-xs text-blue-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{o.portalWarning}</span>
        </div>
      </div>

      {/* Summary Dossier & Print Action Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Printer className="w-5 h-5 text-blue-600" />
              <h3>
                {language === 'ar'
                  ? 'ملخص بيانات الطلب الرسمي والطباعة (Official Application Dossier)'
                  : 'Official Application Summary & Print Dossier'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'ar'
                ? 'قم بتوليد وطباعة وثيقة PDF رسمية منسقة بنمط استمارة DS-5501 تحتوي على كافة بيانات المتقدم، المرافقين، وعنوان المراسلة مع معاينة التدقيق البيومتري.'
                : 'Generate a clean, printer-friendly Form DS-5501 summary containing all entrant identity, eligibility, address, photo audit, and derivative records.'}
            </p>
          </div>

          <div className="relative flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <button
                id="official-prep-print-summary-btn"
                type="button"
                onClick={() => setPrintDropdownOpen(!printDropdownOpen)}
                title={o.printSummary}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{o.printSummary}</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {printDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 text-slate-900 dark:text-white">
                  <button
                    type="button"
                    onClick={() => handlePrint('profile')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="block font-bold">{o.printFullProfile}</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">Form DS-5501 full applicant dossier</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint('requirements')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="block font-bold">{o.printOfficialRequirements}</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">Official DOS submission checklist</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              id="official-prep-export-json-btn"
              type="button"
              onClick={handleExportJson}
              title={o.copyAllJson}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>{o.copyAllJson}</span>
            </button>
          </div>
        </div>

        {/* Quick dossier audit badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">
              {language === 'ar' ? 'المتقدم الرئيسي' : 'Primary Entrant'}
            </span>
            <span className="font-bold text-slate-900 truncate block">
              {applicant.lastName ? `${applicant.lastName}, ${applicant.firstName}` : '—'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">
              {language === 'ar' ? 'المرافقون المسجلون' : 'Derivatives'}
            </span>
            <span className="font-bold text-slate-900 block">
              {applicant.familyMembers?.length || 0}{' '}
              {language === 'ar' ? 'أفراد' : 'Members'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">
              {language === 'ar' ? 'الصورة البيومترية' : 'Photo Check'}
            </span>
            <span className={`font-bold block ${applicant.photo?.dataUrl ? 'text-emerald-700' : 'text-amber-700'}`}>
              {applicant.photo?.dataUrl
                ? (language === 'ar' ? 'معتمدة 600×600' : 'Valid 600×600')
                : (language === 'ar' ? 'غير مرفوعة' : 'Pending')}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">
              {language === 'ar' ? 'دولة الأهلية' : 'Eligibility'}
            </span>
            <span className="font-bold text-slate-900 truncate block">
              {applicant.isEligibleBasedOnBirthCountry
                ? applicant.birthCountry || '—'
                : applicant.alternateCountryOfEligibility || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Number Safe Vault */}
      <div className="bg-white border-2 border-emerald-300 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h3>{o.confirmationVaultTitle}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrint('profile')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>{o.printSummary}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrint('requirements')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{o.printOfficialRequirements}</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{o.copyAllJson}</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {o.confirmationVaultDesc}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {o.confirmationNumberInput}
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value.toUpperCase())}
                placeholder="e.g. 20261O0DZWY3DOV9"
                maxLength={16}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold tracking-widest text-slate-900 uppercase focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-4 flex items-end">
            <button
              id="save-confirmation-vault-btn"
              type="button"
              onClick={handleSaveConfirmation}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تم الحفظ في الخزنة!' : 'Saved to Vault!'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{o.saveConfirmationBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {applicant.confirmationNumber && (
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-slate-500 block">
                {language === 'ar' ? 'رقم التأكيد المحفوظ:' : 'Saved Confirmation Number:'}
              </span>
              <span className="font-mono text-lg font-extrabold text-emerald-900 tracking-wider">
                {applicant.confirmationNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">{o.submissionDate}:</span>
              <span className="font-mono text-xs text-slate-700 font-semibold">
                {applicant.officialSubmissionDate
                  ? new Date(applicant.officialSubmissionDate).toLocaleString()
                  : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step 1-Click Copy Fields Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'ar'
                ? 'تسلسل حقول استمارة وزارة الخارجية (Part 1 — Entrant Information)'
                : 'Official DS-5501 Field Sequence (Part 1 — Entrant Information)'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'انقر على زر "نسخ" بجوار أي حقل للصقه مباشرة في المتصفح الرسمي'
                : 'Click "Copy" next to any field to paste directly into the official portal'}
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {language === 'ar' ? '23 حقل قياسي' : '23 Standard Fields'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {officialFields.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-colors gap-3"
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                    {f.num}
                  </span>
                  <span className="text-xs font-bold text-slate-700 truncate">
                    {f.label}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-900 font-semibold truncate select-all">
                  {f.value}
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(f.id, f.value)}
                disabled={!f.value || f.value === '—'}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-all ${
                  copiedKey === f.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {copiedKey === f.id ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>{t.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{t.copyField}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Printer-Friendly Output Documents rendered on window.print() */}
      <PrintSummaryDocument applicant={applicant} language={language} />
      <OfficialRequirementsPrintDocument applicant={applicant} language={language} />
    </div>
  );
};
