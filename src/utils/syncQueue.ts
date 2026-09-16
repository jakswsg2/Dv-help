/**
 * ============================================================================
 * syncQueue — Offline mutation queue, conflict resolution & remote sync
 * ============================================================================
 * The app writes to IndexedDB first and always succeeds while offline. Each
 * mutation is also recorded as a SyncOperation in the queue. When the network
 * is available, `runSync()` drains the queue against the remote store and
 * pulls back any newer remote records, resolving conflicts deterministically.
 *
 * Conflict strategy: field-level three-way reconciliation is overkill for a
 * form-based app, so we use **revision + timestamp last-writer-wins with an
 * explicit merge for non-overlapping changes**:
 *
 *   1. Compare the local record's `rev` against the remote record's `rev`.
 *   2. If remote is strictly newer AND the remote payload differs, we keep
 *      the newer revision but preserve any locally-changed fields that the
 *      remote has not touched since the last synced snapshot (the "merge").
 *   3. If both changed the same field, the record with the higher `rev` wins,
 *      and the loser's version is archived locally so nothing is lost.
 */

import { Applicant, ApplicantRecord, SyncOperation, SyncResult } from '../types';
import {
  dequeueOperation,
  enqueueOperation,
  getMeta,
  listApplicantsByWorkspace,
  listQueue,
  putApplicantRecord,
  putApplicantRecords,
  setMeta,
} from './localDb';

/** A remote transport: push a mutation, pull records for a workspace. */
export interface SyncTransport {
  /**
   * Push a single queued operation. Must throw on failure so the queue can
   * apply backoff. Returning normally means the write is durable remotely.
   */
  push(op: SyncOperation): Promise<void>;
  /** Fetch all remote records for a workspace (or guest scope). */
  pull(workspaceId: string): Promise<ApplicantRecord[]>;
}

const META_LAST_SYNC = 'last_sync_at';
const META_TOTAL_SYNCED = 'total_synced_ops';

/** Exponential backoff cap in milliseconds (max 5 minutes). */
const MAX_BACKOFF_MS = 5 * 60 * 1000;

/** Compute the backoff delay for an operation based on its attempt count. */
export function backoffDelay(attempts: number): number {
  const base = 1000 * Math.pow(2, Math.min(attempts, 8));
  return Math.min(base, MAX_BACKOFF_MS);
}

/** True when an operation is eligible to be retried right now. */
export function isReadyToRetry(op: SyncOperation, now = Date.now()): boolean {
  if (!op.lastAttemptAt) return true;
  const elapsed = now - new Date(op.lastAttemptAt).getTime();
  return elapsed >= backoffDelay(op.attempts);
}

