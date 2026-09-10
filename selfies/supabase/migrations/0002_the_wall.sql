-- selfies.lol, the wall. Applied 2026-09-10, replacing 0001's shape.
--
-- 0001 hung every table off auth.users, because a Supabase project comes
-- with auth and it looked like the obvious spine. It is not usable here:
-- the project has email sign-up only, with confirmation on and the built-in
-- mailer, which sends a couple of messages an hour. A selfie wall that
-- makes you wait for an email that may not come is a selfie wall nobody
-- posts to.
--
-- So identity moves out of auth and into a cookie the Worker issues: an
-- opaque token, one row in poster_sessions, pointing at one row in
-- posters. Nobody types anything to start posting. A handle is optional
-- and can be claimed later. Nothing here can be read or written with the
-- publishable key -- every table has RLS on with no policy at all, so the
-- only way in is the service role, which lives in the Worker and nowhere
-- else. The browser never speaks to this database; it speaks to /api on
-- selfies.lol.
--
-- The four tables from 0001 are dropped rather than migrated: they were
-- empty, and carrying a shape nobody used would only make the next reader
-- wonder which one is real.

drop table if exists public.likes;
drop table if exists public.selfies;
drop table if exists public.profiles;

-- Whoever is holding the cookie. No email, no password, no name unless
-- they choose one.
create table public.posters (
  id           uuid primary key default gen_random_uuid(),
  handle       text unique,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Set by hand from the admin page. A blocked poster's existing selfies
  -- are hidden and new ones are refused.
  blocked      boolean not null default false,
  constraint posters_handle_check
    check (handle is null or handle ~ '^[a-z0-9_]{3,20}$')
);

-- The cookie, one row per browser. The token is the whole secret: 32 bytes
-- of randomness, opaque, and worth nothing anywhere else, so there is no
-- signing key for anyone to lose. Deleting a row signs that browser out.
create table public.poster_sessions (
  token        text primary key,
  poster_id    uuid not null references public.posters (id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint poster_sessions_token_check check (char_length(token) between 32 and 128)
);

create index if not exists poster_sessions_poster_idx
  on public.poster_sessions (poster_id);

-- The pictures. storage_path is "<poster_id>/<selfie_id>.jpg" in the public
-- "selfies" bucket; the Worker serves them from /i/... so the address a
-- visitor sees, and the one Google indexes, is this site's own.
--
-- like_count and report_count are kept in the row by the triggers below
-- rather than counted per request: the wall is the one query this site
-- runs on every visit, and it should stay one index scan.
create table public.selfies (
  id            uuid primary key default gen_random_uuid(),
  poster_id     uuid not null references public.posters (id) on delete cascade,
  storage_path  text not null unique,
  caption       text,
  width         integer,
  height        integer,
  visible       boolean not null default true,
  -- Why it stopped being visible: 'reports', 'admin', 'poster'. Null while
  -- it is still up.
  hidden_reason text,
  like_count    integer not null default 0,
  report_count  integer not null default 0,
  -- Not the address itself: sha256(ip + the salt in app_config). Enough to
  -- rate-limit one sender, useless for finding out who they were.
  ip_hash       text,
  created_at    timestamptz not null default now(),
  constraint selfies_caption_check
    check (caption is null or char_length(caption) <= 140)
);

create index if not exists selfies_wall_idx
  on public.selfies (created_at desc) where visible;
create index if not exists selfies_poster_idx
  on public.selfies (poster_id, created_at desc);
create index if not exists selfies_ip_idx
  on public.selfies (ip_hash, created_at desc);

create table public.likes (
  selfie_id  uuid not null references public.selfies (id) on delete cascade,
  poster_id  uuid not null references public.posters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (selfie_id, poster_id)
);

-- One row per person who flagged a picture, at most one each, so three
-- reports means three people and not one person clicking three times.
create table public.reports (
  id         uuid primary key default gen_random_uuid(),
  selfie_id  uuid not null references public.selfies (id) on delete cascade,
  poster_id  uuid not null references public.posters (id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now(),
  unique (selfie_id, poster_id),
  constraint reports_reason_check
    check (reason is null or char_length(reason) <= 200)
);

create index if not exists reports_selfie_idx on public.reports (selfie_id);

-- Two values the Worker needs and must not carry in its source: the salt
-- the IP hashes are made with, and the hash of the admin token. Both are
-- read with the service role and never leave the Worker. The admin token's
-- hash is written once, by hand, and its plaintext exists only wherever the
-- owner keeps it -- deliberately not here.
create table public.app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value)
values ('ip_salt', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- like_count follows the likes table, in both directions.
create or replace function public.selfies_like_count_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.selfies set like_count = like_count + 1 where id = new.selfie_id;
  elsif tg_op = 'DELETE' then
    update public.selfies set like_count = greatest(0, like_count - 1) where id = old.selfie_id;
  end if;
  return null;
end $$;

drop trigger if exists likes_count_sync on public.likes;
create trigger likes_count_sync
  after insert or delete on public.likes
  for each row execute function public.selfies_like_count_sync();

-- Three people flagging a picture takes it off the wall immediately and
-- leaves it for the admin page to judge. Waiting for a human while it is
-- still up is the wrong way round: putting it back costs one click, and
-- leaving it up costs whatever it is.
create or replace function public.selfies_report_count_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.selfies
     set report_count = report_count + 1
   where id = new.selfie_id
  returning report_count into n;

  if n >= 3 then
    update public.selfies
       set visible = false, hidden_reason = coalesce(hidden_reason, 'reports')
     where id = new.selfie_id and visible;
  end if;
  return null;
end $$;

drop trigger if exists reports_count_sync on public.reports;
create trigger reports_count_sync
  after insert on public.reports
  for each row execute function public.selfies_report_count_sync();

-- Locked, all of it. RLS on with no policy means the publishable key can
-- read and write exactly nothing; the service role bypasses RLS and is the
-- only thing that ever touches these rows.
alter table public.posters         enable row level security;
alter table public.poster_sessions enable row level security;
alter table public.selfies         enable row level security;
alter table public.likes           enable row level security;
alter table public.reports         enable row level security;
alter table public.app_config      enable row level security;

comment on table public.posters is
  'One row per browser that has ever opened the site with a cookie. Identity here is the cookie and nothing else: no email, no password. Service-role only.';
comment on table public.app_config is
  'The IP-hash salt and the admin token hash. Service-role only; RLS is on with no policy so nothing else can read it.';
