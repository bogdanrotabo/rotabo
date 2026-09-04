-- 147 payments that were never Rotabo's.
--
-- Stripe fans every event on an account out to every endpoint on that
-- account. topten.one sells through the same account as this site, so
-- from the day it opened -- 25 August -- its checkouts were delivered
-- here as well. Each one was correctly signed, so each one verified.
-- None could be matched to a Rotabo tier, so each was written down as an
-- unmatched "manual" payment, reported to the admin as a checkout that
-- needed fulfilling by hand, and acknowledged to the buyer with an email
-- saying their "Rotabo purchase" would be set up shortly.
--
-- Two of the four addresses that received that email had never heard of
-- Rotabo. They had bought a rank on topten.one, been served correctly by
-- that site's own webhook, and then been told by this one that somebody
-- would be in touch about a purchase they had not made.
--
-- The webhook now recognises another site's payment link and drops it
-- before writing or sending anything (see ALTE_SITURI in
-- supabase/functions/stripe-webhook/index.ts). This moves the rows it
-- already wrote out of the books, where they were counting $1,450 of
-- somebody else's revenue as Rotabo's.
--
-- Moved, not deleted: the rows are financial records, and putting them
-- back is one INSERT.

create table if not exists public.payments_straine (like public.payments including all);

-- Service role only, exactly like payments itself: RLS on, no policy.
alter table public.payments_straine enable row level security;

comment on table public.payments_straine is
  'Rows that were never Rotabo payments. Stripe fans every event on an account out to every endpoint on it, and topten.one sells through the same account, so from 2026-08-25 its checkouts arrived at this project''s webhook as well and were written here as unmatched "manual" payments -- 147 of them, USD, all carrying topten.one''s payment link. They made this table''s books wrong and, worse, they made the webhook email two of topten.one''s customers about a Rotabo purchase they had never made. The webhook now drops that link before it writes or sends anything. These rows are kept rather than deleted so the move is reversible: insert them back into payments to undo it.';

insert into public.payments_straine
select * from public.payments where payment_link = 'plink_1U8F7c2eIfG2oegb4npVFInN'
on conflict do nothing;

delete from public.payments where payment_link = 'plink_1U8F7c2eIfG2oegb4npVFInN';
