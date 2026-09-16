/**
 * ============================================================================
 * AuthGate — Sign-in / sign-up / guest entry screen
 * ============================================================================
 * Rendered whenever there is no active session. Presents three clear paths:
 *   1. Sign in to an existing workspace account.
 *   2. Create a new account + workspace.
 *   3. Continue as a guest (local-only data, no sign-up).
 *
 * The guest path is a first-class option, not a buried link, because the
 * requirement is that a visitor can fill, inspect and edit their data without
 * ever registering.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  ShieldCheck,
  WifiOff,
  Loader2,
  AlertCircle,
  Globe,
  Moon,
  Sun,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { translations } from '../translations';
import { Language } from '../types';

interface AuthGateProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

type Mode = 'SIGN_IN' | 'SIGN_UP';

export const AuthGate: React.FC<AuthGateProps> = ({ language, onLanguageChange }) => {
  const t = translations[language];
  const a = t.auth;
  const { signIn, signUp, continueAsGuest } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<Mode>('SIGN_IN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRtl = language === 'ar';

  const errorMessage = (code?: string): string => {
    switch (code) {
      case 'MISSING_FIELDS':
        return a.errorMissingFields;
      case 'PASSWORD_TOO_SHORT':
        return a.errorPasswordShort;
      case 'EMAIL_IN_USE':
        return a.errorEmailInUse;
      case 'INVALID_CREDENTIALS':
        return a.errorInvalidCredentials;
      case 'ACCOUNT_DISABLED':
        return a.errorAccountDisabled;
      default:
        return a.errorGeneric;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === 'SIGN_IN'
          ? await signIn(email, password)
          : await signUp({
              email,
              password,
              displayName,
              workspaceName,
              phoneNumber: phone,
            });
      if (!res.ok) setError(errorMessage(res.error));
    } catch {
      setError(a.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await continueAsGuest();
    } finally {
      setBusy(false);
    }
  };

  const inputBase =
    'w-full pl-10 pr-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors';

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex-col">
      {/* Top bar: brand + language + theme */}
      <div className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            DV
          </div>
          <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tracking-tight">
            {t.appTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLanguageChange(language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>{language === 'ar' ? 'English' : 'عربي'}</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="flex-1 flex items-start sm:items-center justify-center px-4 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-5 sm:p-7">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                {mode === 'SIGN_IN' ? (
                  <LogIn className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {mode === 'SIGN_IN' ? a.signInTitle : a.signUpTitle}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {mode === 'SIGN_IN' ? a.signInSubtitle : a.signUpSubtitle}
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'SIGN_UP' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {a.displayName}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={a.displayNamePlaceholder}
                      className={inputBase}
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {a.email}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={a.emailPlaceholder}
                    className={inputBase}
                    autoComplete="email"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {a.password}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={a.passwordPlaceholder}
                    className={`${inputBase} pr-10`}
                    autoComplete={mode === 'SIGN_IN' ? 'current-password' : 'new-password'}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 -translate-y-1/2 right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'SIGN_UP' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {a.workspaceName}
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder={a.workspaceNamePlaceholder}
                        className={inputBase}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {a.phoneOptional}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+967..."
                        className={inputBase}
                        dir="ltr"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'SIGN_IN' ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>{busy ? a.signingIn : mode === 'SIGN_IN' ? a.signInBtn : a.signUpBtn}</span>
              </button>
            </form>

            {/* Switch mode */}
            <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              {mode === 'SIGN_IN' ? a.noAccountYet : a.haveAccount}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'SIGN_IN' ? 'SIGN_UP' : 'SIGN_IN');
                  setError(null);
                }}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {mode === 'SIGN_IN' ? a.switchToSignUp : a.switchToSignIn}
              </button>
            </div>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-[11px] font-semibold text-slate-400">OR</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Guest path — first-class, not hidden */}
            <button
              type="button"
              onClick={handleGuest}
              disabled={busy}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors disabled:opacity-50 cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 text-left rtl:text-right">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {a.continueAsGuest}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {a.guestSubtitle}
                  </div>
                </div>
              </div>
              {isRtl ? (
                <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
              )}
            </button>

            {/* Trust notes */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{a.securityNote}</span>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <WifiOff className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>{a.offlineNote}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthGate;
