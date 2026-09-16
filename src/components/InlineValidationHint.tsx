import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Language } from '../types';
import { ValidationResult } from '../utils/dvValidation';

interface InlineValidationHintProps {
  result?: ValidationResult | null;
  language: Language;
  showValid?: boolean;
  className?: string;
}

export const InlineValidationHint: React.FC<InlineValidationHintProps> = ({
  result,
  language,
  showValid = false,
  className = '',
}) => {
  if (!result) return null;

  const message = language === 'ar' ? result.messageAr : result.messageEn;
  if (!message) return null;

  if (result.severity === 'error') {
    return (
      <div
        role="alert"
        className={`flex items-start gap-1.5 mt-1.5 text-[11px] font-medium text-rose-600 animate-fadeIn ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
        <span className="leading-snug">{message}</span>
      </div>
    );
  }

  if (result.severity === 'warning') {
    return (
      <div
        className={`flex items-start gap-1.5 mt-1.5 text-[11px] font-medium text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200/80 animate-fadeIn ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
        <span className="leading-snug">{message}</span>
      </div>
    );
  }

  if (result.severity === 'valid' && showValid) {
    return (
      <div
        className={`flex items-center gap-1.5 mt-1 text-[11px] font-medium text-emerald-700 animate-fadeIn ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
        <span className="leading-snug">{message}</span>
      </div>
    );
  }

  return null;
};
