# Master Portal Control Center (SON CONTRACTOR)

This workspace is the Master Portal for SON CONTRACTOR, orchestrating multiple isolated modular sub-apps.

## Workspace Rules & Guidelines:
All documentation, standards, and step-by-step guides are organized in the `Command&Rules/` folder:
- **`Command&Rules/SUB_APP_DEVELOPMENT_RULES.md`**: Strict sub-app isolation rules (CSS scoping, Database prefixing, LocalStorage prefixing, Theme independence).
- **`Command&Rules/INTEGRATION_GUIDE.md`**: Exact 6-step recipe for integrating any new sub-app into the Master Portal with Lazy Loading & URL Hash Routing.
- **`Command&Rules/PROMPT_TEMPLATES.md`**: Standard prompt templates for sub-app creation and handover.

## Key Strict Isolation Mandates:
1. All React sub-apps MUST live exclusively inside `src/<app-id>/`.
2. NEVER write unscoped global CSS selectors (`body`, `html`, `h1`, `button`, `table`, `input`, `*`). Always scope under `.<app-id>-root { ... }`.
3. All Supabase database tables must be prefixed with `<app-id>_`.
4. All LocalStorage/SessionStorage keys must be prefixed with `<app-id>_`.
5. Sub-apps must be integrated with `React.lazy()` and registered in `VALID_MODULES` in `src/App.jsx`.
