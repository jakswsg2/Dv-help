/**
 * ============================================================================
 * whatsappTemplates — Template catalogue, rendering & variable resolution
 * ============================================================================
 * Templates are plain strings with {{placeholder}} tokens. Rendering is
 * intentionally simple and safe: unknown tokens are left as-is rather than
 * blanked, so a broken template is obvious instead of silently losing data.
 */

import {
  Applicant,
  Language,
  MessageTemplate,
  NotificationEvent,
  TemplateVariables,
} from '../types';

/** Replace every {{token}} in `body` with the matching variable value. */
export function renderTemplate(body: string, vars: TemplateVariables): string {
  return body.replace(/\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = (vars as unknown as Record<string, string>)[key];
    return value !== undefined ? value : match;
  });
}

/**
 * Build the variable bag from an applicant plus a little context.
 * `missingCount` and `completionPercent` are supplied by the caller because
 * they depend on the progress calculator, keeping this module pure.
 */
export function buildTemplateVariables(
  applicant: Applicant,
  bureauName: string,
  missingCount: number,
  completionPercent: number
): TemplateVariables {
  const fullName = [applicant.firstName, applicant.middleName, applicant.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    firstName: applicant.firstName || '',
    lastName: applicant.lastName || '',
    fullName: fullName || '—',
    passportNumber: applicant.passportNumber || '—',
    status: applicant.status || '',
    programYear: String(applicant.programYear || ''),
    missingCount: String(missingCount),
    completionPercent: `${completionPercent}%`,
    bureauName,
  };
}

/** The built-in starter templates, one per notification event. */
export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-missing-docs',
    nameAr: 'تنبيه نواقص المستندات',
    nameEn: 'Missing documents reminder',
    event: 'MISSING_DOCUMENTS',
    bodyAr:
      'مرحباً {{firstName}} {{lastName}}،\nنود تذكيركم بأن ملفكم في {{bureauName}} لا يزال ينقصه {{missingCount}} من المتطلبات.\nنسبة الإكمال الحالية: {{completionPercent}}.\nيرجى استكمالها في أقرب وقت لضمان جاهزية الطلب.',
    bodyEn:
      'Hello {{firstName}} {{lastName}},\nA friendly reminder that your file at {{bureauName}} is still missing {{missingCount}} requirement(s).\nCurrent completion: {{completionPercent}}.\nPlease complete them at your earliest convenience.',
    enabled: true,
  },
  {
    id: 'tpl-photo-rejected',
    nameAr: 'إعادة إرسال الصورة الشخصية',
    nameEn: 'Photo resubmission required',
    event: 'PHOTO_REJECTED',
    bodyAr:
      'مرحباً {{firstName}}،\nالصورة الشخصية المرفقة لملفكم لم تجتز الفحص الفني (600×600 بكسل، أقل من 240KB، وضوح كافٍ).\nيرجى إرسال صورة جديدة مطابقة للمواصفات.',
    bodyEn:
      'Hello {{firstName}},\nThe photo attached to your file did not pass the technical check (600×600 px, under 240KB, sufficient sharpness).\nPlease send a new compliant photo.',
    enabled: true,
  },
  {
    id: 'tpl-ready',
    nameAr: 'جاهزية الملف للإدخال الرسمي',
    nameEn: 'File ready for official submission',
    event: 'READY_FOR_SUBMISSION',
    bodyAr:
      'مرحباً {{firstName}} {{lastName}}،\nيسرّنا إبلاغكم بأن ملفكم (رقم الجواز: {{passportNumber}}) قد اكتمل 100% وهو جاهز لمرحلة الإدخال الرسمي في موقع وزارة الخارجية الأمريكية.\nسيتواصل معكم فريق {{bureauName}} لاستكمال الخطوة الأخيرة.',
    bodyEn:
      'Hello {{firstName}} {{lastName}},\nGood news — your file (passport: {{passportNumber}}) is 100% complete and ready for the official submission stage on the U.S. Department of State website.\nOur team at {{bureauName}} will contact you for the final step.',
    enabled: true,
  },
  {
    id: 'tpl-submitted',
    nameAr: 'تأكيد اكتمال التسجيل',
    nameEn: 'Submission confirmation',
    event: 'SUBMISSION_COMPLETE',
    bodyAr:
      'مرحباً {{firstName}}،\nتم إتمام تسجيل طلبكم لبرنامج DV-{{programYear}} رسمياً.\nنتمنى لكم التوفيق، ونذكّركم بأن الاختيار من صلاحية وزارة الخارجية الأمريكية وحدها.',
    bodyEn:
      'Hello {{firstName}},\nYour DV-{{programYear}} entry has been officially submitted.\nBest of luck — and remember, selection is at the sole discretion of the U.S. Department of State.',
    enabled: true,
  },
  {
    id: 'tpl-reminder',
    nameAr: 'تذكير عام',
    nameEn: 'General reminder',
    event: 'CUSTOM_REMINDER',
    bodyAr: 'مرحباً {{firstName}}،\nنود تذكيركم بمراجعة ملفكم في {{bureauName}}.\nشكراً لتعاونكم.',
    bodyEn:
      'Hello {{firstName}},\nA quick reminder to review your file at {{bureauName}}.\nThank you for your cooperation.',
    enabled: true,
  },
];

/** The template that best matches an event, if one is enabled. */
export function templateForEvent(
  templates: MessageTemplate[],
  event: NotificationEvent
): MessageTemplate | undefined {
  return templates.find((tpl) => tpl.event === event && tpl.enabled);
}

/** Pick the template body for the active language, falling back sensibly. */
export function templateBody(tpl: MessageTemplate, language: Language): string {
  return language === 'ar' ? tpl.bodyAr : tpl.bodyEn;
}
