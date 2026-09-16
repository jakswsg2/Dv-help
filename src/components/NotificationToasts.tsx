/**
 * ============================================================================
 * NotificationToasts — Surfaces pending status-change notifications
 * ============================================================================
 * A small stack of dismissible cards, one per applicant whose status just
 * changed. Each card offers "send" (opens the WhatsApp composer) and "dismiss".
 * Non-blocking by design: it sits above the bottom bar and never traps focus.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, BellRing, CheckCircle2 } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';
import { PendingNotification } from '../hooks/useStatusNotifications';

interface NotificationToastsProps {
  language: Language;
  pending: PendingNotification[];
  onDismiss: (applicantId: string) => void;
  onSend: (notification: PendingNotification) => void;
}

export const NotificationToasts: React.FC<NotificationToastsProps> = ({
  language,
  pending,
  onDismiss,
  onSend,
}) => {
  const t = translations[language];
  const w = t.whatsapp;

  if (pending.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-24 right-3 left-3 sm:left-auto sm:right-4 sm:w-96 z-40 space-y-2 pointer-events-none">
      <AnimatePresence>
        {pending.slice(0, 3).map((n) => {
          const isReady = n.newStatus === 'READY_FOR_SUBMISSION';
          return (
            <motion.div
              key={n.applicantId + n.newStatus}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-3.5"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isReady
                      ? 'bg-emerald-50 dark:bg-emerald-950/60'
                      : 'bg-blue-50 dark:bg-blue-950/60'
                  }`}
                >
                  {isReady ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <BellRing className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isReady ? w.notifyReady : w.notifySubmitted}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {n.applicantName}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onSend(n)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{w.sendNotification}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismiss(n.applicantId)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {w.dismiss}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(n.applicantId)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  aria-label="dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToasts;
