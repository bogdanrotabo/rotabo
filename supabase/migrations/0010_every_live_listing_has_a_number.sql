-- Two live listings had no Rotabo number, and so no page could find them.
-- Applied 10 September 2026.
--
-- 0004 took the inner join out of list_public_numbers() and said why in
-- writing: "a listing whose email has never been issued a number is not
-- narrowed by it, it disappears. Nobody is in that state today, which is why
-- this has not bitten yet, and that is precisely why it should not be left
-- standing -- the first person it catches would vanish silently, and the band
-- would look correct while doing it."
--
-- It bit. browse_count() and browse_public() still carry that join, and by
-- 10 September two people were behind it:
--
--   Vitan Marius Casian   move / seeking    Schaffhausen    listed 11 August
--   Rajkumar Lakshan      drive / seeking   Trincomalee     listed  3 September
--
-- Both were live -- visible_until a year out, born visible under the free
-- rule -- and both ran in the band on the front page, which left-joins and
-- so showed them. The pages people actually search from did not:
--
--   /browse.html?category=drive&role=offering   said "2 persoane" of three
--   /browse.html?category=move&role=offering    said nobody was there at all
--
-- So the site advertised them in the band and then told anyone who followed
-- the band that they did not exist -- on a page that asks 2 CHF to see who
-- is there. Rajkumar listed two days after 0004 was written.
--
-- Why they had none: nothing in create-listing assigned one. The only step
-- that did was verify-email's "send", on the way to the code email, and only
-- when the caller said purpose="listing" -- so an address verified first for
-- the viewer unlock or the sponsor form and used for a listing afterwards
-- never met a number-issuing step. That call also logs and continues when
-- assignment fails, on purpose, so nothing downstream ever noticed the gap.
--
-- create-listing now claims the number before it inserts the row, and treats
-- failure as fatal, so a listing cannot be born live without one again. This
-- migration is the other half: the two that already were.
--
-- What this does NOT change: the inner join in browse_count(),
-- browse_public(), find_rotabo_number() and get_listing_details(). With the
-- gap closed at the source there is nobody left behind it today -- which is
-- the same sentence 0004 wrote before it came true, and the owner's call to
-- make deliberately rather than as a side effect of this fix.

do $$
declare
  v_email text;
  v_num   bigint;
  v_count int := 0;
begin
  -- Ordered by each address's earliest listing, not alphabetically: the
  -- numbers run in the order people arrived, so Vitan is ahead of Rajkumar
  -- the way the band already reads as a history.
  for v_email in
    select lower(btrim(l.email))
    from public.listings l
    where l.visible_until is not null
      and l.visible_until > now()
      and l.email is not null
      and btrim(l.email) <> ''
      and not exists (
        select 1 from public.rotabo_numbers rn
        where rn.email = lower(btrim(l.email))
      )
    group by lower(btrim(l.email))
    order by min(l.created_at)
  loop
    -- Idempotent per address, and it holds the same advisory lock the live
    -- path does, so re-running this migration issues nothing a second time.
    v_num := public.assign_rotabo_number(v_email);
    v_count := v_count + 1;
    raise notice 'rotabo number % issued to an address that was live without one', v_num;
  end loop;

  raise notice 'addresses backfilled: %', v_count;

  -- The invariant this migration exists to restore. Asserted rather than
  -- assumed: a backfill that silently matched nothing is the failure mode
  -- worth catching here, not after the next person vanishes.
  if exists (
    select 1 from public.listings l
    where l.visible_until is not null
      and l.visible_until > now()
      and l.email is not null
      and btrim(l.email) <> ''
      and not exists (
        select 1 from public.rotabo_numbers rn
        where rn.email = lower(btrim(l.email))
      )
  ) then
    raise exception 'a live listing still has no rotabo number';
  end if;
end $$;
