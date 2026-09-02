-- The browse list identified people where it needed to identify listings.
-- Applied 1 September 2026.
--
-- browse_public joins rotabo_numbers on the listing's email, so the `number`
-- it returns belongs to a PERSON, not to a listing. That is correct for the
-- number itself -- one person, one Rotabo number -- but browse.html was using
-- it as the handle for the card the visitor clicked, and one person can hold
-- several listings in the same category.
--
-- When they do, the browse page draws several cards carrying the same number.
-- Unlocking any of them called get_listing_details(number), which answered
-- with every one of that person's matching listings, and nothing in the reply
-- distinguished them: same category, same role, same name. The page took the
-- first row. So both cards revealed the same address and the same note, and
-- the other listing's note was unreachable from anywhere in the interface.
--
-- It is not hypothetical. One person on the site today holds two listings in
-- `other`/`offering`, filed under two spellings of the same town.
--
-- The fix is to hand the page the listing's own id, which lets it call
-- get_listing_details_by_id -- a function that already existed, already sits
-- behind the same paid-access check, and answers for exactly one listing.

-- First, the reason this was not already done.
--
-- get_listing_status(p_id) returned stripe_session_id, and it is callable by
-- anyone holding a listing id. Publishing ids in the browse list would have
-- turned a harmless identifier into a way to read every listing's Stripe
-- session id. So the id could not be exposed until that column stopped being
-- returned.
--
-- Nothing reads it any more. browse.html used it to decide whether a listing
-- was confirmed, which was already wrong: since the free period began on
-- 2026-08-22 no listing has a Stripe session at all, so that test read null as
-- "payment pending" and showed everyone who published a free listing
-- "Confirming your payment…" for two minutes. The page now tests
-- visible_until, which is what actually says a listing is live.

drop function if exists public.get_listing_status(uuid);

create function public.get_listing_status(p_id uuid)
returns table(id uuid, visible_until timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select l.id, l.visible_until
  from public.listings l
  where l.id = p_id;
$$;

-- Now the id can travel. Everything else about the function is unchanged --
-- same paid-access gate, same ordering, same columns in the same order with
-- one added at the front.

drop function if exists public.browse_public(text, text, text);

create function public.browse_public(p_category text, p_role text, p_token text default null::text)
returns table(id uuid, number bigint, name text, country text, country_code text,
              category text, role text, city text, created_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select l.id, rn.number, l.name, l.country, l.country_code, l.category, l.role, l.city, l.created_at
  from public.listings l
  join public.rotabo_numbers rn on rn.email = lower(trim(l.email))
  where l.category = p_category and l.role = p_role
    and l.visible_until is not null and l.visible_until > now()
    and public.viewer_has_access_for(p_token, p_category)
  order by l.created_at desc;
$$;
