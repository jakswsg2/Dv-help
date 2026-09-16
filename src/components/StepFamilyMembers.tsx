import React from 'react';
import {
  Applicant,
  FamilyMember,
  Gender,
  Language,
} from '../types';
import { translations } from '../translations';
import {
  formatDayInput,
  formatMonthInput,
  formatYearInput,
  formatPassportNumber,
} from '../utils/inputMasks';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Heart,
  Baby,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { CountryAutocomplete } from './CountryAutocomplete';
import { CityAutocomplete } from './CityAutocomplete';
import { InlineValidationHint } from './InlineValidationHint';
import {
  validateDvName,
  validateDvPassport,
  validateDvBirthDate,
  validateDvCity,
} from '../utils/dvValidation';
import { focusFieldById, isAutoFocusEnabled } from '../utils/autoFocusManager';
import { AutoFocusToggle } from './AutoFocusToggle';

interface StepFamilyMembersProps {
  applicant: Applicant;
  onChange: (updated: Partial<Applicant>) => void;
  language: Language;
}

export const StepFamilyMembers: React.FC<StepFamilyMembersProps> = ({
  applicant,
  onChange,
  language,
}) => {
  const t = translations[language];
  const f = t.family;

  const isMarried =
    applicant.maritalStatus === 'MARRIED_NON_US' ||
    applicant.maritalStatus === 'MARRIED_US';

  const spouse = applicant.familyMembers.find((m) => m.relationship === 'SPOUSE');
  const children = applicant.familyMembers.filter((m) => m.relationship === 'CHILD');

  const updateMember = (id: string, fields: Partial<FamilyMember>) => {
    const updated = applicant.familyMembers.map((m) =>
      m.id === id ? { ...m, ...fields } : m
    );
    onChange({ familyMembers: updated });
  };

  const addSpouse = () => {
    const newSpouseId = `fam-spouse-${Date.now()}`;
    const newSpouse: FamilyMember = {
      id: newSpouseId,
      relationship: 'SPOUSE',
      lastName: applicant.lastName || '',
      firstName: '',
      middleName: '',
      hasNoMiddleName: false,
      gender: applicant.gender === 'MALE' ? 'FEMALE' : 'MALE',
      birthDate: '',
      birthCity: '',
      birthCityUnknown: false,
      birthCountry: applicant.birthCountry || 'Yemen',
      passportNumber: '',
    };
    onChange({ familyMembers: [...applicant.familyMembers, newSpouse] });
    setTimeout(() => {
      focusFieldById(`spouse-first-name-${newSpouseId}`, { highlight: true });
    }, 100);
  };

  const removeMember = (id: string) => {
    const remaining = applicant.familyMembers.filter((m) => m.id !== id);
    const remainingChildren = remaining.filter((m) => m.relationship === 'CHILD');
    onChange({
      familyMembers: remaining,
      numberOfChildren: remainingChildren.length,
    });
  };

  const addChild = () => {
    const newChildId = `fam-child-${Date.now()}`;
    const newChild: FamilyMember = {
      id: newChildId,
      relationship: 'CHILD',
      lastName: applicant.lastName || '',
      firstName: '',
      middleName: '',
      hasNoMiddleName: false,
      gender: 'MALE',
      birthDate: '',
      birthCity: applicant.birthCity || '',
      birthCityUnknown: false,
      birthCountry: applicant.birthCountry || 'Yemen',
      passportNumber: '',
    };
    const updated = [...applicant.familyMembers, newChild];
    onChange({
      familyMembers: updated,
      numberOfChildren: updated.filter((m) => m.relationship === 'CHILD').length,
    });
    setTimeout(() => {
      focusFieldById(`child-first-name-${newChildId}`, { highlight: true });
    }, 100);
  };

  // Spouse validation derivations
  const spouseLastNameVal = spouse
    ? validateDvName(spouse.lastName, true, 'Last / Family Name', 'اسم العائلة / اللقب')
    : null;
  const spouseFirstNameVal = spouse
    ? validateDvName(spouse.firstName, true, 'First Name', 'الاسم الأول')
    : null;
  const spouseMiddleNameVal = spouse
    ? spouse.hasNoMiddleName
      ? null
      : validateDvName(spouse.middleName, false, 'Middle Name', 'الاسم الأوسط')
    : null;
  const spousePassportVal = spouse
    ? validateDvPassport(spouse.passportNumber || '', false)
    : null;
  const spouseBirthVal = spouse
    ? validateDvBirthDate(spouse.birthDate, 'spouse')
    : null;
  const spouseCityVal = spouse
    ? validateDvCity(spouse.birthCity, spouse.birthCityUnknown)
    : null;

  return (
    <div className="space-y-8">
      {/* Strict Warning Alert */}
      <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-5 shadow-xs text-rose-950">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-rose-900">
                {f.warningBox}
              </h2>
              <p className="text-xs text-rose-800 leading-relaxed">
                {language === 'ar'
                  ? 'وفق تعليمات وزارة الخارجية: حتى لو كان الزوج/الزوجة أو الأطفال لا يقيمون معك حالياً أو لا ينوون الهجرة معك للولايات المتحدة، فإن عدم إدراجهم بالكامل يعد تضليلاً قانونياً يؤدي تلقائياً إلى رفض المعاملة بأكملها.'
                  : 'Per official State Dept rules: Even if your spouse or children do not live with you and do not plan to immigrate, failure to list them is considered legal misrepresentation causing automatic disqualification.'}
              </p>
            </div>
          </div>
          <AutoFocusToggle language={language} className="shrink-0" />
        </div>
      </div>

      {/* Spouse Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            <h3 className="text-base font-bold text-slate-900">{f.spouseInfo}</h3>
          </div>
          {isMarried && !spouse && (
            <button
              type="button"
              onClick={addSpouse}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'إضافة سجل الزوج(ة)' : 'Add Spouse Record'}</span>
            </button>
          )}
        </div>

        {!isMarried ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            {f.unmarriedNote} ({t.maritalOptions[applicant.maritalStatus]})
          </div>
        ) : !spouse ? (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center justify-between">
            <span>
              {language === 'ar'
                ? 'الحالة الاجتماعية المسجلة هي "متزوج"، يرجى النقر لإدراج بيانات الزوج(ة).'
                : 'Marital status is set to Married. Please add spouse details.'}
            </span>
            <button
              type="button"
              onClick={addSpouse}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs"
            >
              {language === 'ar' ? 'إضافة الآن' : 'Add Now'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Names row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.personal.lastName} <span className="text-rose-500">*</span>
                </label>
                <input
                  id={`spouse-last-name-${spouse.id}`}
                  type="text"
                  value={spouse.lastName}
                  onChange={(e) =>
                    updateMember(spouse.id, { lastName: e.target.value.toUpperCase() })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      focusFieldById(`spouse-first-name-${spouse.id}`);
                    }
                  }}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm uppercase outline-none focus:bg-white ${
                    spouseLastNameVal?.severity === 'error'
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {spouseLastNameVal && (
                  <InlineValidationHint result={spouseLastNameVal} language={language} />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.personal.firstName} <span className="text-rose-500">*</span>
                </label>
                <input
                  id={`spouse-first-name-${spouse.id}`}
                  type="text"
                  value={spouse.firstName}
                  onChange={(e) =>
                    updateMember(spouse.id, { firstName: e.target.value.toUpperCase() })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (spouse.hasNoMiddleName) {
                        focusFieldById(`spouse-passport-${spouse.id}`);
                      } else {
                        focusFieldById(`spouse-middle-name-${spouse.id}`);
                      }
                    }
                  }}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm uppercase outline-none focus:bg-white ${
                    spouseFirstNameVal?.severity === 'error'
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {spouseFirstNameVal && (
                  <InlineValidationHint result={spouseFirstNameVal} language={language} />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.personal.middleName}
                </label>
                <input
                  id={`spouse-middle-name-${spouse.id}`}
                  type="text"
                  disabled={spouse.hasNoMiddleName}
                  value={spouse.hasNoMiddleName ? '' : spouse.middleName}
                  onChange={(e) =>
                    updateMember(spouse.id, { middleName: e.target.value.toUpperCase() })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      focusFieldById(`spouse-passport-${spouse.id}`);
                    }
                  }}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm uppercase disabled:bg-slate-100 outline-none focus:bg-white ${
                    spouseMiddleNameVal?.severity === 'error'
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {spouseMiddleNameVal && (
                  <InlineValidationHint result={spouseMiddleNameVal} language={language} />
                )}
                <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={spouse.hasNoMiddleName}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateMember(spouse.id, {
                        hasNoMiddleName: checked,
                        middleName: checked ? '' : spouse.middleName,
                      });
                      if (checked && isAutoFocusEnabled()) {
                        focusFieldById(`spouse-passport-${spouse.id}`);
                      }
                    }}
                  />
                  <span>{t.personal.noMiddleName}</span>
                </label>
              </div>
            </div>

            {/* Passport & Gender row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>{f.passportNumber}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({language === 'ar' ? 'اختياري - إن وجد' : 'Optional / If issued'})
                  </span>
                </label>
                <div className="relative">
                  <input
                    id={`spouse-passport-${spouse.id}`}
                    type="text"
                    maxLength={9}
                    value={spouse.passportNumber || ''}
                    onChange={(e) => {
                      const formatted = formatPassportNumber(e.target.value);
                      updateMember(spouse.id, { passportNumber: formatted });
                      if (formatted.length === 9 && isAutoFocusEnabled()) {
                        focusFieldById(`spouse-day-${spouse.id}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        focusFieldById(`spouse-day-${spouse.id}`);
                      }
                    }}
                    placeholder={language === 'ar' ? 'مثال: A12345678' : 'e.g. A12345678'}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm font-mono uppercase tracking-wider outline-none focus:bg-white ${
                      spousePassportVal?.severity === 'error'
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                        : spousePassportVal?.severity === 'valid'
                        ? 'border-emerald-400 focus:border-emerald-500'
                        : 'border-slate-300 focus:border-blue-500'
                    }`}
                  />
                  {spousePassportVal?.isValid && spouse.passportNumber && (
                    <span className="absolute end-3 top-2.5 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </div>
                {spousePassportVal && (
                  <InlineValidationHint result={spousePassportVal} language={language} />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.personal.gender}
                </label>
                <select
                  value={spouse.gender}
                  onChange={(e) =>
                    updateMember(spouse.id, { gender: e.target.value as Gender })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="FEMALE">{t.personal.female}</option>
                  <option value="MALE">{t.personal.male}</option>
                </select>
              </div>
            </div>

            {/* Birth Date, City, Country row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t.personal.birthDate}</span>
                  {spouse.birthDate && (
                    <span className="text-[10px] font-mono font-semibold text-slate-500">
                      {spouse.birthDate}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <input
                    id={`spouse-day-${spouse.id}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="DD"
                    value={spouse.birthDate ? spouse.birthDate.split('-')[2] || '' : ''}
                    onChange={(e) => {
                      const dayVal = formatDayInput(e.target.value);
                      const parts = spouse.birthDate ? spouse.birthDate.split('-') : ['', '', ''];
                      const y = parts[0] || '1990';
                      const m = parts[1] || '01';
                      const padD = dayVal.length === 1 ? `0${dayVal}` : dayVal;
                      updateMember(spouse.id, { birthDate: dayVal ? `${y}-${m}-${padD}` : '' });
                      if ((dayVal.length === 2 || (e.target.value.length === 1 && parseInt(e.target.value, 10) >= 4)) && isAutoFocusEnabled()) {
                        focusFieldById(`spouse-month-${spouse.id}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        focusFieldById(`spouse-month-${spouse.id}`);
                      }
                    }}
                    className="px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-center font-mono font-semibold focus:bg-white focus:border-blue-500 outline-none"
                  />
                  <input
                    id={`spouse-month-${spouse.id}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="MM"
                    value={spouse.birthDate ? spouse.birthDate.split('-')[1] || '' : ''}
                    onChange={(e) => {
                      const monthVal = formatMonthInput(e.target.value);
                      const parts = spouse.birthDate ? spouse.birthDate.split('-') : ['', '', ''];
                      const y = parts[0] || '1990';
                      const d = parts[2] || '01';
                      const padM = monthVal.length === 1 ? `0${monthVal}` : monthVal;
                      updateMember(spouse.id, { birthDate: monthVal ? `${y}-${padM}-${d}` : '' });
                      if ((monthVal.length === 2 || (e.target.value.length === 1 && parseInt(e.target.value, 10) >= 2)) && isAutoFocusEnabled()) {
                        focusFieldById(`spouse-year-${spouse.id}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !spouse.birthDate?.split('-')[1]) {
                        e.preventDefault();
                        focusFieldById(`spouse-day-${spouse.id}`);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        focusFieldById(`spouse-year-${spouse.id}`);
                      }
                    }}
                    className="px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-center font-mono font-semibold focus:bg-white focus:border-blue-500 outline-none"
                  />
                  <input
                    id={`spouse-year-${spouse.id}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="YYYY"
                    value={spouse.birthDate ? spouse.birthDate.split('-')[0] || '' : ''}
                    onChange={(e) => {
                      const yearVal = formatYearInput(e.target.value);
                      const parts = spouse.birthDate ? spouse.birthDate.split('-') : ['', '', ''];
                      const m = parts[1] || '01';
                      const d = parts[2] || '01';
                      updateMember(spouse.id, { birthDate: yearVal ? `${yearVal}-${m}-${d}` : '' });
                      if (yearVal.length === 4 && parseInt(yearVal, 10) >= 1920 && isAutoFocusEnabled()) {
                        focusFieldById(`spouse-city-${spouse.id}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !spouse.birthDate?.split('-')[0]) {
                        e.preventDefault();
                        focusFieldById(`spouse-month-${spouse.id}`);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        focusFieldById(`spouse-city-${spouse.id}`);
                      }
                    }}
                    className="px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-center font-mono font-semibold focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
                {spouseBirthVal && (
                  <InlineValidationHint result={spouseBirthVal} language={language} />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.personal.birthCity}
                </label>
                <CityAutocomplete
                  id={`spouse-city-${spouse.id}`}
                  name={`spouse-city-${spouse.id}`}
                  autoComplete="address-level2"
                  value={spouse.birthCity}
                  country={spouse.birthCountry}
                  onChange={(val) =>
                    updateMember(spouse.id, { birthCity: val })
                  }
                  onSelectAdvance={() => {
                    if (isAutoFocusEnabled()) {
                      focusFieldById(`spouse-country-${spouse.id}`);
                    }
                  }}
                  placeholder="City"
                />
                {spouseCityVal && (
                  <InlineValidationHint result={spouseCityVal} language={language} />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.personal.birthCountry}
                </label>
                <CountryAutocomplete
                  id={`spouse-country-${spouse.id}`}
                  name={`spouse-country-${spouse.id}`}
                  autoComplete="country-name"
                  value={spouse.birthCountry}
                  onChange={(countryName) =>
                    updateMember(spouse.id, { birthCountry: countryName })
                  }
                  language={language}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Children Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Baby className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              {f.childrenInfo} ({children.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={addChild}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{f.addChild}</span>
          </button>
        </div>

        {children.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
            <span>{f.noChildrenNote}</span>
            <button
              type="button"
              onClick={addChild}
              className="text-emerald-700 font-bold hover:underline"
            >
              + {f.addChild}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child, index) => {
              const childLastNameVal = validateDvName(
                child.lastName,
                true,
                'Last / Family Name',
                'اسم العائلة / اللقب'
              );
              const childFirstNameVal = validateDvName(
                child.firstName,
                true,
                'First Name',
                'الاسم الأول'
              );
              const childMiddleNameVal = child.hasNoMiddleName
                ? null
                : validateDvName(child.middleName, false, 'Middle Name', 'الاسم الأوسط');
              const childPassportVal = validateDvPassport(
                child.passportNumber || '',
                false
              );
              const childBirthVal = validateDvBirthDate(child.birthDate, 'child');
              const childCityVal = validateDvCity(
                child.birthCity,
                child.birthCityUnknown
              );

              return (
                <div
                  key={child.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {language === 'ar' ? `الابن / الابنة #${index + 1}` : `Child #${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMember(child.id)}
                      className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                      title={f.deleteMember}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Names row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t.personal.lastName} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id={`child-last-name-${child.id}`}
                        type="text"
                        value={child.lastName}
                        onChange={(e) =>
                          updateMember(child.id, {
                            lastName: e.target.value.toUpperCase(),
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            focusFieldById(`child-first-name-${child.id}`);
                          }
                        }}
                        className={`w-full px-3 py-1.5 bg-white border rounded-lg text-sm uppercase outline-none focus:border-blue-500 ${
                          childLastNameVal.severity === 'error'
                            ? 'border-rose-400 bg-rose-50/20'
                            : 'border-slate-300'
                        }`}
                      />
                      <InlineValidationHint result={childLastNameVal} language={language} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t.personal.firstName} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id={`child-first-name-${child.id}`}
                        type="text"
                        value={child.firstName}
                        onChange={(e) =>
                          updateMember(child.id, {
                            firstName: e.target.value.toUpperCase(),
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (child.hasNoMiddleName) {
                              focusFieldById(`child-passport-${child.id}`);
                            } else {
                              focusFieldById(`child-middle-name-${child.id}`);
                            }
                          }
                        }}
                        className={`w-full px-3 py-1.5 bg-white border rounded-lg text-sm uppercase outline-none focus:border-blue-500 ${
                          childFirstNameVal.severity === 'error'
                            ? 'border-rose-400 bg-rose-50/20'
                            : 'border-slate-300'
                        }`}
                      />
                      <InlineValidationHint result={childFirstNameVal} language={language} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t.personal.middleName}
                      </label>
                      <input
                        id={`child-middle-name-${child.id}`}
                        type="text"
                        disabled={child.hasNoMiddleName}
                        value={child.hasNoMiddleName ? '' : child.middleName}
                        onChange={(e) =>
                          updateMember(child.id, {
                            middleName: e.target.value.toUpperCase(),
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            focusFieldById(`child-passport-${child.id}`);
                          }
                        }}
                        className={`w-full px-3 py-1.5 bg-white border rounded-lg text-sm uppercase disabled:bg-slate-100 outline-none focus:border-blue-500 ${
                          childMiddleNameVal?.severity === 'error'
                            ? 'border-rose-400 bg-rose-50/20'
                            : 'border-slate-300'
                        }`}
                      />
                      {childMiddleNameVal && (
                        <InlineValidationHint result={childMiddleNameVal} language={language} />
                      )}
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={child.hasNoMiddleName}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateMember(child.id, {
                              hasNoMiddleName: checked,
                              middleName: checked ? '' : child.middleName,
                            });
                            if (checked && isAutoFocusEnabled()) {
                              focusFieldById(`child-passport-${child.id}`);
                            }
                          }}
                        />
                        <span>{t.personal.noMiddleName}</span>
                      </label>
                    </div>
                  </div>

                  {/* Passport & Gender row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>{f.passportNumber}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({language === 'ar' ? 'اختياري - إن وجد' : 'Optional / If issued'})
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          id={`child-passport-${child.id}`}
                          type="text"
                          maxLength={9}
                          value={child.passportNumber || ''}
                          onChange={(e) => {
                            const formatted = formatPassportNumber(e.target.value);
                            updateMember(child.id, { passportNumber: formatted });
                            if (formatted.length === 9 && isAutoFocusEnabled()) {
                              focusFieldById(`child-day-${child.id}`);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusFieldById(`child-day-${child.id}`);
                            }
                          }}
                          placeholder={language === 'ar' ? 'مثال: A12345678' : 'e.g. A12345678'}
                          className={`w-full px-3 py-1.5 bg-white border rounded-lg text-sm font-mono uppercase tracking-wider outline-none focus:border-blue-500 ${
                            childPassportVal?.severity === 'error'
                              ? 'border-rose-400 bg-rose-50/20'
                              : childPassportVal?.severity === 'valid'
                              ? 'border-emerald-400'
                              : 'border-slate-300'
                          }`}
                        />
                        {childPassportVal?.isValid && child.passportNumber && (
                          <span className="absolute end-3 top-2 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      {childPassportVal && (
                        <InlineValidationHint result={childPassportVal} language={language} />
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t.personal.gender}
                      </label>
                      <select
                        value={child.gender}
                        onChange={(e) =>
                          updateMember(child.id, { gender: e.target.value as Gender })
                        }
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                      >
                        <option value="MALE">{t.personal.male}</option>
                        <option value="FEMALE">{t.personal.female}</option>
                      </select>
                    </div>
                  </div>

                  {/* Birth Date, City, Country row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>{t.personal.birthDate}</span>
                        {child.birthDate && (
                          <span className="text-[10px] font-mono font-semibold text-slate-500">
                            {child.birthDate}
                          </span>
                        )}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        <input
                          id={`child-day-${child.id}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          placeholder="DD"
                          value={child.birthDate ? child.birthDate.split('-')[2] || '' : ''}
                          onChange={(e) => {
                            const dayVal = formatDayInput(e.target.value);
                            const parts = child.birthDate ? child.birthDate.split('-') : ['', '', ''];
                            const y = parts[0] || '2015';
                            const m = parts[1] || '01';
                            const padD = dayVal.length === 1 ? `0${dayVal}` : dayVal;
                            updateMember(child.id, { birthDate: dayVal ? `${y}-${m}-${padD}` : '' });
                            if ((dayVal.length === 2 || (e.target.value.length === 1 && parseInt(e.target.value, 10) >= 4)) && isAutoFocusEnabled()) {
                              focusFieldById(`child-month-${child.id}`);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusFieldById(`child-month-${child.id}`);
                            }
                          }}
                          className="px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-center font-mono font-semibold focus:border-blue-500 outline-none"
                        />
                        <input
                          id={`child-month-${child.id}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          placeholder="MM"
                          value={child.birthDate ? child.birthDate.split('-')[1] || '' : ''}
                          onChange={(e) => {
                            const monthVal = formatMonthInput(e.target.value);
                            const parts = child.birthDate ? child.birthDate.split('-') : ['', '', ''];
                            const y = parts[0] || '2015';
                            const d = parts[2] || '01';
                            const padM = monthVal.length === 1 ? `0${monthVal}` : monthVal;
                            updateMember(child.id, { birthDate: monthVal ? `${y}-${padM}-${d}` : '' });
                            if ((monthVal.length === 2 || (e.target.value.length === 1 && parseInt(e.target.value, 10) >= 2)) && isAutoFocusEnabled()) {
                              focusFieldById(`child-year-${child.id}`);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !child.birthDate?.split('-')[1]) {
                              e.preventDefault();
                              focusFieldById(`child-day-${child.id}`);
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              focusFieldById(`child-year-${child.id}`);
                            }
                          }}
                          className="px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-center font-mono font-semibold focus:border-blue-500 outline-none"
                        />
                        <input
                          id={`child-year-${child.id}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="YYYY"
                          value={child.birthDate ? child.birthDate.split('-')[0] || '' : ''}
                          onChange={(e) => {
                            const yearVal = formatYearInput(e.target.value);
                            const parts = child.birthDate ? child.birthDate.split('-') : ['', '', ''];
                            const m = parts[1] || '01';
                            const d = parts[2] || '01';
                            updateMember(child.id, { birthDate: yearVal ? `${yearVal}-${m}-${d}` : '' });
                            if (yearVal.length === 4 && parseInt(yearVal, 10) >= 2000 && isAutoFocusEnabled()) {
                              focusFieldById(`child-city-${child.id}`);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !child.birthDate?.split('-')[0]) {
                              e.preventDefault();
                              focusFieldById(`child-month-${child.id}`);
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              focusFieldById(`child-city-${child.id}`);
                            }
                          }}
                          className="px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-center font-mono font-semibold focus:border-blue-500 outline-none"
                        />
                      </div>
                      <InlineValidationHint result={childBirthVal} language={language} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t.personal.birthCity}
                      </label>
                      <CityAutocomplete
                        id={`child-city-${child.id}`}
                        name={`child-city-${child.id}`}
                        autoComplete="address-level2"
                        value={child.birthCity}
                        country={child.birthCountry}
                        onChange={(val) =>
                          updateMember(child.id, { birthCity: val })
                        }
                        onSelectAdvance={() => {
                          if (isAutoFocusEnabled()) {
                            focusFieldById(`child-country-${child.id}`);
                          }
                        }}
                        placeholder="City"
                      />
                      <InlineValidationHint result={childCityVal} language={language} />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t.personal.birthCountry}
                      </label>
                      <CountryAutocomplete
                        id={`child-country-${child.id}`}
                        name={`child-country-${child.id}`}
                        autoComplete="country-name"
                        value={child.birthCountry}
                        onChange={(countryName) =>
                          updateMember(child.id, { birthCountry: countryName })
                        }
                        language={language}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default StepFamilyMembers;
