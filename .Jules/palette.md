# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-14 - Skip Links in Bilingual RTL/LTR Web Apps
**Learning:** In dual-language applications switching between RTL (Arabic) and LTR (English), positioning skip-to-content links with directional utilities like `left-3` or `right-3` causes inconsistent layout offsets when the document direction toggles. Using Tailwind logical property `focus:start-3` ensures the focused skip link always anchors to the reading start edge (top-right in RTL, top-left in LTR). Additionally, targeting `<main id="main-content" tabIndex={-1}>` with `focus:outline-hidden` is essential so programmatic focus shift succeeds across all browsers without rendering an unwanted persistent border.
**Action:** When adding bypass blocks or skip links in multilingual applications with RTL support, always use logical positioning (`focus:start-*`) and ensure target containers specify `tabIndex={-1}` and `focus:outline-hidden`.
