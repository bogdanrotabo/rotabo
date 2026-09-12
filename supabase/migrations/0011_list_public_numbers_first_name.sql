-- The band's function stops sending surnames.
--
-- The privacy page promises that the band shows "your first name only -- the
-- first word of the name you entered" and "never shows your surname". The band
-- keeps that promise on screen: bands.js cuts row.name to its first word before
-- drawing it. But list_public_numbers() is granted to anon and returned the
-- whole name, surname included, to anybody who called it -- the promise held
-- in the drawing and broke on the wire, where any visitor's browser already
-- had the full name in hand.
--
-- The cut now happens here, with the band's own rule (split on whitespace,
-- first word), so what leaves the database is what the page promises and
-- nothing more. The return type is unchanged, and so is every other column,
-- the visibility filter and the order: bands.js, the only caller, cuts a
-- first name to its first word and gets the same first name back, so the band
-- draws exactly what it drew before.

create or replace function public.list_public_numbers()
returns table (number bigint, name text, country text, category text, role text, city text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    rn.number,
    (regexp_split_to_array(btrim(coalesce(l.name, '')), '\s+'))[1],
    l.country,
    l.category,
    l.role,
    l.city
  from public.listings l
  left join public.rotabo_numbers rn on rn.email = lower(trim(l.email))
  where l.visible_until is not null and l.visible_until > now()
  order by l.created_at;
$$;
