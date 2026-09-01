-- The band was counting numbers, not people. Applied 1 September 2026.
--
-- Eight listings were visible on the site and the running band showed seven.
-- Nothing was limiting it: list_public_numbers() was written when the band's
-- subject was the Rotabo number itself, and it still carried the two clauses
-- that follow from that subject.
--
-- The first is `distinct on (rn.number)`. One row per number is the right
-- shape for a list of numbers and the wrong shape for a list of people: a
-- person who lists twice -- once seeking, once offering, which is a normal
-- thing to do -- holds one number and so occupied one row. The newer listing
-- won on `created_at desc` and the older one was dropped without trace.
-- Number 12 is exactly this case, and it is the missing eighth.
--
-- The second is the inner join to rotabo_numbers. It reads as a join but it
-- acts as a filter: a listing whose email has never been issued a number is
-- not narrowed by it, it disappears. Nobody is in that state today, which is
-- why this has not bitten yet, and that is precisely why it should not be
-- left standing -- the first person it catches would vanish silently, and the
-- band would look correct while doing it.
--
-- Both go. Every visible listing is now one cell, the number comes along when
-- there is one, and listingCell() in index.html already guards on row.number
-- so a cell without one simply renders without the #N chip.
--
-- The order changes with them. Ordering by number put the band in the order
-- the numbers were issued, which is not the order anything happened in; it
-- now runs by created_at, so a new listing joins at the end and the band
-- reads as a history, the same way companies_public() already does.
--
-- What this does NOT change: the visible_until gate. Sixteen further listings
-- are held behind it -- fourteen with visible_until null, from the weeks when
-- a listing was paid and was born invisible until Stripe flipped it, and two
-- whose year has genuinely run out. Those are a decision about what the site
-- owes people who signed up under the old rule, not a bug in this function,
-- and making them public is a change to what strangers can see about real
-- people. It is left to be decided deliberately.

create or replace function public.list_public_numbers()
returns table (number bigint, name text, country text, category text, role text, city text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select rn.number, l.name, l.country, l.category, l.role, l.city
  from public.listings l
  left join public.rotabo_numbers rn on rn.email = lower(trim(l.email))
  where l.visible_until is not null and l.visible_until > now()
  order by l.created_at;
$$;

grant execute on function public.list_public_numbers() to anon, authenticated;
