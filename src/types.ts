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
/* ==========================================================================
 * Identity, Roles & Multi-Tenant Workspace Model
 * ==========================================================================
 * DV-Prep is a multi-tenant platform: every staff account belongs to exactly
 * one workspace, and every applicant record is owned by exactly one workspace.
 * This is what guarantees that two staff members on the SAME permission level
 * never see each other's records.
 */

/**
 * Permission roles, ordered from least to most privileged.
 *
 * - GUEST      : anonymous visitor. Can fill, inspect and edit their own
 *                draft locally, but nothing is published to a workspace and
 *                no other account can see it.
 * - STAFF      : a bureau staff member. Full CRUD over applicants in their
 *                OWN workspace only.
 * - SUPERVISOR : a staff lead. Same as STAFF plus aggregated (anonymous)
 *                analytics across their workspace.
 * - ADMIN      : platform administrator. Can list workspaces and manage
 *                user accounts. Still scoped to their own workspace for
 *                applicant data unless explicitly granted global read.
 */
export type UserRole = 'GUEST' | 'STAFF' | 'SUPERVISOR' | 'ADMIN';

export interface UserAccount {
  /** Stable unique id (also the Firebase Auth uid when signed in). */
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  /** The tenant this account belongs to. Empty string for GUEST. */
  workspaceId: string;
  /** ISO timestamp of account creation. */
  createdAt: string;
  /** ISO timestamp of last successful sign-in. */
  lastLoginAt?: string;
  /** Whether the account is active; deactivated accounts cannot sign in. */
  isActive: boolean;
  /** Optional phone for WhatsApp notifications (phase 2). */
  phoneNumber?: string;
}

/**
 * A workspace is an isolated tenancy boundary. All applicant records carry a
 * workspaceId and can only ever be read or written by accounts whose own
 * workspaceId matches (except ADMIN with global read enabled).
 */
export interface Workspace {
  id: string;
  name: string;
  /** Human-readable slug used in URLs and diagnostics. */
  slug: string;
  createdAt: string;
  /** Account id of the workspace owner/creator. */
  ownerId: string;
  /** Optional short description. */
  description?: string;
}

/** The authenticated (or guest) session currently active in the browser. */
export interface Session {
  account: UserAccount | null;
  /** True when the session is an anonymous guest with local-only data. */
  isGuest: boolean;
}

/* ==========================================================================
 * Offline-First Local Database & Sync Model
 * ========================================================================== */

/** Lifecycle of a record inside the local IndexedDB store. */
export type LocalRecordState = 'clean' | 'dirty' | 'pending_delete';

/** How a sync conflict between local and remote versions was resolved. */
export type ConflictResolution = 'local_wins' | 'remote_wins' | 'merged';

/** A queued offline mutation waiting to be pushed to the remote store. */
export interface SyncOperation {
  id: string;
  /** The entity kind this operation applies to. */
  entity: 'applicant' | 'workspace' | 'account';
  /** Id of the affected record. */
  entityId: string;
  /** The kind of mutation. */
  action: 'upsert' | 'delete';
  /** The payload to write (the local record snapshot). */
  payload: unknown;
  /** ISO timestamp the operation was enqueued. */
  enqueuedAt: string;
  /** Number of failed push attempts so far (for backoff). */
  attempts: number;
  /** ISO timestamp of the last attempt, if any. */
  lastAttemptAt?: string;
  /** Last error message, if the push failed. */
  lastError?: string;
}

/** Result summary returned by a sync run. */
export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  failed: number;
  startedAt: string;
  finishedAt: string;
}

/** A wrapper stored in IndexedDB alongside every applicant record. */
export interface ApplicantRecord {
  id: string;
  /** Owning workspace; empty string means a local-only guest draft. */
  workspaceId: string;
  /** The applicant payload itself. */
  data: Applicant;
  /** Local lifecycle state used to drive the sync queue. */
  state: LocalRecordState;
  /**
   * Monotonic revision counter, incremented on every local write. Used for
   * last-writer-wins conflict resolution against the remote revision.
   */
  rev: number;
  /** ISO timestamp of the last local mutation. */
  localUpdatedAt: string;
  /** ISO timestamp of the last successful remote sync. */
  lastSyncedAt?: string;
}
/* ==========================================================================
 * WhatsApp Messaging & Notifications
 * ==========================================================================
 * The platform supports two delivery modes so it works everywhere without
 * forcing a paid integration:
 *
 *  - 'WA_ME'    : opens WhatsApp with a pre-filled message via a wa.me deep
 *                 link. Zero configuration, works immediately, but the user
 *                 presses send themselves (semi-automatic).
 *  - 'CLOUD_API': sends server-side via the WhatsApp Business Cloud API. Fully
 *                 automatic, but requires a Meta business account, a phone
 *                 number id and an access token.
 *
 * The provider interface below lets the UI treat both identically.
 */

export type WhatsAppProviderKind = 'WA_ME' | 'CLOUD_API';

/** Message delivery lifecycle. */
export type MessageStatus = 'DRAFT' | 'QUEUED' | 'OPENED' | 'SENT' | 'FAILED';

/**
 * Events that can trigger an automatic notification. Each maps to a template
 * so the body is editable without touching code.
 */
export type NotificationEvent =
  | 'MISSING_DOCUMENTS'
  | 'PHOTO_REJECTED'
  | 'READY_FOR_SUBMISSION'
  | 'SUBMISSION_COMPLETE'
  | 'CUSTOM_REMINDER';

/** A reusable message template with {{placeholders}}. */
export interface MessageTemplate {
  id: string;
  /** Bilingual display name. */
  nameAr: string;
  nameEn: string;
  /** Which event this template is the default for, if any. */
  event: NotificationEvent;
  /** Template body. Supports {{firstName}}, {{lastName}}, {{status}}, etc. */
  bodyAr: string;
  bodyEn: string;
  /** Whether this template is currently enabled for automatic sending. */
  enabled: boolean;
}

/** A record of a message that was composed/opened/sent. */
export interface MessageLogEntry {
  id: string;
  applicantId: string;
  /** E.164 or local phone as entered. */
  phone: string;
  templateId?: string;
  /** The final rendered body (placeholders already resolved). */
  body: string;
  status: MessageStatus;
  provider: WhatsAppProviderKind;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

/** User-editable WhatsApp configuration (stored locally per workspace). */
export interface WhatsAppConfig {
  provider: WhatsAppProviderKind;
  /** Default country code prepended to local numbers, e.g. '967'. */
  defaultCountryCode: string;
  /** Cloud API settings — only used when provider === 'CLOUD_API'. */
  cloudApi: {
    phoneNumberId: string;
    accessToken: string;
    /** Meta Graph API version, e.g. 'v21.0'. */
    apiVersion: string;
  };
  /** When true, queue a notification automatically on status changes. */
  autoNotifyOnStatusChange: boolean;
}

/** Variables available to templates, resolved from an applicant record. */
export interface TemplateVariables {
  firstName: string;
  lastName: string;
  fullName: string;
  passportNumber: string;
  status: string;
  programYear: string;
  missingCount: string;
  completionPercent: string;
  bureauName: string;
}
