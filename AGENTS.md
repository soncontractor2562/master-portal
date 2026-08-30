# Master Portal Project Guidelines (SON CONTRACTOR)

This workspace is the Master Portal for SON CONTRACTOR, orchestrating multiple modular sub-apps.

## Strict Sub-App Development Rules:
Whenever creating or editing a sub-application within this workspace, you MUST follow the guidelines defined in `SUB_APP_DEVELOPMENT_RULES.md`:

1. **Folder Location:**
   - All React-based sub-apps must reside completely inside `src/<app-id>/`.
2. **Strict CSS Scoping:**
   - NEVER define global CSS selectors (`body`, `html`, `h1`, `button`, `table`, `input`, `*`) without scoping.
   - ALWAYS scope all styles under a dedicated container class: `.<app-id>-root { ... }`.
3. **Database & Storage Prefixing:**
   - All Supabase tables must be prefixed: `<app-id>_<table_name>`.
   - All LocalStorage keys must be prefixed: `<app-id>_<key_name>`.
   - Always supply a `setup_<app-id>.sql` script for any required database tables.
4. **Theme Isolation:**
   - Sub-apps must control their own styling within their container. Never mutate `document.body` or `:root` theme variables directly.
5. **Integration Checklist:**
   - When completing a sub-app, notify the user with the App ID, English Label, Thai Description, Lucide Icon, npm install requirements, and the SQL setup script.
