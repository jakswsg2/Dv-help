/**
 * ============================================================================
 * permissions — Single source of truth for the role/permission matrix
 * ============================================================================
 * Every UI gate and every data-access check reads from here. Keeping the
 * matrix in one place means "who can do what" is auditable and testable
 * instead of being scattered across components as ad-hoc boolean checks.
 */

import { ApplicantRecord, UserAccount, UserRole } from '../types';

/** Discrete capabilities a role may or may not hold. */
export type Permission =
  | 'applicant:create'
  | 'applicant:read_own_workspace'
  | 'applicant:update_own_workspace'
  | 'applicant:delete_own_workspace'
  | 'applicant:read_local_draft'
  | 'applicant:update_local_draft'
  | 'workspace:view_aggregate_stats'
  | 'workspace:manage_members'
  | 'platform:manage_workspaces'
  | 'platform:manage_all_users';

/**
 * The permission matrix. Ordered by privilege so the intent is obvious.
 *
 * GUEST is deliberately narrow: a visitor may create, read and edit the
 * single local draft that lives on their own device, and nothing else. They
 * can never read another person's record, never read a workspace, and never
 * delete anything they did not create, because their data is scoped to
 * `workspaceId === ''` and is never pushed to a shared tenant.
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  GUEST: ['applicant:create', 'applicant:read_local_draft', 'applicant:update_local_draft'],

  STAFF: [
    'applicant:create',
    'applicant:read_own_workspace',
    'applicant:update_own_workspace',
    'applicant:delete_own_workspace',
  ],

  SUPERVISOR: [
    'applicant:create',
    'applicant:read_own_workspace',
    'applicant:update_own_workspace',
    'applicant:delete_own_workspace',
    'workspace:view_aggregate_stats',
  ],

  ADMIN: [
    'applicant:create',
    'applicant:read_own_workspace',
    'applicant:update_own_workspace',
    'applicant:delete_own_workspace',
    'workspace:view_aggregate_stats',
    'workspace:manage_members',
    'platform:manage_workspaces',
    'platform:manage_all_users',
  ],
};

/** Human-readable role labels (bilingual). */
export const ROLE_LABELS: Record<UserRole, { ar: string; en: string }> = {
  GUEST: { ar: 'زائر', en: 'Guest' },
  STAFF: { ar: 'إداري', en: 'Staff' },
  SUPERVISOR: { ar: 'مشرف', en: 'Supervisor' },
  ADMIN: { ar: 'مدير النظام', en: 'Administrator' },
};

/** Does the given role hold the given permission? */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** All permissions granted to a role. */
export function permissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

/** Convenience: does this account hold the permission? */
export function accountCan(
  account: UserAccount | null,
  permission: Permission,
  isGuest: boolean
): boolean {
  if (!account) {
    return isGuest ? roleHasPermission('GUEST', permission) : false;
  }
  if (!account.isActive) return false;
  return roleHasPermission(account.role, permission);
}

/**
 * The tenant a record must belong to for this account to see it.
 * Guests are scoped to the empty-string "local only" workspace.
 */
export function scopeWorkspaceId(account: UserAccount | null, isGuest: boolean): string {
  if (!account || isGuest) return '';
  return account.workspaceId;
}

/**
 * Can `account` access this applicant record?
 *
 * This is the single guard every read/write path must call. It enforces the
 * core requirement that staff on the same level keep separate records: a
 * record is only accessible when its `workspaceId` equals the account's own.
 */
export function canAccessApplicant(
  account: UserAccount | null,
  isGuest: boolean,
  record: ApplicantRecord
): boolean {
  // Guests may only touch their own local-only drafts.
  if (!account || isGuest) {
    return (
      record.workspaceId === '' &&
      roleHasPermission('GUEST', 'applicant:read_local_draft')
    );
  }

  if (!account.isActive) return false;

  // Administrators with workspace management powers may read across
  // workspaces; everyone else is hard-scoped to their own tenant.
  if (account.role === 'ADMIN') return true;

  return record.workspaceId === account.workspaceId;
}

/** Can `account` mutate (create/update/delete) this applicant record? */
export function canMutateApplicant(
  account: UserAccount | null,
  isGuest: boolean,
  record: ApplicantRecord
): boolean {
  if (!account || isGuest) {
    return (
      record.workspaceId === '' &&
      roleHasPermission('GUEST', 'applicant:update_local_draft')
    );
  }
  if (!account.isActive) return false;
  if (account.role === 'ADMIN') return true;
  return record.workspaceId === account.workspaceId;
}

/**
 * Filter a list of records down to only those the account may access.
 * Use this at every collection boundary, never trust the caller's list.
 */
export function filterAccessibleApplicants(
  account: UserAccount | null,
  isGuest: boolean,
  records: ApplicantRecord[]
): ApplicantRecord[] {
  return records.filter((r) => canAccessApplicant(account, isGuest, r));
}
