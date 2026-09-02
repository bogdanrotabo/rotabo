-- admin-listings looked up the caller with .ilike("email", user.email).
-- Applied 1 September 2026.
--
-- ilike is a pattern match: % and _ are wildcards in it. The address comes
-- from a Google-verified session, and Google does not issue addresses
-- containing either, so nothing was exploitable -- but a wildcard operator
-- was doing the work of an equality test, which is the wrong instrument for
-- "is this exact address on the list".
--
-- Switching the function to .eq() removes the pattern matching. The catch is
-- that .eq() is case-sensitive where .ilike() was not: a row added later as
-- Bogdan.Tanase.CH@gmail.com would stop matching, and the failure mode is a
-- locked-out admin with a uniform 401 that deliberately explains nothing.
--
-- So the case-insensitivity moves here, where it can be enforced instead of
-- hoped for. Auth stores addresses lowercased; this makes the table agree,
-- and refuses any future row that does not.

update public.admin_emails
set email = lower(trim(email))
where email <> lower(trim(email));

alter table public.admin_emails
  add constraint admin_emails_lowercase
  check (email = lower(trim(email)));
