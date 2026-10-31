# Palette's Journal - Critical UX & Accessibility Learnings

## 2026-10-31 - Contextual Accessible Labels and Tooltips for Repeated Matrix Action Buttons
**Learning:** In forms replicating official sequences (like the 23 DS-5501 fields matrix), repeated identical action buttons ("Copy" / "نسخ") leave screen reader users without context as to which field is being operated on. Furthermore, HTML `<button disabled>` suppresses mouse pointer events in some browsers unless `disabled:pointer-events-auto` is set, blocking disabled-state explanatory tooltips.
**Action:** When rendering repeated actions across structured field lists, always interpolate the field number and title into `aria-label` and `title` (e.g. `Copy: 1.a Last Name`), and pair `disabled:opacity-40 disabled:cursor-not-allowed` with `disabled:pointer-events-auto` so users understand why an action is inactive.
