-- The public list of who is on Rotabo, one person under another.
--
-- The owner asked for the members in the order they joined, each with the
-- category and name and country flag, a name you can press to see what they
-- offer or look for, and the contact details behind the existing paywall.
--
-- Everything on it is already public, and the privacy page says exactly how
-- much: "in the running band on the home page ... your first name only -- the
-- first word of the name you entered -- the category, whether you are
-- offering it or looking for it, your town and country, and your Rotabo
-- number". This returns that and nothing else, for the same listings the band
-- shows (visible now) and in the same order (the order they joined).
--
-- Two differences from list_public_numbers, which feeds the band and is left
-- exactly as it is:
--
--   * The first name is cut here, in the database. The band cuts it in the
--     browser, which keeps the promise on screen and breaks it on the wire:
--     the full name, surname included, reaches anyone who calls that function.
--     This one never sends a surname anywhere.
--
--   * The listing's own id comes back. Revealing contact details by Rotabo
--     number was the bug browse.html already paid for: a number belongs to a
--     person, so somebody with two listings in a category got one card's
--     details on both. get_listing_details_by_id answers for exactly one
--     listing, behind the same paid-access check -- the id alone unlocks
--     nothing, and the note, phone, email, address and surname stay on the
--     other side of that check.

create or replace function public.list_public_members()
returns table (
  id       uuid,
  number   bigint,
  name     text,
  country  text,
  category text,
  role     text,
  city     text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    l.id,
    rn.number,
    -- The band's own rule, split(/\s+/)[0], written in SQL.
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

-- Public on purpose, like list_public_numbers: it is the same public data.
grant execute on function public.list_public_members() to anon, authenticated;
