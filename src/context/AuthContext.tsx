/**
 * ============================================================================
 * AuthContext — Session state, role helpers & permission gates for the UI
 * ============================================================================
 * Wraps the imperative `authStore` in React state so components can react to
 * sign-in/sign-out and ask "can I do X?" without touching IndexedDB directly.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { UserAccount } from '../types';
import {
  changePassword,
  continueAsGuest as storeContinueAsGuest,
  restoreSession,
  signIn as storeSignIn,
  signOutSession,
  signUp as storeSignUp,
  SignUpInput,
} from '../utils/authStore';
import {
  accountCan,
  Permission,
  permissionsForRole,
  scopeWorkspaceId,
} from '../utils/permissions';

export type AuthStatus = 'loading' | 'signed_out' | 'guest' | 'signed_in';

interface AuthContextValue {
  status: AuthStatus;
  account: UserAccount | null;
  isGuest: boolean;
  /** True when the user is either a guest or a signed-in account. */
  hasSession: boolean;

  signUp: (input: SignUpInput) => Promise<{ ok: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;

  /** Does the current session hold this permission? */
  can: (permission: Permission) => boolean;
  /** All permissions for the current role. */
  permissions: Permission[];
  /** The workspace id data must be scoped to for the current session. */
  workspaceId: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [account, setAccount] = useState<UserAccount | null>(null);

  // Restore any persisted session on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const restored = await restoreSession();
        if (cancelled) return;
        if (restored.isGuest) {
          setStatus('guest');
          setAccount(null);
        } else if (restored.account) {
          setStatus('signed_in');
          setAccount(restored.account);
        } else {
          setStatus('signed_out');
          setAccount(null);
        }
      } catch {
        if (!cancelled) setStatus('signed_out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const res = await storeSignUp(input);
    if (res.ok && res.account) {
      setAccount(res.account);
      setStatus('signed_in');
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await storeSignIn(email, password);
    if (res.ok && res.account) {
      setAccount(res.account);
      setStatus('signed_in');
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }, []);

  const continueAsGuest = useCallback(async () => {
    await storeContinueAsGuest();
    setAccount(null);
    setStatus('guest');
  }, []);

  const signOut = useCallback(async () => {
    await signOutSession();
    setAccount(null);
    setStatus('signed_out');
  }, []);

  const updatePassword = useCallback(
    async (current: string, next: string) => {
      if (!account) return { ok: false, error: 'NO_ACCOUNT' };
      const res = await changePassword(account.id, current, next);
      return res.ok ? { ok: true } : { ok: false, error: res.error };
    },
    [account]
  );

  const isGuest = status === 'guest';

  const can = useCallback(
    (permission: Permission) => accountCan(account, permission, isGuest),
    [account, isGuest]
  );

  const permissions = useMemo(
    () => (account ? permissionsForRole(account.role) : permissionsForRole('GUEST')),
    [account]
  );

  const workspaceId = useMemo(() => scopeWorkspaceId(account, isGuest), [account, isGuest]);

  const value: AuthContextValue = {
    status,
    account,
    isGuest,
    hasSession: status === 'guest' || status === 'signed_in',
    signUp,
    signIn,
    continueAsGuest,
    signOut,
    updatePassword,
    can,
    permissions,
    workspaceId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Access the auth context. Throws when used outside the provider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
