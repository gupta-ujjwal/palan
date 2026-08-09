# Plant Care MWeb App — Design Spec

**Date:** 2026-08-09  
**Status:** Approved (pending user spec review)  
**Approach:** Monolithic Svelte SPA (Approach 1)

## Overview

A mobile-first web app for managing home plant care. Users import plant data as JSON files; the app stores everything in browser memory (IndexedDB), builds a dashboard with care task reminders, and sends browser push notifications for watering, fertilizing, repotting, and pruning schedules. No backend — fully client-side, deployable to GitHub Pages.

## Tech Stack

- **Svelte 5 + Vite** — framework and build tool
- **Dexie.js** — IndexedDB wrapper for all storage (plants, care logs, pest tracking)
- **Svelte stores** — reactive state management
- **Service Worker + Notification API** — push notifications (no backend)
- **TypeScript** — type safety for plant schema and app logic
- **GitHub Pages** — deployment target (static build with `base` path in Vite config)
- **PWA manifest** — installable as a home-screen app

## Plant JSON Schema

The core data model. Users import JSON files matching this schema. The `id` field is auto-generated on import (not expected in the user's file). All other fields are user-provided.

```json
{
  "id": "uuid-auto-generated-on-import",
  "name": "Monstera Deliciosa",
  "nickname": "Monsty",
  "species": "Monstera deliciosa",
  "type": "Tropical",
  "acquiredDate": "2024-03-15",
  "location": "Living Room",
  "images": [
    {
      "type": "url",
      "value": "https://example.com/monstera.jpg",
      "label": "Full plant"
    },
    {
      "type": "base64",
      "value": "data:image/jpeg;base64,/9j/4AAQ...",
      "label": "Leaf detail"
    }
  ],
  "careSchedule": {
    "watering": {
      "frequencyDays": 7,
      "lastDone": "2024-08-01",
      "notes": "Check soil moisture before watering"
    },
    "fertilizing": {
      "frequencyDays": 30,
      "lastDone": "2024-07-15",
      "fertilizerType": "Balanced 10-10-10",
      "notes": "Dilute to half strength"
    },
    "repotting": {
      "frequencyDays": 365,
      "lastDone": "2024-03-15",
      "potSize": "6 inch",
      "soilType": "Well-draining potting mix"
    },
    "pruning": {
      "frequencyDays": 90,
      "lastDone": "2024-06-01",
      "notes": "Remove yellowing leaves, trim aerial roots"
    }
  },
  "environment": {
    "light": "Bright indirect",
    "humidity": "Medium (40-60%)",
    "temperature": "18-27C",
    "pruningStyle": "Selective pruning",
    "notes": "Keep away from AC vents"
  },
  "pestTracking": [
    {
      "date": "2024-07-10",
      "pest": "Spider mites",
      "severity": "mild",
      "treatment": "Neem oil spray",
      "resolved": true,
      "resolvedDate": "2024-07-17",
      "notes": "Caught early, under leaves"
    }
  ],
  "healthLog": [],
  "notes": "Loves the corner spot by the window."
}
```

### Schema Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | auto-generated | UUID, assigned on import |
| `name` | string | yes | Display name for the plant |
| `nickname` | string | no | Casual name |
| `species` | string | no | Scientific or common species name |
| `type` | string | yes | Category (Tropical, Succulent, Flowering, etc.) |
| `acquiredDate` | string (ISO date) | no | When the plant was acquired |
| `location` | string | no | Where in the home the plant lives |
| `images` | array | no | List of image objects |
| `images[].type` | "url" \| "base64" | yes (if images present) | How the image is stored |
| `images[].value` | string | yes (if images present) | URL or base64 data URI |
| `images[].label` | string | no | Description of the image |
| `careSchedule` | object | yes | Care task schedules |
| `careSchedule.watering` | object | yes (at least watering required) | Watering schedule |
| `careSchedule.fertilizing` | object | no | Fertilizing schedule |
| `careSchedule.repotting` | object | no | Repotting schedule |
| `careSchedule.pruning` | object | no | Pruning schedule |
| `careSchedule.*.frequencyDays` | number | yes | How often to perform this care action |
| `careSchedule.*.lastDone` | string (ISO date) | no | Last date this was performed; defaults to `acquiredDate` or today if missing |
| `careSchedule.*.notes` | string | no | Care-specific notes |
| `careSchedule.fertilizing.fertilizerType` | string | no | Type of fertilizer to use |
| `careSchedule.repotting.potSize` | string | no | Current pot size |
| `careSchedule.repotting.soilType` | string | no | Soil mix to use |
| `environment` | object | no | Static care requirements |
| `environment.light` | string | no | Light requirements |
| `environment.humidity` | string | no | Humidity preferences |
| `environment.temperature` | string | no | Temperature range |
| `environment.pruningStyle` | string | no | How to prune this plant |
| `environment.notes` | string | no | Additional environment notes |
| `pestTracking` | array | no | Log of pest incidents |
| `pestTracking[].date` | string (ISO date) | yes | When the pest was noticed |
| `pestTracking[].pest` | string | yes | Type of pest |
| `pestTracking[].severity` | "mild" \| "moderate" \| "severe" | no | How bad the infestation is |
| `pestTracking[].treatment` | string | no | What was used to treat it |
| `pestTracking[].resolved` | boolean | no | Whether the issue is resolved (default false) |
| `pestTracking[].resolvedDate` | string (ISO date) | no | When resolved |
| `pestTracking[].notes` | string | no | Additional notes |
| `healthLog` | array | no | Auto-populated in-app when care actions are logged |
| `healthLog[].date` | string (ISO date) | yes | When the action was performed |
| `healthLog[].action` | "watering" \| "fertilizing" \| "repotting" \| "pruning" | yes | What was done |
| `healthLog[].note` | string | no | Optional note for this log entry |
| `notes` | string | no | Free-form notes about the plant |

### Validation Rules

- **Required fields:** `name`, `type`, `careSchedule` with at least `watering` defined
- **Unknown fields:** Preserved as a `metadata` object on the plant record — never discard user data
- **Invalid JSON:** Show parse error with the file name
- **Schema mismatch:** Highlight missing/invalid fields, offer "import anyway" (fills defaults for missing optional fields)
- **Duplicate plant (same name + species):** Warn, offer to import as duplicate or skip
- **Date validation:** Dates must be valid ISO format (YYYY-MM-DD); `lastDone` in the future is treated as today

## App Architecture

### Project Structure

```
plants/
├── src/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── database.ts          # Dexie schema & connection
│   │   │   ├── plants.ts            # Plant CRUD queries
│   │   │   └── careLog.ts           # Care log & pest tracking queries
│   │   ├── notifications/
│   │   │   ├── sw.js                # Service worker for push
│   │   │   └── notifier.ts          # Permission check, schedule, trigger
│   │   ├── types/
│   │   │   └── plant.ts             # Plant JSON TypeScript types
│   │   ├── stores/
│   │   │   ├── plants.ts            # Reactive plant list store
│   │   │   └── tasks.ts             # Today's tasks store (derived)
│   │   ├── utils/
│   │   │   ├── schedule.ts          # Calculate next-due dates
│   │   │   ├── jsonImporter.ts      # Parse & validate imported JSON
│   │   │   └── dates.ts             # Date helpers
│   │   └── components/
│   │       ├── PlantCard.svelte
│   │       ├── TaskItem.svelte
│   │       ├── PestAlert.svelte
│   │       ├── CareLogEntry.svelte
│   │       ├── ImageGallery.svelte
│   │       ├── JsonImport.svelte
│   │       └── BottomNav.svelte
│   ├── routes/
│   │   ├── Dashboard.svelte         # Today's tasks + stats
│   │   ├── Catalog.svelte           # All plants grid/list
│   │   ├── PlantDetail.svelte       # Full plant info, care log, pest tracking
│   │   ├── PlantEdit.svelte         # Edit form for any field
│   │   └── Settings.svelte          # Notification prefs, export data
│   ├── App.svelte                   # Shell with tab navigation
│   ├── main.ts                      # Entry point, registers SW
│   └── app.css                      # Global styles, mobile-first
├── public/
│   ├── sw.js
│   └── manifest.json                # PWA manifest (installable)
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### Data Flow

1. **Import:** User selects JSON file → `jsonImporter` validates → stored in IndexedDB via Dexie → `plants` store updates → UI re-renders
2. **Task calculation:** On app open (and after any care action) → `schedule.ts` calculates which tasks are due → `tasks` store (derived from `plants`) populates Dashboard
3. **Care logging:** User taps "Done" on a task → Dexie updates `healthLog` and the care type's `lastDone` field → `schedule.ts` recalculates next-due → notification rescheduled
4. **Notifications:** Service worker periodically checks due tasks → fires push notifications

### Storage (IndexedDB via Dexie)

**Tables:**
- `plants` — stores full plant JSON objects, keyed by `id`
- `appSettings` — key-value store for notification preferences, theme, etc.

**Why IndexedDB:**
- Handles large data (base64 images can be 1MB+ each)
- ~50MB+ storage limit (vs 5-10MB for localStorage)
- Supports complex queries (filter by type, sort by next-due date)
- Dexie provides a clean promise-based API

## Dashboard & UI Design

### Navigation

Fixed bottom navigation bar with 3 tabs (thumb-reachable on mobile):
- **Tasks** (home icon) — today's care tasks
- **Plants** (leaf icon) — plant catalog
- **Settings** (gear icon) — preferences

### Tasks View (Dashboard)

- **Header:** "Today" + date, summary stats (X plants, Y tasks today, Z overdue)
- **Overdue section** (red accent): tasks past due, sorted by most overdue first
- **Today section** (green accent): tasks due today
- **Upcoming section** (muted): next 3 days preview
- Each task is a `TaskItem` card: plant thumbnail + name, action icon (water/fertilize/repot/prune), "Done" button
- Tapping "Done" logs the care action and removes the task from today
- **Pest alert banner** (if any unresolved pests): "2 plants have active pest issues — Tap to view"
- **Empty state:** "No tasks today! Your plants are happy." or "Add a plant to get started." (if no plants)

### Catalog View

- **Search bar** + filter chips (All, Tropical, Succulent, Flowering, etc.)
- **Grid of PlantCards** (2 columns on mobile): thumbnail, name, nickname, next task badge
- Sort options: by name, by next task, by recently added
- **FAB (+)** to import new plant JSON
- Tapping a card opens `PlantDetail`

### Plant Detail View

- **Hero image** (first image, or placeholder leaf icon on green gradient)
- **Name + nickname + species** header
- **Quick info chips:** location, light, humidity, temperature
- **Care schedule cards:** watering, fertilizing, repotting, pruning — each shows frequency, last done, next due, "Log action" button
- **Pest tracking section:** list of entries, unresolved ones highlighted in red; "Add pest entry" button
- **Health log:** chronological timeline of all care actions
- **Image gallery:** all images, tappable to enlarge
- **Edit button** opens `PlantEdit`
- **Export button** downloads plant JSON

### Plant Edit View

- Form-based editing of all plant fields
- Sections: Basic info, Images (add/remove/reorder), Care schedule (edit frequencies, last done dates), Environment, Notes
- Save button persists to IndexedDB
- Cancel button discards changes

### Settings View

- Notification toggle (enable/disable push)
- Notification time preference (e.g., "Notify me at 9:00 AM")
- Per-plant notification override (mute notifications for specific plants)
- Export all data (downloads a single JSON array containing all plant objects)
- Clear all data (with confirmation dialog)
- App info

### Visual Style

- **Color palette:** soft greens (#2d6a4f, #74c69d), warm neutrals (#f8f9fa, #e9ecef), alert reds (#e63946), warm amber (#f4a261)
- **Shapes:** rounded corners (12px), subtle shadows
- **Typography:** system fonts (no external font dependency)
- **Touch targets:** 44px+ minimum, bottom nav thumb-reachable
- **Layout:** mobile-first, responsive up to tablet width

## Notification System

### Registration

- On first app open, request notification permission via `Notification.requestPermission()`
- Register service worker (`sw.js`) for background functionality
- Service worker uses Periodic Background Sync API (Chrome) to check due tasks every 12 hours
- Fallback: when the app is open, a timer checks every 15 minutes for newly-due tasks
- Notifications only fire at the user's preferred time (default 9:00 AM); the service worker stores the last notification date and skips if already sent today

### Trigger Logic (`notifier.ts`)

- For each plant, check all 4 care types (watering, fertilizing, repotting, pruning)
- If `today >= lastDone + frequencyDays` → task is due
- Fire notification with plant name + action
- Group multiple tasks into a single notification
- Notifications fire at user's preferred time (default 9:00 AM)

### Notification Content

```
Title: "Plant Care: 3 tasks today"
Body: "Monsty needs watering, Ferny needs fertilizing, Cactus needs pruning"
Icon: app logo (green leaf)
Tag: "plant-care-daily" (replaces yesterday's notification)
```

### Platform Limitations

- **iOS Safari:** Notifications only work when app is added to home screen and opened at least once in 24h. No true background notifications.
- **Chrome/Edge (Android):** Periodic Background Sync works if granted. Notifications can fire when browser is closed.
- **Firefox:** No Periodic Background Sync. Notifications fire when app is open or next opened.
- **All browsers:** No push server means no true "push from nowhere." This is the best a backend-less app can do.

## Error Handling & Edge Cases

### JSON Import Validation

- Validate required fields: `name`, `type`, `careSchedule` with at least `watering`
- Unknown fields: preserve in a `metadata` object (never discard user data)
- Invalid JSON: show parse error with file name
- Schema mismatch: highlight missing/invalid fields, offer "import anyway" (fills defaults)
- Duplicate plant (same name + species): warn, offer to import as duplicate or skip

### Storage Edge Cases

- IndexedDB quota exceeded (base64 images): catch `QuotaExceededError`, show warning, suggest using URL images instead
- Corrupted data: Dexie transaction rollback, surface error to user

### Date Edge Cases

- `lastDone` in the future: treat as today (don't show overdue)
- Missing `lastDone`: use `acquiredDate` or treat as due now
- Plant with no `frequencyDays` for a care type: skip that care type in scheduling

### Empty States

- No plants: dashboard shows onboarding prompt with "Import your first plant" CTA
- No tasks today: celebratory empty state ("Your plants are happy!")
- No images: show placeholder (leaf icon on green gradient)

## Deployment

- **GitHub Pages:** Static build output from `npm run build`
- **Vite config:** Set `base` to the repository name (e.g., `/plants/`) for correct asset paths
- **Build command:** `npm run build`
- **Output directory:** `dist/`
- **Service worker:** Copied to `dist/` as static asset, registered in `main.ts`

## Out of Scope (YAGNI)

- No backend server, database, or API
- No user accounts or authentication
- No cloud sync between devices
- No social/sharing features
- No plant identification from photos
- No weather-based care adjustments
- No IoT sensor integration
