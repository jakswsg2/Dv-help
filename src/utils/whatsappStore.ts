/**
 * ============================================================================
 * whatsappStore — Configuration, templates & message log persistence
 * ============================================================================
 * All WhatsApp state lives in the local `meta` store, keyed per workspace so
 * two bureaus never share templates or credentials. The message log is capped
 * to avoid unbounded growth on a long-lived device.
 */

import {
  MessageLogEntry,
  MessageTemplate,
  WhatsAppConfig,
} from '../types';
import { getMeta, setMeta } from './localDb';
import { DEFAULT_TEMPLATES } from './whatsappTemplates';
import { DEFAULT_WHATSAPP_CONFIG } from './whatsappProvider';

const MAX_LOG_ENTRIES = 200;

function configKey(workspaceId: string): string {
  return `wa_config_${workspaceId || 'local'}`;
}
function templatesKey(workspaceId: string): string {
  return `wa_templates_${workspaceId || 'local'}`;
}
function logKey(workspaceId: string): string {
  return `wa_log_${workspaceId || 'local'}`;
}

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export async function loadWhatsAppConfig(workspaceId: string): Promise<WhatsAppConfig> {
  const stored = await getMeta<WhatsAppConfig>(configKey(workspaceId));
  if (!stored) return { ...DEFAULT_WHATSAPP_CONFIG };
  // Shallow-merge so a config written by an older build still loads.
  return {
    ...DEFAULT_WHATSAPP_CONFIG,
    ...stored,
    cloudApi: { ...DEFAULT_WHATSAPP_CONFIG.cloudApi, ...(stored.cloudApi || {}) },
  };
}

export async function saveWhatsAppConfig(
  workspaceId: string,
  config: WhatsAppConfig
): Promise<void> {
  await setMeta(configKey(workspaceId), config);
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

export async function loadTemplates(workspaceId: string): Promise<MessageTemplate[]> {
  const stored = await getMeta<MessageTemplate[]>(templatesKey(workspaceId));
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    return DEFAULT_TEMPLATES.map((t) => ({ ...t }));
  }
  return stored;
}

export async function saveTemplates(
  workspaceId: string,
  templates: MessageTemplate[]
): Promise<void> {
  await setMeta(templatesKey(workspaceId), templates);
}

/* ------------------------------------------------------------------ */
/* Message log                                                         */
/* ------------------------------------------------------------------ */

export async function loadMessageLog(workspaceId: string): Promise<MessageLogEntry[]> {
  const stored = await getMeta<MessageLogEntry[]>(logKey(workspaceId));
  return Array.isArray(stored) ? stored : [];
}

export async function appendMessageLog(
  workspaceId: string,
  entry: MessageLogEntry
): Promise<MessageLogEntry[]> {
  const current = await loadMessageLog(workspaceId);
  const next = [entry, ...current].slice(0, MAX_LOG_ENTRIES);
  await setMeta(logKey(workspaceId), next);
  return next;
}

export async function clearMessageLog(workspaceId: string): Promise<void> {
  await setMeta(logKey(workspaceId), []);
}
