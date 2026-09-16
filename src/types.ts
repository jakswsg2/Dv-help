export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';

export type Gender = 'MALE' | 'FEMALE';

export type MaritalStatus =
  | 'UNMARRIED'
  | 'MARRIED_NON_US'
  | 'MARRIED_US'
  | 'DIVORCED'
  | 'WIDOWED'
  | 'LEGALLY_SEPARATED';

export type EducationLevel =
  | 'PRIMARY_ONLY'
  | 'HIGH_SCHOOL_NO_DEGREE'
  | 'HIGH_SCHOOL_DEGREE'
  | 'VOCATIONAL_SCHOOL'
  | 'SOME_UNIVERSITY'
  | 'UNIVERSITY_DEGREE'
  | 'SOME_GRADUATE'
  | 'MASTERS_DEGREE'
  | 'SOME_DOCTORATE'
  | 'DOCTORATE_DEGREE';

export type ApplicantStatus =
  | 'DRAFT'
  | 'REVIEWING'
  | 'PHOTOS_VERIFIED'
  | 'READY_FOR_SUBMISSION'
  | 'SUBMITTED';

export type BrightnessStatus = 'TOO_DARK' | 'OPTIMAL' | 'WASHED_OUT';

export interface BrightnessAnalysis {
  avg: number;
  faceAvg: number;
  status: BrightnessStatus;
  underexposedRatio: number;
  overexposedRatio: number;
  ratingMessage: string;
}

export interface PhotoData {
  dataUrl: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  isSquare: boolean;
  isSizeOk: boolean;
  sharpnessScore: number;
  brightnessAvg: number;
  brightnessStatus?: BrightnessStatus;
  brightnessAnalysis?: BrightnessAnalysis;
  isInspected: boolean;
  notes: string[];
}

export interface FamilyMember {
  id: string;
  relationship: 'SPOUSE' | 'CHILD';
  lastName: string;
  firstName: string;
  middleName: string;
  hasNoMiddleName: boolean;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  birthCity: string;
  birthCityUnknown: boolean;
  birthCountry: string;
  photo?: PhotoData;
  passportNumber?: string;
}

export interface PassportMRZData {
  documentNumber: string;
  documentType: string;
  issuingCountry: string;
  nationality: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate: string; // YYYY-MM-DD
  gender: string;
  expiryDate: string; // YYYY-MM-DD
  personalNumber?: string;
  validChecksum: boolean;
  rawText?: string;
}

export interface Applicant {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ApplicantStatus;
  programYear: number; // e.g. 2026

  // 1. Name & Passport
  lastName: string;
  firstName: string;
  middleName: string;
  hasNoMiddleName: boolean;
  passportNumber?: string;

  // 2. Gender
  gender: Gender;

  // 3. Birth Date
  birthDate: string; // YYYY-MM-DD

  // 4. City Where You Were Born
  birthCity: string;
  birthCityUnknown: boolean;

  // 5. Country Where You Were Born
  birthCountry: string;

  // 6. Country of Eligibility
  isEligibleBasedOnBirthCountry: boolean;
  alternateCountryOfEligibility: string;

  // 7. Entrant Photograph
  photo?: PhotoData;

  // 8. Mailing Address
  inCareOf: string;
  addressLine1: string;
  addressLine2: string;
  cityTown: string;
  districtCountyProvinceState: string;
  postalCode: string;
  noPostalCode: boolean;
  country: string;

  // 9. Country Where You Live Today
  currentCountry: string;

  // 10. Phone Number
  phoneNumber: string;

  // 11. E-mail Address
  email: string;
  emailConfirmation: string;

  // 12. Education Level
  highestEducation: EducationLevel;
  qualifyingWorkExperience: boolean;
  occupationTitle: string;
  jobZoneYears: number;

  // 13. Marital Status
  maritalStatus: MaritalStatus;

  // 14. Number of Children
  numberOfChildren: number;

  // Derivatives
  familyMembers: FamilyMember[];

  // Document OCR Data
  mrzData?: PassportMRZData;

  // Legal Acknowledgements
  legalAcknowledged: boolean;
  ethicsAcknowledged: boolean;

  // Official Submission Prep
  officialSubmissionDate?: string;
  confirmationNumber?: string;
  submissionNotes?: string;

  // Network Sync Tracking
  hasPendingSync?: boolean;
  lastSyncedAt?: string;
}

export interface ConsistencyIssue {
  id: string;
  field: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  suggestion: string;
}

export type AppStep =
  | 'PERSONAL'
  | 'FAMILY'
  | 'DOCUMENTS'
  | 'PHOTO'
  | 'ELIGIBILITY'
  | 'CONSISTENCY'
  | 'OFFICIAL_PREP';
