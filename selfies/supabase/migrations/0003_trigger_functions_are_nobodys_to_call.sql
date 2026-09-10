-- The two trigger functions are SECURITY DEFINER, and Postgres grants
-- EXECUTE on a new function to public by default. In practice PostgREST
-- does not expose them -- it leaves out anything returning `trigger`, and a
-- call to either answers PGRST202 -- so nothing could reach them today. That
-- is a property of PostgREST's schema cache, though, not of this database,
-- and it is not the thing to rest a SECURITY DEFINER function on.
--
-- A trigger function needs EXECUTE granted to nobody: the trigger runs it as
-- the table's owner regardless. So take the default grant away and let the
-- security advisor stop pointing at it.
--
-- Applied 2026-09-10. After it, the advisor reports only rls_enabled_no_policy,
-- which is this schema's whole design: RLS on with no policy anywhere means
-- the publishable key can reach nothing, and the service role in the Worker
-- is the only way in.

revoke execute on function public.selfies_like_count_sync()   from public, anon, authenticated;
revoke execute on function public.selfies_report_count_sync() from public, anon, authenticated;
