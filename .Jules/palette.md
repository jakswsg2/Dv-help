# Palette's Journal

## 2025-05-18 - RTL/LTR Bypass Blocks with Tailwind Logical Properties
**Learning:** In bidirectional applications (Arabic RTL / English LTR), traditional skip links using physical classes (such as `left-2`) cause visual overlap or misalignment when flipped to RTL. Using Tailwind CSS logical placement utilities like `focus:start-3` along with `focus:fixed focus:top-3 focus:z-50 sr-only focus:not-sr-only` provides clean, standard-compliant keyboard bypass behavior across both Arabic and English modes without requiring separate directional overrides.
**Action:** When adding accessible skip-to-content links or floating focus aids in bilingual RTL/LTR apps, always use logical property utilities (`start-*` instead of `left-*`) and ensure target containers receive `tabIndex={-1}` and `outline-none` for graceful programmatic focus shift.
