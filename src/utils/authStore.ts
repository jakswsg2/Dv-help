/**
 * ============================================================================
 * authStore — Local account store, credential hashing & session handling
 * ============================================================================
 * Accounts are stored locally in IndexedDB so the platform is fully usable
 * offline (a bureau in a low-connectivity area cannot depend on a login
 * round-trip). Passwords are never stored in plaintext: each account keeps a
 * PBKDF2-HMAC-SHA256 hash and a per-account random salt, both computed with
 * the WebCrypto API.
 *
 * IMPORTANT SECURITY NOTE
 * -----------------------
 * Client-side credential verification is only as strong as the device it runs
 * on. It prevents casual access and keeps the UX offline, but it is NOT a
 * substitute for server-side authentication. When a remote backend is wired
 * up (phase 2), sign-in must be re-validated server-side and these local
 * records treated as a cache only. This module is written so that swapping in
 * a real identity provider only requires changing `verifyPassword`/`signIn`.
 */

import { UserAccount, UserRole, Workspace } from '../types';
import {
  findAccountByEmail,
  getAccount,
  getMeta,
  listAccounts,
  listAccountsByWorkspace,
  putAccount,
  putWorkspace,
  setMeta,
} from './localDb';

const META_SESSION_ACCOUNT = 'session_account_id';
const META_GUEST_MODE = 'session_guest_mode';

/** Number of PBKDF2 iterations. 210k is a reasonable modern floor. */
const PBKDF2_ITERATIONS = 210_000;

/** A stored credential record (kept separate from the account profile). */
interface CredentialRecord {
  accountId: string;
  salt: string; // base64
  hash: string; // base64
  iterations: number;
  algorithm: string;
}

const CREDENTIALS_PREFIX = 'cred:';

/* ------------------------------------------------------------------ */
/* Crypto helpers                                                      */
/* ------------------------------------------------------------------ */

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function randomSaltBase64(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bufferToBase64(salt.buffer);
}

async function deriveHash(password: string, saltBase64: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  return bufferToBase64(bits);
}

/** Constant-time-ish string comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function getCredential(accountId: string): Promise<CredentialRecord | undefined> {
  const raw = await getMeta<CredentialRecord>(CREDENTIALS_PREFIX + accountId);
  return raw;
}

async function setCredential(cred: CredentialRecord): Promise<void> {
  await setMeta(CREDENTIALS_PREFIX + cred.accountId, cred);
}

/* ------------------------------------------------------------------ */
/* Ids & slugs                                                         */
/* ------------------------------------------------------------------ */

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/* ------------------------------------------------------------------ */
/* Account lifecycle                                                   */
/* ------------------------------------------------------------------ */

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  /** Display name for the new workspace; ignored when joining an invite. */
  workspaceName?: string;
  /**
   * When set, the account joins an existing workspace instead of creating
   * one, and is assigned the STAFF role within it.
   */
  inviteWorkspaceId?: string;
  phoneNumber?: string;
}

export interface AuthResult {
  ok: boolean;
  account?: UserAccount;
  error?: string;
}

/**
 * Create a new account. By default the first account of a new workspace
 * becomes its ADMIN owner (the "bureau owner" flow). Subsequent accounts
 * joining via an invite become STAFF.
 */
export async function signUp(input: SignUpInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();

  if (!email || !input.password || !input.displayName.trim()) {
    return { ok: false, error: 'MISSING_FIELDS' };
  }
  if (input.password.length < 8) {
    return { ok: false, error: 'PASSWORD_TOO_SHORT' };
  }

  const existing = await findAccountByEmail(email);
  if (existing) {
    return { ok: false, error: 'EMAIL_IN_USE' };
  }

  let workspaceId: string;
  let role: UserRole;

  if (input.inviteWorkspaceId) {
    workspaceId = input.inviteWorkspaceId;
    role = 'STAFF';
  } else {
    const workspace: Workspace = {
      id: newId('ws'),
      name: input.workspaceName?.trim() || `${input.displayName.trim()} Workspace`,
      slug: slugify(input.workspaceName || input.displayName),
      createdAt: new Date().toISOString(),
      ownerId: '', // patched below once the account id exists
    };
    workspaceId = workspace.id;
    role = 'ADMIN';
    await putWorkspace(workspace);
    await setMeta(`ws_owner_${workspace.id}`, workspace);
  }

  const account: UserAccount = {
    id: newId('usr'),
    email,
    displayName: input.displayName.trim(),
    role,
    workspaceId,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    isActive: true,
    phoneNumber: input.phoneNumber?.trim() || undefined,
  };

  await putAccount(account);

  // Patch the workspace owner now that we have the account id.
  if (!input.inviteWorkspaceId) {
    const ws = await getMeta<Workspace>(`ws_owner_${workspaceId}`);
    if (ws) {
      ws.ownerId = account.id;
      await putWorkspace(ws);
      await setMeta(`ws_owner_${workspaceId}`, ws);
    }
  }

  const salt = randomSaltBase64();
  const hash = await deriveHash(input.password, salt, PBKDF2_ITERATIONS);
  await setCredential({
    accountId: account.id,
    salt,
    hash,
    iterations: PBKDF2_ITERATIONS,
    algorithm: 'PBKDF2-HMAC-SHA256',
  });

  await setMeta(META_SESSION_ACCOUNT, account.id);
  await setMeta(META_GUEST_MODE, false);

  return { ok: true, account };
}

