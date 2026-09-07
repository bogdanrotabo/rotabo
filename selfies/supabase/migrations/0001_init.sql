-- selfies.lol, the first tables. Applied 2026-09-07 to project uwpsdbymmwwoeltlvtic.
--
-- A starting shape, chosen before the application script exists: a person,
-- the selfies they post, who liked what, and a visit log like the other
-- sites keep. Every table has row level security on, and the rule is the
-- same everywhere -- anyone may read what is visible, only the owner may
-- write their own rows, and the visit log is write-only from the browser.
-- The photos themselves go in the "selfies" storage bucket, each under a
-- folder named by the uploader's user id, which is what the storage policies
-- check.
--
-- When the real script arrives, change this by a new migration, not by
-- editing this file: it has already run.

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  handle        text not null unique,
  display_name  text,
  avatar_path   text,
  created_at    timestamptz not null default now(),
  constraint profiles_handle_check check (handle ~ '^[a-z0-9_]{3,24}$')
);

create table if not exists public.selfies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- Object name inside the "selfies" bucket: "<user_id>/<file>".
  storage_path  text not null unique,
  caption       text,
  width         integer,
  height        integer,
  visible       boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint selfies_caption_check check (caption is null or char_length(caption) <= 280)
);

create index if not exists selfies_created_idx on public.selfies (created_at desc);
create index if not exists selfies_user_idx    on public.selfies (user_id);

create table if not exists public.likes (
  selfie_id   uuid not null references public.selfies (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (selfie_id, user_id)
);

create table if not exists public.site_visits (
  id          bigint generated always as identity primary key,
  path        text not null,
  referrer    text,
  country     text,
  created_at  timestamptz not null default now()
);

alter table public.profiles    enable row level security;
alter table public.selfies     enable row level security;
alter table public.likes       enable row level security;
alter table public.site_visits enable row level security;

-- profiles: everyone reads, you write your own.
drop policy if exists "profiles are public"      on public.profiles;
drop policy if exists "insert own profile"       on public.profiles;
drop policy if exists "update own profile"       on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
create policy "insert own profile"  on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile"  on public.profiles for update using (auth.uid() = id);

-- selfies: visible ones are public; the owner sees and edits all of theirs.
drop policy if exists "visible selfies are public" on public.selfies;
drop policy if exists "own selfies"                on public.selfies;
create policy "visible selfies are public" on public.selfies for select using (visible or auth.uid() = user_id);
create policy "own selfies" on public.selfies for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- likes: counts are public, a like is yours to give and take back.
drop policy if exists "likes are public" on public.likes;
drop policy if exists "own likes"        on public.likes;
create policy "likes are public" on public.likes for select using (true);
create policy "own likes" on public.likes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- site_visits: the browser may add a row and never read one back.
drop policy if exists "anyone may log a visit" on public.site_visits;
create policy "anyone may log a visit" on public.site_visits for insert with check (true);

-- The photos. Public bucket: a selfie's URL is meant to be shared. Uploads
-- go under the uploader's own user id, and only they can remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('selfies', 'selfies', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

drop policy if exists "selfies bucket is public"   on storage.objects;
drop policy if exists "upload into own folder"     on storage.objects;
drop policy if exists "delete from own folder"     on storage.objects;
create policy "selfies bucket is public" on storage.objects for select
  using (bucket_id = 'selfies');
create policy "upload into own folder" on storage.objects for insert
  with check (bucket_id = 'selfies' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "delete from own folder" on storage.objects for delete
  using (bucket_id = 'selfies' and auth.uid()::text = (storage.foldername(name))[1]);
