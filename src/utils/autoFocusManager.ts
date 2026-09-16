/**
 * Smart Auto-Focus & Auto-Advance Engine for DV-Prep.
 * Streamlines the DS-5501 application form-filling experience by automatically
 * advancing the cursor to the next required/logical form field as soon as validation criteria are met.
 */

export const AUTOFOCUS_STORAGE_KEY = 'dv_prep_autofocus_enabled';
export const AUTOFOCUS_TOGGLE_EVENT = 'dv_prep_autofocus_toggle';

/**
 * Checks if auto-focus is currently enabled in user preferences (defaults to true).
 */
export function isAutoFocusEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(AUTOFOCUS_STORAGE_KEY);
    if (val === null) return true; // Enabled by default
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * Updates the user's auto-focus preference and dispatches a broadcast event.
 */
export function setAutoFocusEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTOFOCUS_STORAGE_KEY, String(enabled));
    window.dispatchEvent(
      new CustomEvent(AUTOFOCUS_TOGGLE_EVENT, { detail: { enabled } })
    );
  } catch (err) {
    console.warn('Failed to save auto-focus preference:', err);
  }
}

/**
 * Toggles auto-focus on/off and returns the new state.
 */
export function toggleAutoFocus(): boolean {
  const current = isAutoFocusEnabled();
  const next = !current;
  setAutoFocusEnabled(next);
  return next;
}

/**
 * Programmatically focuses a DOM element by ID, optionally selecting its content
 * and applying an animated highlight glow effect.
 */
export function focusFieldById(
  elementId: string,
  options?: {
    select?: boolean;
    highlight?: boolean;
    scrollIntoView?: boolean;
    force?: boolean;
  }
): boolean {
  if (typeof document === 'undefined') return false;
  if (!options?.force && !isAutoFocusEnabled()) return false;

  const target = document.getElementById(elementId) as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | HTMLButtonElement
    | null;

  if (!target) return false;

  // Check if target is disabled or hidden
  if (target.disabled || target.offsetParent === null) return false;

  try {
    target.focus({ preventScroll: !options?.scrollIntoView });

    // Select text for inputs if applicable
    if (
      options?.select !== false &&
      (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
      target.type !== 'checkbox' &&
      target.type !== 'radio' &&
      target.type !== 'file'
    ) {
      target.select();
    }

    // Apply transient pulse animation
    if (options?.highlight !== false) {
      target.classList.remove('autofocus-pulse');
      // Trigger reflow
      void target.offsetWidth;
      target.classList.add('autofocus-pulse');

      setTimeout(() => {
        target.classList.remove('autofocus-pulse');
      }, 1000);
    }

    return true;
  } catch (err) {
    console.debug('Failed to focus element:', elementId, err);
    return false;
  }
}

/**
 * Default field sequence for Step 1: Personal Details
 */
export const PERSONAL_DETAILS_SEQUENCE: string[] = [
  'family-name',
  'given-name',
  'additional-name',
  'passport-number',
  'birth-day',
  'birth-month',
  'birth-year',
  'birth-city',
  'birth-country',
  'street-address-1',
  'street-address-2',
  'address-city',
  'address-district',
  'postal-code',
  'current-country',
  'tel-national',
  'user-email',
  'user-email-confirm',
  'highest-education',
  'marital-status',
  'number-of-children',
];

/**
 * Focuses the next valid, non-disabled field in a predefined or custom sequence.
 */
export function focusNextFieldInSequence(
  currentFieldId: string,
  customSequence: string[] = PERSONAL_DETAILS_SEQUENCE,
  options?: { force?: boolean }
): boolean {
  if (!options?.force && !isAutoFocusEnabled()) return false;

  const currentIndex = customSequence.indexOf(currentFieldId);
  if (currentIndex === -1) return false;

  // Search forward for the next accessible element
  for (let i = currentIndex + 1; i < customSequence.length; i++) {
    const nextId = customSequence[i];
    const success = focusFieldById(nextId, { select: true, highlight: true, scrollIntoView: false });
    if (success) {
      return true;
    }
  }

  return false;
}
