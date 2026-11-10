-- GidiReads Batch 4 — Acquisition Editor access corrections
-- Apply after the existing Build 4, Batch 3 AE sharing, and Build 6 AE notification migrations.
-- This is limited to the existing AE application, assignment, draft-sharing and review workflows.
-- No tables are created and no production data is changed by preparing this file.

-- A pending/rejected application must never leave an active AE staff role behind.
-- Application notifications are emitted by the existing Build 6 trigger; do not insert
-- a second notification here.
create or replace function public.admin_review_ae_application(
  p_application_id uuid,
  p_status text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_admin uuid := auth.uid();
  v_app public.ae_applications%rowtype;
begin
  if not exists (
    select 1 from public.profiles where id = v_admin and role = 'admin'
  ) then
    raise exception 'not_authorized';
  end if;

  if p_status not in ('in_review', 'approved', 'rejected') then
    raise exception 'invalid_status';
  end if;

  select * into v_app
  from public.ae_applications
  where id = p_application_id
  for update;

  if v_app.id is null then
    raise exception 'application_not_found';
  end if;

  update public.ae_applications
  set status = p_status,
      admin_note = nullif(left(trim(coalesce(p_note, '')), 2000), ''),
      reviewed_by = v_admin,
      reviewed_at = now(),
      updated_at = now()
  where id = p_application_id;

  if p_status = 'approved' then
    insert into public.staff_assignments(user_id, role_key, assigned_by, is_active, updated_at)
    values (v_app.user_id, 'acquisitions_editor', v_admin, true, now())
    on conflict (user_id, role_key) do update
      set assigned_by = excluded.assigned_by,
          is_active = true,
          updated_at = now();
  else
    -- Both In Review and Rejected mean the applicant has no AE workspace access.
    update public.staff_assignments
    set is_active = false,
        assigned_by = v_admin,
        updated_at = now()
    where user_id = v_app.user_id
      and role_key = 'acquisitions_editor';
  end if;

  return jsonb_build_object(
    'success', true,
    'status', p_status,
    'user_id', v_app.user_id
  );
end;
$function$;
revoke all on function public.admin_review_ae_application(uuid, text, text) from public, anon;
grant execute on function public.admin_review_ae_application(uuid, text, text) to authenticated;

-- Keep assignment validation consistent with the live contract period, not status alone.
create or replace function public.admin_assign_ae_author(
  p_ae_user_id uuid,
  p_author_id uuid,
  p_active boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_admin uuid := auth.uid();
  v_was_active boolean := false;
  v_author_name text;
  v_ae_name text;
begin
  if not exists (
    select 1 from public.profiles where id = v_admin and role = 'admin'
  ) then
    raise exception 'not_authorized';
  end if;

  if p_active and not exists (
    select 1 from public.staff_assignments
    where user_id = p_ae_user_id
      and role_key = 'acquisitions_editor'
      and is_active = true
  ) then
    raise exception 'ae_not_approved';
  end if;

  if p_active and not exists (
    select 1 from public.creator_contracts
    where author_id = p_author_id
      and status = 'active'
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
  ) then
    raise exception 'author_has_no_active_contract';
  end if;

  select coalesce(is_active, false) into v_was_active
  from public.ae_author_assignments
  where ae_user_id = p_ae_user_id and author_id = p_author_id
  for update;

  insert into public.ae_author_assignments(
    ae_user_id, author_id, assigned_by, is_active, updated_at
  )
  values (p_ae_user_id, p_author_id, v_admin, p_active, now())
  on conflict (ae_user_id, author_id) do update
    set assigned_by = excluded.assigned_by,
        is_active = excluded.is_active,
        updated_at = now();

  if not p_active then
    update public.ae_draft_shares
    set status = 'revoked', revoked_at = now()
    where ae_user_id = p_ae_user_id
      and author_id = p_author_id
      and status = 'active';
  end if;

  if p_active and not coalesce(v_was_active, false) then
    select coalesce(display_name, username, 'your author')
      into v_author_name from public.profiles where id = p_author_id;
    select coalesce(display_name, username, 'your editor')
      into v_ae_name from public.profiles where id = p_ae_user_id;

    insert into public.notifications(user_id, actor_id, message, link, category)
    values
      (p_ae_user_id, v_admin,
       'You have been assigned to support ' || coalesce(v_author_name, 'an author') || '. Open your AE workspace to view their contracted stories.',
       'ae.html', 'system'),
      (p_author_id, v_admin,
       coalesce(v_ae_name, 'An Acquisition Editor') || ' has been assigned to support your contracted stories.',
       'authors-studio.html', 'system');
  end if;

  return jsonb_build_object('success', true, 'active', p_active);
end;
$function$;
revoke all on function public.admin_assign_ae_author(uuid, uuid, boolean) from public, anon;
grant execute on function public.admin_assign_ae_author(uuid, uuid, boolean) to authenticated;

-- A previously assigned AE must still have an active role and a current contract
-- to open a published-story review by URL.
create or replace function public.ae_get_story_review(p_story_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null or not exists (
    select 1
    from public.ae_author_assignments aa
    join public.staff_assignments sa
      on sa.user_id = aa.ae_user_id
     and sa.role_key = 'acquisitions_editor'
     and sa.is_active = true
    join public.stories s
      on s.id = p_story_id
     and s.author_id = aa.author_id
    join public.creator_contracts cc
      on cc.author_id = aa.author_id
     and cc.story_id = s.id
     and cc.status = 'active'
     and (cc.starts_at is null or cc.starts_at <= now())
     and (cc.ends_at is null or cc.ends_at >= now())
    where aa.ae_user_id = v_user
      and aa.is_active = true
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'story', jsonb_build_object(
      'id', s.id,
      'title', s.title,
      'author_id', p.id,
      'author_name', coalesce(p.display_name, p.username, 'Author')
    ),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'chapter_number', c.chapter_number,
        'title', c.title,
        'content', c.content,
        'word_count', array_length(
          regexp_split_to_array(trim(coalesce(c.content, '')), '\s+'), 1
        )
      ) order by c.chapter_number)
      from public.chapters c
      where c.story_id = s.id
        and c.is_published = true
        and c.archived_at is null
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from public.ae_editorial_reviews r
      where r.story_id = s.id
        and r.ae_user_id = v_user
    ), '[]'::jsonb)
  ) into v_result
  from public.stories s
  join public.profiles p on p.id = s.author_id
  where s.id = p_story_id;

  if v_result is null then
    raise exception 'story_not_found';
  end if;

  return v_result;
