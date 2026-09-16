import { Language } from '../types';

export type RebindableAction = 'nextStep' | 'prevStep' | 'save';

export interface KeyBinding {
  key: string; // e.g. "ArrowRight", "s", "j", "Enter", "PageDown"
  code?: string; // e.g. "KeyS", "ArrowRight", "KeyJ"
  ctrlOrCmd: boolean;
  alt: boolean;
  shift: boolean;
}

export interface CustomShortcutsConfig {
  nextStep: KeyBinding;
  prevStep: KeyBinding;
  save: KeyBinding;
}

export const DEFAULT_SHORTCUTS: CustomShortcutsConfig = {
  nextStep: {
    key: 'ArrowRight',
    code: 'ArrowRight',
    ctrlOrCmd: true,
    alt: false,
    shift: false,
  },
  prevStep: {
    key: 'ArrowLeft',
    code: 'ArrowLeft',
    ctrlOrCmd: true,
    alt: false,
    shift: false,
  },
  save: {
    key: 's',
    code: 'KeyS',
    ctrlOrCmd: true,
    alt: false,
    shift: false,
  },
};

export const SHORTCUTS_STORAGE_KEY = 'dvprep_custom_shortcuts_v1';
export const SHORTCUTS_CHANGED_EVENT = 'dv_shortcuts_updated';

/**
 * Load shortcuts from localStorage or return defaults
 */
export function loadShortcutsConfig(): CustomShortcutsConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_SHORTCUTS };

  try {
    const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SHORTCUTS };

    const parsed = JSON.parse(raw);
    return {
      nextStep: { ...DEFAULT_SHORTCUTS.nextStep, ...(parsed.nextStep || {}) },
      prevStep: { ...DEFAULT_SHORTCUTS.prevStep, ...(parsed.prevStep || {}) },
      save: { ...DEFAULT_SHORTCUTS.save, ...(parsed.save || {}) },
    };
  } catch (err) {
    console.warn('Failed to parse custom shortcuts from localStorage, using defaults:', err);
    return { ...DEFAULT_SHORTCUTS };
  }
}

/**
 * Save shortcuts to localStorage and notify the application
 */
export function saveShortcutsConfig(config: CustomShortcutsConfig): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(
      new CustomEvent(SHORTCUTS_CHANGED_EVENT, { detail: config })
    );
  } catch (err) {
    console.error('Failed to save custom shortcuts to localStorage:', err);
  }
}

/**
 * Reset shortcuts to system defaults
 */
export function resetShortcutsConfig(): CustomShortcutsConfig {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
      window.dispatchEvent(
        new CustomEvent(SHORTCUTS_CHANGED_EVENT, { detail: DEFAULT_SHORTCUTS })
      );
    } catch (err) {
      console.error('Failed to clear custom shortcuts:', err);
    }
  }
  return { ...DEFAULT_SHORTCUTS };
}

/**
 * Check if two key bindings are identical
 */
export function areBindingsEqual(b1: KeyBinding, b2: KeyBinding): boolean {
  if (b1.ctrlOrCmd !== b2.ctrlOrCmd) return false;
  if (b1.alt !== b2.alt) return false;
  if (b1.shift !== b2.shift) return false;

  const k1 = b1.key.toLowerCase();
  const k2 = b2.key.toLowerCase();
  return k1 === k2;
}

/**
 * Check if a binding matches the system default
 */
export function isDefaultBinding(action: RebindableAction, binding: KeyBinding): boolean {
  const def = DEFAULT_SHORTCUTS[action];
  return areBindingsEqual(def, binding);
}

/**
 * Check for duplicate shortcut bindings across actions
 */
export function findBindingConflicts(config: CustomShortcutsConfig): {
  hasConflict: boolean;
  conflictingActions: [RebindableAction, RebindableAction] | null;
} {
  const actions: RebindableAction[] = ['nextStep', 'prevStep', 'save'];

  for (let i = 0; i < actions.length; i++) {
    for (let j = i + 1; j < actions.length; j++) {
      const a1 = actions[i];
      const a2 = actions[j];
      if (areBindingsEqual(config[a1], config[a2])) {
        return {
          hasConflict: true,
          conflictingActions: [a1, a2],
        };
      }
    }
  }

  return { hasConflict: false, conflictingActions: null };
}

/**
 * Check if macOS platform
 */
export function isMacOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Format key display name (e.g. "ArrowRight" -> "→" or "Right")
 */
export function formatKeyName(key: string, language: Language = 'en'): string {
  switch (key) {
    case 'ArrowRight':
      return '→';
    case 'ArrowLeft':
      return '←';
    case 'ArrowUp':
      return '↑';
    case 'ArrowDown':
      return '↓';
    case 'PageUp':
      return language === 'ar' ? 'صفحة لأعلى' : 'PageUp';
    case 'PageDown':
      return language === 'ar' ? 'صفحة لأسفل' : 'PageDown';
    case 'Enter':
      return '↵ Enter';
    case 'Escape':
      return 'Esc';
    case ' ':
      return language === 'ar' ? 'مسافة (Space)' : 'Space';
    case 'Tab':
      return 'Tab';
    default:
      if (key.length === 1) {
        return key.toUpperCase();
      }
      return key;
  }
}

