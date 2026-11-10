-- GidiReads: self-service account deletion.
--
-- Why this exists: there is no way for a signed-in user to delete their own
-- account. The browser client cannot delete rows from auth.users directly, so
-- this SECURITY DEFINER function runs with the owner's privileges and deletes
-- only the caller's own auth record.
--
-- Safety properties:
--   * It deletes ONLY the row matching auth.uid() (the signed-in caller). There
--     is no parameter, so one user can never target another.
--   * It is a no-op for signed-out callers (auth.uid() is null).
--   * Dependent data is removed by foreign keys: profiles references
--     auth.users(id), and stories/chapters/etc. cascade from profiles. Rows that
--     use "on delete set null" (e.g. created_by/updated_by) are kept but
--     anonymised, which is the intended behaviour.
--   * After the delete, the caller's JWT is invalid on the next request; the
--     client signs out locally as well.

create or replace function public.gidireads_delete_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  -- Only a signed-in user can delete their own account.
  if uid is null then
    raise exception 'You must be signed in to delete your account.';
  end if;

  delete from auth.users where id = uid;
end;
$$;

-- Only signed-in users may call it. Never grant to anon.
revoke all on function public.gidireads_delete_account() from public;
revoke all on function public.gidireads_delete_account() from anon;
grant execute on function public.gidireads_delete_account() to authenticated;
