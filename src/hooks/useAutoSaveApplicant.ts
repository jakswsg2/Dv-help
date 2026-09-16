import { useEffect, useRef, useState, useCallback } from 'react';
import { Applicant } from '../types';
import {
  getStoredApplicants,
  saveStoredApplicants,
  saveActiveApplicantId,
} from '../utils/storage';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutoSaveApplicantOptions {
  /**
   * Debounce delay in milliseconds before triggering save.
   * Default: 500ms
   */
  debounceMs?: number;

  /**
   * Custom save callback if caller manages parent state.
   * If omitted, updates local storage automatically.
   */
  onSave?: (applicant: Applicant) => void | Promise<void>;

  /**
   * Whether auto-save is currently enabled.
   * Default: true
   */
  enabled?: boolean;
}

export interface UseAutoSaveApplicantReturn {
  /** Current auto-save lifecycle status */
  saveStatus: AutoSaveStatus;
  /** True when a save operation is in-flight or debounce timer is counting */
  isSaving: boolean;
  /** True when current applicant has fields different from last saved snapshot */
  hasUnsavedChanges: boolean;
  /** Timestamp when save last completed successfully */
  lastSavedAt: Date | null;
  /** Immediately triggers the save, bypassing debounce delay */
  saveNow: () => void;
  /** Cancels any pending debounced save */
  cancel: () => void;
}

/**
 * Creates a normalized JSON snapshot of the applicant for deep comparison,
 * ignoring harmless timestamp variations if only comparing user-editable fields.
 */
function createApplicantSnapshot(applicant: Applicant | null | undefined): string {
  if (!applicant) return '';
  // Clone to omit transient updatedAt if needed, or serialize complete structure
  return JSON.stringify(applicant);
}

/**
 * Custom React hook that monitors an applicant's fields and automatically
 * triggers save logic after a debounced delay to optimize performance
 * and prevent continuous synchronous writes during fast user typing.
 */
export function useAutoSaveApplicant(
  applicant: Applicant | null | undefined,
  options: UseAutoSaveApplicantOptions = {}
): UseAutoSaveApplicantReturn {
  const { debounceMs = 500, onSave, enabled = true } = options;

  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // References to track state without causing effect re-triggers
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef<string>(createApplicantSnapshot(applicant));
  const currentApplicantRef = useRef<Applicant | null | undefined>(applicant);
  const onSaveRef = useRef(onSave);
  const applicantIdRef = useRef<string | undefined>(applicant?.id);

  // Keep references current
  currentApplicantRef.current = applicant;
  onSaveRef.current = onSave;

  // Clear debounce timer
  const clearDebounceTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Internal execution of save logic
  const executeSave = useCallback(
    async (appToSave: Applicant) => {
      clearDebounceTimer();
      setSaveStatus('saving');

      try {
        if (onSaveRef.current) {
          await onSaveRef.current(appToSave);
        } else {
          // Default storage save implementation
          const stored = getStoredApplicants();
          const exists = stored.some((a) => a.id === appToSave.id);
          const updatedList = exists
            ? stored.map((a) => (a.id === appToSave.id ? appToSave : a))
            : [appToSave, ...stored];

          saveStoredApplicants(updatedList);
          saveActiveApplicantId(appToSave.id);
        }

        // Update tracking ref
        lastSavedSnapshotRef.current = createApplicantSnapshot(appToSave);
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
        setSaveStatus('saved');

        // Reset saved indicator to idle after 2.5 seconds
        if (statusTimerRef.current) {
          clearTimeout(statusTimerRef.current);
        }
        statusTimerRef.current = setTimeout(() => {
          setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
        }, 2500);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    },
    [clearDebounceTimer]
  );

  // Public immediate save
  const saveNow = useCallback(() => {
    if (currentApplicantRef.current) {
      executeSave(currentApplicantRef.current);
    }
  }, [executeSave]);

  // Public cancel
  const cancel = useCallback(() => {
    clearDebounceTimer();
    setSaveStatus('idle');
  }, [clearDebounceTimer]);

  // Handle applicant change detection and debounced saving
  useEffect(() => {
    if (!enabled || !applicant) {
      return;
    }

    // Handle switching between different applicants
    if (applicantIdRef.current !== applicant.id) {
      // Flush pending save for previous applicant before switching if needed
      if (timerRef.current && currentApplicantRef.current) {
        executeSave(currentApplicantRef.current);
      } else {
        clearDebounceTimer();
      }

      applicantIdRef.current = applicant.id;
      lastSavedSnapshotRef.current = createApplicantSnapshot(applicant);
      setHasUnsavedChanges(false);
      setSaveStatus('idle');
      return;
    }

    const currentSnapshot = createApplicantSnapshot(applicant);

    // If identical to last saved state, no need to trigger save
    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    // Fields have changed!
    setHasUnsavedChanges(true);
    setSaveStatus('saving');
    clearDebounceTimer();

    timerRef.current = setTimeout(() => {
      if (currentApplicantRef.current) {
        executeSave(currentApplicantRef.current);
      }
    }, debounceMs);

    return () => {
      clearDebounceTimer();
    };
  }, [applicant, debounceMs, enabled, executeSave, clearDebounceTimer]);

  // Save on page unload or component unmount if changes remain unsaved
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentApplicantRef.current && timerRef.current) {
        // Execute immediate synchronous save before window unloads
        const app = currentApplicantRef.current;
        const stored = getStoredApplicants();
        const exists = stored.some((a) => a.id === app.id);
        const updatedList = exists
          ? stored.map((a) => (a.id === app.id ? app : a))
          : [app, ...stored];
        saveStoredApplicants(updatedList);
        saveActiveApplicantId(app.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearDebounceTimer();
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
      // If unmounting with pending timer, trigger save
      if (currentApplicantRef.current && timerRef.current) {
        handleBeforeUnload();
      }
    };
  }, [clearDebounceTimer]);

  return {
    saveStatus,
    isSaving: saveStatus === 'saving',
    hasUnsavedChanges,
    lastSavedAt,
    saveNow,
    cancel,
  };
}

export default useAutoSaveApplicant;
