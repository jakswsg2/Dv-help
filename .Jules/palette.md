# Palette's UX & Accessibility Journal

## 2025-05-18 - Header & Modal Accessibility Touchups
**Learning:** Icon-only responsive collapses in navigation bars need explicit dynamic ARIA labels and `aria-current` attributes to properly communicate context to screen reader users when screen sizes shift.
**Action:** Always provide full `aria-label`s and `aria-current="page"` on header elements and icon-only triggers.
