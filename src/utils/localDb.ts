/**
 * ============================================================================
 * localDb — Offline-first local database layer (IndexedDB)
 * ============================================================================
 * A tiny, dependency-free promise wrapper around IndexedDB that stores all
 * applicant records, accounts, workspaces and the sync queue locally. This
 * is the source of truth while offline and is reconciled with the remote
 * store by `syncQueue.ts`.
 *
 * Design notes:
 *  - No external dependency: raw IndexedDB via a small promisifying helper.
 *  - Indexes on `workspaceId` and `state` so tenant-scoped queries and the
 *    sync drain are both cheap.
 *  - Every store is versioned together by DB_VERSION; bump it to migrate.
 */

import { ApplicantRecord, SyncOperation, UserAccount, Workspace } from '../types';

const DB_NAME = 'dvprep_local';
const DB_VERSION = 1;

export const STORE_APPLICANTS = 'applicants';
export const STORE_ACCOUNTS = 'accounts';
export const STORE_WORKSPACES = 'workspaces';
export const STORE_SYNC_QUEUE = 'sync_queue';
export const STORE_META = 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

/** Open (and lazily upgrade) the local database. */
export function openLocalDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // Applicant records, indexed by tenant and local state.
      if (!db.objectStoreNames.contains(STORE_APPLICANTS)) {
        const store = db.createObjectStore(STORE_APPLICANTS, { keyPath: 'id' });
        store.createIndex('workspaceId', 'workspaceId', { unique: false });
        store.createIndex('state', 'state', { unique: false });
        store.createIndex('workspace_state', ['workspaceId', 'state'], { unique: false });
      }

      // User accounts, indexed by email for fast login lookups.
      if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) {
        const store = db.createObjectStore(STORE_ACCOUNTS, { keyPath: 'id' });
        store.createIndex('email', 'email', { unique: true });
        store.createIndex('workspaceId', 'workspaceId', { unique: false });
      }

      // Workspaces (tenants).
      if (!db.objectStoreNames.contains(STORE_WORKSPACES)) {
        db.createObjectStore(STORE_WORKSPACES, { keyPath: 'id' });
      }

      // The offline mutation queue.
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const store = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        store.createIndex('enqueuedAt', 'enqueuedAt', { unique: false });
      }

      // Small key/value bag for counters, session pointer, etc.
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/** Promisify a single IDBRequest. */
function reqAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Run a transaction and resolve with the transaction's completion. */
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */

export async function putRecord<T>(storeName: string, value: T): Promise<void> {
  const db = await openLocalDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(value);
  await txDone(tx);
}

export async function putMany<T>(storeName: string, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openLocalDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  values.forEach((v) => store.put(v));
  await txDone(tx);
}

export async function getRecord<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openLocalDb();
  const tx = db.transaction(storeName, 'readonly');
  return reqAsPromise<T | undefined>(tx.objectStore(storeName).get(key) as IDBRequest<T | undefined>);
}

export async function getAllRecords<T>(storeName: string): Promise<T[]> {
  const db = await openLocalDb();
  const tx = db.transaction(storeName, 'readonly');
  return reqAsPromise<T[]>(tx.objectStore(storeName).getAll() as IDBRequest<T[]>);
}

export async function deleteRecord(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openLocalDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(key);
  await txDone(tx);
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await openLocalDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).clear();
  await txDone(tx);
}

/** Query a store by an index value. */
async function queryIndex<T>(
  storeName: string,
  indexName: string,
  key: IDBValidKey
): Promise<T[]> {
  const db = await openLocalDb();
  const tx = db.transaction(storeName, 'readonly');
  const index = tx.objectStore(storeName).index(indexName);
  return reqAsPromise<T[]>(index.getAll(key) as IDBRequest<T[]>);
}

/** Query a store by a compound index (e.g. [workspaceId, state]). */
async function queryCompound<T>(
  storeName: string,
  indexName: string,
  key: [IDBValidKey, IDBValidKey]
): Promise<T[]> {
  const db = await openLocalDb();
  const tx = db.transaction(storeName, 'readonly');
  const index = tx.objectStore(storeName).index(indexName);
  return reqAsPromise<T[]>(index.getAll(key) as IDBRequest<T[]>);
}

