import React from 'react';
import { useAutoFocus } from '../hooks/useAutoFocus';
import { translations } from '../translations';
import { Language } from '../types';
import { Zap, Sparkles } from 'lucide-react';

interface AutoFocusToggleProps {
  language: Language;
  className?: string;
  compact?: boolean;
}

export const AutoFocusToggle: React.FC<AutoFocusToggleProps> = ({
  language,
  className = '',
  compact = false,
}) => {
  const t = translations[language];
  const { isEnabled, toggle } = useAutoFocus();

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        title={t.autoFocus?.tooltip || 'Automatically moves cursor to next field on valid completion (Alt+A)'}
        aria-label={isEnabled ? t.autoFocus?.enabled : t.autoFocus?.disabled}
        aria-pressed={isEnabled}
        className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none border ${
          isEnabled
            ? 'bg-blue-50/80 hover:bg-blue-100 text-blue-800 border-blue-200 shadow-2xs dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
            : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700'
        }`}
      >
        <div
          className={`p-0.5 rounded-md transition-colors ${
            isEnabled
              ? 'bg-blue-600 text-white'
              : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          {isEnabled ? <Zap className="w-3 h-3 fill-current" /> : <Sparkles className="w-3 h-3" />}
        </div>

        <span className="text-[11px] font-bold">
          {isEnabled ? t.autoFocus?.enabled : t.autoFocus?.disabled}
        </span>

        {!compact && (
          <span
            className={`text-[9px] font-mono px-1 py-0.2 rounded border transition-colors ${
              isEnabled
                ? 'bg-blue-100/90 text-blue-700 border-blue-300 dark:bg-blue-900/60 dark:text-blue-200 dark:border-blue-700'
                : 'bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-700 dark:text-slate-400'
            }`}
          >
            Alt+A
          </span>
        )}

        {isEnabled && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </button>
    </div>
  );
};
