-- Batch 4 safeguards + AE workflow notifications (Batch 6 notification integration).
-- Prevent self-approval, self-assignment and self-review when an account also has staff authority.
-- Keep report contents confidential from the AE; notifications contain no report details.

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
  if v_admin is null or not exists (
    select 1 from public.profiles where id = v_admin and role = 'admin'
  ) then
    raise exception 'not_authorized';
  end if;
  if p_status is null or p_status not in ('in_review', 'approved', 'rejected') then
    raise exception 'invalid_status';
  end if;
  select * into v_app from public.ae_applications where id = p_application_id for update;
  if v_app.id is null then raise exception 'application_not_found'; end if;
  if v_app.user_id = v_admin then
    raise exception 'cannot_review_own_ae_application';
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
      set assigned_by = excluded.assigned_by, is_active = true, updated_at = now();
  else
    update public.staff_assignments set is_active = false, assigned_by = v_admin, updated_at = now()
    where user_id = v_app.user_id and role_key = 'acquisitions_editor';
  end if;
  return jsonb_build_object('success', true, 'status', p_status, 'user_id', v_app.user_id);
end;
$function$;
revoke all on function public.admin_review_ae_application(uuid, text, text) from public, anon;
grant execute on function public.admin_review_ae_application(uuid, text, text) to authenticated;

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
  if v_admin is null or not exists (select 1 from public.profiles where id = v_admin and role = 'admin') then
    raise exception 'not_authorized';
  end if;
  if p_active is null then raise exception 'invalid_assignment_state'; end if;
  if p_active and p_ae_user_id = p_author_id then raise exception 'cannot_assign_yourself_as_ae'; end if;
  if p_active and not exists (
    select 1 from public.staff_assignments sa
    join public.ae_applications ap on ap.user_id = sa.user_id and ap.status = 'approved'
    where sa.user_id = p_ae_user_id and sa.role_key = 'acquisitions_editor' and sa.is_active = true
  ) then raise exception 'ae_not_approved'; end if;
  if p_active and not exists (
    select 1 from public.creator_contracts
    where author_id = p_author_id and status = 'active'
      and starts_at <= now() and (ends_at is null or ends_at >= now())
  ) then raise exception 'author_has_no_active_contract'; end if;

  select coalesce(is_active, false) into v_was_active
  from public.ae_author_assignments
  where ae_user_id = p_ae_user_id and author_id = p_author_id for update;

  insert into public.ae_author_assignments(ae_user_id, author_id, assigned_by, is_active, updated_at)
  values (p_ae_user_id, p_author_id, v_admin, p_active, now())
  on conflict (ae_user_id, author_id) do update
    set assigned_by = excluded.assigned_by, is_active = excluded.is_active, updated_at = now();

  if not p_active then
    update public.ae_draft_shares set status = 'revoked', revoked_at = now()
    where ae_user_id = p_ae_user_id and author_id = p_author_id and status = 'active';
  elsif not coalesce(v_was_active, false) then
    select coalesce(display_name, username, 'your author') into v_author_name from public.profiles where id = p_author_id;
    select coalesce(display_name, username, 'your editor') into v_ae_name from public.profiles where id = p_ae_user_id;
    insert into public.notifications(user_id, actor_id, message, link, category)
    values
      (p_ae_user_id, null, 'You have been assigned to support ' || coalesce(v_author_name, 'an author') || '. Open your AE workspace to view their contracted stories.', 'ae.html', 'system'),
      (p_author_id, null, coalesce(v_ae_name, 'An Acquisition Editor') || ' has been assigned to support your contracted stories. You can review your editor from Contract Centre or Authors Studio.', 'contract-center.html', 'system');
  end if;
  return jsonb_build_object('success', true, 'active', p_active);
end;
$function$;
revoke all on function public.admin_assign_ae_author(uuid, uuid, boolean) from public, anon;
grant execute on function public.admin_assign_ae_author(uuid, uuid, boolean) to authenticated;

