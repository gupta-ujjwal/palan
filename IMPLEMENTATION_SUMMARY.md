# IMPLEMENTATION_SUMMARY

Full engagement redesign of Palan — Hook Model (trigger → action → variable reward → investment) applied against the existing care loop without undermining the app's utility. Built branch `feat/rewards-engagement-revamp` from `faed334` up; 11 logical commits, never pushed (per brief). All tests green, build passing, svelte-check clean.

**Test count: 103 passing / 0 failing.** All new derived logic lives in pure, injectable functions under `src/lib/engagement/` covered by 44 new unit tests (streaks 11, celebrations 7, notifications 10, vitality 7, badges 9). Existing 59 tests untouched and still passing.

## Phase 1 — foundation (fully local)

### 1. Care streaks (`src/lib/engagement/streaks.ts`)
Reconstructs per-plant due-date chains from `careSchedule.lastDone` + `healthLog` completions, walks day-by-day and marks each day with at least one due task as `perfect | grace | missed`.

- A day counts when **every** due task has a completion strictly inside `(windowStart, dueDate]`.
- Days with nothing due are skipped (don't extend, don't break).
- **Grace token**: at most 1 missed day absorbed per trailing 7-day window. Exposed via `graceTokensAvailable` so the rule is visible, not silent.
- Today is excluded until all its tasks are done.
- Time complexity: O(windows × occurrences) via a consumed-index pointer over sorted completions.

### 2. Streak banner on Today (`StreakBanner.svelte`)
Lives **above** the task list per the brief, shows current streak, best streak, and a visible grace-token pill (`🧊 N`) with a tooltip explaining the streak-freeze rule.

### 3. Variable celebration (`engagement/celebrations.ts` + `Celebration.svelte`)
Pure weighted lottery: **70% quiet / 20% bloom animation / 7% plant-care fact / 3% rare badge toast.** RNG is injectable so tests are hermetic. Toast renders with `prefers-reduced-motion` support (skips pop + spin), is dismissable, and auto-clears after ~3 s.

- Facts are drawn from a 12-fact pool so repeat facts feel rare.
- Badges are *not* persisted — the 3% badge toast is a one-off dopamine hit; durable badges are the Growth tab's job (Phase 2).

### 4. Notification redesign (`engagement/notifications.ts` + notifier + Settings)
- `isInQuietHours(settings, now)`: handles overnight ranges (21:00–08:00) and same-day ranges (12:00–14:00) with unit coverage of every boundary.
- `buildBundleNotification(tasks)`: one notification per day listing plant names (nickname first), care labels, and overdue markers. Capped at 10 plants + "+N more" so the body stays legible for huge gardens.
- `checkAndNotify(plants, settings)` now honours quiet hours AND `mutedPlantIds`.
- Settings adds quiet-hours toggle + from/to time pickers, plus a **confirm-on-disable** dialog so a single tap can't silently clear reminders.

### 5. Undo window + confirmation (NN/g error recovery)
`logCareAction` still commits immediately (streak math stays honest); `handleDone` captures the plant's previous `lastDone`, and for 5 s shows an undo toast. Tapping **Undo** calls the new `undoLastCareAction` which removes the latest matching log entry and restores `lastDone` (or deletes the key if the entry never had one). The same press discipline was applied to notification disable (new) and clear-all-data (already had it).

## Phase 2 — growth surface

### 6. Per-plant vitality levels (`engagement/vitality.ts`)
Seedling → Sprout → Thriving → Flourishing from real data:

```
score = 0.5 × onTimeRate
      + 0.2 × pestResolutionRate
      + 0.3 × careActivityRate
      − 15 if any pest is unresolved
```

