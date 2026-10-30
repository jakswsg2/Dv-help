## 2025-05-20 - Accessible Icon-Only Buttons on Responsive Breakpoints
**Learning:** Responsive layout patterns in this app hide button text spans (e.g. `hidden md:inline`) on narrow viewports, causing buttons to become icon-only for screen reader users on mobile/tablet if explicit `aria-label` attributes are omitted.
**Action:** Always provide explicit `aria-label` or `aria-current` attributes on header buttons and navigation tabs that toggle between text and icon-only displays at different breakpoints.