/** Verify credentials and start a session. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const account = await findAccountByEmail(email);
  if (!account) return { ok: false, error: 'INVALID_CREDENTIALS' };
  if (!account.isActive) return { ok: false, error: 'ACCOUNT_DISABLED' };

  const cred = await getCredential(account.id);
  if (!cred) return { ok: false, error: 'INVALID_CREDENTIALS' };

  const hash = await deriveHash(password, cred.salt, cred.iterations);
  if (!safeEqual(hash, cred.hash)) {
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }

  const updated: UserAccount = { ...account, lastLoginAt: new Date().toISOString() };
  await putAccount(updated);
  await setMeta(META_SESSION_ACCOUNT, account.id);
  await setMeta(META_GUEST_MODE, false);

  return { ok: true, account: updated };
}

/** Enter guest mode: local drafts only, no workspace, no published records. */
export async function continueAsGuest(): Promise<void> {
  await setMeta(META_GUEST_MODE, true);
  await setMeta(META_SESSION_ACCOUNT, null);
}

/** End the current session entirely. */
export async function signOutSession(): Promise<void> {
  await setMeta(META_SESSION_ACCOUNT, null);
  await setMeta(META_GUEST_MODE, false);
}

/** Restore the session on app boot. */
export async function restoreSession(): Promise<{ account: UserAccount | null; isGuest: boolean }> {
  const guest = (await getMeta<boolean>(META_GUEST_MODE)) === true;
  if (guest) return { account: null, isGuest: true };

  const id = await getMeta<string>(META_SESSION_ACCOUNT);
  if (!id) return { account: null, isGuest: false };

  const account = await getAccount(id);
  if (!account || !account.isActive) return { account: null, isGuest: false };

  return { account, isGuest: false };
}

/* ------------------------------------------------------------------ */
/* Account administration (ADMIN only — callers must gate on permission) */
/* ------------------------------------------------------------------ */

export async function setAccountRole(accountId: string, role: UserRole): Promise<void> {
  const account = await getAccount(accountId);
  if (!account) return;
  await putAccount({ ...account, role });
}

export async function setAccountActive(accountId: string, isActive: boolean): Promise<void> {
  const account = await getAccount(accountId);
  if (!account) return;
  await putAccount({ ...account, isActive });
}

/** Every account in the system (ADMIN view). */
export async function listAllAccounts(): Promise<UserAccount[]> {
  return listAccounts();
}

/** Accounts inside one workspace (owner/supervisor view). */
export async function listWorkspaceAccounts(workspaceId: string): Promise<UserAccount[]> {
  return listAccountsByWorkspace(workspaceId);
}

/** Change the current account's password. */
export async function changePassword(
  accountId: string,
  currentPassword: string,
  newPassword: string
): Promise<AuthResult> {
  const account = await getAccount(accountId);
  if (!account) return { ok: false, error: 'NO_ACCOUNT' };
  if (newPassword.length < 8) return { ok: false, error: 'PASSWORD_TOO_SHORT' };

  const cred = await getCredential(accountId);
  if (!cred) return { ok: false, error: 'NO_CREDENTIAL' };

  const currentHash = await deriveHash(currentPassword, cred.salt, cred.iterations);
  if (!safeEqual(currentHash, cred.hash)) return { ok: false, error: 'INVALID_CREDENTIALS' };

  const salt = randomSaltBase64();
  const hash = await deriveHash(newPassword, salt, PBKDF2_ITERATIONS);
  await setCredential({ accountId, salt, hash, iterations: PBKDF2_ITERATIONS, algorithm: 'PBKDF2-HMAC-SHA256' });

  return { ok: true, account };
}
