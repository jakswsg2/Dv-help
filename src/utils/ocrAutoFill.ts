import { Applicant, PassportMRZData } from '../types';
import { ISO_COUNTRIES } from '../data/countries';

export interface OcrCandidateField {
  id: string;
  key: string;
  labelEn: string;
  labelAr: string;
  currentDisplay: string;
  ocrDisplay: string;
  status: 'NEW' | 'OVERWRITE' | 'IDENTICAL';
  differs: boolean;
  applyValues: Partial<Applicant>;
}

export function resolveCountryFromCode(codeOrName?: string): { code: string; nameEn: string; nameAr: string } | null {
  if (!codeOrName) return null;
  const trimmed = codeOrName.trim().toUpperCase();
  const match = ISO_COUNTRIES.find(
    (c) =>
      c.code.toUpperCase() === trimmed ||
      c.nameEn.toUpperCase() === trimmed ||
      c.nameAr === codeOrName.trim()
  );
  if (match) {
    return { code: match.code, nameEn: match.nameEn, nameAr: match.nameAr };
  }
  return null;
}

export function getOcrCandidateFields(
  applicant: Applicant,
  mrzData?: PassportMRZData | null
): OcrCandidateField[] {
  const mrz = mrzData || applicant.mrzData;
  if (!mrz) return [];

  const candidates: OcrCandidateField[] = [];

  // 1. Last Name
  if (mrz.lastName && mrz.lastName.trim()) {
    const ocrVal = mrz.lastName.trim().toUpperCase();
    const currentVal = (applicant.lastName || '').trim().toUpperCase();
    const isNew = !currentVal;
    const differs = currentVal !== ocrVal;
    candidates.push({
      id: 'lastName',
      key: 'lastName',
      labelEn: 'Last / Family Name',
      labelAr: 'اسم العائلة / اللقب',
      currentDisplay: applicant.lastName || '—',
      ocrDisplay: ocrVal,
      status: isNew ? 'NEW' : differs ? 'OVERWRITE' : 'IDENTICAL',
      differs,
      applyValues: { lastName: ocrVal },
    });
  }

  // 2. First Name
  if (mrz.firstName && mrz.firstName.trim()) {
    const ocrVal = mrz.firstName.trim().toUpperCase();
    const currentVal = (applicant.firstName || '').trim().toUpperCase();
    const isNew = !currentVal;
    const differs = currentVal !== ocrVal;
    candidates.push({
      id: 'firstName',
      key: 'firstName',
      labelEn: 'First Name',
      labelAr: 'الاسم الأول',
      currentDisplay: applicant.firstName || '—',
      ocrDisplay: ocrVal,
      status: isNew ? 'NEW' : differs ? 'OVERWRITE' : 'IDENTICAL',
      differs,
      applyValues: { firstName: ocrVal },
    });
  }

  // 3. Middle Name
  const ocrMiddle = (mrz.middleName || '').trim().toUpperCase();
  const currentMiddle = applicant.hasNoMiddleName ? '' : (applicant.middleName || '').trim().toUpperCase();
  const middleDiffers =
    Boolean(ocrMiddle && currentMiddle !== ocrMiddle) ||
    Boolean(!ocrMiddle && !applicant.hasNoMiddleName && currentMiddle);

  candidates.push({
    id: 'middleName',
    key: 'middleName',
    labelEn: 'Middle Name',
    labelAr: 'الاسم الأوسط',
    currentDisplay: applicant.hasNoMiddleName
      ? 'No Middle Name (N/A)'
      : applicant.middleName || '—',
    ocrDisplay: ocrMiddle || 'None (No Middle Name)',
    status: !currentMiddle && !applicant.hasNoMiddleName && ocrMiddle ? 'NEW' : middleDiffers ? 'OVERWRITE' : 'IDENTICAL',
    differs: middleDiffers,
    applyValues: ocrMiddle
      ? { middleName: ocrMiddle, hasNoMiddleName: false }
      : { middleName: '', hasNoMiddleName: true },
  });

  // 4. Gender
  if (mrz.gender) {
    const ocrGender = mrz.gender === 'FEMALE' ? 'FEMALE' : 'MALE';
    const currentGender = applicant.gender;
    const differs = currentGender !== ocrGender;
    candidates.push({
      id: 'gender',
      key: 'gender',
      labelEn: 'Gender',
      labelAr: 'الجنس',
      currentDisplay: applicant.gender === 'MALE' ? 'Male (ذكر)' : 'Female (أنثى)',
      ocrDisplay: ocrGender === 'MALE' ? 'Male (ذكر)' : 'Female (أنثى)',
      status: differs ? 'OVERWRITE' : 'IDENTICAL',
      differs,
      applyValues: { gender: ocrGender },
    });
  }

  // 5. Date of Birth
  if (mrz.birthDate && mrz.birthDate.trim()) {
    const ocrDob = mrz.birthDate.trim();
    const currentDob = (applicant.birthDate || '').trim();
    const isNew = !currentDob;
    const differs = currentDob !== ocrDob;
    candidates.push({
      id: 'birthDate',
      key: 'birthDate',
      labelEn: 'Date of Birth (YYYY-MM-DD)',
      labelAr: 'تاريخ الميلاد (السنة-الشهر-اليوم)',
      currentDisplay: applicant.birthDate || '—',
      ocrDisplay: ocrDob,
      status: isNew ? 'NEW' : differs ? 'OVERWRITE' : 'IDENTICAL',
      differs,
      applyValues: { birthDate: ocrDob },
    });
  }

  // 6. Birth Country (from nationality or issuingCountry)
  const resolvedCountry =
    resolveCountryFromCode(mrz.nationality) ||
    resolveCountryFromCode(mrz.issuingCountry);

  if (resolvedCountry) {
    const ocrCountryName = resolvedCountry.nameEn;
    const currentCountry = (applicant.birthCountry || '').trim();
    const isNew = !currentCountry;
    const differs = currentCountry.toUpperCase() !== ocrCountryName.toUpperCase();
    candidates.push({
      id: 'birthCountry',
      key: 'birthCountry',
      labelEn: 'Birth Country (from Nationality)',
      labelAr: 'دولة الميلاد (استناداً للجنسية)',
      currentDisplay: applicant.birthCountry || '—',
      ocrDisplay: `${resolvedCountry.nameEn} (${resolvedCountry.nameAr}) [${resolvedCountry.code}]`,
      status: isNew ? 'NEW' : differs ? 'OVERWRITE' : 'IDENTICAL',
      differs,
      applyValues: {
        birthCountry: resolvedCountry.nameEn,
        isEligibleBasedOnBirthCountry: true,
      },
    });
  }

  // 7. Passport Number
  if (mrz.documentNumber && mrz.documentNumber.trim()) {
    const ocrDoc = mrz.documentNumber.trim().toUpperCase();
    const currentDoc = (applicant.passportNumber || '').trim().toUpperCase();
    const isNew = !currentDoc;
    const differs = currentDoc !== ocrDoc;
    candidates.push({
      id: 'passportNumber',
      key: 'passportNumber',
      labelEn: 'Passport / Travel Document Number',
      labelAr: 'رقم وثيقة السفر / الجواز',
      currentDisplay: applicant.passportNumber || '—',
      ocrDisplay: ocrDoc,
      status: isNew ? 'NEW' : differs ? 'OVERWRITE' : 'IDENTICAL',
      differs,
      applyValues: {
        passportNumber: ocrDoc,
      },
    });
  }

  return candidates;
}

export function countOcrDifferences(
  applicant: Applicant,
  mrzData?: PassportMRZData | null
): { total: number; differsCount: number; newCount: number; identicalCount: number } {
  const fields = getOcrCandidateFields(applicant, mrzData);
  const differsCount = fields.filter((f) => f.status === 'OVERWRITE').length;
  const newCount = fields.filter((f) => f.status === 'NEW').length;
  const identicalCount = fields.filter((f) => f.status === 'IDENTICAL').length;
  return {
    total: fields.length,
    differsCount,
    newCount,
    identicalCount,
  };
}
