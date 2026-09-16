/**
 * ============================================================================
 * WhatsAppSettingsPanel — Provider config, template editor & message log
 * ============================================================================
 * Three sections:
 *   1. Delivery: choose wa.me (zero setup) or the Business Cloud API.
 *   2. Templates: edit the body for each notification event per language.
 *   3. Log: the recent outbound messages with their status.
 *
 * Credentials live in the local encrypted-at-rest store and never leave the
 * device except in the direct Cloud API call.
 */

import React, { useEffect, useState } from 'react';
import {
  MessageCircle,
  Settings2,
  FileText,
  History,
  Save,
  CheckCircle2,
  Send,
  Smartphone,
  Server,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Language, MessageLogEntry, MessageTemplate, WhatsAppConfig } from '../types';
import { translations } from '../translations';
import { DEFAULT_WHATSAPP_CONFIG } from '../utils/whatsappProvider';
import {
  clearMessageLog,
  loadMessageLog,
  loadTemplates,
  loadWhatsAppConfig,
  saveTemplates,
  saveWhatsAppConfig,
} from '../utils/whatsappStore';

interface WhatsAppSettingsPanelProps {
  language: Language;
  workspaceId: string;
}

type Tab = 'DELIVERY' | 'TEMPLATES' | 'LOG';

