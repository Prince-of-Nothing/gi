-- GidiReads: email-availability pre-check for signup.
--
-- Why this exists: the client cannot read auth.users with the anon key, and
-- public.profiles has no email column, so there is no way to detect an already-
-- registered email before submitting the form. This SECURITY DEFINER function
-- runs with the owner's privileges and answers "is this email already used?"
-- so auth.js can reject a taken email at the "Next" step (same as username).
--
-- Note: this deliberately exposes email existence to signed-out callers to
-- improve signup UX. GidiReads already exposes username availability the same
-- way, so this does not add a materially new enumeration surface.

create or replace function public.gidireads_email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(coalesce(p_email, '')))
  );
$$;

-- Allow the signed-out signup flow (anon) and signed-in users to call it.
grant execute on function public.gidireads_email_exists(text) to anon, authenticated;
