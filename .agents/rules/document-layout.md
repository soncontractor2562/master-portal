---
name: Document Layout
description: Enforces A4 page constraints and theme styles (Classic/Modern) for generated documents.
trigger: model_decision
---

# Document Layout Constraints

When creating or modifying document viewer components in this project, adhere strictly to the following layout constraints to ensure accurate PDF and image generation.

## A4 Page Container

Every page to be exported must be wrapped in an element with the `a4-page` class.
- **Dimensions**: `794px` width, `1123px` height (strict, do not allow it to grow or shrink).
- **Padding**: `44px 44px 38px`.
- **Styling**: `box-sizing: border-box`, `position: relative`, `overflow: hidden`.
- **Flexbox**: `display: flex; flex-direction: column; justify-content: flex-start;`.

If content exceeds the height, it must be paginated into multiple `.a4-page` wrappers.

## Themes

Documents must support two themes toggled by a wrapper class: `.classic-theme` and `.modern-theme`.

### Classic Theme (`.classic-theme`)
- **Fonts**: Use standard serif/sans-serif.
- **Borders**: Dark, solid borders (`1px solid #000000`).
- **Colors**: No background highlights on section titles (transparent background, underlined text).
- **Tables**: `th` backgrounds are `#eee`, standard inner and outer borders.

### Modern Theme (`.modern-theme`)
- **Borders**: Soft gray borders (`1px solid #cbd5e1`).
- **Section Titles**: Left green border accent (`border-left: 4px solid #2f5233`), `padding-left: 6px`.
- **Tables**: `th` backgrounds are `#f1f5f9`. All `td` and `th` have `border: 1px solid #cbd5e1`.
- **Signatures**: No outer box border. Dotted or dashed signature lines (`border-bottom: 1.5px dashed #94a3b8`).

## General Print Rules
- Ensure components are compatible with `@media print`.
- Never use `vh` or `vw` units inside `.a4-page`, always use exact pixels (`px`) or percentages (`%`) relative to the page.
