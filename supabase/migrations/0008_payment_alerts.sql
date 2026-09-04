-- The owner is told when somebody pays.
--
-- 0007 did this for registrations. Payments were harder to see: the
-- webhook already sent an admin email, but only for sponsorships and for
-- checkouts it could not match to a tier, and only if ROTABO_ADMIN_EMAIL
-- happened to be set -- a silent dependency, since an unset variable made
-- it compose the message and drop it. The ordinary payments, which is
-- almost all of them, announced themselves nowhere.
--
-- The announcement hangs on the payments row instead, for two reasons.
-- Every completed checkout writes exactly one, whatever kind it was; and
-- the money path is the last code in this system that should be edited to
-- add a convenience. A trigger cannot fail a fulfilment that has already
-- happened.
--
-- kind = 'manual' is the one that wants a human: money arrived and
-- nothing was granted for it. The alert says so in its subject.

create extension if not exists pg_net;

-- What the alert may say. The notify function reads this back rather than
-- trusting anything it was POSTed, so the text of the email always comes
-- from the row.
--
-- Unlike the same function on topten.one and gift.ceo, this one is NOT
-- granted to anon: a Rotabo payment carries the buyer's address, and the
-- caller here is a function on this same project, holding the service key.
create or replace function public.alerta_plata(p_ref uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $fn$
  select jsonb_build_object(
    'amount_cents', p.amount_total,
    'currency',     p.currency,
    'what',         coalesce(s.display_name, l.category, p.product, p.kind),
    'needs_you',    (p.kind = 'manual'),
    'lines',        jsonb_build_array(
      'kind:       ' || coalesce(p.kind, '-'),
      'paid by:    ' || coalesce(p.email, '(no address)'),
      'bought:     ' || coalesce(
                          p.product,
                          case when p.months is not null
                               then p.months || (case when p.months = 1 then ' month' else ' months' end) ||
                                    case when p.kind = 'viewer' then ' of viewer access'
                                         else ' of visibility' end
                          end,
                          '-'),
      'category:   ' || coalesce(l.category, '-'),
      'sponsor:    ' || coalesce(s.display_name || ' (' || coalesce(s.tier, '?') || ')', '-'),
      'session:    ' || coalesce(p.stripe_session_id, '-'),
      case when p.kind = 'manual'
           then 'NOTE:       money arrived and nothing was granted for it. Fulfil it by hand or refund.'
           else 'page:       https://rotabo.app/' end
    )
  )
  from public.payments p
  left join public.listings l on l.id = p.listing_id
  left join public.sponsors s on s.stripe_session_id = p.stripe_session_id
  where p.id = p_ref
    and p.created_at > now() - interval '30 minutes';
$fn$;

revoke all on function public.alerta_plata(uuid) from public, anon, authenticated;
grant execute on function public.alerta_plata(uuid) to service_role;

create or replace function public.anunta_plata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform net.http_post(
    url     := 'https://caqfbpzwdgnwjoaedjrg.supabase.co/functions/v1/notify',
    body    := jsonb_build_object('kind', 'payment', 'site', 'rotabo.app', 'ref', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return new;
exception when others then
  raise warning 'anunta_plata failed for %: %', new.id, sqlerrm;
  return new;
end;
$fn$;

revoke all on function public.anunta_plata() from public, anon, authenticated;

drop trigger if exists anunta_plata on public.payments;
create trigger anunta_plata
  after insert on public.payments
  for each row execute function public.anunta_plata();
