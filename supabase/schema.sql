-- ============================================================================
-- MeetNotes — database schema
-- Run this in Supabase: Dashboard -> SQL Editor -> paste -> Run.
-- It is safe to re-run (uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, holds the role.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone authenticated can read profiles (needed to show participant names).
-- Tighten this if you want stricter privacy.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- A user may update only their own profile, and may NOT change their own role.
-- (Role changes happen through the admin server route using the service key.)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up.
-- The first user you promote to admin manually (see README).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- rooms: a named video room.
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.rooms enable row level security;

drop policy if exists "rooms_select_authenticated" on public.rooms;
create policy "rooms_select_authenticated"
  on public.rooms for select to authenticated using (true);

drop policy if exists "rooms_insert_own" on public.rooms;
create policy "rooms_insert_own"
  on public.rooms for insert to authenticated
  with check (auth.uid() = created_by);

-- Only the creator can delete via the client. Admin deletion goes through the
-- service-role server route, which bypasses RLS after an explicit admin check.
drop policy if exists "rooms_delete_own" on public.rooms;
create policy "rooms_delete_own"
  on public.rooms for delete to authenticated
  using (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- notes: private to their owner.
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled',
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.notes enable row level security;

-- Owner-only for every operation. No admin override — notes stay private.
drop policy if exists "notes_owner_all" on public.notes;
create policy "notes_owner_all"
  on public.notes for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- recordings: metadata for each recorded call. Rows are written only by the
-- server (service role), so there is no client INSERT/UPDATE policy.
-- ---------------------------------------------------------------------------
create table if not exists public.recordings (
  id            uuid primary key default gen_random_uuid(),
  room_name     text not null,
  room_slug     text,
  started_by    uuid references auth.users(id) on delete set null,
  egress_id     text unique,
  storage_key   text,            -- object path inside the bucket
  status        text not null default 'recording'
                  check (status in ('recording', 'completed', 'failed', 'aborted')),
  duration_secs integer,
  created_at    timestamptz not null default now()
);

alter table public.recordings enable row level security;

-- Any authenticated user can list/read recording metadata (personal-use app
-- with a small trusted group). Tighten to started_by/admin if you need to.
drop policy if exists "recordings_select_authenticated" on public.recordings;
create policy "recordings_select_authenticated"
  on public.recordings for select to authenticated using (true);

-- No insert/update policy on purpose: only the service-role server writes here.

create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists rooms_created_by_idx on public.rooms(created_by);
create index if not exists recordings_created_at_idx on public.recordings(created_at desc);
