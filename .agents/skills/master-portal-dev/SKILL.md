---
name: master-portal-dev
description: >-
  Use this skill when modifying the Master Portal project. 
  It provides guidelines on the project's architecture, database tables, and coding standards.
---

# Master Portal Development Guidelines

Welcome to the Master Portal project! When making changes to this codebase, please follow these instructions:

## 1. Project Architecture
- **Frontend**: HTML/JS/CSS running with Vite (`vite.config.js`). It's a PWA using `vite-plugin-pwa` in `injectManifest` mode.
- **Backend/API**: Uses Vercel Serverless functions (in `/api`) and Supabase for the database.
- **Service Worker**: Found in `public/sw.js`. We use Workbox for caching and custom logic for Push Notifications.

## 2. Database Structure (Supabase)
Key tables you might interact with:
- `store_items`: Main inventory list (JSON based quantities for bulk items).
- `store_locations`: List of locations (stores and sites).
- `store_history`: Ledger of all movements and adjustments.
- `store_pending_moves`: Queue for items sent to sites waiting to be received.

## 3. Important Rules
- Do NOT modify `public/sw.js` without carefully testing Push Notifications.
- When creating new features, always ensure they are mobile-responsive since this app is mostly used on site via mobile phones.
- After modifying frontend JS files, make sure to run `npm run build` to verify there are no syntax errors before committing.

## 4. Useful Commands
- Run dev server: `npm run dev`
- Build project: `npm run build`
