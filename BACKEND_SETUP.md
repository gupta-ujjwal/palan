# BACKEND_SETUP.md

Palan is a **local-first** PWA. The app runs 100% offline against a Dexie/IndexedDB store. Cloud sync is **opt-in** and only activates when Supabase env vars are present at build time. If you skip this file, everything in Palan still works.

This document walks a human operator through provisioning and running the optional backend. The agent that implemented this could not create a real Supabase project (no cloud credentials), so these steps must be completed manually before the sync features go live.

---

## Why Supabase

Pick-any-BaaS tradeoffs for a static Vite/Svelte PWA:

| Option | Pros | Cons | Why not |
|---|---|---|---|
| **Supabase** | Postgres + row-level security + email OTP OTP auth, generous free tier, pairs naturally with a static SPA | Slightly more setup than Firebase | **chosen** — open source, SQL schema in-repo, easy to export later |
| Firebase | One-click Google auth, huge doc corpus | Firestore doc model forces local flattening; harder to self-host; harder to query | |
| PocketBase | Single binary, SQLite, cheap to host | Requires us to run the server (defeats "static site" premise) | |
| Custom API | Full control | Way too much work for a personal PWA | |

## Architecture

```
┌──────────────────────┐         ┌───────────────────┐
│ Palan PWA (static)   │ HTTPS   │ Supabase project  │
│  Dexie (IndexedDB)   │◄───────►│  Postgres + Auth  │
│  streaks computed    │ supabase│  RLS policies     │
│  locally             │  -js    │                   │
└──────────────────────┘         └───────────────────┘
```

- **Client**: `src/lib/sync/supabase.ts` initializes `supabase-js` only if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
- **Sync strategy**: last-write-wins keyed on `updated_at`. Client pushes local plants (`data` JSONB column), pulls any rows where `updated_at > last_sync`. Local writes continue immediately; remote coherence happens in the background. No conflict resolution UI.
- **Opt-in**: Users who never open Settings → Cloud Sync see no difference. Disabling sync entirely is achieved by *not* setting the env vars.

## Manual provisioning

### 1. Create a Supabase project

1. Go to <https://supabase.com> and create a free account.
2. **New Project**
   - Name: `palan-prod` (or `palan-dev`)
   - Database password: generate and store in a password manager
   - Region: closest to you
3. Wait for the project to provision (1–2 min).

### 2. Run the schema migration

Open **SQL Editor** in the dashboard and run the SQL from [`/supabase/schema.sql`](./supabase/schema.sql) (below). This creates:

- `public.plants` — one row per plant, JSONB `data` column mirrors the local Dexie record; RLS so users see only their own rows.
- `public.profiles` — display name + streak snapshot (one row per user).
- `public.friendships` — unidirectional `user_id → friend_id` for the friend-streak surface.

The canonical, copy-pasteable SQL is in [`supabase/schema.sql`](./supabase/schema.sql). Run it in the SQL editor or via `psql $SUPABASE_DB_URL -f supabase/schema.sql`.

### 3. Enable email auth

**Authentication → Providers → Email** — turn **Enable Email provider** on, and set **Confirm email** to on. Palan uses `signInWithOtp` (magic link), so no password UI is needed.

### 4. Get your API keys

**Settings → API**:
- `URL` → copy to `VITE_SUPABASE_URL`
- `anon public` key → copy to `VITE_SUPABASE_ANON_KEY`

### 5. Configure environment

For **local development** create a `.env.local` (gitignored):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

For **GitHub Pages builds** add these as repository secrets and wire them into `.github/workflows/deploy.yml`:

```yaml
- name: Build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
  run: npm run build
```

Vite inlines variables prefixed `VITE_` into the bundle at build time.

### 6. Verify

1. `npm run dev`
2. Open **Settings → Cloud Sync**. Enter an email and click **Sign in**.
3. Click the magic link in your inbox. You should land back at Palan, signed in.
4. **Sync now** — your local plants are pushed to the `plants` table; refresh and confirm.

## Limitations (v1)

- **Last-write-wins only.** If you edit on two devices offline and then connect both, the later `updated_at` wins for each field's row. For individual plants this is fine; for shared gardens with concurrent edits it will eventually lose data. Real conflict resolution is a Phase 3.5 item.
- **No realtime subscriptions.** Sync is pull-based with the `Sync now` button. Trivially upgradeable to `supabase.channel('plants').on('postgres_changes', …)` once we want push.
- **Friend-streak surface is read-only.** No "add friend" UI yet — this is a stub that renders friend rows once the `friendships` table has data. Add friends via the Supabase SQL editor for now.

## Rollback / kill switch

Setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to empty strings in a new build disables sync without breaking existing local data. Delete the Supabase project without affecting any local users.
