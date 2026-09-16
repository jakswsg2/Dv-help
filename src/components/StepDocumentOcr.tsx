import React, { useState } from 'react';
import { Applicant, Language, PassportMRZData } from '../types';
import { translations } from '../translations';
import { parseMRZ, SAMPLE_MRZ } from '../utils/mrzParser';
import {
  formatPassportNumber,
  validatePassportNumber,
} from '../utils/inputMasks';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRightLeft,
  Check,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { CountryAutocomplete } from './CountryAutocomplete';
import { ISO_COUNTRIES } from '../data/countries';
import { OcrAutoFillModal } from './OcrAutoFillModal';

interface StepDocumentOcrProps {
  applicant: Applicant;
  onChange: (updated: Partial<Applicant>) => void;
  language: Language;
}

export const StepDocumentOcr: React.FC<StepDocumentOcrProps> = ({
  applicant,
  onChange,
  language,
}) => {
  const t = translations[language];
  const o = t.ocr;

  const [rawMrz, setRawMrz] = useState<string>(
    applicant.mrzData?.rawText || SAMPLE_MRZ
  );
  const [parsed, setParsed] = useState<PassportMRZData | null>(
    applicant.mrzData || parseMRZ(SAMPLE_MRZ)
  );
  const [synced, setSynced] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleDecode = (textToDecode: string) => {
    const result = parseMRZ(textToDecode);
    setParsed(result);
    setSynced(false);
    if (result) {
      onChange({ mrzData: result });
    }
  };

  const handleManualPassportNumberChange = (val: string) => {
    const masked = formatPassportNumber(val);
    const updatedMrz: PassportMRZData = {
      ...(parsed || {
        documentNumber: '',
        documentType: 'P',
        issuingCountry: applicant.birthCountry || 'EGY',
        nationality: applicant.birthCountry || 'EGY',
        lastName: applicant.lastName,
        firstName: applicant.firstName,
        birthDate: applicant.birthDate || '1990-01-01',
        gender: applicant.gender,
        expiryDate: '2030-01-01',
        validChecksum: true,
      }),
      documentNumber: masked,
    };
    setParsed(updatedMrz);
    onChange({ mrzData: updatedMrz });
  };

  const handleManualExpiryChange = (val: string) => {
    const updatedMrz: PassportMRZData = {
      ...(parsed || {
        documentNumber: '',
        documentType: 'P',
        issuingCountry: applicant.birthCountry || 'EGY',
        nationality: applicant.birthCountry || 'EGY',
        lastName: applicant.lastName,
        firstName: applicant.firstName,
        birthDate: applicant.birthDate || '1990-01-01',
        gender: applicant.gender,
        expiryDate: '2030-01-01',
        validChecksum: true,
      }),
      expiryDate: val,
    };
    setParsed(updatedMrz);
    onChange({ mrzData: updatedMrz });
  };

  const handleSyncToProfile = () => {
    if (!parsed) return;
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAutoFill = (fieldsToUpdate: Partial<Applicant>) => {
    onChange({
      ...fieldsToUpdate,
      mrzData: parsed || applicant.mrzData,
    });
    setIsConfirmModalOpen(false);
    setSynced(true);
    setTimeout(() => setSynced(false), 3500);
  };

  const passportValidation = validatePassportNumber(parsed?.documentNumber || '');

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span>{o.title}</span>
        </h2>
        <p className="text-xs sm:text-sm text-blue-800 mt-1 leading-relaxed">
          {o.description}
        </p>
      </div>

      {/* Direct Passport Number Masking & Quick Edit Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>
              {language === 'ar' ? 'رقم جواز السفر وتدقيق المعايير الدولية (ICAO Doc 9303)' : 'Passport Number & International Standard Formatting (ICAO Doc 9303)'}
            </span>
          </h3>
          <span className="text-[11px] font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
            Max 9 Chars (A-Z, 0-9)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {o.docNumber} (Passport Number)
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={9}
                value={parsed?.documentNumber || ''}
                onChange={(e) => handleManualPassportNumberChange(e.target.value)}
                placeholder="e.g. A12345678"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold uppercase tracking-wider focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
              {parsed?.documentNumber && (
                <span className="absolute right-3 top-2.5 text-xs">
                  {passportValidation.isValid ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      ICAO Valid
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Min 6 Chars
                    </span>
                  )}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === 'ar'
                ? 'يتم تحويل الأحرف تلقائياً إلى الإنجليزية الكبيرة وإزالة الرموز والمسافات بما يطابق المعايير الدولية.'
                : 'Auto-capitalized alphanumeric masking without spaces or invalid symbols per ICAO standard.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {o.expiryDate} (Passport Expiration Date)
            </label>
            <input
              type="date"
              value={parsed?.expiryDate || ''}
              onChange={(e) => handleManualExpiryChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:bg-white focus:border-blue-500 outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {language === 'ar'
                ? 'تاريخ انتهاء صلاحية الجواز (يجب أن يكون سارياً أثناء التقديم أو عند استلام التأشيرة).'
                : 'Passport expiry date (must be currently valid or renewed prior to interview).'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {o.nationality} (Nationality / Issuing State)
            </label>
            <CountryAutocomplete
              id="passport-nationality-country"
              name="passport-nationality-country"
              autoComplete="country-name"
              value={
                ISO_COUNTRIES.find(
                  (c) =>
                    c.code === parsed?.nationality ||
                    c.nameEn === parsed?.nationality ||
                    c.nameEn === applicant.birthCountry
                )?.nameEn || parsed?.nationality || ''
              }
              onChange={(countryName) => {
                const found = ISO_COUNTRIES.find((c) => c.nameEn === countryName || c.nameAr === countryName);
                const iso3 = found?.code || countryName.substring(0, 3).toUpperCase();
                const updatedMrz: PassportMRZData = {
                  ...(parsed || {
                    documentType: 'P',
                    issuingCountry: iso3,
                    nationality: iso3,
                    lastName: applicant.lastName || '',
                    firstName: applicant.firstName || '',
                    documentNumber: '',
                    birthDate: applicant.birthDate || '',
                    expiryDate: '',
                    gender: applicant.gender,
                    validChecksum: false,
                    rawText: '',
                  }),
                  nationality: iso3,
                  issuingCountry: iso3,
                };
                setParsed(updatedMrz);
                onChange({ mrzData: updatedMrz });
              }}
              language={language}
            />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800">
            {language === 'ar'
              ? 'شريط القراءة الآلية (MRZ - سطرين من 44 حرفاً)'
              : 'Machine Readable Zone (MRZ - 2 lines of 44 chars)'}
          </label>
          <button
            type="button"
            onClick={() => {
              setRawMrz(SAMPLE_MRZ);
              handleDecode(SAMPLE_MRZ);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            {o.sampleMrz}
          </button>
        </div>

        <textarea
          value={rawMrz}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setRawMrz(val);
            handleDecode(val);
          }}
          rows={3}
          placeholder={o.mrzInputPlaceholder}
          className="w-full font-mono text-xs sm:text-sm p-3 bg-slate-900 text-emerald-400 rounded-xl tracking-wider leading-relaxed border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          dir="ltr"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleDecode(rawMrz)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{o.decodeBtn}</span>
          </button>

          {parsed && (
            <button
              type="button"
              onClick={handleSyncToProfile}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-all ${
                synced
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {synced ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تمت المطابقة وتحديث الملف!' : 'Profile Synchronized!'}</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{o.copyToProfileBtn}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Parsed Results */}
      {parsed ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'ar' ? 'البيانات المستخرجة من شريط الجواز' : 'Extracted Passport Information'}
            </h3>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                parsed.validChecksum
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {parsed.validChecksum ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{o.checksumValid}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{o.checksumInvalid}</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block text-slate-500 mb-1">{o.docNumber}</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {parsed.documentNumber || '—'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block text-slate-500 mb-1">{t.personal.lastName}</span>
              <span className="font-bold text-slate-900 text-sm">
                {parsed.lastName || '—'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block text-slate-500 mb-1">{t.personal.firstName}</span>
              <span className="font-bold text-slate-900 text-sm">
                {parsed.firstName || '—'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block text-slate-500 mb-1">{o.nationality}</span>
              <span className="font-bold text-slate-900 text-sm">
                {parsed.nationality || parsed.issuingCountry || '—'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block text-slate-500 mb-1">{t.personal.birthDate}</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {parsed.birthDate || '—'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block text-slate-500 mb-1">{o.expiryDate}</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {parsed.expiryDate || '—'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block text-slate-500 mb-1">{t.personal.gender}</span>
              <span className="font-bold text-slate-900 text-sm">
                {parsed.gender === 'MALE' ? t.personal.male : t.personal.female}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="block text-slate-500 mb-1">{o.issuingState}</span>
              <span className="font-bold text-slate-900 text-sm">
                {parsed.issuingCountry || '—'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
          {language === 'ar'
            ? 'أدخل سطرَي الـ MRZ في الأعلى لمعاينة التحليل التلقائي وتدقيق الصلاحية.'
            : 'Enter the two MRZ lines above to decode and check validity.'}
        </div>
      )}

      {/* Confirmation Modal for Document OCR Auto-Fill */}
      <OcrAutoFillModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmAutoFill}
        applicant={applicant}
        mrzData={parsed}
        language={language}
      />
    </div>
  );
};
