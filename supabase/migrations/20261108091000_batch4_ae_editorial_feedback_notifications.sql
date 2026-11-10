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
