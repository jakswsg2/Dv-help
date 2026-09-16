/**
 * ============================================================================
 * whatsappProvider — Pluggable WhatsApp delivery
 * ============================================================================
 * Two implementations behind one interface:
 *
 *   WaMeProvider      → builds a https://wa.me/<number>?text=<message> link and
 *                       opens it. Works with zero setup; the user confirms in
 *                       the WhatsApp app. Status becomes 'OPENED'.
 *
 *   CloudApiProvider  → POSTs to the Meta Graph API. Requires credentials;
 *                       status becomes 'SENT' or 'FAILED'. Never called unless
 *                       the user explicitly selected the Cloud API provider.
 *
 * The UI never branches on provider kind: it calls `send()` and reads the
 * returned status.
 */

import { MessageLogEntry, MessageStatus, WhatsAppConfig, WhatsAppProviderKind } from '../types';

export interface SendResult {
  status: MessageStatus;
  /** Present when the provider cannot complete the send itself. */
  openedUrl?: string;
  error?: string;
}

export interface WhatsAppProvider {
  kind: WhatsAppProviderKind;
  /** Human label for the UI. */
  label: string;
  /** Send (or open) a message to a phone number. */
  send(phone: string, body: string): Promise<SendResult>;
}

/* ------------------------------------------------------------------ */
/* Phone normalisation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Normalise a phone number into the digits-only international form wa.me and
 * the Cloud API both require. Strips spaces, dashes, parentheses and a single
 * leading '+'. A local number missing a country code gets the configured
 * default prepended.
 */
export function normalizePhone(raw: string, defaultCountryCode = ''): string {
  if (!raw) return '';
  let digits = raw.replace(/[^\d]/g, '');

  // A leading 00 is an international prefix and must be dropped.
  if (raw.trim().startsWith('00')) digits = digits.replace(/^00/, '');

  // Prepend the country code when the number looks local.
  if (defaultCountryCode && !digits.startsWith(defaultCountryCode)) {
    // Heuristic: a local number is shorter than the country code + 8 digits.
    if (digits.length <= 10) {
      digits = defaultCountryCode.replace(/\D/g, '') + digits.replace(/^0+/, '');
    }
  }

  return digits;
}

/* ------------------------------------------------------------------ */
/* wa.me provider                                                      */
/* ------------------------------------------------------------------ */

export class WaMeProvider implements WhatsAppProvider {
  readonly kind: WhatsAppProviderKind = 'WA_ME';
  readonly label = 'wa.me link';

  constructor(private defaultCountryCode: string) {}

  async send(phone: string, body: string): Promise<SendResult> {
    const normalized = normalizePhone(phone, this.defaultCountryCode);
    if (!normalized) {
      return { status: 'FAILED', error: 'INVALID_PHONE' };
    }

    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(body)}`;

    // Open in a new tab. Browsers may block this outside a user gesture, so
    // callers must invoke send() from a click handler.
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // Still surface the URL so the user can copy it manually.
      return { status: 'OPENED', openedUrl: url };
    }

    return { status: 'OPENED', openedUrl: url };
  }
}

/* ------------------------------------------------------------------ */
/* Cloud API provider                                                  */
/* ------------------------------------------------------------------ */

export class CloudApiProvider implements WhatsAppProvider {
  readonly kind: WhatsAppProviderKind = 'CLOUD_API';
  readonly label = 'WhatsApp Business Cloud API';

  constructor(private config: WhatsAppConfig) {}

  async send(phone: string, body: string): Promise<SendResult> {
    const { phoneNumberId, accessToken, apiVersion } = this.config.cloudApi;

    if (!phoneNumberId || !accessToken) {
      return { status: 'FAILED', error: 'CLOUD_API_NOT_CONFIGURED' };
    }

    const normalized = normalizePhone(phone, this.config.defaultCountryCode);
    if (!normalized) {
      return { status: 'FAILED', error: 'INVALID_PHONE' };
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/${apiVersion || 'v21.0'}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: normalized,
            type: 'text',
            text: { preview_url: false, body },
          }),
        }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        return { status: 'FAILED', error: `HTTP_${res.status} ${detail.slice(0, 180)}` };
      }

      return { status: 'SENT' };
    } catch (err) {
      return { status: 'FAILED', error: err instanceof Error ? err.message : String(err) };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

/** Build the provider selected by the config. */
export function createWhatsAppProvider(config: WhatsAppConfig): WhatsAppProvider {
  if (config.provider === 'CLOUD_API') {
    return new CloudApiProvider(config);
  }
  return new WaMeProvider(config.defaultCountryCode);
}

/** Default configuration for a fresh workspace. */
export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  provider: 'WA_ME',
  defaultCountryCode: '967',
  cloudApi: { phoneNumberId: '', accessToken: '', apiVersion: 'v21.0' },
  autoNotifyOnStatusChange: false,
};

/** Build a log entry for a send attempt. */
export function buildLogEntry(
  applicantId: string,
  phone: string,
  body: string,
  result: SendResult,
  provider: WhatsAppProviderKind,
  templateId?: string
): MessageLogEntry {
  const now = new Date().toISOString();
  return {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    applicantId,
    phone,
    templateId,
    body,
    status: result.status,
    provider,
    createdAt: now,
    sentAt: result.status === 'SENT' || result.status === 'OPENED' ? now : undefined,
    error: result.error,
  };
}