create or replace function public.admin_manage_ae_authority(
  p_ae_user_id uuid,
  p_action text,
  p_reassign_to uuid default null,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_author_id uuid;
  v_moved integer := 0;
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user and role = 'admin') then
    raise exception 'not_authorized';
  end if;
  if p_ae_user_id = v_user then raise exception 'cannot_manage_own_ae_authority'; end if;
  if p_action is null or p_action not in ('remove_authority', 'remove_and_reassign') then raise exception 'invalid_action'; end if;
  if p_action = 'remove_and_reassign' and (
    p_reassign_to is null or p_reassign_to = p_ae_user_id or p_reassign_to = v_user
    or not exists (
      select 1 from public.staff_assignments sa
      join public.ae_applications ap on ap.user_id = sa.user_id and ap.status = 'approved'
      where sa.user_id = p_reassign_to and sa.role_key = 'acquisitions_editor' and sa.is_active = true
    )
  ) then raise exception 'replacement_ae_not_active'; end if;

  update public.staff_assignments set is_active = false, updated_at = now()
  where user_id = p_ae_user_id and role_key = 'acquisitions_editor' and is_active = true;
  update public.ae_applications set status = 'rejected', admin_note = left(coalesce(p_note, 'AE authority removed by admin'), 3000),
    reviewed_by = v_user, reviewed_at = now(), updated_at = now()
  where user_id = p_ae_user_id and status = 'approved';

  for v_author_id in
    select author_id from public.ae_author_assignments where ae_user_id = p_ae_user_id and is_active = true
  loop
    update public.ae_author_assignments set is_active = false, updated_at = now()
    where ae_user_id = p_ae_user_id and author_id = v_author_id and is_active = true;
    update public.ae_draft_shares set status = 'revoked', revoked_at = now()
    where ae_user_id = p_ae_user_id and author_id = v_author_id and status = 'active';
    if p_action = 'remove_and_reassign' and exists (
      select 1 from public.creator_contracts where author_id = v_author_id and status = 'active'
        and starts_at <= now() and (ends_at is null or ends_at >= now())
    ) then
      insert into public.ae_author_assignments(ae_user_id, author_id, assigned_by, is_active, updated_at)
      values (p_reassign_to, v_author_id, v_user, true, now())
      on conflict (ae_user_id, author_id) do update set is_active = true, assigned_by = v_user, updated_at = now();
      insert into public.notifications(user_id, actor_id, message, link, category)
      values (v_author_id, null, 'Your Acquisition Editor assignment has changed. Open Contract Centre to see your current editor and review options.', 'contract-center.html', 'system');
      v_moved := v_moved + 1;
    elsif p_action = 'remove_authority' then
      insert into public.notifications(user_id, actor_id, message, link, category)
      values (v_author_id, null, 'Your Acquisition Editor assignment has ended. GidiReads will provide an update when a new editor is assigned.', 'contract-center.html', 'system');
    end if;
  end loop;
  return jsonb_build_object('success', true, 'reassigned_authors', v_moved);
end;
$function$;
revoke all on function public.admin_manage_ae_authority(uuid, text, uuid, text) from public, anon;
grant execute on function public.admin_manage_ae_authority(uuid, text, uuid, text) to authenticated;

create or replace function public.author_get_assigned_ae()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare v_user uuid := auth.uid(); v_result jsonb;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select jsonb_agg(jsonb_build_object(
    'assignment_id', aa.id, 'ae_user_id', aa.ae_user_id,
    'ae_name', coalesce(p.display_name, p.username, 'Acquisition Editor'),
    'ae_username', p.username, 'rating', f.rating, 'feedback', f.feedback,
    'feedback_updated_at', f.updated_at
  ) order by aa.created_at desc) into v_result
  from public.ae_author_assignments aa
  join public.profiles p on p.id = aa.ae_user_id
  join public.staff_assignments sa on sa.user_id = aa.ae_user_id and sa.role_key = 'acquisitions_editor' and sa.is_active = true
  join public.ae_applications ap on ap.user_id = aa.ae_user_id and ap.status = 'approved'
  left join public.ae_author_feedback f on f.assignment_id = aa.id
  where aa.author_id = v_user and aa.ae_user_id <> v_user and aa.is_active = true
    and exists (select 1 from public.creator_contracts cc where cc.author_id = aa.author_id and cc.status = 'active'
      and cc.starts_at <= now() and (cc.ends_at is null or cc.ends_at >= now()));
  return coalesce(v_result, '[]'::jsonb);