export const WhatsAppSettingsPanel: React.FC<WhatsAppSettingsPanelProps> = ({
  language,
  workspaceId,
}) => {
  const t = translations[language];
  const w = t.whatsapp;

  const [tab, setTab] = useState<Tab>('DELIVERY');
  const [config, setConfig] = useState<WhatsAppConfig>(DEFAULT_WHATSAPP_CONFIG);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [log, setLog] = useState<MessageLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [cfg, tpls, entries] = await Promise.all([
        loadWhatsAppConfig(workspaceId),
        loadTemplates(workspaceId),
        loadMessageLog(workspaceId),
      ]);
      if (cancelled) return;
      setConfig(cfg);
      setTemplates(tpls);
      setLog(entries);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await saveWhatsAppConfig(workspaceId, config);
      flashSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTemplate = (id: string, patch: Partial<MessageTemplate>) => {
    setTemplates((prev) => prev.map((tpl) => (tpl.id === id ? { ...tpl, ...patch } : tpl)));
  };

  const handleSaveTemplates = async () => {
    setSaving(true);
    try {
      await saveTemplates(workspaceId, templates);
      flashSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleClearLog = async () => {
    await clearMessageLog(workspaceId);
    setLog([]);
  };

  const statusStyle = (status: MessageLogEntry['status']) => {
    switch (status) {
      case 'SENT':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'OPENED':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
      case 'FAILED':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs">
        <div className="flex items-center gap-1">
          {(
            [
              { key: 'DELIVERY' as Tab, label: w.deliverySettings, icon: <Smartphone className="w-4 h-4" /> },
              { key: 'TEMPLATES' as Tab, label: w.templatesTab, icon: <FileText className="w-4 h-4" /> },
              { key: 'LOG' as Tab, label: w.messageLog, icon: <History className="w-4 h-4" /> },
            ]
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                tab === item.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Saved flash */}
      {savedFlash && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>{w.settingsSaved}</span>
        </div>
      )}

      {/* ---------------- DELIVERY ---------------- */}
      {tab === 'DELIVERY' && (
        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {w.deliveryMode}
            </h3>
          </div>

          {/* Provider choice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                {
                  kind: 'WA_ME' as const,
                  icon: <Smartphone className="w-4 h-4" />,
                  title: w.providerWaMe,
                  desc: w.providerWaMeDesc,
                  badge: w.recommended,
                },
                {
                  kind: 'CLOUD_API' as const,
                  icon: <Server className="w-4 h-4" />,
                  title: w.providerCloudApi,
                  desc: w.providerCloudApiDesc,
                  badge: w.advanced,
                },
              ]
            ).map((opt) => (
              <button
                key={opt.kind}
                type="button"
                onClick={() => setConfig((c) => ({ ...c, provider: opt.kind }))}
                className={`text-left rtl:text-right p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                  config.provider === opt.kind
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      config.provider === opt.kind
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {opt.icon}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {opt.title}
                  </span>
                  <span className="ml-auto rtl:ml-0 rtl:mr-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {opt.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Default country code */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {w.defaultCountryCode}
            </label>
            <input
              type="text"
              value={config.defaultCountryCode}
              onChange={(e) =>
                setConfig((c) => ({ ...c, defaultCountryCode: e.target.value.replace(/\D/g, '') }))
              }
              className="w-full sm:w-40 px-3 py-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              dir="ltr"
              placeholder="967"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {w.defaultCountryCodeHint}
            </p>
          </div>

          {/* Auto-notify toggle */}
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {w.autoNotify}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{w.autoNotifyHint}</div>
            </div>
            <input
              type="checkbox"
              checked={config.autoNotifyOnStatusChange}
              onChange={(e) =>
                setConfig((c) => ({ ...c, autoNotifyOnStatusChange: e.target.checked }))
              }
              className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
            />
          </label>

          {/* Cloud API credentials */}
          {config.provider === 'CLOUD_API' && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {w.cloudApiCredentials}
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {w.phoneNumberId}
                </label>
                <input
                  type="text"
                  value={config.cloudApi.phoneNumberId}
                  onChange={(e) =>
                    setConfig((c) => {
                      const cloudApi = { ...c.cloudApi, phoneNumberId: e.target.value };
                      return { ...c, cloudApi };
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  dir="ltr"
                  placeholder="123456789012345"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {w.accessToken}
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={config.cloudApi.accessToken}
                    onChange={(e) =>
                      setConfig((c) => {
                        const cloudApi = { ...c.cloudApi, accessToken: e.target.value };
                        return { ...c, cloudApi };
                      })
                    }
                    className="w-full px-3 py-2 pr-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    dir="ltr"
                    placeholder="EAAG..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Toggle token visibility"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 p-2.5 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{w.cloudApiSecurityNote}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{t.saveChanges}</span>
          </button>
        </div>
      )}

      {/* ---------------- TEMPLATES ---------------- */}
      {tab === 'TEMPLATES' && (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {language === 'ar' ? tpl.nameAr : tpl.nameEn}
                  </span>
                </div>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tpl.enabled}
                    onChange={(e) => handleUpdateTemplate(tpl.id, { enabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <span>{tpl.enabled ? w.enabled : w.disabled}</span>
                </label>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {w.arabicBody}
                  </label>
                  <textarea
                    value={tpl.bodyAr}
                    onChange={(e) => handleUpdateTemplate(tpl.id, { bodyAr: e.target.value })}
                    rows={5}
                    dir="rtl"
                    className="w-full px-3 py-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {w.englishBody}
                  </label>
                  <textarea
                    value={tpl.bodyEn}
                    onChange={(e) => handleUpdateTemplate(tpl.id, { bodyEn: e.target.value })}
                    rows={5}
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none leading-relaxed"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-mono">
                {w.availableVariables}: {'{{firstName}} {{lastName}} {{fullName}} {{passportNumber}} {{completionPercent}} {{missingCount}} {{bureauName}}'}
              </p>
            </div>
          ))}

          <button
            type="button"
            onClick={handleSaveTemplates}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{w.saveTemplates}</span>
          </button>
        </div>
      )}

      {/* ---------------- LOG ---------------- */}
      {tab === 'LOG' && (
        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {w.messageLog}
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {log.length}
              </span>
            </div>
            {log.length > 0 && (
              <button
                type="button"
                onClick={handleClearLog}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{w.clearLog}</span>
              </button>
            )}
          </div>

          {log.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <MessageCircle className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">{w.noMessagesYet}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {log.map((entry) => (
                <li
                  key={entry.id}
                  className="p-3 rounded-xl border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                      {entry.phone}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${statusStyle(entry.status)}`}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 whitespace-pre-wrap">
                    {entry.body}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                    <Send className="w-3 h-3" />
                    <span className="font-mono">{entry.provider}</span>
                    <span>•</span>
                    <span>{new Date(entry.createdAt).toLocaleString(language === 'ar' ? 'ar' : 'en')}</span>
                    {entry.error && (
                      <>
                        <span>•</span>
                        <span className="text-rose-500">{entry.error}</span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppSettingsPanel;
