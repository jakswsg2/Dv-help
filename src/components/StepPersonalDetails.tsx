import React, { useRef } from 'react';
import {
  Applicant,
  EducationLevel,
  Language,
  MaritalStatus,
} from '../types';
import { translations } from '../translations';
import {
  formatDayInput,
  formatMonthInput,
  formatYearInput,
  validateDateOfBirth,
  formatPhoneNumber,
  formatPassportNumber,
} from '../utils/inputMasks';
import {
  User,
  MapPin,
  Mail,
  GraduationCap,
  Heart,
  Users,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Undo2,
  X,
  ArrowRight,
} from 'lucide-react';
import { CountryAutocomplete } from './CountryAutocomplete';
import { CityAutocomplete } from './CityAutocomplete';
import { YemenGovernorateSelect } from './YemenGovernorateSelect';
import { findYemenGovernorate } from '../data/yemenData';
import { countOcrDifferences, resolveCountryFromCode } from '../utils/ocrAutoFill';
import { OcrAutoFillModal } from './OcrAutoFillModal';
import { InlineValidationHint } from './InlineValidationHint';
import { AutoFocusToggle } from './AutoFocusToggle';
import { useAutoFocus } from '../hooks/useAutoFocus';
import { PERSONAL_DETAILS_SEQUENCE } from '../utils/autoFocusManager';
import {
  validateDvName,
  validateDvPassport,
  validateDvBirthDate,
  validateDvEmail,
  validateDvEmailConfirmation,
  validateDvCity,
  validateDvAddressField,
} from '../utils/dvValidation';

interface StepPersonalDetailsProps {
  applicant: Applicant;
  onChange: (updated: Partial<Applicant>) => void;
  language: Language;
  onNavigateToStep?: (step: string) => void;
}

