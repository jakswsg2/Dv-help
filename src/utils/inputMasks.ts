/**
 * Input formatting, masking, and validation utilities for DV Lottery / Passport standards (ICAO 9303 & DS-5501).
 */

export interface DateOfBirthParts {
  day: string;
  month: string;
  year: string;
  formatted: string; // YYYY-MM-DD
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Strips non-numeric characters and formats into standard DD/MM/YYYY or parses into parts.
 */
export function formatDayInput(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 2);
  return digits;
}

export function formatMonthInput(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 2);
  return digits;
}

export function formatYearInput(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  return digits;
}

/**
 * Validates day, month, year according to calendar rules and reasonable birth year ranges.
 */
export function validateDateOfBirth(dayStr: string, monthStr: string, yearStr: string): {
  isValid: boolean;
  isoDate: string;
  age?: number;
  error?: string;
} {
  if (!dayStr || !monthStr || !yearStr) {
    return { isValid: false, isoDate: '', error: 'Incomplete date' };
  }

  const d = parseInt(dayStr, 10);
  const m = parseInt(monthStr, 10);
  const y = parseInt(yearStr, 10);

  if (isNaN(d) || isNaN(m) || isNaN(y)) {
    return { isValid: false, isoDate: '', error: 'Invalid numeric values' };
  }

  if (m < 1 || m > 12) {
    return { isValid: false, isoDate: '', error: 'Month must be between 01 and 12' };
  }

  // Days in month calculation (including leap year check for Feb)
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d < 1 || d > daysInMonth) {
    return { isValid: false, isoDate: '', error: `Day must be between 01 and ${daysInMonth}` };
  }

  const currentYear = new Date().getFullYear();
  if (y < 1920 || y > currentYear) {
    return { isValid: false, isoDate: '', error: `Year must be between 1920 and ${currentYear}` };
  }

  const padD = String(d).padStart(2, '0');
  const padM = String(m).padStart(2, '0');
  const padY = String(y).padStart(4, '0');
  const isoDate = `${padY}-${padM}-${padD}`;

  const birthDateObj = new Date(y, m - 1, d);
  const today = new Date();
  if (birthDateObj > today) {
    return { isValid: false, isoDate, error: 'Birth date cannot be in the future' };
  }

  const ageDifMs = today.getTime() - birthDateObj.getTime();
  const ageDate = new Date(ageDifMs);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);

  return { isValid: true, isoDate, age };
}

/**
 * Formats full Date string input (e.g. user types "15081992" or "15/08/1992") with auto-masking DD/MM/YYYY.
 */
export function maskDateInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Passport number auto-formatter conforming strictly to ICAO Doc 9303 standards:
 * - Upper case only
 * - Alphanumeric characters only (A-Z, 0-9)
 * - Removes spaces, hyphens, and invalid symbols
 * - Truncates to standard international max length (9 characters for standard TD3 MRZ doc numbers)
 */
export function formatPassportNumber(rawInput: string): string {
  if (!rawInput) return '';
  return rawInput
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 9);
}

/**
 * Validates passport number according to ICAO 9303 specifications.
 */
export function validatePassportNumber(docNum: string): {
  isValid: boolean;
  message?: string;
} {
  const clean = formatPassportNumber(docNum);
  if (!clean) {
    return { isValid: false, message: 'Passport number is required' };
  }
  if (clean.length < 6) {
    return { isValid: false, message: 'Passport number must be at least 6 characters' };
  }
  if (clean.length > 9) {
    return { isValid: false, message: 'Passport number cannot exceed 9 characters' };
  }
  // Standard format check: typically starts with 1-2 letters followed by numbers, or 9 alphanumeric characters
  return { isValid: true };
}

/**
 * Masks and auto-formats phone number international prefix style (+1234567890...)
 */
export function formatPhoneNumber(val: string): string {
  let cleaned = val.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
  } else {
    cleaned = cleaned.replace(/\+/g, '');
  }
  return cleaned.slice(0, 18);
}
