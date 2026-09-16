import { useEffect, useCallback, useState } from 'react';
import { Language } from '../types';
import {
  loadShortcutsConfig,
  matchesBinding,
  CustomShortcutsConfig,
  SHORTCUTS_CHANGED_EVENT,
} from '../utils/shortcutManager';

interface KeyboardShortcutsOptions {
  onSave: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onJumpToStep?: (stepIndex: number) => void;
  onToggleView?: () => void;
  onNewApplicant?: () => void;
  onToggleTheme?: () => void;
  onOpenShortcutsHelp?: () => void;
  language: Language;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onSave,
  onNextStep,
  onPrevStep,
  onJumpToStep,
  onToggleView,
  onNewApplicant,
  onToggleTheme,
  onOpenShortcutsHelp,
  language,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const [shortcutsConfig, setShortcutsConfig] = useState<CustomShortcutsConfig>(() =>
    loadShortcutsConfig()
  );

  // Subscribe to live shortcut updates from localStorage / modal rebinds
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CustomShortcutsConfig>;
      if (customEvent.detail) {
        setShortcutsConfig(customEvent.detail);
      } else {
        setShortcutsConfig(loadShortcutsConfig());
      }
    };

    window.addEventListener(SHORTCUTS_CHANGED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(SHORTCUTS_CHANGED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const isTextInput = (element: Element | null): boolean => {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'input') {
      const type = (element as HTMLInputElement).type?.toLowerCase();
      // Allow shortcuts if checkbox, radio, button, etc.
      return !(type === 'checkbox' || type === 'radio' || type === 'button' || type === 'submit');
    }
    if (tagName === 'textarea' || tagName === 'select') return true;
    if ((element as HTMLElement).isContentEditable) return true;
    return false;
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const activeEl = document.activeElement;
      const insideText = isTextInput(activeEl);
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;
      const isShift = e.shiftKey;

      // 1. Save: checks customized or default save binding (works everywhere, including inside text inputs)
      if (matchesBinding(e, shortcutsConfig.save, language)) {
        e.preventDefault();
        e.stopPropagation();
        onSave();
        return;
      }

      // 2. Open Shortcuts Help Dialog:
      // - '?' (Shift + /) when NOT inside a text input
      // - Ctrl+/ or Cmd+/ anywhere
      if (
        onOpenShortcutsHelp &&
        ((isCtrlOrCmd && (e.key === '/' || e.key === '?')) ||
          (!insideText && e.key === '?'))
      ) {
        e.preventDefault();
        onOpenShortcutsHelp();
        return;
      }

      // 3. Step Navigation (Customized Rebound Keys or standard directional fallbacks)
      // Custom next/prev bindings check:
      const matchesNext = matchesBinding(e, shortcutsConfig.nextStep, language);
      const matchesPrev = matchesBinding(e, shortcutsConfig.prevStep, language);

      if (matchesNext || matchesPrev) {
        // Prevent navigating when regular single-letter typing inside a text input unless modifier is held
        const hasModifier = isCtrlOrCmd || isAlt;
        const allowTrigger = !insideText || hasModifier;

        if (allowTrigger) {
          e.preventDefault();
          if (matchesNext) {
            onNextStep();
          } else {
            onPrevStep();
          }
          return;
        }
      }

      // Fallback vertical arrows / PageUp / PageDown navigation if not already handled
      const isFallbackNav =
        e.key === 'PageDown' ||
        e.key === 'PageUp' ||
        ((isCtrlOrCmd || isAlt) && (e.key === 'ArrowDown' || e.key === 'ArrowUp'));

      if (isFallbackNav) {
        const allowInInput = isAlt || (isCtrlOrCmd && (isShift || isAlt));
        const canTrigger = !insideText || allowInInput;

        if (canTrigger) {
          e.preventDefault();
          if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            onNextStep();
          } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            onPrevStep();
          }
          return;
        }
      }

      // 4. Direct jump to step 1..7: Alt+1 to Alt+7 (or Ctrl+Alt+1..7)
      if (onJumpToStep && isAlt && !isCtrlOrCmd && !isShift) {
        const stepNum = parseInt(e.key, 10);
        if (!isNaN(stepNum) && stepNum >= 1 && stepNum <= 7) {
          e.preventDefault();
          onJumpToStep(stepNum - 1);
          return;
        }
      }

      // 5. Toggle View (Wizard <-> Bureau): Alt+B or Ctrl+B (when not typing in text input)
      if (
        onToggleView &&
        ((isAlt && (e.key === 'b' || e.key === 'B')) ||
          (!insideText && isCtrlOrCmd && (e.key === 'b' || e.key === 'B')))
      ) {
        e.preventDefault();
        onToggleView();
        return;
      }

      // 6. New Applicant: Alt+N or Ctrl+Alt+N
      if (
        onNewApplicant &&
        isAlt &&
        (e.key === 'n' || e.key === 'N')
      ) {
        e.preventDefault();
        onNewApplicant();
        return;
      }

      // 7. Toggle Theme: Alt+T or Ctrl+Alt+T
      if (
        onToggleTheme &&
        isAlt &&
        (e.key === 't' || e.key === 'T')
      ) {
        e.preventDefault();
        onToggleTheme();
        return;
      }
    },
    [
      enabled,
      language,
      shortcutsConfig,
      onSave,
      onNextStep,
      onPrevStep,
      onJumpToStep,
      onToggleView,
      onNewApplicant,
      onToggleTheme,
      onOpenShortcutsHelp,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
