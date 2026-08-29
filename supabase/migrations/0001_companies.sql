-- A company is not a listing. Applied 2026-08-29.
--
-- The business side has a box headed "here the registered companies appear"
-- and it was filling itself from list_public_numbers(), which returns every
-- Rotabo number ever taken. The site ran for months as a marketplace for
-- people, so what came back was private individuals -- a home in
-- Schaffhausen, a teacher in Dublin -- standing under a heading that is
-- wrong about them.
--
-- There was no column to filter on because the two things are not the same
-- shape. A private listing is a person, a category out of twelve, and which
-- side of the deal they are on. A company is a name, one of the hundred and
-- thirteen professional domains, and a website. Bolting a flag onto listings
-- would have meant half the columns null on every row and a category check
-- that cannot hold the domains.
--
-- So: its own table, locked the same way sponsors is -- no direct API access
-- at all, service role writes through the create-company edge function, and
-- one SECURITY DEFINER function to read the visible ones. The two sides of
-- the site read two different tables and can never show each other's rows.

create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  -- One of the 113 domains in domains.js. Not a check constraint: that list
  -- is edited in the front end and a constraint here would mean a migration
  -- every time a domain is added. create-company validates against the same
  -- list, which is where the list already lives.
  domain        text not null,
  email         text not null,
  phone         text not null,
  country       text not null,
  -- Canonical ISO-3166 alpha-2, resolved by the client from whatever
  -- spelling was typed, so the business side can filter across languages.
  -- Advisory: an unrecognised spelling arrives null and the free text stays.
  country_code  text,
  city          text not null,
  address       text,
  website_url   text,
  -- Commercial register or VAT number. Optional: it is not verified here and
  -- pretending otherwise would be worse than leaving it blank.
  reg_no        text,
  note          text,
  -- Same free period the private listings get: born visible for twelve
  -- months, no checkout. See create-listing for why that stopped being paid.
  visible_until timestamptz,
  user_id       uuid references auth.users (id),
  created_at    timestamptz not null default now(),
  constraint companies_country_code_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$')
);

create index if not exists companies_visible_idx
  on public.companies (visible_until desc nulls last);
create index if not exists companies_domain_idx
  on public.companies (domain);

alter table public.companies enable row level security;

drop policy if exists "no direct api access" on public.companies;
create policy "no direct api access" on public.companies
  for all to anon, authenticated using (false) with check (false);

create or replace function public.companies_public()
returns table (
  name text, domain text, country text, city text,
  website_url text, created_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.name, c.domain, c.country, c.city, c.website_url, c.created_at
  from public.companies c
  where c.visible_until is not null and c.visible_until > now()
  order by c.created_at;
$$;

grant execute on function public.companies_public() to anon, authenticated;
