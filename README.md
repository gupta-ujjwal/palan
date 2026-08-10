<div align="center">

<img src="public/favicon.svg" width="80" height="80" alt="Palan logo" />

# Palan

A mobile-first PWA for managing home plant care. Import your plants as JSON, track watering/fertilizing/repotting/pruning schedules, get push notifications, and never kill another plant.

**No backend. No accounts. No cloud sync.** Your data lives in your browser.

</div>

---

## Features

- **JSON Import** — Import plant data as JSON files with full schema validation. Unknown fields are preserved in a `metadata` object — never discard user data.
- **Care Dashboard** — Today's tasks front and center, with overdue items highlighted in red, today's in green, and a 3-day upcoming preview.
- **Plant Catalog** — Grid view with search, type filters, and sort by name / next task / recently added.
- **Plant Detail** — Hero image, care schedule cards, pest tracking with severity levels, chronological health log, and image gallery.
- **Plant Edit** — Form-based editing of all fields: basic info, care schedules, environment, notes.
- **Notifications** — Browser push notifications via Service Worker + Notification API. Daily reminders at your preferred time. Periodic Background Sync on Chrome/Edge, 15-minute fallback timer when the app is open.
- **PWA** — Installable to home screen. Works offline (cache-first service worker).
- **Data Export** — Export all plants as a single JSON file. Clear all data with confirmation.
- **Dark Mode** — Respects `prefers-color-scheme`.

## Tech Stack

| Layer         | Choice                            | Why                                                  |
| ------------- | --------------------------------- | ---------------------------------------------------- |
| Framework     | Svelte 5                          | Runes-based reactivity, small bundle, no virtual DOM |
| Build         | Vite 8                            | Fast HMR, ES-native, tree-shaking                    |
| Storage       | Dexie.js (IndexedDB)              | 50MB+ capacity for base64 images, promise-based API  |
| Language      | TypeScript                        | Type safety for plant schema and app logic           |
| Notifications | Service Worker + Notification API | Backend-less push, Periodic Background Sync          |
| Deployment    | GitHub Pages                      | Static build, zero infrastructure                    |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run check

# Format code
npm run format
```

## Plant JSON Schema

```json
{
  "name": "Monstera Deliciosa",
  "nickname": "Monsty",
  "species": "Monstera deliciosa",
  "type": "Tropical",
  "acquiredDate": "2024-03-15",
  "location": "Living Room",
  "careSchedule": {
    "watering": {
      "frequencyDays": 7,
      "lastDone": "2024-08-01",
      "notes": "Check soil moisture before watering"
    },
    "fertilizing": {
      "frequencyDays": 30,
      "lastDone": "2024-07-15",
      "fertilizerType": "Balanced 10-10-10"
    },
    "repotting": {
      "frequencyDays": 365,
      "lastDone": "2024-03-15"
    },
    "pruning": {
      "frequencyDays": 90,
      "lastDone": "2024-06-01"
    }
  },
  "environment": {
    "light": "Bright indirect",
    "humidity": "Medium (40-60%)",
    "temperature": "18-27C"
  }
}
```

### Required Fields

- `name` — Display name
- `type` — Category (Tropical, Succulent, Flowering, etc.)
- `careSchedule.watering.frequencyDays` — How often to water (days)

All other fields are optional. Unknown fields are preserved in `metadata`.

## Project Structure

```
src/
├── lib/
│   ├── db/            # Dexie schema, plant CRUD, care log queries
│   ├── notifications/ # Permission, scheduling, service worker registration
│   ├── types/         # Plant TypeScript interfaces
│   ├── stores/        # Svelte reactive stores (plants, derived tasks)
│   ├── utils/         # Date helpers, schedule calc, JSON import/validation
│   └── components/    # 7 Svelte 5 components
├── routes/            # 5 views: Dashboard, Catalog, PlantDetail, PlantEdit, Settings
├── App.svelte         # Shell with tab navigation
├── main.ts            # Entry point, SW registration
└── app.css            # Global styles, mobile-first
public/
├── sw.js              # Service worker (cache-first, background sync)
├── manifest.json      # PWA manifest
└── favicon.svg        # Logo
```

## Deployment

The app is configured for GitHub Pages with `base: '/palan/'` in `vite.config.ts`.

```bash
npm run build
# Deploy the dist/ directory to GitHub Pages
```

## Platform Limitations

- **iOS Safari:** Notifications only work when app is added to home screen and opened at least once in 24h. No true background notifications.
- **Chrome/Edge (Android):** Periodic Background Sync works if granted. Notifications can fire when browser is closed.
- **Firefox:** No Periodic Background Sync. Notifications fire when app is open or next opened.

## License

Private project.
