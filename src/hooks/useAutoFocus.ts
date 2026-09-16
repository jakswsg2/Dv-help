import { useState, useEffect, useCallback } from 'react';
import {
  isAutoFocusEnabled,
  setAutoFocusEnabled,
  toggleAutoFocus,
  focusFieldById,
  focusNextFieldInSequence,
  AUTOFOCUS_TOGGLE_EVENT,
  PERSONAL_DETAILS_SEQUENCE,
} from '../utils/autoFocusManager';

export function useAutoFocus(defaultSequence: string[] = PERSONAL_DETAILS_SEQUENCE) {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => isAutoFocusEnabled());

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
        setIsEnabled(customEvent.detail.enabled);
      } else {
        setIsEnabled(isAutoFocusEnabled());
      }
    };

    window.addEventListener(AUTOFOCUS_TOGGLE_EVENT, handleToggle);
    window.addEventListener('storage', handleToggle);

    // Keyboard shortcut listener: Alt + A or Option + A to toggle auto-advance
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A' || e.key === 'ش')) {
        e.preventDefault();
        const next = toggleAutoFocus();
        setIsEnabled(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener(AUTOFOCUS_TOGGLE_EVENT, handleToggle);
      window.removeEventListener('storage', handleToggle);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = toggleAutoFocus();
    setIsEnabled(next);
    return next;
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setAutoFocusEnabled(enabled);
    setIsEnabled(enabled);
  }, []);

  const focusNext = useCallback(
    (currentFieldId: string, sequence: string[] = defaultSequence) => {
      return focusNextFieldInSequence(currentFieldId, sequence);
    },
    [defaultSequence]
  );

  const focusField = useCallback(
    (targetId: string, options?: { select?: boolean; highlight?: boolean; force?: boolean }) => {
      return focusFieldById(targetId, options);
    },
    []
  );

  /**
   * Helper handler for onKeyDown: when user presses Enter and the field is valid,
   * advances to the next field automatically.
   */
  const handleEnterToNext = useCallback(
    (
      e: React.KeyboardEvent,
      currentFieldId: string,
      isValid: boolean = true,
      sequence: string[] = defaultSequence
    ) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isValid) {
          focusNext(currentFieldId, sequence);
        }
      }
    },
    [defaultSequence, focusNext]
  );

  return {
    isEnabled,
    toggle,
    setEnabled,
    focusNext,
    focusField,
    handleEnterToNext,
  };
}
