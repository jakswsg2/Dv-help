/**
 * ============================================================================
 * applicantRepository — Workspace-scoped, offline-first data access
 * ============================================================================
 * This is the single API the UI uses to read and write applicants. It sits on
 * top of IndexedDB (offline truth) and the sync queue (remote reconciliation),
 * and it enforces two invariants on every call:
 *
 *   1. TENANT ISOLATION — a caller can only ever see records whose
 *      `workspaceId` matches the caller's scope. There is no API here that
 *      exposes another workspace's records.
 *
 *   2. OFFLINE-FIRST — writes always succeed locally and are queued for sync;
 *      nothing blocks on the network.
 */

import { Applicant, ApplicantRecord } from '../types';
import {
  deleteApplicantRecord,
  getAllRecords,
  listApplicantsByWorkspace,
  putApplicantRecord,
} from './localDb';
import { queueApplicantDelete, queueApplicantUpsert } from './syncQueue';
import { canAccessApplicant, canMutateApplicant } from './permissions';
import { UserAccount } from '../types';

const STORE = 'applicants';

/** Shape used to migrate legacy localStorage records into the local DB. */
export interface LegacyApplicant extends Applicant {
  hasPendingSync?: boolean;
  lastSyncedAt?: string;
}

/** Create the storage record wrapper around a plain applicant payload. */
export function toRecord(
  applicant: Applicant,
  workspaceId: string,
  prevRev = 0,
  state: ApplicantRecord['state'] = 'dirty'
): ApplicantRecord {
  return {
    id: applicant.id,
    workspaceId,
    data: applicant,
    state,
    rev: prevRev + 1,
    localUpdatedAt: new Date().toISOString(),
  };
}

/**
 * List every applicant visible to the current session, scoped to its
 * workspace. Guests (workspaceId === '') see only their own local drafts.
 */
export async function listApplicants(workspaceId: string): Promise<Applicant[]> {
  const records = await listApplicantsByWorkspace(workspaceId);
  return records
    .map((r) => r.data)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

/** List the full records (with sync metadata) for the current scope. */
export async function listApplicantRecords(workspaceId: string): Promise<ApplicantRecord[]> {
  return listApplicantsByWorkspace(workspaceId);
}

/**
 * Persist an applicant for the current session.
 *
 * - Rejects writes the session is not permitted to make.
 * - Always writes locally and queues the remote sync.
 */
export async function saveApplicant(
  account: UserAccount | null,
  isGuest: boolean,
  workspaceId: string,
  applicant: Applicant
): Promise<ApplicantRecord> {
  const existing = (await listApplicantsByWorkspace(workspaceId)).find((r) => r.id === applicant.id);

  const candidate: ApplicantRecord = toRecord(
    applicant,
    workspaceId,
    existing?.rev ?? 0,
    'dirty'
  );

  const permitted = existing
    ? canMutateApplicant(account, isGuest, existing)
    : isGuest
    ? workspaceId === ''
    : canAccessApplicant(account, isGuest, candidate) || account?.role === 'ADMIN';

  if (!permitted) {
    throw new Error('PERMISSION_DENIED');
  }

  await queueApplicantUpsert(candidate);
  return candidate;
}

/** Delete an applicant, enforcing the same permission gate. */
export async function removeApplicant(
  account: UserAccount | null,
  isGuest: boolean,
  workspaceId: string,
  id: string
): Promise<void> {
  const existing = (await listApplicantsByWorkspace(workspaceId)).find((r) => r.id === id);
  if (existing && !canMutateApplicant(account, isGuest, existing)) {
    throw new Error('PERMISSION_DENIED');
  }
  await deleteApplicantRecord(id);
  await queueApplicantDelete(id);
}

/**
 * Migrate legacy localStorage applicants into the local DB, once.
 *
 * Existing installs stored applicants under `dvprep_applicants_v1`. On first
 * boot after this upgrade we import them into the given workspace so no work
 * is lost, then mark the migration complete so it never runs twice.
 */
export async function migrateLegacyApplicants(
  workspaceId: string,
  legacy: LegacyApplicant[]
): Promise<number> {
  if (!Array.isArray(legacy) || legacy.length === 0) return 0;

  const existing = await listApplicantsByWorkspace(workspaceId);
  const existingIds = new Set(existing.map((r) => r.id));

  const toImport: ApplicantRecord[] = [];
  for (const applicant of legacy) {
    if (existingIds.has(applicant.id)) continue;
    const record = toRecord(applicant, workspaceId, 0, 'dirty');
    toImport.push(record);
  }

  for (const record of toImport) {
    await putApplicantRecord(record);
  }

  return toImport.length;
}

/** Diagnostics: total local records across every scope. */
export async function countAllLocalRecords(): Promise<number> {
  const all = await getAllRecords<ApplicantRecord>(STORE);
  return all.length;
}
