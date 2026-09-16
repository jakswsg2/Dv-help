/**
 * ============================================================================
 * useStatusNotifications — Auto WhatsApp notification on applicant status change
 * ============================================================================
 * Watches the applicant list and, when a status transition occurs AND the
 * workspace has auto-notify enabled, opens the WhatsApp composer for that
 * applicant pre-targeted at the matching event template.
 *
 * Design decision: we deliberately do NOT auto-send. Even with the Cloud API
 * configured, silently messaging an applicant on a data change is risky — a
 * mis-click could notify the wrong person. Instead we surface a durable
 * "pending notification" the staff member confirms. When the Cloud API is on
 * and the workspace opts in, the confirmation is a single click.
 */

import { useEffect, useRef, useState } from 'react';
import { Applicant, ApplicantStatus, NotificationEvent } from '../types';

/** Map a new status to the notification event it should trigger. */
export function eventForStatus(status: ApplicantStatus): NotificationEvent | null {
  switch (status) {
    case 'READY_FOR_SUBMISSION':
      return 'READY_FOR_SUBMISSION';
    case 'SUBMITTED':
      return 'SUBMISSION_COMPLETE';
    default:
      return null;
  }
}

export interface PendingNotification {
  applicantId: string;
  applicantName: string;
  event: NotificationEvent;
  previousStatus: ApplicantStatus;
  newStatus: ApplicantStatus;
  at: string;
}

/**
 * Track status transitions across renders and queue a notification for each.
 * Returns the queue plus a dismiss action. Only transitions to states that
 * have a matching template are queued.
 */
export function useStatusNotifications(
  applicants: Applicant[],
  enabled: boolean
): {
  pending: PendingNotification[];
  dismiss: (applicantId: string) => void;
  clear: () => void;
} {
  const prevStatusRef = useRef<Map<string, ApplicantStatus>>(new Map());
  const [pending, setPending] = useState<PendingNotification[]>([]);
  const initialisedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // Still track statuses so enabling later does not fire a burst.
      prevStatusRef.current = new Map(applicants.map((a) => [a.id, a.status]));
      initialisedRef.current = true;
      return;
    }

    // On the very first pass, record statuses without notifying — otherwise
    // every existing applicant would fire a notification on app load.
    if (!initialisedRef.current) {
      prevStatusRef.current = new Map(applicants.map((a) => [a.id, a.status]));
      initialisedRef.current = true;
      return;
    }

    const queued: PendingNotification[] = [];

    applicants.forEach((app) => {
      const prev = prevStatusRef.current.get(app.id);
      if (prev && prev !== app.status) {
        const event = eventForStatus(app.status);
        if (event) {
          queued.push({
            applicantId: app.id,
            applicantName: [app.firstName, app.lastName].filter(Boolean).join(' ') || app.id,
            event,
            previousStatus: prev,
            newStatus: app.status,
            at: new Date().toISOString(),
          });
        }
      }
      prevStatusRef.current.set(app.id, app.status);
    });

    if (queued.length > 0) {
      setPending((current) => {
        // Replace any existing entry for the same applicant to avoid duplicates.
        const withoutStale = current.filter(
          (p) => !queued.some((q) => q.applicantId === p.applicantId)
        );
        return [...queued, ...withoutStale];
      });
    }
  }, [applicants, enabled]);

  const dismiss = (applicantId: string) =>
    setPending((current) => current.filter((p) => p.applicantId !== applicantId));

  const clear = () => setPending([]);

  return { pending, dismiss, clear };
}
