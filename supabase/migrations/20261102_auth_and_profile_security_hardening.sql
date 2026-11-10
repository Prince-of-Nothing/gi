-- GidiReads A/B hardening: auth integrity, profile privileges, and exposed RPCs.
-- Apply after deploying the matching Version 5 frontend files.
-- This migration deliberately does not add a username-format CHECK constraint:
-- production contains legacy usernames outside the new signup format.

begin;

-- Existing production data was checked for case-insensitive collisions before
-- this migration. Keep the guard so a later environment fails safely instead
-- of silently allowing ambiguous usernames.
do $$
begin
  if exists (
    select 1
    from public.profiles
    group by lower(username)
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce case-insensitive username uniqueness: duplicate usernames already exist.';
  end if;
end;
$$;

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

comment on index public.profiles_username_lower_key is
  'Enforces case-insensitive username uniqueness across signup and profile edits.';

-- Profile data remains publicly readable only for the explicit public fields.
-- Financial counters and moderation status are no longer exposed via profiles.
revoke all privileges on table public.profiles from public, anon, authenticated;

grant select (
  id,
  username,
  display_name,
  bio,
  avatar_url,
  created_at,
  role,
  is_verified,
  profile_header,
  theme_pref
) on table public.profiles to anon, authenticated;

grant update (
  username,
  display_name,
  bio,
  avatar_url,
  profile_header,
  theme_pref
) on table public.profiles to authenticated;

-- Client-side profile creation/deletion is not part of the app's flow.
-- Auth creates profiles through the trusted auth.users trigger.

-- Require ownership both before and after an UPDATE.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Defense in depth: even trusted SQL paths must not let an ordinary user
-- change server-managed fields through a profile UPDATE.
create or replace function public.protect_privileged_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_is_admin boolean;
begin
  select coalesce((
    select p.role = 'admin'
    from public.profiles p
    where p.id = auth.uid()
  ), false) into v_is_admin;

  if new.username is distinct from old.username and new.username !~ '^[A-Za-z0-9_]{3,24}$' then
    raise exception using errcode = '23514', message = 'invalid_username';
  end if;

  if not v_is_admin then
    new.role := old.role;
    new.account_status := old.account_status;
    new.echo_credits := old.echo_credits;
    new.last_echo_refill := old.last_echo_refill;
    new.is_verified := old.is_verified;
  end if;

  return new;
end;
$function$;

-- Enforce the new username format for every Auth signup path, not just the
-- redesigned auth page. Older stored usernames remain untouched.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_username text;
begin
  v_username := nullif(btrim(new.raw_user_meta_data->>'username'), '');
  if v_username is null then
    v_username := regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^A-Za-z0-9_]', '', 'g');
    if length(v_username) < 3 then
      v_username := 'reader_' || substr(replace(new.id::text, '-', ''), 1, 8);
    end if;
  end if;

  if v_username !~ '^[A-Za-z0-9_]{3,24}$' then
    raise exception using errcode = '23514', message = 'invalid_username';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_username)
  on conflict (id) do nothing;

  return new;
end;
$function$;

-- The existing admin status RPC remains the only client-facing status writer.
-- Its body already checks that auth.uid() belongs to an admin profile and all
-- referenced relations are schema-qualified; pin its search_path explicitly.
alter function public.admin_set_user_status(uuid, text, text)
  set search_path = '';

-- Replace the old unrestricted profile status reads in the admin UI with
-- authenticated, admin-checked server-side RPCs.
create or replace function public.admin_profile_counts()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_counts jsonb;
begin
  if v_actor is null or not exists (
    select 1 from public.profiles p where p.id = v_actor and p.role = 'admin'
  ) then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  select jsonb_build_object(
    'total_users', count(*),
    'total_admins', count(*) filter (where p.role = 'admin'),
    'suspended_accounts', count(*) filter (where p.account_status = 'suspended'),
    'disabled_accounts', count(*) filter (where p.account_status = 'disabled')
  )
  into v_counts
  from public.profiles p;

  return v_counts;
end;
$function$;