end;
$function$;
revoke all on function public.ae_get_story_review(uuid) from public, anon;
grant execute on function public.ae_get_story_review(uuid) to authenticated;

-- Match editorial feedback submission to the same current assignment/contract rules.
create or replace function public.ae_submit_editorial_review(
  p_story_id uuid,
  p_type text,
  p_focus text,
  p_feedback text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_author uuid;
  v_id uuid;
begin
  if v_user is null or not exists (
    select 1 from public.staff_assignments
    where user_id = v_user
      and role_key = 'acquisitions_editor'
      and is_active = true
  ) then
    raise exception 'not_authorized';
  end if;

  select aa.author_id into v_author
  from public.ae_author_assignments aa
  join public.stories s
    on s.id = p_story_id
   and s.author_id = aa.author_id
  join public.creator_contracts cc
    on cc.author_id = aa.author_id
   and cc.story_id = s.id
   and cc.status = 'active'
   and (cc.starts_at is null or cc.starts_at <= now())
   and (cc.ends_at is null or cc.ends_at >= now())
  where aa.ae_user_id = v_user
    and aa.is_active = true
  limit 1;

  if v_author is null then
    raise exception 'story_not_assigned';
  end if;

  if p_type not in ('developmental', 'chapter', 'continuity')
     or length(trim(coalesce(p_focus, ''))) < 3
     or length(trim(coalesce(p_feedback, ''))) < 40 then
    raise exception 'Please add a clear focus and at least 40 characters of feedback.';
  end if;

  insert into public.ae_editorial_reviews(
    ae_user_id, author_id, story_id, review_type, focus, feedback, status
  )
  values (
    v_user, v_author, p_story_id, p_type,
    left(trim(p_focus), 120), left(trim(p_feedback), 6000), 'sent'
  )
  returning id into v_id;

  return jsonb_build_object('success', true, 'review_id', v_id);
end;
$function$;
revoke all on function public.ae_submit_editorial_review(uuid, text, text, text) from public, anon;
grant execute on function public.ae_submit_editorial_review(uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';

-- Shared draft lists and direct draft URLs must also verify the current
-- contract window. Assignment or an old share alone is not sufficient.
create or replace function public.ae_get_shared_drafts()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null or not exists (
    select 1 from public.staff_assignments
    where user_id = v_user
      and role_key = 'acquisitions_editor'
      and is_active = true
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'story_id', s.id,
    'story_title', s.title,
    'author_id', p.id,
    'author_name', coalesce(p.display_name, p.username, 'GidiReads author'),
    'author_avatar_url', p.avatar_url,
    'shared_at', ds.shared_at,
    'draft_chapter_count', coalesce(ch.chapter_count, 0)
  ) order by ds.shared_at desc), '[]'::jsonb)
  into v_result
  from public.ae_draft_shares ds
  join public.stories s
    on s.id = ds.story_id and s.author_id = ds.author_id
  join public.profiles p on p.id = ds.author_id
  join public.creator_contracts cc
    on cc.author_id = ds.author_id
   and cc.story_id = ds.story_id
   and cc.status = 'active'
   and (cc.starts_at is null or cc.starts_at <= now())
   and (cc.ends_at is null or cc.ends_at >= now())
  join public.ae_author_assignments aa
    on aa.ae_user_id = v_user
   and aa.author_id = ds.author_id
   and aa.is_active = true
  left join lateral (
    select count(*) as chapter_count
    from public.chapters c
    where c.story_id = s.id
      and c.is_published = false
      and c.archived_at is null
  ) ch on true
  where ds.ae_user_id = v_user
    and ds.status = 'active';

  return v_result;
