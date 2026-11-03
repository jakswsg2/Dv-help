# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-18 - Modal Dialog Accessibility and Dismissal Consistency
**Learning:** In full-screen modal overlays that feature complex interactions (such as LiveCameraCapture and ImageCropperOverlay), omitting standard dialog a11y patterns (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, body scroll lock, Escape key handler, and backdrop-click dismissal) creates trapped navigation traps for keyboard and screen-reader users. Furthermore, interactive toggle buttons (such as guidelines overlay toggles) require `aria-pressed` in addition to tooltip titles.
**Action:** Always ensure any modal/overlay includes `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, an `Escape` keyboard listener, body scroll lock (`overflow: hidden`), and backdrop click handler with guard on async processing state.
