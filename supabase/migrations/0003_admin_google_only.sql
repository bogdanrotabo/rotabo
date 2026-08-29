-- How a session was made, answered from the table that records it.
--
-- The admin dashboard now opens only for a session made by signing in with
-- Google, never for one made by typing a password. Something has to be able
-- to tell those apart, and the access token's own amr claim was the obvious
-- candidate -- but a claim is only as trustworthy as the assumption that it
-- is there at all, and a check that silently fails open, or one that locks
-- the only admin out because a claim moved, is not worth having.
--
-- auth.mfa_amr_claims is where GoTrue writes it: one row per session per
-- method, 'oauth' for a provider sign-in and 'password' for a typed one. The
-- rows outlive the token -- sessions here have been refreshed nine times over
-- thirteen days and still carry the method they started with -- and they go
-- away when the session does, so a signed-out session stops being an admin
-- one immediately rather than at the end of the token's hour.
--
-- The schema is not reachable through PostgREST, hence this function. It is
-- SECURITY DEFINER and therefore deliberately narrow: it takes a session id
-- the caller must already hold, returns one boolean, and is executable by
-- service_role alone. It cannot be used to enumerate anything -- an id that
-- does not exist and one made by password both answer false.
create or replace function public.session_made_by_oauth(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.mfa_amr_claims c
    where c.session_id = p_session
      and c.authentication_method = 'oauth'
  );
$$;

revoke all on function public.session_made_by_oauth(uuid) from public;
revoke all on function public.session_made_by_oauth(uuid) from anon;
revoke all on function public.session_made_by_oauth(uuid) from authenticated;
grant execute on function public.session_made_by_oauth(uuid) to service_role;