end;
$function$;
revoke all on function public.author_get_assigned_ae() from public, anon;
grant execute on function public.author_get_assigned_ae() to authenticated;

create or replace function public.author_submit_ae_feedback(p_assignment_id uuid, p_rating integer, p_feedback text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_assignment public.ae_author_assignments%rowtype;
  v_id uuid;
  v_existing public.ae_author_feedback%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_rating is null or p_rating not between 1 and 5 or length(trim(coalesce(p_feedback, ''))) not between 10 and 3000 then raise exception 'invalid_feedback'; end if;
  select aa.* into v_assignment from public.ae_author_assignments aa
  where aa.id = p_assignment_id and aa.author_id = v_user and aa.ae_user_id <> v_user and aa.is_active = true
    and exists (select 1 from public.creator_contracts cc where cc.author_id = aa.author_id and cc.status = 'active'
      and cc.starts_at <= now() and (cc.ends_at is null or cc.ends_at >= now()))
    and exists (select 1 from public.staff_assignments sa join public.ae_applications ap on ap.user_id = sa.user_id and ap.status = 'approved'
      where sa.user_id = aa.ae_user_id and sa.role_key = 'acquisitions_editor' and sa.is_active = true);
  if not found then raise exception 'assignment_not_active'; end if;
  select * into v_existing from public.ae_author_feedback where assignment_id = v_assignment.id;
  insert into public.ae_author_feedback(assignment_id, author_id, ae_user_id, rating, feedback)
  values (v_assignment.id, v_user, v_assignment.ae_user_id, p_rating, trim(p_feedback))
  on conflict (assignment_id) do update set rating = excluded.rating, feedback = excluded.feedback, updated_at = now()
  returning id into v_id;

  if v_existing.id is null or v_existing.rating is distinct from p_rating or v_existing.feedback is distinct from trim(p_feedback) then
    insert into public.notifications(user_id, actor_id, message, link, category)
    values (v_assignment.ae_user_id, null, 'An author has updated feedback about your editorial support. Your AE performance summary has been updated.', 'ae.html', 'system');
    insert into public.notifications(user_id, actor_id, message, link, category)
    select p.id, null, 'An author has submitted feedback about an Acquisition Editor. Review the AE performance overview.', 'admin.html', 'system'
    from public.profiles p where p.role = 'admin' and p.id <> v_user;
  end if;
  return jsonb_build_object('success', true, 'feedback_id', v_id);
end;
$function$;
revoke all on function public.author_submit_ae_feedback(uuid, integer, text) from public, anon;
grant execute on function public.author_submit_ae_feedback(uuid, integer, text) to authenticated;

create or replace function public.author_report_ae(p_assignment_id uuid, p_reason text, p_details text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_assignment public.ae_author_assignments%rowtype;
  v_id uuid;
  v_feedback uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if length(trim(coalesce(p_reason, ''))) not between 3 and 120 or length(trim(coalesce(p_details, ''))) not between 10 and 3000 then raise exception 'invalid_report'; end if;
  select aa.* into v_assignment from public.ae_author_assignments aa
  where aa.id = p_assignment_id and aa.author_id = v_user and aa.ae_user_id <> v_user and aa.is_active = true
    and exists (select 1 from public.creator_contracts cc where cc.author_id = aa.author_id and cc.status = 'active'
      and cc.starts_at <= now() and (cc.ends_at is null or cc.ends_at >= now()))
    and exists (select 1 from public.staff_assignments sa join public.ae_applications ap on ap.user_id = sa.user_id and ap.status = 'approved'
      where sa.user_id = aa.ae_user_id and sa.role_key = 'acquisitions_editor' and sa.is_active = true);
  if not found then raise exception 'assignment_not_active'; end if;
  select id into v_feedback from public.ae_author_feedback where assignment_id = v_assignment.id;
  insert into public.ae_author_reports(assignment_id, author_id, ae_user_id, feedback_id, reason, details)
  values (v_assignment.id, v_user, v_assignment.ae_user_id, v_feedback, trim(p_reason), trim(p_details)) returning id into v_id;

  insert into public.notifications(user_id, actor_id, message, link, category)
  values (v_user, null, 'Your confidential report about an Acquisition Editor has been received by the moderation team.', 'ae-author-feedback.html', 'system');
  insert into public.notifications(user_id, actor_id, message, link, category)
  select recipients.user_id, null, 'A new confidential Acquisition Editor report needs review in the Moderator Dashboard.', 'moderator.html', 'system'
  from (
    select p.id as user_id from public.profiles p where p.role = 'admin'
    union
    select sa.user_id from public.staff_assignments sa where sa.role_key = 'community_moderator' and sa.is_active = true
  ) recipients where recipients.user_id <> v_user;
  return jsonb_build_object('success', true, 'report_id', v_id);
end;
$function$;
revoke all on function public.author_report_ae(uuid, text, text) from public, anon;
grant execute on function public.author_report_ae(uuid, text, text) to authenticated;

create or replace function public.moderator_update_ae_report(p_report_id uuid, p_status text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_report public.ae_author_reports%rowtype;
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user and role = 'admin')
    and not exists (select 1 from public.staff_assignments where user_id = v_user and role_key = 'community_moderator' and is_active = true)
  then raise exception 'not_authorized'; end if;
  if p_status is null or p_status not in ('in_review', 'actioned', 'dismissed') then raise exception 'invalid_status'; end if;
  select * into v_report from public.ae_author_reports where id = p_report_id for update;
  if v_report.id is null then raise exception 'report_not_found'; end if;
  update public.ae_author_reports set status = p_status, decision_note = left(coalesce(p_note, ''), 3000),
    updated_at = now(), resolved_at = case when p_status in ('actioned', 'dismissed') then now() else null end
  where id = p_report_id;
  insert into public.community_moderation_actions(moderator_id, content_type, content_id, action, note)
  values (v_user, 'acquisition_editor', p_report_id, p_status, left(coalesce(p_note, ''), 3000));
  if v_report.status is distinct from p_status or coalesce(v_report.decision_note, '') is distinct from coalesce(left(p_note, 3000), '') then
    insert into public.notifications(user_id, actor_id, message, link, category)
    values (v_report.author_id, null,
      case p_status when 'in_review' then 'The moderation team has started reviewing your Acquisition Editor report.'
        when 'actioned' then 'The moderation team has completed an action on your Acquisition Editor report.'
        else 'The moderation team has reviewed and closed your Acquisition Editor report.' end,
      'ae-author-feedback.html', 'system');
  end if;
  return jsonb_build_object('success', true);
end;
$function$;
revoke all on function public.moderator_update_ae_report(uuid, text, text) from public, anon;
grant execute on function public.moderator_update_ae_report(uuid, text, text) to authenticated;
-- Batch 6 notification integration for the existing AE editorial-review/reply workflow.
-- Notification bodies contain no private editorial text; the page itself remains access-controlled.

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
  v_story_title text;
  v_id uuid;
begin
  if v_user is null or not exists (
    select 1 from public.staff_assignments sa
    join public.ae_applications ap on ap.user_id = sa.user_id and ap.status = 'approved'
    where sa.user_id = v_user and sa.role_key = 'acquisitions_editor' and sa.is_active = true
  ) then raise exception 'not_authorized'; end if;

  select aa.author_id, s.title into v_author, v_story_title
  from public.ae_author_assignments aa
  join public.stories s on s.id = p_story_id and s.author_id = aa.author_id
  join public.creator_contracts cc on cc.author_id = aa.author_id and cc.story_id = s.id
    and cc.status = 'active' and cc.starts_at <= now() and (cc.ends_at is null or cc.ends_at >= now())
  where aa.ae_user_id = v_user and aa.is_active = true
  limit 1;
  if v_author is null then raise exception 'story_not_assigned'; end if;
  if p_type is null or p_type not in ('developmental', 'chapter', 'continuity')
    or length(trim(coalesce(p_focus, ''))) < 3
    or length(trim(coalesce(p_feedback, ''))) < 40
  then raise exception 'Please add a clear focus and at least 40 characters of feedback.'; end if;

  insert into public.ae_editorial_reviews(ae_user_id, author_id, story_id, review_type, focus, feedback, status)
  values (v_user, v_author, p_story_id, p_type, left(trim(p_focus), 120), left(trim(p_feedback), 6000), 'sent')
  returning id into v_id;

  insert into public.notifications(user_id, actor_id, message, link, category)
  values (v_author, null,
    'Your Acquisition Editor has sent editorial feedback for ' || coalesce(v_story_title, 'one of your contracted stories') || '. Open Editorial Feedback to read it and reply.',
    'ae-author-feedback.html', 'system');
  return jsonb_build_object('success', true, 'review_id', v_id);
end;
$function$;
revoke all on function public.ae_submit_editorial_review(uuid, text, text, text) from public, anon;
grant execute on function public.ae_submit_editorial_review(uuid, text, text, text) to authenticated;

create or replace function public.author_reply_ae_review(p_review_id uuid, p_reply text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_ae_user uuid;
begin
  if v_user is null or length(trim(coalesce(p_reply, ''))) < 2 then raise exception 'Please enter a reply.'; end if;
  update public.ae_editorial_reviews
  set author_reply = left(trim(p_reply), 3000), status = 'author_replied', updated_at = now()
  where id = p_review_id and author_id = v_user
  returning ae_user_id into v_ae_user;
  if not found then raise exception 'review_not_found'; end if;

  insert into public.notifications(user_id, actor_id, message, link, category)
  values (v_ae_user, null, 'An author has replied to your editorial feedback. Open your AE Workspace to review their response.', 'ae.html', 'system');
  return jsonb_build_object('success', true);
end;
$function$;
revoke all on function public.author_reply_ae_review(uuid, text) from public, anon;
grant execute on function public.author_reply_ae_review(uuid, text) to authenticated;
-- A person who is the subject of an AE report must not be able to inspect or action that report,
-- even if the same account also has admin or community-moderator privileges.

create or replace function public.moderator_get_ae_reports()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare v_user uuid := auth.uid(); v_result jsonb;
begin
  if v_user is null or (
    not exists (select 1 from public.profiles where id = v_user and role = 'admin')
    and not exists (select 1 from public.staff_assignments where user_id = v_user and role_key = 'community_moderator' and is_active = true)
  ) then raise exception 'not_authorized'; end if;

  select jsonb_agg(jsonb_build_object(
    'id', r.id, 'author_id', r.author_id, 'ae_user_id', r.ae_user_id,
    'author_name', coalesce(au.display_name, au.username, 'Author'),
    'ae_name', coalesce(ae.display_name, ae.username, 'AE'),
    'reason', r.reason, 'details', r.details, 'status', r.status,
    'decision_note', r.decision_note, 'created_at', r.created_at,
    'rating', f.rating, 'feedback', f.feedback
  ) order by r.created_at desc)
  into v_result
  from public.ae_author_reports r
  left join public.profiles au on au.id = r.author_id
  left join public.profiles ae on ae.id = r.ae_user_id
  left join public.ae_author_feedback f on f.id = r.feedback_id
  where r.ae_user_id <> v_user;
  return coalesce(v_result, '[]'::jsonb);
end;
$function$;
revoke all on function public.moderator_get_ae_reports() from public, anon;
grant execute on function public.moderator_get_ae_reports() to authenticated;

create or replace function public.moderator_update_ae_report(p_report_id uuid, p_status text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare v_user uuid := auth.uid(); v_report public.ae_author_reports%rowtype;
begin
  if v_user is null or (
    not exists (select 1 from public.profiles where id = v_user and role = 'admin')
    and not exists (select 1 from public.staff_assignments where user_id = v_user and role_key = 'community_moderator' and is_active = true)
  ) then raise exception 'not_authorized'; end if;
  if p_status is null or p_status not in ('in_review', 'actioned', 'dismissed') then raise exception 'invalid_status'; end if;
  select * into v_report from public.ae_author_reports where id = p_report_id for update;
  if v_report.id is null then raise exception 'report_not_found'; end if;
  if v_report.ae_user_id = v_user then raise exception 'cannot_review_report_about_yourself'; end if;

  update public.ae_author_reports set status = p_status, decision_note = left(coalesce(p_note, ''), 3000),
    updated_at = now(), resolved_at = case when p_status in ('actioned', 'dismissed') then now() else null end
  where id = p_report_id;
  insert into public.community_moderation_actions(moderator_id, content_type, content_id, action, note)
  values (v_user, 'acquisition_editor', p_report_id, p_status, left(coalesce(p_note, ''), 3000));
  if v_report.status is distinct from p_status or coalesce(v_report.decision_note, '') is distinct from coalesce(left(p_note, 3000), '') then
    insert into public.notifications(user_id, actor_id, message, link, category)
    values (v_report.author_id, null,
      case p_status when 'in_review' then 'The moderation team has started reviewing your Acquisition Editor report.'
        when 'actioned' then 'The moderation team has completed an action on your Acquisition Editor report.'
        else 'The moderation team has reviewed and closed your Acquisition Editor report.' end,
      'ae-author-feedback.html', 'system');
  end if;
  return jsonb_build_object('success', true);
end;
$function$;
revoke all on function public.moderator_update_ae_report(uuid, text, text) from public, anon;
grant execute on function public.moderator_update_ae_report(uuid, text, text) to authenticated;

-- Do not alert the reported AE through a second staff role (for example, if they are also an admin).
create or replace function public.author_report_ae(p_assignment_id uuid, p_reason text, p_details text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare v_user uuid := auth.uid(); v_assignment public.ae_author_assignments%rowtype; v_id uuid; v_feedback uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if length(trim(coalesce(p_reason, ''))) not between 3 and 120 or length(trim(coalesce(p_details, ''))) not between 10 and 3000 then raise exception 'invalid_report'; end if;
  select aa.* into v_assignment from public.ae_author_assignments aa
  where aa.id = p_assignment_id and aa.author_id = v_user and aa.ae_user_id <> v_user and aa.is_active = true
    and exists (select 1 from public.creator_contracts cc where cc.author_id = aa.author_id and cc.status = 'active'
      and cc.starts_at <= now() and (cc.ends_at is null or cc.ends_at >= now()))
    and exists (select 1 from public.staff_assignments sa join public.ae_applications ap on ap.user_id = sa.user_id and ap.status = 'approved'
      where sa.user_id = aa.ae_user_id and sa.role_key = 'acquisitions_editor' and sa.is_active = true);
  if not found then raise exception 'assignment_not_active'; end if;
  select id into v_feedback from public.ae_author_feedback where assignment_id = v_assignment.id;
  insert into public.ae_author_reports(assignment_id, author_id, ae_user_id, feedback_id, reason, details)
  values (v_assignment.id, v_user, v_assignment.ae_user_id, v_feedback, trim(p_reason), trim(p_details)) returning id into v_id;
  insert into public.notifications(user_id, actor_id, message, link, category)
  values (v_user, null, 'Your confidential report about an Acquisition Editor has been received by the moderation team.', 'ae-author-feedback.html', 'system');
  insert into public.notifications(user_id, actor_id, message, link, category)
  select recipients.user_id, null, 'A new confidential Acquisition Editor report needs review in the Moderator Dashboard.', 'moderator.html', 'system'
  from (
    select p.id as user_id from public.profiles p where p.role = 'admin'
    union
    select sa.user_id from public.staff_assignments sa where sa.role_key = 'community_moderator' and sa.is_active = true
  ) recipients
  where recipients.user_id <> v_user and recipients.user_id <> v_assignment.ae_user_id;
  return jsonb_build_object('success', true, 'report_id', v_id);
end;
$function$;
revoke all on function public.author_report_ae(uuid, text, text) from public, anon;
grant execute on function public.author_report_ae(uuid, text, text) to authenticated;
