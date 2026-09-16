import { Applicant } from '../types';

const STORAGE_KEY = 'dvprep_applicants_v1';
const ACTIVE_ID_KEY = 'dvprep_active_id_v1';

export const INITIAL_APPLICANT: Applicant = {
  id: 'app-sample-001',
  createdAt: '2026-09-15T12:00:00.000Z',
  updatedAt: '2026-09-15T12:30:00.000Z',
  status: 'REVIEWING',
  programYear: 2026,

  lastName: 'AL-ERYANI',
  firstName: 'TAHA',
  middleName: 'MOHAMMED',
  hasNoMiddleName: false,
  passportNumber: '08123456',

  gender: 'MALE',
  birthDate: '1992-05-15',

  birthCity: 'Sanaa',
  birthCityUnknown: false,
  birthCountry: 'Yemen',

  isEligibleBasedOnBirthCountry: true,
  alternateCountryOfEligibility: '',

  inCareOf: '',
  addressLine1: 'Hadda Street, Near Diplomatic Quarter',
  addressLine2: 'As Sabin District, Bldg 12',
  cityTown: 'Sanaa',
  districtCountyProvinceState: 'Amanat Al Asimah (Sanaa)',
  postalCode: '11000',
  noPostalCode: false,
  country: 'Yemen',

  currentCountry: 'Yemen',
  phoneNumber: '+967771234567',
  email: 'taha.aleryani.dv2026@gmail.com',
  emailConfirmation: 'taha.aleryani.dv2026@gmail.com',

  highestEducation: 'UNIVERSITY_DEGREE',
  qualifyingWorkExperience: true,
  occupationTitle: 'Software Systems Engineer',
  jobZoneYears: 5,

  maritalStatus: 'MARRIED_NON_US',
  numberOfChildren: 1,

  familyMembers: [
    {
      id: 'fam-spouse-001',
      relationship: 'SPOUSE',
      lastName: 'AL-ERYANI',
      firstName: 'FATIMA',
      middleName: 'ALI',
      hasNoMiddleName: false,
      gender: 'FEMALE',
      birthDate: '1994-08-20',
      birthCity: 'Aden',
      birthCityUnknown: false,
      birthCountry: 'Yemen',
      passportNumber: '08765432',
    },
    {
      id: 'fam-child-001',
      relationship: 'CHILD',
      lastName: 'AL-ERYANI',
      firstName: 'OMAR',
      middleName: 'TAHA',
      hasNoMiddleName: false,
      gender: 'MALE',
      birthDate: '2021-03-10',
      birthCity: 'Taiz',
      birthCityUnknown: false,
      birthCountry: 'Yemen',
      passportNumber: '08988776',
    },
  ],

  mrzData: {
    documentNumber: '08123456',
    documentType: 'P',
    issuingCountry: 'YEM',
    nationality: 'YEM',
    lastName: 'AL-ERYANI',
    firstName: 'TAHA',
    birthDate: '1992-05-15',
    gender: 'MALE',
    expiryDate: '2031-10-25',
    validChecksum: true,
  },

  legalAcknowledged: true,
  ethicsAcknowledged: true,

  officialSubmissionDate: '',
  confirmationNumber: '',
  submissionNotes: 'All passport details verified against official MRZ strip and Yemeni Republic passport standards.',

  hasPendingSync: false,
  lastSyncedAt: '2026-09-15T12:30:00.000Z',
};

export function getStoredApplicants(): Applicant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = [INITIAL_APPLICANT];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_APPLICANT];
  } catch (err) {
    console.error('Failed to load stored applicants:', err);
    return [INITIAL_APPLICANT];
  }
}

export function saveStoredApplicants(applicants: Applicant[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applicants));
  } catch (err) {
    console.error('Failed to save applicants to storage:', err);
  }
}

export function getActiveApplicantId(): string {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY) || INITIAL_APPLICANT.id;
  } catch {
    return INITIAL_APPLICANT.id;
  }
}

export function saveActiveApplicantId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  } catch (err) {
    console.error('Failed to save active applicant id:', err);
  }
}

export function createNewApplicant(): Applicant {
  const newId = `app-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  return {
    id: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'DRAFT',
    programYear: 2026,

    lastName: '',
    firstName: '',
    middleName: '',
    hasNoMiddleName: false,

    gender: 'MALE',
    birthDate: '',

    birthCity: '',
    birthCityUnknown: false,
    birthCountry: 'Yemen',

    isEligibleBasedOnBirthCountry: true,
    alternateCountryOfEligibility: '',

    inCareOf: '',
    addressLine1: '',
    addressLine2: '',
    cityTown: '',
    districtCountyProvinceState: '',
    postalCode: '',
    noPostalCode: false,
    country: 'Yemen',

    currentCountry: 'Yemen',
    phoneNumber: '',
    email: '',
    emailConfirmation: '',

    highestEducation: 'HIGH_SCHOOL_DEGREE',
    qualifyingWorkExperience: false,
    occupationTitle: '',
    jobZoneYears: 0,

    maritalStatus: 'UNMARRIED',
    numberOfChildren: 0,

    familyMembers: [],
    legalAcknowledged: false,
    ethicsAcknowledged: false,
    hasPendingSync: false,
  };
}