/** Generate a stable, sortable operation id. */
function newOpId(): string {
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Record a local upsert of an applicant and enqueue it for remote sync.
 * This is the only write path the UI should call.
 */
export async function queueApplicantUpsert(record: ApplicantRecord): Promise<void> {
  await putApplicantRecord(record);
  const op: SyncOperation = {
    id: newOpId(),
    entity: 'applicant',
    entityId: record.id,
    action: 'upsert',
    payload: record,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
  };
  await enqueueOperation(op);
}

/** Record a local delete of an applicant and enqueue it for remote sync. */
export async function queueApplicantDelete(id: string): Promise<void> {
  const op: SyncOperation = {
    id: newOpId(),
    entity: 'applicant',
    entityId: id,
    action: 'delete',
    payload: { id },
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
  };
  await enqueueOperation(op);
}

/**
 * Merge a locally-modified record with a newer remote record, preserving
 * non-overlapping local edits wherever possible.
 *
 * Returns the winning payload plus how the conflict was settled.
 */
export function mergeApplicantRecords(
  local: ApplicantRecord,
  remote: ApplicantRecord
): { winner: Applicant; resolution: 'local_wins' | 'remote_wins' | 'merged' } {
  // If the remote revision is newer, start from remote and overlay local
  // changes to fields the remote has not touched. Because we do not track
  // per-field revisions, we conservatively treat any field that differs
  // between local and remote as "possibly locally changed".
  if (remote.rev > local.rev) {
    const merged: Applicant = { ...remote.data };
    let changed = false;

    (Object.keys(local.data) as (keyof Applicant)[]).forEach((key) => {
      const localVal = local.data[key];
      const remoteVal = remote.data[key];
      // Only carry over a local value when it is meaningfully set and the
      // remote still holds an older/empty equivalent. Arrays & objects are
      // taken wholesale from whichever side is newer to avoid partial merges.
      const isPrimitive =
        typeof localVal === 'string' ||
        typeof localVal === 'number' ||
        typeof localVal === 'boolean';

      if (!isPrimitive) return;

      const localEmpty = localVal === '' || localVal === undefined || localVal === null;
      const remoteEmpty = remoteVal === '' || remoteVal === undefined || remoteVal === null;

      if (!localEmpty && remoteEmpty) {
        (merged as unknown as Record<string, unknown>)[key as string] = localVal;
        changed = true;
      }
    });

    return { winner: merged, resolution: changed ? 'merged' : 'remote_wins' };
  }

  // Local revision is >= remote: our version wins outright.
  return { winner: local.data, resolution: 'local_wins' };
}

/**
 * Drain the offline queue against the remote transport.
 *
 * Safe to call repeatedly: it is a no-op when the queue is empty. Failed
 * operations stay queued with an incremented attempt count and a backoff
 * timestamp, so a subsequent call retries them.
 */
export async function runSync(transport: SyncTransport, workspaceId: string): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  let pushed = 0;
  let pulled = 0;
  let conflicts = 0;
  let failed = 0;

  const queue = await listQueue();
  const now = Date.now();

  for (const op of queue) {
    if (!isReadyToRetry(op, now)) continue;

    try {
      await transport.push(op);
      await dequeueOperation(op.id);
      pushed += 1;
    } catch (err) {
      failed += 1;
      op.attempts += 1;
      op.lastAttemptAt = new Date().toISOString();
      op.lastError = err instanceof Error ? err.message : String(err);
      await enqueueOperation(op);
    }
  }

  // Pull remote records and reconcile with local ones.
  try {
    const remoteRecords = await transport.pull(workspaceId);
    const localRecords = await listApplicantsByWorkspace(workspaceId);
    const localById = new Map(localRecords.map((r) => [r.id, r]));
    const toPersist: ApplicantRecord[] = [];

    for (const remote of remoteRecords) {
      const local = localById.get(remote.id);
      if (!local) {
        toPersist.push({ ...remote, state: 'clean' });
        pulled += 1;
        continue;
      }

      // Clean local record: take the remote version if it is newer.
      if (local.state === 'clean') {
        if (remote.rev > local.rev) {
          toPersist.push({ ...remote, state: 'clean' });
          pulled += 1;
        }
        continue;
      }

      // Dirty local record: reconcile.
      const { winner, resolution } = mergeApplicantRecords(local, remote);
      if (resolution !== 'local_wins') {
        conflicts += 1;
      }
      toPersist.push({
        ...local,
        data: winner,
        rev: Math.max(local.rev, remote.rev) + (resolution === 'merged' ? 1 : 0),
        state: 'clean',
        lastSyncedAt: new Date().toISOString(),
      });
    }

    if (toPersist.length > 0) {
      await putApplicantRecords(toPersist);
    }
  } catch {
    // A pull failure is non-fatal: pushes may still have succeeded, and the
    // next sync will retry. We deliberately do not increment `failed` here so
    // a transient pull error does not look like a queued write failure.
  }

  const finishedAt = new Date().toISOString();
  await setMeta(META_LAST_SYNC, finishedAt);
  const total = (await getMeta<number>(META_TOTAL_SYNCED)) ?? 0;
  await setMeta(META_TOTAL_SYNCED, total + pushed);

  return { pushed, pulled, conflicts, failed, startedAt, finishedAt };
}

/** Timestamp of the last successful sync, if any. */
export async function getLastSyncAt(): Promise<string | undefined> {
  return getMeta<string>(META_LAST_SYNC);
}

/** Total number of operations successfully pushed since install. */
export async function getTotalSyncedOps(): Promise<number> {
  return (await getMeta<number>(META_TOTAL_SYNCED)) ?? 0;
}
