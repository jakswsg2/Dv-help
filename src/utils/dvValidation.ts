/**
 * DV Lottery (DS-5501) & ICAO Doc 9303 Standard Validation Utilities.
 * Provides granular inline validation logic and bilingual error/warning messages.
 */

export interface ValidationResult {
  isValid: boolean;
  severity: 'error' | 'warning' | 'valid';
  messageEn?: string;
  messageAr?: string;
}

const LATIN_NAME_REGEX = /^[A-Za-z\s\-'.]+$/;
const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;
const DIGIT_REGEX = /[0-9]/;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PASSPORT_CHAR_REGEX = /^[A-Z0-9]+$/;

/**
 * Validates names (Last Name, First Name, Middle Name) according to DS-5501 standards.
 */
export function validateDvName(
  val: string,
  isRequired: boolean,
  fieldLabelEn: string,
  fieldLabelAr: string
): ValidationResult {
  const trimmed = val ? val.trim() : '';

  if (!trimmed) {
    if (isRequired) {
      return {
        isValid: false,
        severity: 'error',
        messageEn: `${fieldLabelEn} is required matching your passport in English.`,
        messageAr: `${fieldLabelAr} إلزامي تماماً كما في جواز السفر بالأحرف الإنجليزية.`,
      };
    }
    return { isValid: true, severity: 'valid' };
  }

  if (ARABIC_CHAR_REGEX.test(trimmed)) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'English (Latin) alphabet only (A-Z). Arabic characters are not accepted by DS-5501.',
      messageAr: 'أحرف لاتينية إنجليزية فقط (A-Z). لا تقبل استمارة DS-5501 الحروف العربية.',
    };
  }

  if (DIGIT_REGEX.test(trimmed)) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Numbers are not permitted in names.',
      messageAr: 'الأرقام غير مسموح بها في الأسماء.',
    };
  }

  if (!LATIN_NAME_REGEX.test(trimmed)) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Only letters, hyphens, spaces, and apostrophes are allowed.',
      messageAr: 'يُسمح فقط بالحروف اللاتينية والواصلات والمسافات والفواصل العلوية.',
    };
  }

  return { isValid: true, severity: 'valid' };
}

/**
 * Validates passport number according to ICAO Doc 9303 TD3 standard (6-9 alphanumeric characters).
 */
export function validateDvPassport(
  docNumber: string,
  isRequired: boolean = false
): ValidationResult {
  const clean = docNumber ? docNumber.trim().toUpperCase() : '';

  if (!clean) {
    if (isRequired) {
      return {
        isValid: false,
        severity: 'error',
        messageEn: 'Passport / Travel document number is required.',
        messageAr: 'رقم جواز السفر / وثيقة السفر مطلوب.',
      };
    }
    return { isValid: true, severity: 'valid' };
  }

  if (!PASSPORT_CHAR_REGEX.test(clean)) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Alphanumeric only (A-Z, 0-9). Spaces and symbols are not permitted in ICAO standard.',
      messageAr: 'أحرف وأرقام إنجليزية فقط (A-Z, 0-9). غير مسموح بالمسافات أو الرموز الخاصة.',
    };
  }

  if (clean.length < 6) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: `Passport number too short (${clean.length}/6 min characters). Standard requires 6-9 characters.`,
      messageAr: `رقم الجواز قصير جداً (${clean.length}/6 خانات كحد أدنى). يتطلب المعيار الدولي من 6 إلى 9 خانات.`,
    };
  }

  if (clean.length > 9) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: `Passport number cannot exceed 9 characters (${clean.length}/9 max characters).`,
      messageAr: `رقم الجواز لا يمكن أن يتجاوز 9 خانات (${clean.length}/9 خانات كحد أقصى).`,
    };
  }

  return {
    isValid: true,
    severity: 'valid',
    messageEn: 'Valid ICAO Doc 9303 format',
    messageAr: 'تنسيق معتمد وفق معيار ICAO 9303',
  };
}

/**
 * Validates date of birth according to standard calendar and DV lottery age constraints:
 * - Entrants: warning if age < 18 (education / work experience requirement)
 * - Derivative Children: MUST BE < 21 years old on entry date
 */
