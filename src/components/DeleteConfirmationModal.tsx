import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Applicant, Language } from '../types';
import { translations } from '../translations';
import {
  AlertTriangle,
  Trash2,
  X,
  ShieldAlert,
  CreditCard,
  Users,
  Camera,
  CheckCircle2,
} from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  applicant: Applicant | null;
  onClose: () => void;
  onConfirm: (applicantId: string) => void;
  language: Language;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  applicant,
  onClose,
  onConfirm,
  language,
}) => {
  const t = translations[language];
  const dt = t.deleteConfirmation;
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on open for safety (prevents accidental Enter triggering delete)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !applicant) return null;

  const fullName =
    `${applicant.lastName || ''} ${applicant.firstName || ''} ${applicant.middleName || ''}`.trim() ||
    (language === 'ar' ? 'متقدم غير مسمى' : 'Unnamed Entrant');

  const passport = applicant.passportNumber || applicant.mrzData?.documentNumber;
  const familyCount = applicant.familyMembers?.length || 0;
  const hasConfirmation = Boolean(applicant.confirmationNumber);

  const getStatusBadge = () => {
    switch (applicant.status) {
      case 'DRAFT':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      case 'REVIEWING':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
      case 'PHOTOS_VERIFIED':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
      case 'READY_FOR_SUBMISSION':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      case 'SUBMITTED':
        return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs overflow-y-auto"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6"
        >
          {/* Top Danger Bar */}
          <div className="h-1.5 w-full bg-linear-to-r from-rose-500 via-rose-600 to-red-600" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 rtl:left-4 ltr:right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 space-y-5">
            {/* Header: Warning Icon + Title */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3
                  id="delete-dialog-title"
                  className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug"
                >
                  {dt.title}
                </h3>
                <p
                  id="delete-dialog-description"
                  className="text-xs text-rose-600 dark:text-rose-400 font-semibold"
                >
                  {dt.warning}
                </p>
              </div>
            </div>

            {/* General Consequence explanation */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>{dt.consequences}</p>
            </div>

            {/* Critical Warning if submitted or has confirmation number */}
            {hasConfirmation && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 leading-relaxed font-semibold">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div>{dt.hasConfirmationWarning}</div>
                  <div className="font-mono bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 px-2 py-0.5 rounded inline-block font-bold">
                    {applicant.confirmationNumber}
                  </div>
                </div>
              </div>
            )}

            {/* Profile Snapshot Card */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {dt.applicantDetails}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Name */}
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[11px]">{dt.fullName}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                    {fullName}
                  </span>
                </div>

                {/* Passport */}
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    <span>{dt.passport}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                    {passport || dt.noPassport}
                  </span>
                </div>

                {/* Family members */}
                <div>
                  <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{dt.familyCount}</span>
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {familyCount > 0
                      ? `${familyCount} ${language === 'ar' ? 'مرافق' : 'derivatives'}`
                      : dt.noFamily}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <span className="text-slate-400 block text-[11px]">{dt.status}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getStatusBadge()}`}
                  >
                    {t.status[applicant.status]}
                  </span>
                </div>
              </div>

              {/* Photo & Country hints */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  {applicant.photo ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{language === 'ar' ? 'الصورة الشخصية معتمدة' : 'Verified Photo Included'}</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'ar' ? 'لا توجد صورة' : 'No photo attached'}</span>
                    </>
                  )}
                </span>
                {applicant.birthCountry && (
                  <span>{applicant.birthCountry}</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                {dt.escHint}
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  ref={cancelButtonRef}
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  {dt.cancelButton}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onConfirm(applicant.id);
                    onClose();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors shadow-xs hover:shadow-sm cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{dt.confirmButton}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
