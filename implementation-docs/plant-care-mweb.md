# plant-care-mweb

> Implemented via `/brainstorm` → `/develop` on 2026-08-10.

## What

A complete greenfield mobile-first PWA for managing home plant care, built with Svelte 5 + Vite + TypeScript + Dexie.js. Users import plant data as JSON files; the app stores everything in IndexedDB, builds a dashboard with care task reminders (watering, fertilizing, repotting, pruning), and sends browser notifications. Fully client-side — no backend, deployable to GitHub Pages. The implementation covers all spec sections: plant JSON schema with validation, dashboard with overdue/today/upcoming task sections, plant catalog with search/filter/sort, plant detail with care logging and pest tracking, plant edit form, settings with notification preferences and data export, PWA manifest and service worker.

## Why

The spec (at `docs/superpowers/specs/2026-08-09-plant-care-mweb-design.md`) defines a monolithic Svelte SPA approach (Approach 1) — chosen over a componentized multi-package approach for simplicity and GitHub Pages compatibility. The app solves the problem of tracking recurring plant care schedules without a backend: all data lives in the browser via IndexedDB, notifications use the Service Worker + Notification API with Periodic Background Sync fallback, and the JSON import/export flow ensures users own their data.

Key design decisions from the spec:
- **Dexie.js over raw IndexedDB**: cleaner promise-based API, handles complex queries
- **Svelte stores for reactive state**: `plants` store wraps Dexie CRUD, `tasks` store is derived for dashboard
- **Unknown JSON fields preserved in `metadata`**: never discard user data (spec validation rule)
- **Date edge cases**: future `lastDone` treated as today, missing `lastDone` defaults to `acquiredDate` or today
- **Service worker duplicates schedule logic**: necessary because SW can't import ES modules from the app; acceptable trade-off documented in review

The review found 0 Block findings, 3 Request changes (1 fixed: sort-by-next-task; 2 deferred: quota error handling, `as any` bypass), 3 Follow-up items (per-plant notification mute UI, Dashboard $effect pattern, missing `src/lib/notifications/sw.js`), and 2 Nits.

## How

Implementation was done in vertical slices following the spec's project structure:

1. **Project scaffolding**: Vite + Svelte 5 + TypeScript, configured with `base: '/plants/'` for GitHub Pages, Prettier for formatting, Vitest for testing, svelte-check for type checking.

2. **Types** (`src/lib/types/plant.ts`): Comprehensive TypeScript interfaces for the entire plant JSON schema — Plant, CareSchedule, PestEntry, HealthLogEntry, CareTask, AppSettings, plus CARE_TYPE constants and labels.

3. **Utilities** (`src/lib/utils/`):
   - `dates.ts`: ISO date parsing, formatting, day arithmetic, future date detection
   - `schedule.ts`: Next-due-date calculation, task status (overdue/today/upcoming), task sorting by urgency
   - `jsonImporter.ts`: Plant validation (required fields, date format, unknown field detection), normalization (ID generation, metadata extraction, future date clamping), duplicate detection

4. **Tests** (59 tests, all passing): Comprehensive unit tests for dates (21 tests), schedule (17 tests), and jsonImporter (21 tests) covering all edge cases from the spec.

5. **Database** (`src/lib/db/`): Dexie wrapper with `plants` and `appSettings` tables, CRUD queries for plants, care log actions (log watering/fertilizing/repotting/pruning, update `lastDone` and `healthLog`), pest tracking CRUD.

6. **Stores** (`src/lib/stores/`): `plantsStore` wraps Dexie with reactive updates; `tasksStore` derives due/overdue/today/upcoming tasks and stats.

7. **Components** (7 Svelte 5 components): BottomNav, PlantCard, TaskItem, JsonImport (with validation feedback), PestAlert, CareLogEntry, ImageGallery — all using Svelte 5 runes ($state, $derived, $props, $effect).

8. **Routes** (5 views): Dashboard (tasks + stats + pest alerts), Catalog (grid + search + filter + sort), PlantDetail (hero + care cards + pest tracking + health log + gallery), PlantEdit (form-based editing), Settings (notifications + export + clear).

9. **Notifications + PWA**: `notifier.ts` handles permission requests, SW registration, 15-minute fallback timer, daily notification deduplication via localStorage. `public/sw.js` implements cache-first fetching, Periodic Background Sync, and notification click handling with raw IndexedDB access (since SW can't import app modules). `public/manifest.json` makes the app installable.

10. **App shell** (`App.svelte`): State-based router managing 5 views (tasks, plants, settings, plant-detail, plant-edit), loads plants on mount, starts notification timer, registers service worker.

Conventions honored:
- Spec's color palette: soft greens (#2d6a4f, #74c69d), warm neutrals, alert reds, warm amber
- 44px+ touch targets, bottom nav thumb-reachable
- System fonts (no external dependency)
- Unknown JSON fields preserved in metadata (never discarded)
- Date edge cases per spec (future lastDone → today, missing → acquiredDate/today)

Build / format / test outcomes:
- **Build**: `npm run build` — PASSED (147 modules, 179KB JS gzipped to 59KB)
- **Format**: Prettier — PASSED (all files formatted)
- **Type check**: `svelte-check` — PASSED (0 errors, 0 warnings)
- **Tests**: `npx vitest run` — PASSED (59/59 tests across 3 test files)
- **Review**: CLEAN (0 Block findings after 1 iteration)