/* ------------------------------------------------------------------ */
/* Applicant-specific API                                              */
/* ------------------------------------------------------------------ */

/**
 * List applicant records belonging to a workspace.
 * Passing an empty workspaceId returns the local-only guest drafts.
 */
export async function listApplicantsByWorkspace(workspaceId: string): Promise<ApplicantRecord[]> {
  return queryIndex<ApplicantRecord>(STORE_APPLICANTS, 'workspaceId', workspaceId);
}

export async function getApplicantRecord(id: string): Promise<ApplicantRecord | undefined> {
  return getRecord<ApplicantRecord>(STORE_APPLICANTS, id);
}

export async function putApplicantRecord(record: ApplicantRecord): Promise<void> {
  await putRecord(STORE_APPLICANTS, record);
}

export async function putApplicantRecords(records: ApplicantRecord[]): Promise<void> {
  await putMany(STORE_APPLICANTS, records);
}

export async function deleteApplicantRecord(id: string): Promise<void> {
  await deleteRecord(STORE_APPLICANTS, id);
}

/** Records in a given local state within a workspace (used by the sync drain). */
export async function listApplicantsByState(
  workspaceId: string,
  state: ApplicantRecord['state']
): Promise<ApplicantRecord[]> {
  return queryCompound<ApplicantRecord>(STORE_APPLICANTS, 'workspace_state', [workspaceId, state]);
}

export async function listAllApplicantRecords(): Promise<ApplicantRecord[]> {
  return getAllRecords<ApplicantRecord>(STORE_APPLICANTS);
}

/* ------------------------------------------------------------------ */
/* Account & workspace API                                             */
/* ------------------------------------------------------------------ */

export async function findAccountByEmail(email: string): Promise<UserAccount | undefined> {
  const matches = await queryIndex<UserAccount>(
    STORE_ACCOUNTS,
    'email',
    email.trim().toLowerCase()
  );
  return matches[0];
}

export async function getAccount(id: string): Promise<UserAccount | undefined> {
  return getRecord<UserAccount>(STORE_ACCOUNTS, id);
}

export async function putAccount(account: UserAccount): Promise<void> {
  await putRecord(STORE_ACCOUNTS, account);
}

export async function listAccounts(): Promise<UserAccount[]> {
  return getAllRecords<UserAccount>(STORE_ACCOUNTS);
}

export async function listAccountsByWorkspace(workspaceId: string): Promise<UserAccount[]> {
  return queryIndex<UserAccount>(STORE_ACCOUNTS, 'workspaceId', workspaceId);
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  return getRecord<Workspace>(STORE_WORKSPACES, id);
}

export async function putWorkspace(workspace: Workspace): Promise<void> {
  await putRecord(STORE_WORKSPACES, workspace);
}

export async function listWorkspaces(): Promise<Workspace[]> {
  return getAllRecords<Workspace>(STORE_WORKSPACES);
}

/* ------------------------------------------------------------------ */
/* Sync queue API                                                      */
/* ------------------------------------------------------------------ */

export async function enqueueOperation(op: SyncOperation): Promise<void> {
  await putRecord(STORE_SYNC_QUEUE, op);
}

export async function listQueue(): Promise<SyncOperation[]> {
  const ops = await getAllRecords<SyncOperation>(STORE_SYNC_QUEUE);
  return ops.sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
}

export async function dequeueOperation(id: string): Promise<void> {
  await deleteRecord(STORE_SYNC_QUEUE, id);
}

export async function countQueue(): Promise<number> {
  const db = await openLocalDb();
  const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
  return reqAsPromise<number>(tx.objectStore(STORE_SYNC_QUEUE).count());
}

/* ------------------------------------------------------------------ */
/* Meta key/value API                                                  */
/* ------------------------------------------------------------------ */

export interface MetaEntry {
  key: string;
  value: unknown;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await putRecord<MetaEntry>(STORE_META, { key, value });
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const entry = await getRecord<MetaEntry>(STORE_META, key);
  return entry?.value as T | undefined;
}
