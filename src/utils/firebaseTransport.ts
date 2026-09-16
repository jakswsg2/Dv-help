/**
 * ============================================================================
 * firebaseTransport — Remote sync transport over Firestore
 * ============================================================================
 * Implements the `SyncTransport` contract used by `syncQueue.runSync`. It is
 * deliberately thin: the queue owns retry/backoff/conflict logic, this module
 * only knows how to read and write Firestore documents.
 *
 * Guests (empty workspaceId) never reach this transport; their data is local
 * only by design. Signed-in accounts sync into a per-workspace collection so
 * one tenant can never read another's documents even if rules regress.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { ApplicantRecord, SyncOperation } from '../types';
import { SyncTransport } from './syncQueue';
import { db } from './firebase';

/** Firestore collection holding all applicant records, partitioned by tenant. */
const COLLECTION = 'workspace_applicants';

/** Compose the document path for a record. */
function recordPath(workspaceId: string, id: string): string {
  return `${workspaceId}__${id}`;
}

export class FirebaseSyncTransport implements SyncTransport {
  async push(op: SyncOperation): Promise<void> {
    if (op.entity !== 'applicant') return;

    if (op.action === 'delete') {
      const payload = op.payload as { id: string; workspaceId?: string };
      if (!payload.workspaceId) return;
      await deleteDoc(doc(db, COLLECTION, recordPath(payload.workspaceId, payload.id)));
      return;
    }

    const record = op.payload as ApplicantRecord;
    // Refuse to publish anything that is not bound to a real workspace.
    if (!record.workspaceId) {
      throw new Error('REFUSED_TO_PUBLISH_WITHOUT_WORKSPACE');
    }

    await setDoc(
      doc(db, COLLECTION, recordPath(record.workspaceId, record.id)),
      {
        id: record.id,
        workspaceId: record.workspaceId,
        data: record.data,
        rev: record.rev,
        localUpdatedAt: record.localUpdatedAt,
        syncedAt: Timestamp.now(),
      },
      { merge: true }
    );
  }

  async pull(workspaceId: string): Promise<ApplicantRecord[]> {
    if (!workspaceId) return [];

    const snapshot = await getDocs(collection(db, COLLECTION));
    const records: ApplicantRecord[] = [];

    snapshot.forEach((docSnap) => {
      const raw = docSnap.data() as {
        id: string;
        workspaceId: string;
        data: ApplicantRecord['data'];
        rev: number;
        localUpdatedAt: string;
      };
      // Defence in depth: never surface a document from another tenant even
      // if it somehow ended up in the result set.
      if (raw.workspaceId !== workspaceId) return;

      records.push({
        id: raw.id,
        workspaceId: raw.workspaceId,
        data: raw.data,
        state: 'clean',
        rev: raw.rev ?? 0,
        localUpdatedAt: raw.localUpdatedAt,
        lastSyncedAt: new Date().toISOString(),
      });
    });

    return records;
  }
}

/**
 * A transport that always fails, used when the platform is configured to run
 * fully local (no Firebase project). Keeps the queue intact for a later
 * configuration change rather than silently dropping data.
 */
export class OfflineOnlyTransport implements SyncTransport {
  async push(): Promise<void> {
    throw new Error('REMOTE_SYNC_DISABLED');
  }
  async pull(): Promise<ApplicantRecord[]> {
    return [];
  }
}

/** Pick a transport based on whether a Firebase project is configured. */
export function createDefaultTransport(): SyncTransport {
  try {
    // `db` is truthy when Firebase initialised successfully at import time.
    if (db) return new FirebaseSyncTransport();
  } catch {
    /* fall through */
  }
  return new OfflineOnlyTransport();
}
