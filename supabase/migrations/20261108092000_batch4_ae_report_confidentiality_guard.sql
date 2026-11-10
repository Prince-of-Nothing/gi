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