/**
 * Breakdown of modifiers and main key for UI chips/kbd rendering
 */
export function formatKeyBindingParts(
  binding: KeyBinding,
  language: Language = 'en',
  isMac: boolean = isMacOS()
): { modifiers: string[]; mainKey: string; fullDisplay: string } {
  const modifiers: string[] = [];
  const modName = isMac ? '⌘ Cmd' : 'Ctrl';

  if (binding.ctrlOrCmd) {
    modifiers.push(modName);
  }
  if (binding.alt) {
    modifiers.push(isMac ? '⌥ Opt' : 'Alt');
  }
  if (binding.shift) {
    modifiers.push('Shift');
  }

  const mainKey = formatKeyName(binding.key, language);
  const fullDisplay = [...modifiers, mainKey].join(' + ');

  return {
    modifiers,
    mainKey,
    fullDisplay,
  };
}

/**
 * Format binding into a single display string (e.g. "Ctrl + →")
 */
export function formatKeyBinding(
  binding: KeyBinding,
  language: Language = 'en',
  isMac: boolean = isMacOS()
): string {
  return formatKeyBindingParts(binding, language, isMac).fullDisplay;
}

/**
 * Test if a keyboard event matches a configured key binding
 */
export function matchesBinding(
  e: KeyboardEvent,
  binding: KeyBinding,
  language: Language = 'en'
): boolean {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey;
  if (Boolean(binding.ctrlOrCmd) !== Boolean(isCtrlOrCmd)) return false;
  if (Boolean(binding.alt) !== Boolean(e.altKey)) return false;

  // For shift: if shift is explicitly required in binding, require it in event
  // If binding does not require shift, only allow shift if it was used with a letter key (like uppercase S)
  if (binding.shift !== e.shiftKey) {
    // If the binding key is a letter and user pressed shift, let it pass if shift wasn't explicitly false for symbol keys
    const isSingleLetter = binding.key.length === 1 && /[a-zA-Z]/.test(binding.key);
    if (!isSingleLetter) {
      return false;
    }
  }

  const targetKey = binding.key.toLowerCase();
  const eventKey = e.key.toLowerCase();

  // Special direction check for default arrows in RTL/Arabic
  if (
    language === 'ar' &&
    (binding.key === 'ArrowRight' || binding.key === 'ArrowLeft') &&
    (e.key === 'ArrowRight' || e.key === 'ArrowLeft')
  ) {
    // In RTL, if binding is ArrowRight (next), in Arabic screen visual ArrowLeft moves forward (next)
    // We match by physical arrow or configured intent
    if (binding.key === 'ArrowRight' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      return e.key === 'ArrowLeft';
    }
    if (binding.key === 'ArrowLeft' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      return e.key === 'ArrowRight';
    }
  }

  if (eventKey === targetKey) {
    return true;
  }

  // Check code fallback if provided (e.g. "KeyS", "ArrowRight")
  if (binding.code && e.code === binding.code) {
    return true;
  }

  return false;
}

/**
 * Presets for rapid configuration
 */
export const SHORTCUT_PRESETS: Record<string, { labelEn: string; labelAr: string; config: CustomShortcutsConfig }> = {
  standard: {
    labelEn: 'Standard (Ctrl + Arrows)',
    labelAr: 'الافتراضي (Ctrl + الأسهم)',
    config: DEFAULT_SHORTCUTS,
  },
  vim: {
    labelEn: 'Vim Style (Ctrl + J / K)',
    labelAr: 'نمط Vim (Ctrl + J / K)',
    config: {
      nextStep: { key: 'j', code: 'KeyJ', ctrlOrCmd: true, alt: false, shift: false },
      prevStep: { key: 'k', code: 'KeyK', ctrlOrCmd: true, alt: false, shift: false },
      save: { key: 's', code: 'KeyS', ctrlOrCmd: true, alt: false, shift: false },
    },
  },
  altKeys: {
    labelEn: 'Alt Navigation (Alt + Arrows)',
    labelAr: 'نمط Alt (Alt + الأسهم)',
    config: {
      nextStep: { key: 'ArrowRight', code: 'ArrowRight', ctrlOrCmd: false, alt: true, shift: false },
      prevStep: { key: 'ArrowLeft', code: 'ArrowLeft', ctrlOrCmd: false, alt: true, shift: false },
      save: { key: 's', code: 'KeyS', ctrlOrCmd: true, alt: false, shift: false },
    },
  },
  pageKeys: {
    labelEn: 'PageUp / PageDown',
    labelAr: 'أزرار الصفحات (PageDown / PageUp)',
    config: {
      nextStep: { key: 'PageDown', code: 'PageDown', ctrlOrCmd: true, alt: false, shift: false },
      prevStep: { key: 'PageUp', code: 'PageUp', ctrlOrCmd: true, alt: false, shift: false },
      save: { key: 's', code: 'KeyS', ctrlOrCmd: true, alt: false, shift: false },
    },
  },
};
