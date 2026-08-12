-- Palan → Supabase schema (manual run)
-- Apply with: psql $SUPABASE_DB_URL -f supabase/schema.sql
-- Or paste into the Supabase dashboard SQL editor.

create table if not exists public.plants (
  id         text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  updated_at     timestamptz not null default now()
);

create table if not exists public.friendships (
  user_id   uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status    text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table public.plants      enable row level security;
alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "users manage own plants" on public.plants;
create policy "users manage own plants"
  on public.plants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage own profile" on public.profiles;
create policy "users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "users see own + friends' profiles" on public.profiles;
create policy "users see own + friends' profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid()
        and f.friend_id = public.profiles.id
        and f.status = 'accepted'
    )
  );

drop policy if exists "users manage own friendships" on public.friendships;
create policy "users manage own friendships"
  on public.friendships for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
