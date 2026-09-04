-- The owner is told when somebody registers.
--
-- Payments already have a function behind them -- stripe-webhook -- and it
-- can send its own email. Registering has nothing: an account can appear
-- from the password modal, from Google, or from verify-email's
-- set_password, and no single piece of code sees all three. The database
-- does. Every one of them is an INSERT into auth.users, so that is where
-- the announcement is raised, and the notify function turns it into mail.
--
-- The trigger must never be able to cost somebody their account: it runs
-- after the row is in, and anything that goes wrong inside it is swallowed
-- with a warning. A missed email is a nuisance; a failed sign-up is a lost
-- customer.

create extension if not exists pg_net;

-- Every alert that has been sent, so nothing is sent twice. pg_net retries,
-- Stripe redelivers, and a person can replay an event by hand; each of them
-- ends here, on a primary key, instead of in the inbox a second time.
create table if not exists public.owner_alerts (
  kind    text        not null,
  ref     text        not null,
  sent_at timestamptz not null default now(),
  primary key (kind, ref)
);

-- Service role only, like processed_stripe_events and payments: RLS on,
-- and deliberately no policy, so anon and authenticated see nothing.
alter table public.owner_alerts enable row level security;

comment on table public.owner_alerts is
  'One row per owner notification already sent. The primary key is the claim: '
  'a redelivered event loses the insert and stops there, so no alert arrives twice.';

create or replace function public.anunta_inregistrare()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  -- Fire and forget: pg_net queues the request and a background worker
  -- sends it, so signing up never waits on an HTTP call. The function on
  -- the other end decides whether this is worth an email -- it re-reads
  -- the user itself and refuses anything that is not a genuinely new one.
  perform net.http_post(
    url     := 'https://caqfbpzwdgnwjoaedjrg.supabase.co/functions/v1/notify',
    body    := jsonb_build_object('kind', 'signup', 'user_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return new;
exception when others then
  -- An account is worth more than knowing about it.
  raise warning 'anunta_inregistrare failed for %: %', new.id, sqlerrm;
  return new;
end;
$fn$;

revoke all on function public.anunta_inregistrare() from public, anon, authenticated;

drop trigger if exists anunta_inregistrare on auth.users;
create trigger anunta_inregistrare
  after insert on auth.users
  for each row execute function public.anunta_inregistrare();