end;
$function$;
revoke all on function public.ae_get_shared_drafts() from public, anon;
grant execute on function public.ae_get_shared_drafts() to authenticated;

create or replace function public.ae_get_shared_draft(p_story_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null or not exists (
    select 1
    from public.ae_draft_shares ds
    join public.ae_author_assignments aa
      on aa.ae_user_id = ds.ae_user_id
     and aa.author_id = ds.author_id
     and aa.is_active = true
    join public.staff_assignments sa
      on sa.user_id = ds.ae_user_id
     and sa.role_key = 'acquisitions_editor'
     and sa.is_active = true
    join public.stories shared_story
      on shared_story.id = ds.story_id
     and shared_story.author_id = ds.author_id
    join public.creator_contracts cc
      on cc.author_id = ds.author_id
     and cc.story_id = ds.story_id
     and cc.status = 'active'
     and (cc.starts_at is null or cc.starts_at <= now())
     and (cc.ends_at is null or cc.ends_at >= now())
    where ds.story_id = p_story_id
      and ds.ae_user_id = v_user
      and ds.status = 'active'
  ) then
    raise exception 'draft_not_shared_with_this_editor' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'story', jsonb_build_object(
      'id', s.id,
      'title', s.title,
      'description', s.description,
      'author_id', p.id,
      'author_name', coalesce(p.display_name, p.username, 'GidiReads author'),
      'author_avatar_url', p.avatar_url
    ),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'chapter_number', c.chapter_number,
        'title', c.title,
        'content', c.content,
        'updated_at', c.updated_at
      ) order by c.chapter_number, c.created_at)
      from public.chapters c
      where c.story_id = s.id
        and c.is_published = false
        and c.archived_at is null
    ), '[]'::jsonb)
  ) into v_result
  from public.stories s
  join public.profiles p on p.id = s.author_id
  where s.id = p_story_id;

  return v_result;
end;
$function$;
revoke all on function public.ae_get_shared_draft(uuid) from public, anon;
grant execute on function public.ae_get_shared_draft(uuid) to authenticated;

notify pgrst, 'reload schema';

-- Authors can only share a draft while the AE assignment and the story's
-- contract are both current. Re-sharing after a revoked share is explicit.
create or replace function public.author_share_draft_with_ae(
  p_story_id uuid,
  p_ae_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_story public.stories%rowtype;
  v_author_name text;
  v_was_active boolean := false;
  v_share_id uuid;
begin
  if v_user is null then
    raise exception 'authentication_required';
  end if;

  select * into v_story
  from public.stories
  where id = p_story_id and author_id = v_user
  for update;
  if not found then
    raise exception 'story_not_found_or_not_owned';
  end if;

  if not exists (
    select 1
    from public.ae_author_assignments aa
    join public.staff_assignments sa
      on sa.user_id = aa.ae_user_id
     and sa.role_key = 'acquisitions_editor'
     and sa.is_active = true
    where aa.author_id = v_user
      and aa.ae_user_id = p_ae_user_id
      and aa.is_active = true
  ) then
    raise exception 'editor_not_assigned';
  end if;

  if not exists (
    select 1 from public.creator_contracts cc
    where cc.author_id = v_user
      and cc.story_id = p_story_id
      and cc.status = 'active'
      and (cc.starts_at is null or cc.starts_at <= now())
      and (cc.ends_at is null or cc.ends_at >= now())
  ) then
    raise exception 'story_has_no_current_contract';
  end if;

  if v_story.status <> 'draft' and not exists (
    select 1 from public.chapters c
    where c.story_id = p_story_id
      and c.is_published = false
      and c.archived_at is null
  ) then
    raise exception 'no_draft_chapters_to_share';
  end if;

  select coalesce(status = 'active', false) into v_was_active
  from public.ae_draft_shares
  where story_id = p_story_id
    and author_id = v_user
    and ae_user_id = p_ae_user_id
  for update;

  insert into public.ae_draft_shares(
    story_id, author_id, ae_user_id, status, shared_at, revoked_at
  ) values (
    p_story_id, v_user, p_ae_user_id, 'active', now(), null
  )
  on conflict (story_id, author_id, ae_user_id) do update
    set status = 'active', shared_at = now(), revoked_at = null
  returning id into v_share_id;

  select coalesce(nullif(btrim(display_name), ''), username, 'an author')
  into v_author_name
  from public.profiles
  where id = v_user;

  if not coalesce(v_was_active, false) then
    insert into public.notifications(user_id, actor_id, message, link, category)
    values (
      p_ae_user_id,
      v_user,
      'A draft of “' || coalesce(v_story.title, 'a story') || '” has been shared with you by ' || coalesce(v_author_name, 'an assigned author') || '.',
      'ae.html?pane=drafts',
      'system'
    );
  end if;

  return jsonb_build_object('success', true, 'share_id', v_share_id);
end;
$function$;
revoke all on function public.author_share_draft_with_ae(uuid, uuid) from public, anon;
grant execute on function public.author_share_draft_with_ae(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
