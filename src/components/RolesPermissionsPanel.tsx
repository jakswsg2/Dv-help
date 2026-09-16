/**
 * ============================================================================
 * RolesPermissionsPanel — Role hierarchy, permission matrix & member admin
 * ============================================================================
 * Visible to signed-in users. Every signed-in user sees the read-only role
 * hierarchy and the full permission matrix (so the rules are transparent).
 * The member-management section is only actionable when the account holds the
 * `workspace:manage_members` permission, and every mutation re-checks it.
 */

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Users,
  Check,
  X,
  Crown,
  UserCog,
  User as UserIcon,
  KeyRound,
  Loader2,
  Power,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { Language, UserAccount, UserRole } from '../types';
import { PERMISSION_MATRIX } from '../utils/permissionMatrix';
import { listWorkspaceAccounts, setAccountActive, setAccountRole } from '../utils/authStore';

interface RolesPermissionsPanelProps {
  language: Language;
}

const ROLE_ORDER: UserRole[] = ['GUEST', 'STAFF', 'SUPERVISOR', 'ADMIN'];

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  GUEST: <UserIcon className="w-4 h-4" />,
  STAFF: <UserCog className="w-4 h-4" />,
  SUPERVISOR: <KeyRound className="w-4 h-4" />,
  ADMIN: <Crown className="w-4 h-4" />,
};

export const RolesPermissionsPanel: React.FC<RolesPermissionsPanelProps> = ({ language }) => {
  const t = translations[language];
  const a = t.auth;
  const { account, can } = useAuth();

  const [members, setMembers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManageMembers = can('workspace:manage_members');

  const loadMembers = async () => {
    if (!account) return;
    const list = await listWorkspaceAccounts(account.workspaceId);
    setMembers(list);
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.workspaceId]);

  const handleToggleActive = async (member: UserAccount) => {
    if (!canManageMembers || member.id === account?.id) return;
    setBusyId(member.id);
    try {
      await setAccountActive(member.id, !member.isActive);
      await loadMembers();
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = async (member: UserAccount, role: UserRole) => {
    if (!canManageMembers || member.id === account?.id) return;
    setBusyId(member.id);
    try {
      await setAccountRole(member.id, role);
      await loadMembers();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Isolation notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-200 text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{a.isolatedNotice}</span>
      </div>

      {/* Role hierarchy */}
      <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{a.roleHierarchy}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLE_ORDER.map((role, idx) => (
            <div
              key={role}
              className="relative p-3 rounded-xl border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  {ROLE_ICONS[role]}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {a.roles[role]}
                </span>
                <span className="ml-auto text-[10px] font-mono text-slate-400">L{idx}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {a.rolesDesc[role]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Permission matrix */}
      <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {a.permissionMatrix}
          </h3>
        </div>
        <table className="w-full min-w-[560px] text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left rtl:text-right py-2 pr-3 font-semibold text-slate-500 dark:text-slate-400">
                {language === 'ar' ? 'الصلاحية' : 'Permission'}
              </th>
              {ROLE_ORDER.map((role) => (
                <th
                  key={role}
                  className="py-2 px-2 font-semibold text-slate-500 dark:text-slate-400 text-center whitespace-nowrap"
                >
                  {a.roles[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MATRIX.map((row) => (
              <tr
                key={row.permission}
                className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? row.labelAr : row.labelEn}
                </td>
                {ROLE_ORDER.map((role) => {
                  const has = row.permissions.includes(role);
                  return (
                    <td key={role} className="py-2 px-2 text-center">
                      {has ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 dark:text-slate-600 inline" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Member management */}
      <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {a.memberManagement}
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {a.membersCount}: {members.length}
          </span>
        </div>

        {!canManageMembers && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs mb-3">
            <Info className="w-4 h-4 shrink-0" />
            <span>{a.noPermission}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
            {language === 'ar' ? 'لا يوجد أعضاء آخرون في مساحة العمل' : 'No other members in this workspace'}
          </p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => {
              const isSelf = member.id === account?.id;
              return (
                <li
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {member.displayName}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold">
                          {language === 'ar' ? 'أنت' : 'you'}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          member.isActive
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {member.isActive ? a.active : a.disabled}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" dir="ltr">
                      {member.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                      disabled={!canManageMembers || isSelf || busyId === member.id}
                      className="text-xs px-2 py-1.5 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      title={a.changeRole}
                    >
                      {ROLE_ORDER.filter((r) => r !== 'GUEST').map((r) => (
                        <option key={r} value={r}>
                          {a.roles[r]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(member)}
                      disabled={!canManageMembers || isSelf || busyId === member.id}
                      className="p-1.5 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title={member.isActive ? a.deactivate : a.activate}
                    >
                      {busyId === member.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Power className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RolesPermissionsPanel;
