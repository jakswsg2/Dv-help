import { PassportMRZData } from '../types';

// Weight factor sequence for ICAO 9303: 7, 3, 1 repeating
const WEIGHTS = [7, 3, 1];

function charValue(c: string): number {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55;
  if (c === '<') return 0;
  return 0;
}

export function computeCheckDigit(str: string): number {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const val = charValue(str[i]);
    const weight = WEIGHTS[i % 3];
    sum += val * weight;
  }
  return sum % 10;
}

export function parseMRZ(rawInput: string): PassportMRZData | null {
  const lines = rawInput
    .split(/\r?\n/)
    .map((l) => l.trim().toUpperCase())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return null;
  }

  // Ensure lines are padded or sliced to 44 characters for TD3
  let line1 = lines[0].padEnd(44, '<').substring(0, 44);
  let line2 = lines[1].padEnd(44, '<').substring(0, 44);

  // If first char is not P, check if another line is line 1
  if (!line1.startsWith('P') && lines.length >= 3) {
    const pIdx = lines.findIndex((l) => l.startsWith('P'));
    if (pIdx !== -1 && pIdx + 1 < lines.length) {
      line1 = lines[pIdx].padEnd(44, '<').substring(0, 44);
      line2 = lines[pIdx + 1].padEnd(44, '<').substring(0, 44);
    }
  }

  const documentType = line1.substring(0, 2).replace(/</g, '');
  const issuingCountry = line1.substring(2, 5).replace(/</g, '');
  const namesSection = line1.substring(5);
  const nameParts = namesSection.split('<<');
  const lastName = (nameParts[0] || '').replace(/</g, ' ').trim();
  const givenNames = (nameParts[1] || '').split('<').filter(Boolean);
  const firstName = givenNames[0] || '';
  const middleName = givenNames.slice(1).join(' ');

  // Line 2
  const docNumberRaw = line2.substring(0, 9);
  const docNumberCheck = line2.charAt(9);
  const documentNumber = docNumberRaw.replace(/</g, '').trim();

  const nationality = line2.substring(10, 13).replace(/</g, '');

  const dobRaw = line2.substring(13, 19);
  const dobCheck = line2.charAt(19);

  const genderRaw = line2.charAt(20);
  const gender = genderRaw === 'M' ? 'MALE' : genderRaw === 'F' ? 'FEMALE' : 'UNKNOWN';

  const expiryRaw = line2.substring(21, 27);
  const expiryCheck = line2.charAt(27);

  const personalNumber = line2.substring(28, 42).replace(/</g, '').trim();

  // Validate check digits
  const isDocValid = computeCheckDigit(docNumberRaw) === parseInt(docNumberCheck, 10);
  const isDobValid = computeCheckDigit(dobRaw) === parseInt(dobCheck, 10);
  const isExpValid = computeCheckDigit(expiryRaw) === parseInt(expiryCheck, 10);

  // Format DOB (YYMMDD -> YYYY-MM-DD)
  // For DV lottery, applicants are born between 1940 and 2015
  let birthYear = parseInt(dobRaw.substring(0, 2), 10);
  birthYear = birthYear > 30 ? 1900 + birthYear : 2000 + birthYear;
  const birthMonth = dobRaw.substring(2, 4);
  const birthDay = dobRaw.substring(4, 6);
  const formattedDob = `${birthYear}-${birthMonth}-${birthDay}`;

  // Format Expiry (YYMMDD -> YYYY-MM-DD)
  let expYear = parseInt(expiryRaw.substring(0, 2), 10);
  expYear = 2000 + expYear;
  const expMonth = expiryRaw.substring(2, 4);
  const expDay = expiryRaw.substring(4, 6);
  const formattedExpiry = `${expYear}-${expMonth}-${expDay}`;

  return {
    documentType: documentType || 'P',
    issuingCountry,
    nationality,
    lastName,
    firstName,
    middleName: middleName || undefined,
    documentNumber,
    birthDate: formattedDob,
    gender,
    expiryDate: formattedExpiry,
    personalNumber: personalNumber || undefined,
    validChecksum: isDocValid && isDobValid && isExpValid,
    rawText: `${line1}\n${line2}`,
  };
}

export const SAMPLE_MRZ = `P<EGYMOHAMED<<AHMED<HASSAN<<<<<<<<<<<<<<<<<<
A123456783EGY9205156M3110258<<<<<<<<<<<<<<<4`;