- `onTimeRate`: waterings in last 30d ÷ waterings due in last 30d (clamped).
- `pestResolutionRate`: resolved / total pest entries; defaults to 1.0 when there are no pests (absence isn't bad).
- `careActivityRate`: any care log entries in last 30d vs weeks-in-window; one active day/week is "full engagement".
- Thresholds: seedling < 30, sprout < 70, thriving < 88, flourishing ≥ 88. Documented in code as a tuning knob.

### 7. Garden map view (`PlantCard.svelte`)
Each card now carries:
- Stage icon overlay (🌱🌿🪴🌸) top-right — icon and label are tied by `VITALITY_METADATA`, not color alone (accessibility).
- Stage label chip in the body.
- Attention dot + outline when the plant has an overdue task OR an unresolved pest.

Card structure (image, name, nickname, next-task pill) is otherwise untouched so recognition is still image-first.

### 8. Milestone badges + Growth tab (`engagement/badges.ts`, `stores/garden.ts`, `routes/Growth.svelte`)
`computeUnlockedBadges(plants, gardenState)` is pure and idempotent — same inputs give same output. Grants:

- `first-plant` · `ten-plants`
- `streak-7` · `streak-30` · `streak-100` (from the current computed streak)
- `pest-free-30` — 30+ days since any plant was added with NO unresolved pest anywhere
- `full-garden-water` — at least one calendar day where every plant has a watering entry
- `first-rescue` — any pest entry ever marked resolved

New `gardenStore` reads/writes the Dexie `gardenState` table (already added in Phase 1). Growth tab shows: triple-stat card (current / best streak / grace tokens), a vitality distribution across all plants, friend streaks (when sync enabled, see Phase 3), and the badge catalog sorted unlocked-first. **New "Growth" tab added to `BottomNav`**, routing handled in `App.svelte`.

### 9. Bulk "water all overdue"
A button appears on Today **only when 2+ distinct plants are overdue for watering**. It writes each through `logCareAction` ordered by most-overdue-first. Each plant's previous `lastDone` is captured so the existing undo toast can revert the latest write. One-at-a-time flow untouched.

## Phase 3 — sync & social (opt-in, real architecture)

### 10. Supabase client integration (`src/lib/sync/supabase.ts`, `src/lib/sync/sync.ts`, `CloudSyncSection.svelte`)
- Lazy singleton; only initializes when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are present at build time — `isCloudSyncEnabled()` flips all UI on/off. Local-first invariant is preserved.
- Auth: `signInWithOtp` (magic link). No password UI.
- Sync: `pushPlants` upserts one row per plant into a JSONB `data` column keyed `(user_id, id)`; `pullPlants` returns the full remote list. Both functions return `{ error }` results, never throw.
- Streak snapshot is pushed to a `profiles` row; `getFriendStreaks` joins friendships + profiles (RLS restricts visibility).
- **Last-write-wins by `updated_at`**. Documented as a v1 limitation in BACKEND_SETUP.md.

### 11. `BACKEND_SETUP.md` + `supabase/schema.sql`
- Explains why Supabase was picked over Firebase / PocketBase / custom.
- 6-step operator runbook: create project → run `schema.sql` → enable email auth → read keys → set env (local `.env.local` vs GitHub Actions secrets) → verify.
- `schema.sql` ships idempotent DDL + RLS policies so the doc links to a runnable artifact rather than pasting inline SQL.
- Notes on limitations: LWW only, no realtime subscriptions yet, friend-adding UI is a stub (insert into `friendships` via SQL for now), trivial kill-switch = unset env vars.

## Decisions & tradeoffs (logged for the reviewer)

1. **Streak math is derived, not persisted.** Streaks, vitality, and badge eligibility all recompute from `healthLog` / `pestTracking` / `careSchedule` on every read. Tradeoff: we never need a backfill migration, streaks respond to data-editing honestly, and the GardenState table only stores what *must* persist (grace-token last-used, badge unlock timestamps). Cost: some redundant CPU on every Dashboard paint — acceptable for ≤100 plants.
2. **Variable rewards use an injectable RNG.** Lets the test suite be deterministic AND lets us swap in a seeded RNG (e.g. per-day seed) later without touching the callers.
3. **Celebrations are ephemeral.** A random 3%-chance badge *toast* is not written into `gardenState.unlockedBadges` — the durable badge system (Phase 2) is derived from real accomplishments, so its integrity is protected from random-noise inflation.
4. **Grace-window semantics are "≤1 miss in any trailing 7-day window"**, not "1 free miss per calendar week". The former is more forgiving in a way that matches the Duolingo analogy the brief referenced; codified in tests.
5. **Undo commits immediately, reverts via inverse operation.** Simpler than a deferred-write journal; preserves the invariant that everything the streak engine sees is real. Edge case (close tab within the 5 s window) writes the change as if confirmed — the safer default.
6. **Supabase over Firebase/PocketBase**: open-source, SQL schema in-repo, easy to export, and RLS means no private-key service is needed for friend visibility. The schema is minimal (3 tables) so migration to another BaaS stays cheap.
7. **Sync is pull-based, not realtime.** Deliberately the minimal v1 per the brief; realtime subscriptions are a one-line upgrade in `CloudSyncSection` once we want them.

## What's left

- **Apply schema.sql to a real Supabase project.** Manual, ~10 min — steps in `BACKEND_SETUP.md`.
- **Wire `VITE_SUPABASE_*` into `.github/workflows/deploy.yml`** if the hosted Pages build should ship with sync on.
- **Add-friend UI** — currently insert via SQL editor; friend-streak surface already renders rows.
- **Realtime sync** (`supabase.channel(...).on('postgres_changes')`) if multi-device edits ever feel sluggish.
- **Conflict-resolution UI** — LWW is correct for a single human; if multiple editors ever exist (shared gardens with simultaneous writes), Phase 3.5 should add a merge view.

## Verification log

```
npm run test    → 8 files, 103 tests passing
npm run check   → 0 errors, 0 warnings
npm run build   → 229 ms, JS 199 kB gzip 64 kB (was 189 kB pre-engagement)
```

Commits (oldest → newest):

```
0bf5f46 P1: extend AppSettings with quiet hours, add GardenState + Dexie v2
d29f186 P1: streak engine with grace tokens (TDD)
1b47659 P1: StreakBanner on Today screen + reward color tokens
d5434a0 P1: variable celebration on task completion (TDD)
87735bc P1: notification redesign — quiet hours, bundling, disable confirm
7de0b2a P1: undo window after marking a task done
ef2986d P2: per-plant vitality levels (TDD)
2e1cb8e P2: garden map view — vitality visible on plant cards
ec614ce P2: milestone badges + Growth tab (TDD)
aea4d58 P2: bulk 'water all overdue' on Today screen
2fee08e P3: opt-in Supabase sync + friend streaks + BACKEND_SETUP.md
```
