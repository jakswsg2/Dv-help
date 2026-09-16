/**
 * ============================================================================
 * WhatsAppSendButton — Compose & send a WhatsApp message for one applicant
 * ============================================================================
 * Opens a small composer pre-filled from the chosen template and the
 * applicant's data. The recipient's phone is editable (numbers are often
 * stored locally formatted). Sending delegates to the configured provider and
 * appends a log entry.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Loader2, CheckCircle2, AlertCircle, Phone } from 'lucide-react';
import { Applicant, Language, MessageTemplate, NotificationEvent, WhatsAppConfig } from '../types';
import { translations } from '../translations';
import {
  buildTemplateVariables,
  renderTemplate,
  templateBody,
} from '../utils/whatsappTemplates';
import { buildLogEntry, createWhatsAppProvider, normalizePhone } from '../utils/whatsappProvider';

interface WhatsAppSendButtonProps {
  applicant: Applicant;
  language: Language;
  workspaceId: string;
  bureauName: string;
  config: WhatsAppConfig;
  templates: MessageTemplate[];
  missingCount: number;
  completionPercent: number;
  /** Default event to select when opening the composer. */
  defaultEvent?: NotificationEvent;
  onSent?: (logEntry: ReturnType<typeof buildLogEntry>) => void;
  variant?: 'icon' | 'full';
}

export const WhatsAppSendButton: React.FC<WhatsAppSendButtonProps> = ({
  applicant,
  language,
  bureauName,
  config,
  templates,
  missingCount,
  completionPercent,
  defaultEvent = 'CUSTOM_REMINDER',
  onSent,
  variant = 'icon',
}) => {
  const t = translations[language];
  const w = t.whatsapp;

  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string>('');
  const [body, setBody] = useState('');
  const [phone, setPhone] = useState(applicant.phoneNumber || '');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const enabledTemplates = useMemo(() => templates.filter((tpl) => tpl.enabled), [templates]);

  // Choose the template matching the default event, else the first enabled one.
  useEffect(() => {
    if (!open) return;
    const preferred =
      enabledTemplates.find((tpl) => tpl.event === defaultEvent) || enabledTemplates[0];
    if (preferred) {
      setTemplateId(preferred.id);
      const vars = buildTemplateVariables(applicant, bureauName, missingCount, completionPercent);
      setBody(renderTemplate(templateBody(preferred, language), vars));
    }
    setPhone(applicant.phoneNumber || '');
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Re-render the body when the template or language changes.
  useEffect(() => {
    const tpl = enabledTemplates.find((x) => x.id === templateId);
    if (!tpl) return;
    const vars = buildTemplateVariables(applicant, bureauName, missingCount, completionPercent);
    setBody(renderTemplate(templateBody(tpl, language), vars));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, language]);

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    setResult(null);
    try {
      const provider = createWhatsAppProvider(config);
      const sendResult = await provider.send(phone, body);
      const entry = buildLogEntry(
        applicant.id,
        normalizePhone(phone, config.defaultCountryCode),
        body,
        sendResult,
        config.provider,
        templateId
      );
      onSent?.(entry);

      if (sendResult.status === 'FAILED') {
        setResult({ ok: false, message: `${w.sendFailed}: ${sendResult.error || ''}` });
      } else if (sendResult.status === 'OPENED') {
        setResult({ ok: true, message: w.openedInWhatsApp });
      } else {
        setResult({ ok: true, message: w.sentSuccessfully });
        setTimeout(() => setOpen(false), 1200);
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : w.sendFailed });
    } finally {
      setSending(false);
    }
  };

  const displayName = [applicant.firstName, applicant.lastName].filter(Boolean).join(' ') || '—';

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={w.sendMessage}
        aria-label={w.sendMessage}
        className={
          variant === 'full'
            ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer'
            : 'p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer'
        }
      >
        <MessageCircle className="w-4 h-4" />
        {variant === 'full' && <span>{w.sendMessage}</span>}
      </button>

      {/* Composer modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => !sending && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800 max-h-[92vh] flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {w.sendMessage}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {displayName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !sending && setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3.5 overflow-y-auto">
                {/* Template picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {w.template}
                  </label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    {enabledTemplates.length === 0 && (
                      <option value="">{w.noTemplatesEnabled}</option>
                    )}
                    {enabledTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {language === 'ar' ? tpl.nameAr : tpl.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {w.phoneNumber}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                      dir="ltr"
                      placeholder="+967..."
                    />
                  </div>
                  {phone && normalizePhone(phone, config.defaultCountryCode) !== phone.replace(/\D/g, '') && (
                    <p className="mt-1 text-[10px] text-slate-400 font-mono" dir="ltr">
                      → {normalizePhone(phone, config.defaultCountryCode)}
                    </p>
                  )}
                </div>

                {/* Message body */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {w.messageBody}
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={7}
                    className="w-full px-3 py-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none leading-relaxed"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">{w.editableHint}</p>
                </div>

                {/* Result */}
                {result && (
                  <div
                    className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${
                      result.ok
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                    }`}
                  >
                    {result.ok ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{result.message}</span>
                  </div>
                )}

                {config.provider === 'WA_ME' && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{w.waMeHint}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 p-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {w.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !phone || !body}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold shadow-xs transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{sending ? w.sending : w.sendNow}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WhatsAppSendButton;