create or replace function public.admin_list_users(p_limit integer default 100)
returns table (
  id uuid,
  username text,
  display_name text,
  role text,
  account_status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
begin
  if v_actor is null or not exists (
    select 1 from public.profiles p where p.id = v_actor and p.role = 'admin'
  ) then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  return query
    select p.id, p.username, p.display_name, p.role, p.account_status, p.created_at
    from public.profiles p
    order by p.created_at desc
    limit v_limit;
end;
$function$;

revoke all on function public.admin_profile_counts() from public, anon;
grant execute on function public.admin_profile_counts() to authenticated;
revoke all on function public.admin_list_users(integer) from public, anon;
grant execute on function public.admin_list_users(integer) to authenticated;

-- Remove the email-existence oracle. Version 5 does not call it; Supabase Auth
-- remains responsible for signup and duplicate-account responses.
revoke all on function public.gidireads_email_exists(text) from public, anon, authenticated;

-- The Contracted badge is public UI. Limit this SECURITY DEFINER function to
-- IDs of already-published stories, so it cannot reveal contracts for drafts,
-- private stories, or stories with no published chapters.
create or replace function public.contracted_story_ids(p_story_ids uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select distinct ca.story_id
  from public.contract_applications ca
  join public.stories s on s.id = ca.story_id
  where ca.status = 'accepted'
    and s.status in ('ongoing', 'completed')
    and exists (
      select 1 from public.chapters c
      where c.story_id = s.id and c.is_published = true
    )
    and ca.story_id = any(p_story_ids)
$function$;
revoke all on function public.contracted_story_ids(uuid[]) from public, anon, authenticated;
grant execute on function public.contracted_story_ids(uuid[]) to anon, authenticated;

-- This predicate is used by RLS policies and reads only the public role field.
-- SECURITY INVOKER is sufficient because profiles has a public SELECT policy.
create or replace function public.hh_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
$function$;

-- Trigger/event-trigger functions are not RPC endpoints. Remove their default
-- PUBLIC execute grants without affecting trigger invocation.
revoke all on function public.hh_block_entry_story_delete() from public, anon, authenticated;
alter function public.hh_block_entry_story_delete() set search_path = '';
revoke all on function public.hh_entry_recognition() from public, anon, authenticated;
alter function public.hh_entry_recognition() set search_path = '';
revoke all on function public.hh_finalist_badges() from public, anon, authenticated;
alter function public.hh_finalist_badges() set search_path = '';
revoke all on function public.hh_keep_contest_tag() from public, anon, authenticated;
alter function public.hh_keep_contest_tag() set search_path = '';
revoke all on function public.reading_list_limits() from public, anon, authenticated;
alter function public.reading_list_limits() set search_path = '';
revoke all on function public.recalc_story_echo_count(uuid) from public, anon, authenticated;
alter function public.recalc_story_echo_count(uuid) set search_path = '';
revoke all on function public.sync_story_echo_count_from_support() from public, anon, authenticated;
alter function public.sync_story_echo_count_from_support() set search_path = '';
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Catalog editor stamping is also trigger-only; its body uses schema-qualified objects.
revoke all on function public.stamp_gidireads_catalog_editor() from public, anon, authenticated;
alter function public.stamp_gidireads_catalog_editor() set search_path = '';

-- These legacy notification helpers are not called by Version 5 and would let
-- any signed-in user manufacture notifications by supplying arbitrary IDs.
revoke all on function public.notify_new_comment_reply(uuid) from public, anon, authenticated;
alter function public.notify_new_comment_reply(uuid) set search_path = '';
revoke all on function public.notify_comment_liked(uuid) from public, anon, authenticated;
alter function public.notify_comment_liked(uuid) set search_path = '';

-- Clear the remaining mutable search_path warnings on pure helpers/triggers.
alter function public.increment_story_reads(uuid) set search_path = '';
alter function public.hh_text_to_html(text) set search_path = '';
alter function public.hh_chapters_words(jsonb) set search_path = '';
alter function public.touch_platform_opportunity_slides() set search_path = '';
alter function public.hh_word_count(text) set search_path = '';
alter function public.touch_reading_list() set search_path = '';

commit;