export function validateDvBirthDate(
  dateStr: string,
  role: 'entrant' | 'spouse' | 'child'
): ValidationResult {
  if (!dateStr || !dateStr.trim()) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Date of birth is required (Day, Month, 4-digit Year).',
      messageAr: 'تاريخ الميلاد إلزامي (اليوم، الشهر، والسنة رباعية الأرقام).',
    };
  }

  const parts = dateStr.split('-');
  const yStr = parts[0] || '';
  const mStr = parts[1] || '';
  const dStr = parts[2] || '';

  if (!yStr || !mStr || !dStr || yStr.length < 4 || dStr.length === 0 || mStr.length === 0) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Incomplete date. Please complete Day (DD), Month (MM), and Year (YYYY).',
      messageAr: 'تاريخ غير مكتمل. يرجى إدخال اليوم (DD) والشهر (MM) والسنة (YYYY) كاملة.',
    };
  }

  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Invalid date values. Please use numbers.',
      messageAr: 'قيم تاريخ غير صحيحة. يرجى استخدام الأرقام.',
    };
  }

  if (m < 1 || m > 12) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Month must be between 01 and 12.',
      messageAr: 'يجب أن يكون الشهر بين 01 و 12.',
    };
  }

  const daysInMonth = new Date(y, m, 0).getDate();
  if (d < 1 || d > daysInMonth) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: `Day must be between 01 and ${daysInMonth} for this month.`,
      messageAr: `يجب أن يكون اليوم بين 01 و ${daysInMonth} لهذا الشهر.`,
    };
  }

  const currentYear = new Date().getFullYear();
  if (y < 1920 || y > currentYear) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: `Year must be between 1920 and ${currentYear}.`,
      messageAr: `يجب أن تكون السنة بين 1920 و ${currentYear}.`,
    };
  }

  const birthDateObj = new Date(y, m - 1, d);
  const today = new Date();
  if (birthDateObj > today) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Birth date cannot be in the future.',
      messageAr: 'لا يمكن أن يكون تاريخ الميلاد في المستقبل.',
    };
  }

  // Age calculation
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }

  // Role-based DV rules
  if (role === 'child') {
    if (age >= 21) {
      return {
        isValid: false,
        severity: 'error',
        messageEn: `Disqualification risk: Child is ${age} years old. Per official DV rules, derivative children MUST be unmarried and under 21 on the entry date.`,
        messageAr: `خطر استبعاد الطلب: عمر الابن/الابنة ${age} عاماً. تشترط القرعة رسمياً أن يكون الأبناء دون سن 21 عاماً وغير متزوجين بتاريخ التقديم.`,
      };
    }
    if (age >= 20.5) {
      return {
        isValid: true,
        severity: 'warning',
        messageEn: `Notice: Child is ${age} years old and nearing the age limit of 21.`,
        messageAr: `تنبيه: الابن/الابنة بعمر ${age} عاماً ويقترب من الحد الأقصى للعمر (21 عاماً).`,
      };
    }
  } else if (role === 'entrant') {
    if (age < 18) {
      return {
        isValid: true,
        severity: 'warning',
        messageEn: `Primary entrant is ${age} years old. Ensure you meet the high school diploma or qualifying work experience requirement.`,
        messageAr: `عمر المتقدم الأساسي ${age} عاماً. تأكد من استيفاء شرط إتمام الثانوية العامة أو سنتين من الخبرة المهنية المؤهلة.`,
      };
    }
  } else if (role === 'spouse') {
    if (age < 16) {
      return {
        isValid: true,
        severity: 'warning',
        messageEn: `Spouse age (${age} years) is unusually young. Verify legal marriage age.`,
        messageAr: `عمر الزوج/الزوجة (${age} عاماً) صغير. يرجى التأكد من استيفاء السن القانوني للزواج.`,
      };
    }
  }

  return { isValid: true, severity: 'valid' };
}

/**
 * Validates email format.
 */
export function validateDvEmail(email: string): ValidationResult {
  const trimmed = email ? email.trim() : '';

  if (!trimmed) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Email address is required for official State Dept notifications.',
      messageAr: 'البريد الإلكتروني إلزامي لإشعارات وزارة الخارجية الرسمية.',
    };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Invalid email format (example: applicant@domain.com).',
      messageAr: 'صيغة بريد غير صحيحة (مثال: applicant@domain.com).',
    };
  }

  return { isValid: true, severity: 'valid' };
}

/**
 * Validates email confirmation match.
 */
export function validateDvEmailConfirmation(
  email: string,
  confirmEmail: string
): ValidationResult {
  const primary = email ? email.trim().toLowerCase() : '';
  const confirm = confirmEmail ? confirmEmail.trim().toLowerCase() : '';

  if (!confirm) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Email confirmation is required.',
      messageAr: 'تأكيد البريد الإلكتروني إلزامي.',
    };
  }

  if (primary !== confirm) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Email addresses do not match exactly.',
      messageAr: 'عنوان البريد الإلكتروني وتأكيده غير متطابقين تماماً.',
    };
  }

  return { isValid: true, severity: 'valid' };
}

/**
 * Validates city name.
 */
export function validateDvCity(
  city: string,
  isUnknown: boolean
): ValidationResult {
  if (isUnknown) {
    return { isValid: true, severity: 'valid' };
  }

  const trimmed = city ? city.trim() : '';
  if (!trimmed) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'City of birth is required (or check "Unknown").',
      messageAr: 'مدينة الولادة إلزامية (أو حدد خانة "غير معروفة").',
    };
  }

  if (ARABIC_CHAR_REGEX.test(trimmed)) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Latin English letters only (A-Z). Arabic letters are not accepted.',
      messageAr: 'أحرف لاتينية إنجليزية فقط (A-Z). الحروف العربية غير مقبولة.',
    };
  }

  return { isValid: true, severity: 'valid' };
}

/**
 * Validates address fields for Latin-only requirements.
 */
export function validateDvAddressField(
  val: string,
  isRequired: boolean,
  fieldNameEn: string,
  fieldNameAr: string
): ValidationResult {
  const trimmed = val ? val.trim() : '';

  if (!trimmed) {
    if (isRequired) {
      return {
        isValid: false,
        severity: 'error',
        messageEn: `${fieldNameEn} is required.`,
        messageAr: `${fieldNameAr} إلزامي.`,
      };
    }
    return { isValid: true, severity: 'valid' };
  }

  if (ARABIC_CHAR_REGEX.test(trimmed)) {
    return {
      isValid: false,
      severity: 'error',
      messageEn: 'Latin English alphabet only. State Dept forms require standard English characters.',
      messageAr: 'أحرف لاتينية إنجليزية فقط. تتطلب نماذج الخارجية الأمريكية حروفاً إنجليزية قياسية.',
    };
  }

  return { isValid: true, severity: 'valid' };
}
