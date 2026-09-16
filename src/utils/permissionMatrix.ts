/**
 * ============================================================================
 * permissionMatrix — Human-readable permission catalogue for the UI
 * ============================================================================
 * `permissions.ts` answers "can this role do X?" at runtime. This module
 * answers "show me the whole matrix" for the Roles & Permissions panel. It is
 * derived from the same source of truth so the two can never disagree.
 */

import { Permission, permissionsForRole } from './permissions';
import { UserRole } from '../types';

export interface RolePermissionRow {
  permission: Permission;
  labelAr: string;
  labelEn: string;
  /** Roles that hold this permission. */
  permissions: UserRole[];
}

interface PermissionMeta {
  permission: Permission;
  labelAr: string;
  labelEn: string;
}

/** Every permission the platform defines, with bilingual labels. */
const CATALOGUE: PermissionMeta[] = [
  {
    permission: 'applicant:create',
    labelAr: 'إنشاء ملف متقدم جديد',
    labelEn: 'Create a new applicant file',
  },
  {
    permission: 'applicant:read_local_draft',
    labelAr: 'قراءة المسودة المحلية للزائر',
    labelEn: "Read the guest's local draft",
  },
  {
    permission: 'applicant:update_local_draft',
    labelAr: 'تعديل المسودة المحلية للزائر',
    labelEn: "Edit the guest's local draft",
  },
  {
    permission: 'applicant:read_own_workspace',
    labelAr: 'قراءة ملفات مساحة عمله',
    labelEn: 'Read applicants in own workspace',
  },
  {
    permission: 'applicant:update_own_workspace',
    labelAr: 'تعديل ملفات مساحة عمله',
    labelEn: 'Update applicants in own workspace',
  },
  {
    permission: 'applicant:delete_own_workspace',
    labelAr: 'حذف ملفات مساحة عمله',
    labelEn: 'Delete applicants in own workspace',
  },
  {
    permission: 'workspace:view_aggregate_stats',
    labelAr: 'الاطلاع على الإحصائيات المجمّعة',
    labelEn: 'View aggregated workspace statistics',
  },
  {
    permission: 'workspace:manage_members',
    labelAr: 'إدارة أعضاء مساحة العمل وأدوارهم',
    labelEn: 'Manage workspace members and roles',
  },
  {
    permission: 'platform:manage_workspaces',
    labelAr: 'إدارة كل مساحات العمل (المنصة)',
    labelEn: 'Manage all workspaces (platform)',
  },
  {
    permission: 'platform:manage_all_users',
    labelAr: 'إدارة كل حسابات المستخدمين',
    labelEn: 'Manage all user accounts',
  },
];

/**
 * Build the full matrix: every permission row, annotated with the roles that
 * hold it. Derived from `permissionsForRole`, so it stays in sync with the
 * runtime checks automatically.
 */
export const READ_ONLY_ROLES: UserRole[] = ['GUEST', 'STAFF', 'SUPERVISOR', 'ADMIN'];

export const PERMISSION_MATRIX: RolePermissionRow[] = CATALOGUE.map((entry) => {
  const holders = READ_ONLY_ROLES.filter((role) =>
    permissionsForRole(role).includes(entry.permission)
  );
  return {
    permission: entry.permission,
    labelAr: entry.labelAr,
    labelEn: entry.labelEn,
    permissions: holders,
  };
});

/**
 * Return the matrix. Kept as a function to mirror the original call site
 * (`permissionsForRole(...)` was mistaken for a matrix getter) while making
 * the intent explicit for future maintainers.
 */
export function permissionsForRoleRow(): RolePermissionRow[] {
  return PERMISSION_MATRIX;
}