export const StepPersonalDetails: React.FC<StepPersonalDetailsProps> = ({
  applicant,
  onChange,
  language,
  onNavigateToStep,
}) => {
  const t = translations[language];
  const p = t.personal;

  const { isEnabled: isAutoFocus, focusField, handleEnterToNext } =
    useAutoFocus(PERSONAL_DETAILS_SEQUENCE);

  const [isAutoFillModalOpen, setIsAutoFillModalOpen] = React.useState(false);
  const [previousValues, setPreviousValues] = React.useState<Partial<Applicant> | null>(null);
  const [autoFillSuccessMessage, setAutoFillSuccessMessage] = React.useState<{
    count: number;
    timestamp: number;
  } | null>(null);
  const [dismissBanner, setDismissBanner] = React.useState(false);

  const hasMrz = Boolean(
    applicant.mrzData &&
    (applicant.mrzData.lastName || applicant.mrzData.documentNumber)
  );

  const ocrDiff = hasMrz ? countOcrDifferences(applicant, applicant.mrzData) : null;
  const resolvedCountry = hasMrz
    ? (resolveCountryFromCode(applicant.mrzData?.nationality) || resolveCountryFromCode(applicant.mrzData?.issuingCountry))
    : null;

  const handleConfirmAutoFill = (fieldsToUpdate: Partial<Applicant>, appliedFieldIds: string[]) => {
    // Save snapshot of previous values for undo
    const backup: Partial<Applicant> = {};
    (Object.keys(fieldsToUpdate) as Array<keyof Applicant>).forEach((key) => {
      (backup as any)[key] = applicant[key];
    });
    setPreviousValues(backup);

    // Apply updates
    onChange(fieldsToUpdate);
    setIsAutoFillModalOpen(false);

    // Show success banner with undo
    setAutoFillSuccessMessage({
      count: appliedFieldIds.length,
      timestamp: Date.now(),
    });
  };

  const handleUndoAutoFill = () => {
    if (previousValues) {
      onChange(previousValues);
      setPreviousValues(null);
      setAutoFillSuccessMessage(null);
    }
  };

  const dayInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);

  const handleBirthDatePartChange = (part: 'year' | 'month' | 'day', rawVal: string) => {
    const current = applicant.birthDate ? applicant.birthDate.split('-') : ['', '', ''];
    let y = current[0] || '';
    let m = current[1] || '';
    let d = current[2] || '';

    if (part === 'day') {
      const formattedDay = formatDayInput(rawVal);
      d = formattedDay;
      // Auto-focus next field when 2 digits entered or single digit > 3
      if ((formattedDay.length === 2 || (rawVal.length === 1 && parseInt(rawVal, 10) >= 4)) && isAutoFocus) {
        focusField('birth-month', { select: true, highlight: true });
      }
    } else if (part === 'month') {
      const formattedMonth = formatMonthInput(rawVal);
      m = formattedMonth;
      // Auto-focus next field when 2 digits entered or single digit > 1
      if ((formattedMonth.length === 2 || (rawVal.length === 1 && parseInt(rawVal, 10) >= 2)) && isAutoFocus) {
        focusField('birth-year', { select: true, highlight: true });
      }
    } else if (part === 'year') {
      const formattedYear = formatYearInput(rawVal);
      y = formattedYear;
      // Auto-focus birth city when 4-digit valid year entered
      if (formattedYear.length === 4 && parseInt(formattedYear, 10) >= 1920 && isAutoFocus) {
        focusField('birth-city', { select: true, highlight: true });
      }
    }

    if (!y && !m && !d) {
      onChange({ birthDate: '' });
      return;
    }

    // Standardize pad
    const padD = d.length === 1 ? `0${d}` : d;
    const padM = m.length === 1 ? `0${m}` : m;
    onChange({ birthDate: `${y}-${padM}-${padD}` });
  };

  const birthParts = applicant.birthDate ? applicant.birthDate.split('-') : ['', '', ''];
  const birthYear = birthParts[0] || '';
  const birthMonth = birthParts[1] || '';
  const birthDay = birthParts[2] || '';

  const dobValidation = validateDateOfBirth(birthDay, birthMonth, birthYear);

  // Centralized DV Lottery Validations
  const lastNameValidation = validateDvName(
    applicant.lastName,
    true,
    'Last / Family Name',
    'اسم العائلة / اللقب'
  );
  const firstNameValidation = validateDvName(
    applicant.firstName,
    true,
    'First Name',
    'الاسم الأول'
  );
  const middleNameValidation = applicant.hasNoMiddleName
    ? null
    : validateDvName(
        applicant.middleName,
        false,
        'Middle Name',
        'الاسم الأوسط'
      );
  const passportValidation = validateDvPassport(
    applicant.passportNumber || '',
    false
  );
  const birthDateValidation = validateDvBirthDate(
    applicant.birthDate,
    'entrant'
  );
  const birthCityValidation = validateDvCity(
    applicant.birthCity,
    applicant.birthCityUnknown
  );
  const address1Validation = validateDvAddressField(
    applicant.addressLine1,
    true,
    'Address Line 1',
    'سطر العنوان 1'
  );
  const cityTownValidation = validateDvAddressField(
    applicant.cityTown,
    true,
    'City / Town',
    'المدينة / البلدة'
  );
  const districtValidation = validateDvAddressField(
    applicant.districtCountyProvinceState,
    true,
    'District / Province',
    'المحافظة / الإقليم'
  );
  const emailValidation = validateDvEmail(applicant.email);
  const emailConfirmValidation = validateDvEmailConfirmation(
    applicant.email,
    applicant.emailConfirmation
  );

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-blue-950 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>{t.steps.PERSONAL}</span>
          </h2>
          <p className="text-xs sm:text-sm text-blue-800 mt-1 leading-relaxed">
            {language === 'ar'
              ? 'تعبئة البيانات الشخصية وفق التسلسل الرسمي لاستمارة وزارة الخارجية الأمريكية DS-5501 بدقة تامة وبالأحرف الإنجليزية المطابقة لجواز السفر.'
              : 'Fill in entrant personal details adhering strictly to the official US State Dept DS-5501 sequence and matching your official passport in English letters.'}
          </p>
        </div>

        {/* Auto-Focus Quick Switch */}
        <div className="shrink-0 self-start sm:self-center">
          <AutoFocusToggle language={language} />
        </div>
      </div>

      {/* Auto-fill Success & Undo Notification */}
      {autoFillSuccessMessage && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-emerald-950">
                {p.autoFillSuccessMsg}
              </p>
              <p className="text-[11px] text-emerald-800">
                {language === 'ar'
                  ? `تم تطبيق بيانات ${autoFillSuccessMessage.count} حقل(حقول) وفق وثيقة جواز السفر بدقة.`
                  : `Applied data for ${autoFillSuccessMessage.count} field(s) adhering strictly to your passport.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {previousValues && (
              <button
                type="button"
                onClick={handleUndoAutoFill}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>{p.autoFillUndoBtn}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setAutoFillSuccessMessage(null)}
              aria-label={language === 'ar' ? 'إغلاق الإشعار' : 'Close notice'}
              className="p-1 text-emerald-700 hover:text-emerald-950 rounded hover:bg-emerald-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* OCR Auto-fill Available Banner */}
      {hasMrz && !dismissBanner && (
        <div className="relative overflow-hidden bg-linear-to-r from-blue-900/5 via-indigo-900/5 to-blue-950/10 border-2 border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs mt-0.5 shrink-0">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">
                    {ocrDiff && (ocrDiff.differsCount > 0 || ocrDiff.newCount > 0)
                      ? p.autoFillPromptTitle
                      : p.autoFillSyncedBadge}
                  </h3>
                  {ocrDiff && (ocrDiff.differsCount > 0 || ocrDiff.newCount > 0) ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {language === 'ar'
                        ? `${ocrDiff.differsCount + ocrDiff.newCount} حقول للتحديث`
                        : `${ocrDiff.differsCount + ocrDiff.newCount} field(s) ready to sync`}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {language === 'ar' ? 'متطابق مع الجواز' : 'In sync with Passport'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                  {p.autoFillPromptDesc}
                </p>

                {/* Passport Chips */}
                <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px]">
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                    Doc: {applicant.mrzData?.documentNumber || '—'}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {applicant.mrzData?.firstName} {applicant.mrzData?.lastName}
                  </span>
                  {applicant.mrzData?.birthDate && (
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                      {applicant.mrzData.birthDate}
                    </span>
                  )}
                  {resolvedCountry && (
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                      {language === 'ar' ? resolvedCountry.nameAr : resolvedCountry.nameEn}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setIsAutoFillModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  {ocrDiff && (ocrDiff.differsCount > 0 || ocrDiff.newCount > 0)
                    ? p.autoFillBtn
                    : p.autoFillReviewBtn}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDismissBanner(true)}
                aria-label={language === 'ar' ? 'إخفاء الإشعار' : 'Dismiss notice'}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tip to Scan Passport OCR if no MRZ data is present yet */}
      {!hasMrz && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{p.autoFillNoOcrTip}</span>
          </div>
          {onNavigateToStep && (
            <button
              type="button"
              onClick={() => onNavigateToStep('DOCUMENTS')}
              className="text-blue-600 hover:text-blue-800 font-bold shrink-0 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{p.goToOcrStep}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 1. Name & Passport Information */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-extrabold">
              1
            </span>
            {p.nameSection}
          </h3>
          <div className="flex items-center gap-2">
            {hasMrz && (
              <button
                type="button"
                id="name-section-compare-ocr-btn"
                onClick={() => setIsAutoFillModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title={language === 'ar' ? 'مقارنة وتدقيق الأسماء مع الجواز' : 'Compare names with Passport OCR'}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'ar' ? 'مقارنة مع الجواز (OCR)' : 'Compare with Passport'}</span>
              </button>
            )}
            <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Latin characters only (A-Z)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="family-name" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.lastName} <span className="text-rose-500">*</span>
            </label>
            <input
              id="family-name"
              name="family-name"
              autoComplete="family-name"
              type="text"
              value={applicant.lastName}
              onChange={(e) => onChange({ lastName: e.target.value.toUpperCase() })}
              onKeyDown={(e) => handleEnterToNext(e, 'family-name', lastNameValidation.isValid)}
              placeholder="e.g. MOHAMED"
              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm uppercase tracking-wide focus:bg-white outline-none transition-all ${
                lastNameValidation.severity === 'error'
                  ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-200'
                  : lastNameValidation.severity === 'valid' && applicant.lastName
                  ? 'border-emerald-300 focus:border-emerald-500'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
            <InlineValidationHint result={lastNameValidation} language={language} />
          </div>

          <div>
            <label htmlFor="given-name" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.firstName} <span className="text-rose-500">*</span>
            </label>
            <input
              id="given-name"
              name="given-name"
              autoComplete="given-name"
              type="text"
              value={applicant.firstName}
              onChange={(e) => onChange({ firstName: e.target.value.toUpperCase() })}
              onKeyDown={(e) =>
                handleEnterToNext(
                  e,
                  'given-name',
                  firstNameValidation.isValid,
                  applicant.hasNoMiddleName
                    ? PERSONAL_DETAILS_SEQUENCE.filter((id) => id !== 'additional-name')
                    : PERSONAL_DETAILS_SEQUENCE
                )
              }
              placeholder="e.g. AHMED"
              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm uppercase tracking-wide focus:bg-white outline-none transition-all ${
                firstNameValidation.severity === 'error'
                  ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-200'
                  : firstNameValidation.severity === 'valid' && applicant.firstName
                  ? 'border-emerald-300 focus:border-emerald-500'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
            <InlineValidationHint result={firstNameValidation} language={language} />
          </div>

          <div>
            <label htmlFor="additional-name" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.middleName}
            </label>
            <input
              id="additional-name"
              name="additional-name"
              autoComplete="additional-name"
              type="text"
              disabled={applicant.hasNoMiddleName}
              value={applicant.hasNoMiddleName ? '' : applicant.middleName}
              onChange={(e) => onChange({ middleName: e.target.value.toUpperCase() })}
              onKeyDown={(e) => handleEnterToNext(e, 'additional-name', middleNameValidation?.isValid ?? true)}
              placeholder={applicant.hasNoMiddleName ? 'N/A' : 'e.g. HASSAN'}
              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm uppercase tracking-wide focus:bg-white outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400 ${
                middleNameValidation && middleNameValidation.severity === 'error'
                  ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
            <InlineValidationHint result={middleNameValidation} language={language} />
            <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applicant.hasNoMiddleName}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onChange({
                    hasNoMiddleName: checked,
                    middleName: checked ? '' : applicant.middleName,
                  });
                  if (checked && isAutoFocus) {
                    focusField('passport-number');
                  }
                }}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>{p.noMiddleName}</span>
            </label>
          </div>
        </div>

        {/* Passport / Travel Document Number Field */}
        <div className="pt-4 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="passport-number"
                className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>{p.passportNumber}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  ICAO Doc 9303
                </span>
              </label>
              <div className="relative">
                <input
                  id="passport-number"
                  name="passport-number"
                  type="text"
                  value={applicant.passportNumber || ''}
                  onChange={(e) => {
                    const formatted = formatPassportNumber(e.target.value);
                    onChange({
                      passportNumber: formatted,
                      ...(applicant.mrzData ? { mrzData: { ...applicant.mrzData, documentNumber: formatted } } : {}),
                    });
                    // Auto-advance when exactly 9 characters (standard passport) entered
                    if (formatted.length === 9 && isAutoFocus) {
                      focusField('birth-day');
                    }
                  }}
                  onKeyDown={(e) => handleEnterToNext(e, 'passport-number', passportValidation.isValid)}
                  placeholder="e.g. A12345678"
                  maxLength={9}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm uppercase tracking-wider font-mono outline-none transition-all ${
                    passportValidation.severity === 'error'
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-200'
                      : applicant.passportNumber && passportValidation.isValid
                      ? 'border-emerald-300 focus:border-emerald-500'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
                {applicant.passportNumber && passportValidation.isValid && (
                  <span className="absolute right-3 top-2.5 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </div>
              <InlineValidationHint
                result={passportValidation}
                language={language}
                showValid={Boolean(applicant.passportNumber)}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {p.passportHint}
              </p>
            </div>

            {applicant.mrzData?.documentNumber && (
              <div className="bg-blue-50/50 border border-blue-200/70 rounded-lg p-3 text-xs text-blue-900 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 font-semibold text-blue-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {language === 'ar' ? 'بيانات الجواز الممسوحة متوفرة' : 'Scanned Passport MRZ Available'}
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 mt-1">
                  {language === 'ar'
                    ? `الرقم المستخرج: ${applicant.mrzData.documentNumber} (${applicant.mrzData.issuingCountry || ''}) — تم فحص أرقام التحقق بنجاح.`
                    : `Extracted Doc: ${applicant.mrzData.documentNumber} (${applicant.mrzData.issuingCountry || ''}) — Checksum validated.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2 & 3: Gender & Birth Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-extrabold">
              2
            </span>
            {p.gender}
          </h3>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              id="gender-male-btn"
              onClick={() => {
                onChange({ gender: 'MALE' });
                if (isAutoFocus) focusField('birth-day');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                applicant.gender === 'MALE'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{p.male}</span>
            </button>
            <button
              type="button"
              id="gender-female-btn"
              onClick={() => {
                onChange({ gender: 'FEMALE' });
                if (isAutoFocus) focusField('birth-day');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                applicant.gender === 'FEMALE'
                  ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-xs'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{p.female}</span>
            </button>
          </div>
        </div>

        {/* Date of Birth */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-extrabold">
                3
              </span>
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{p.birthDate}</span>
            </h3>
            {applicant.birthDate && (
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-semibold flex items-center gap-1 ${
                  dobValidation.isValid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {dobValidation.isValid ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{dobValidation.isoDate} ({dobValidation.age} yrs)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    <span>{dobValidation.error || 'Invalid'}</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                {p.day} (DD)
              </span>
              <input
                id="birth-day"
                ref={dayInputRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={birthDay}
                onChange={(e) => handleBirthDatePartChange('day', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    focusField('birth-month');
                  }
                }}
                placeholder="15"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-center font-mono font-semibold focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                {p.month} (MM)
              </span>
              <input
                id="birth-month"
                ref={monthInputRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={birthMonth}
                onChange={(e) => handleBirthDatePartChange('month', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !birthMonth) {
                    e.preventDefault();
                    focusField('birth-day');
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    focusField('birth-year');
                  }
                }}
                placeholder="05"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-center font-mono font-semibold focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                {p.year} (YYYY)
              </span>
              <input
                id="birth-year"
                ref={yearInputRef}
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={birthYear}
                onChange={(e) => handleBirthDatePartChange('year', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !birthYear) {
                    e.preventDefault();
                    focusField('birth-month');
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    focusField('birth-city');
                  }
                }}
                placeholder="1992"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-center font-mono font-semibold focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          <InlineValidationHint result={birthDateValidation} language={language} />
          <p className="text-[11px] text-slate-500">
            {language === 'ar'
              ? 'تنسيق قياسي مطابق لوثيقة السفر DS-5501 (اليوم / الشهر / السنة رباعية الأرقام).'
              : 'Official international standard DS-5501 format (Day / Month / 4-digit Year).'}
          </p>
        </div>
      </div>

      {/* 4, 5, 6: Birth Place & Eligibility */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 4. Birth City */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-extrabold">
                4
              </span>
              {p.birthCity}
            </h3>
            <CityAutocomplete
              id="birth-city"
              name="birth-city"
              autoComplete="address-level2"
              disabled={applicant.birthCityUnknown}
              value={applicant.birthCityUnknown ? '' : applicant.birthCity}
              onChange={(val) => onChange({ birthCity: val })}
              onSelectAdvance={() => {
                if (isAutoFocus) focusField('birth-country');
              }}
              country={applicant.birthCountry}
              placeholder={applicant.birthCityUnknown ? 'Unknown' : 'e.g. Sanaa, Aden, Taiz'}
            />
            <InlineValidationHint result={birthCityValidation} language={language} />
            <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applicant.birthCityUnknown}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onChange({
                    birthCityUnknown: checked,
                    birthCity: checked ? '' : applicant.birthCity,
                  });
                  if (checked && isAutoFocus) {
                    focusField('birth-country');
                  }
                }}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>{p.birthCityUnknown}</span>
            </label>
          </div>

          {/* 5. Birth Country */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-extrabold">
                5
              </span>
              {p.birthCountry}
            </h3>
            <CountryAutocomplete
              id="birth-country"
              name="birth-country"
              autoComplete="country-name"
              value={applicant.birthCountry}
              onChange={(countryName) => onChange({ birthCountry: countryName })}
              onSelectAdvance={() => {
                if (isAutoFocus) focusField('street-address-1');
              }}
              language={language}
              filterIneligibleDV={true}
            />
          </div>
        </div>

        {/* 6. Country of Eligibility */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-extrabold">
              6
            </span>
            {p.eligibilityCountry}
          </h3>

          <div className="space-y-2 text-xs sm:text-sm">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="eligibilityOption"
                checked={applicant.isEligibleBasedOnBirthCountry}
                onChange={() => onChange({ isEligibleBasedOnBirthCountry: true })}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-800 font-medium">{p.eligibleByBirth}</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="eligibilityOption"
                checked={!applicant.isEligibleBasedOnBirthCountry}
                onChange={() => onChange({ isEligibleBasedOnBirthCountry: false })}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-800 font-medium">{p.alternateEligibility}</span>
            </label>
          </div>

          {!applicant.isEligibleBasedOnBirthCountry && (
            <div className="mt-2 pl-6 pr-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {p.alternateCountrySelect}
              </label>
              <CountryAutocomplete
                id="alternate-eligibility-country"
                name="alternate-eligibility-country"
                value={applicant.alternateCountryOfEligibility}
                onChange={(countryName) =>
                  onChange({ alternateCountryOfEligibility: countryName })
                }
                language={language}
                filterIneligibleDV={true}
                className="w-full sm:w-1/2"
              />
            </div>
          )}
        </div>
      </div>

      {/* 8. Mailing Address & 9. Current Country */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-extrabold">
            8
          </span>
          <MapPin className="w-4 h-4 text-blue-600" />
          {p.addressSection}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="address-care-of" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.inCareOf}
            </label>
            <input
              id="address-care-of"
              name="address-care-of"
              autoComplete="name"
              type="text"
              value={applicant.inCareOf}
              onChange={(e) => onChange({ inCareOf: e.target.value })}
              onKeyDown={(e) => handleEnterToNext(e, 'address-care-of', true)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="street-address-1" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.address1} <span className="text-rose-500">*</span>
            </label>
            <input
              id="street-address-1"
              name="street-address-1"
              autoComplete="address-line1"
              type="text"
              value={applicant.addressLine1}
              onChange={(e) => onChange({ addressLine1: e.target.value })}
              onKeyDown={(e) => handleEnterToNext(e, 'street-address-1', address1Validation.isValid)}
              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm focus:bg-white outline-none ${
                address1Validation.severity === 'error'
                  ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                  : 'border-slate-300 focus:border-blue-500'
              }`}
            />
            <InlineValidationHint result={address1Validation} language={language} />
          </div>

          <div>
            <label htmlFor="street-address-2" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.address2}
            </label>
            <input
              id="street-address-2"
              name="street-address-2"
              autoComplete="address-line2"
              type="text"
              value={applicant.addressLine2}
              onChange={(e) => onChange({ addressLine2: e.target.value })}
              onKeyDown={(e) => handleEnterToNext(e, 'street-address-2', true)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="address-city" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.cityTown} <span className="text-rose-500">*</span>
            </label>
            <CityAutocomplete
              id="address-city"
              name="address-city"
              autoComplete="address-level2"
              value={applicant.cityTown}
              onChange={(val) => {
                const isYemen =
                  applicant.currentCountry?.toLowerCase() === 'yemen' ||
                  applicant.currentCountry === 'اليمن' ||
                  applicant.country?.toLowerCase() === 'yemen' ||
                  applicant.country === 'اليمن';
                const gov = isYemen ? findYemenGovernorate(val) : undefined;
                onChange({
                  cityTown: val,
                  ...(gov && !applicant.districtCountyProvinceState
                    ? { districtCountyProvinceState: gov.nameEn }
                    : {}),
                  ...(gov && !applicant.postalCode && !applicant.noPostalCode
                    ? { postalCode: gov.defaultPostalCode }
                    : {}),
                });
              }}
              onSelectAdvance={() => {
                if (isAutoFocus) focusField('address-district');
              }}
              country={applicant.currentCountry || applicant.country}
              placeholder="e.g. Sanaa, Aden, Taiz..."
            />
            <InlineValidationHint result={cityTownValidation} language={language} />
          </div>

          <div>
            {applicant.currentCountry?.toLowerCase() === 'yemen' ||
            applicant.currentCountry === 'اليمن' ||
            applicant.country?.toLowerCase() === 'yemen' ||
            applicant.country === 'اليمن' ? (
              <YemenGovernorateSelect
                id="address-district"
                name="address-district"
                value={applicant.districtCountyProvinceState}
                label={p.district}
                required={true}
                language={language}
                onChange={(govEn, gov) => {
                  onChange({
                    districtCountyProvinceState: govEn,
                    ...(gov && !applicant.postalCode && !applicant.noPostalCode
                      ? { postalCode: gov.defaultPostalCode }
                      : {}),
                  });
                }}
                onSelectAdvance={() => {
                  if (isAutoFocus) focusField('postal-code');
                }}
              />
            ) : (
              <>
                <label htmlFor="address-district" className="block text-xs font-semibold text-slate-700 mb-1">
                  {p.district} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="address-district"
                  name="address-district"
                  autoComplete="address-level1"
                  type="text"
                  value={applicant.districtCountyProvinceState}
                  onChange={(e) =>
                    onChange({ districtCountyProvinceState: e.target.value })
                  }
                  onKeyDown={(e) => handleEnterToNext(e, 'address-district', districtValidation.isValid)}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm focus:bg-white outline-none ${
                    districtValidation.severity === 'error'
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
              </>
            )}
            <InlineValidationHint result={districtValidation} language={language} />
          </div>

          <div>
            <label htmlFor="postal-code" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.postalCode}
            </label>
            <input
              id="postal-code"
              name="postal-code"
              autoComplete="postal-code"
              type="text"
              disabled={applicant.noPostalCode}
              value={applicant.noPostalCode ? '' : applicant.postalCode}
              onChange={(e) => onChange({ postalCode: e.target.value })}
              onKeyDown={(e) => handleEnterToNext(e, 'postal-code', true)}
              placeholder={applicant.noPostalCode ? 'N/A' : '11511'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
            />
            <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applicant.noPostalCode}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onChange({
                    noPostalCode: checked,
                    postalCode: checked ? '' : applicant.postalCode,
                  });
                  if (checked && isAutoFocus) {
                    focusField('current-country');
                  }
                }}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>{p.noPostalCode}</span>
            </label>
          </div>
        </div>

        {/* 9. Country Where You Live Today */}
        <div className="pt-2 border-t border-slate-100">
          <CountryAutocomplete
            id="current-country"
            name="current-country"
            autoComplete="country-name"
            label={p.currentCountry}
            required={true}
            value={applicant.currentCountry}
            onChange={(countryName) => onChange({ currentCountry: countryName })}
            onSelectAdvance={() => {
              if (isAutoFocus) focusField('tel-national');
            }}
            language={language}
            className="w-full sm:w-1/2"
          />
        </div>
      </div>

      {/* 10 & 11: Phone & Email */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-600" />
          <span>10 &amp; 11. {p.phone} &amp; {p.email}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="tel-national" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.phone}
            </label>
            <input
              id="tel-national"
              name="tel-national"
              autoComplete="tel"
              type="tel"
              value={applicant.phoneNumber}
              onChange={(e) =>
                onChange({ phoneNumber: formatPhoneNumber(e.target.value) })
              }
              onKeyDown={(e) => handleEnterToNext(e, 'tel-national', true)}
              placeholder={applicant.currentCountry?.toLowerCase() === 'yemen' || applicant.country?.toLowerCase() === 'yemen' ? '+967 770 123 456' : '+967 770 123 456'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="user-email" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.email} <span className="text-rose-500">*</span>
            </label>
            <input
              id="user-email"
              name="user-email"
              autoComplete="email"
              type="email"
              value={applicant.email}
              onChange={(e) => onChange({ email: e.target.value.toLowerCase().trim() })}
              onKeyDown={(e) => handleEnterToNext(e, 'user-email', emailValidation.isValid)}
              placeholder="applicant@example.com"
              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm focus:bg-white outline-none ${
                emailValidation.severity === 'error'
                  ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                  : 'border-slate-300 focus:border-blue-500'
              }`}
            />
            <InlineValidationHint result={emailValidation} language={language} />
          </div>

          <div>
            <label htmlFor="user-email-confirm" className="block text-xs font-semibold text-slate-700 mb-1">
              {p.emailConfirm} <span className="text-rose-500">*</span>
            </label>
            <input
              id="user-email-confirm"
              name="user-email-confirm"
              autoComplete="email"
              type="email"
              value={applicant.emailConfirmation}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().trim();
                onChange({ emailConfirmation: val });
                if (val && val === applicant.email && isAutoFocus) {
                  focusField('highest-education');
                }
              }}
              onKeyDown={(e) => handleEnterToNext(e, 'user-email-confirm', emailConfirmValidation.isValid)}
              placeholder="applicant@example.com"
              className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm focus:bg-white outline-none ${
                emailConfirmValidation.severity === 'error'
                  ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                  : 'border-slate-300 focus:border-blue-500'
              }`}
            />
            <InlineValidationHint result={emailConfirmValidation} language={language} />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{p.emailNotice}</span>
        </div>
      </div>

      {/* 12, 13, 14: Education, Marital Status & Children Count */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Education */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>{p.education}</span>
          </h3>
          <select
            id="highest-education"
            value={applicant.highestEducation}
            onChange={(e) => {
              onChange({ highestEducation: e.target.value as EducationLevel });
              if (isAutoFocus) focusField('marital-status');
            }}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-500 outline-none cursor-pointer"
          >
            {Object.entries(t.educationOptions).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Marital Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            <span>{p.marital}</span>
          </h3>
          <select
            id="marital-status"
            value={applicant.maritalStatus}
            onChange={(e) => {
              onChange({ maritalStatus: e.target.value as MaritalStatus });
              if (isAutoFocus) focusField('number-of-children');
            }}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-500 outline-none cursor-pointer"
          >
            {Object.entries(t.maritalOptions).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Number of Children */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>{p.childrenCount}</span>
          </h3>
          <div className="flex items-center gap-2">
            <input
              id="number-of-children"
              type="number"
              min="0"
              max="20"
              value={applicant.numberOfChildren}
              onChange={(e) =>
                onChange({
                  numberOfChildren: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              onKeyDown={(e) => handleEnterToNext(e, 'number-of-children', true)}
              className="w-24 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base text-center font-bold focus:bg-white focus:border-blue-500 outline-none"
            />
            <span className="text-xs text-slate-500">
              {language === 'ar' ? 'طفل / طفلة دون سن 21' : 'unmarried children'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {p.childrenNotice}
          </p>
        </div>
      </div>

      {/* Confirmation Modal for Document OCR Auto-Fill */}
      <OcrAutoFillModal
        isOpen={isAutoFillModalOpen}
        onClose={() => setIsAutoFillModalOpen(false)}
        onConfirm={handleConfirmAutoFill}
        applicant={applicant}
        language={language}
      />
    </div>
  );
};
