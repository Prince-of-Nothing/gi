-- The Gathering: final connection and permission repair.
-- Run after BUILD-05-THE-GATHERING-MIGRATION.sql. Additive and rerunnable.
begin;

-- Ensure a member can see the community profile count without exposing profile details.
create or replace function public.community_member_count()
returns bigint language sql stable security definer set search_path=public,auth
as $$ select count(*)::bigint from public.community_profiles where is_public=true $$;

-- Create a circle and its owner membership atomically; the browser cannot self-assign owner privileges.
create or replace function public.community_create_circle(
 p_name text,p_description text,p_visibility text,p_reading_theme text,p_schedule text default null
) returns uuid language plpgsql security definer set search_path=public,auth
as $$ declare new_id uuid; begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if length(trim(coalesce(p_name,''))) not between 3 and 120 then raise exception 'Circle name must be 3–120 characters'; end if;
 if length(trim(coalesce(p_description,''))) not between 1 and 3000 then raise exception 'Add a short circle description'; end if;
 if p_visibility not in ('public','private') then raise exception 'Invalid circle visibility'; end if;
 insert into public.reading_circles(owner_id,name,description,visibility,reading_theme,schedule)
 values(auth.uid(),trim(p_name),trim(p_description),p_visibility,left(trim(coalesce(p_reading_theme,'')),240),nullif(trim(coalesce(p_schedule,'')),'')) returning id into new_id;
 insert into public.reading_circle_members(circle_id,user_id,role,status) values(new_id,auth.uid(),'owner','active')
 on conflict(circle_id,user_id) do update set role='owner',status='active';
 return new_id;
end $$;

-- Circle joining returns a precise state and never grants membership in a private circle automatically.
create or replace function public.community_join_circle(p_circle_id uuid) returns text
language plpgsql security definer set search_path=public,auth
as $$ declare v text; begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select visibility into v from public.reading_circles where id=p_circle_id and status='active';
 if not found then raise exception 'Circle not found'; end if;
 insert into public.reading_circle_members(circle_id,user_id,role,status)
 values(p_circle_id,auth.uid(),'member',case when v='public' then 'active' else 'requested' end)
 on conflict(circle_id,user_id) do update set status=case when v='public' then 'active' else 'requested' end
 where reading_circle_members.status in ('left','removed');
 return case when v='public' then 'joined' else 'requested' end;
end $$;

-- Add safe read access for active public content and keep private submissions/report details owner-only.
-- Existing policies are dropped by their exact names to make this repair rerunnable.
drop policy if exists community_profile_read on public.community_profiles;
create policy community_profile_read on public.community_profiles for select to authenticated
 using (is_public or user_id=auth.uid());
drop policy if exists community_profile_write on public.community_profiles;
create policy community_profile_write on public.community_profiles for insert to authenticated
 with check(user_id=auth.uid());
drop policy if exists community_profile_update on public.community_profiles;
create policy community_profile_update on public.community_profiles for update to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists community_discussion_update on public.community_discussions;
create policy community_discussion_update on public.community_discussions for update to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists community_comment_update on public.community_comments;
create policy community_comment_update on public.community_comments for update to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists community_circle_owner_update on public.reading_circles;
create policy community_circle_owner_update on public.reading_circles for update to authenticated
 using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists community_circle_member_read on public.reading_circle_members;
create policy community_circle_member_read on public.reading_circle_members for select to authenticated
 using(user_id=auth.uid() or exists(select 1 from public.reading_circle_members m where m.circle_id=reading_circle_members.circle_id and m.user_id=auth.uid() and m.role in ('owner','moderator') and m.status='active'));
drop policy if exists community_circle_post_read on public.reading_circle_posts;
create policy community_circle_post_read on public.reading_circle_posts for select to authenticated
 using(exists(select 1 from public.reading_circle_members m where m.circle_id=reading_circle_posts.circle_id and m.user_id=auth.uid() and m.status='active'));
drop policy if exists community_circle_post_insert on public.reading_circle_posts;
create policy community_circle_post_insert on public.reading_circle_posts for insert to authenticated
 with check(user_id=auth.uid() and exists(select 1 from public.reading_circle_members m where m.circle_id=reading_circle_posts.circle_id and m.user_id=auth.uid() and m.status='active'));
drop policy if exists community_prompt_read on public.community_prompts;
create policy community_prompt_read on public.community_prompts for select to authenticated
 using(status='published' or created_by=auth.uid());
drop policy if exists community_prompt_submission_read on public.community_prompt_submissions;
create policy community_prompt_submission_read on public.community_prompt_submissions for select to authenticated
 using(user_id=auth.uid() or exists(select 1 from public.community_prompts p where p.id=prompt_id and p.created_by=auth.uid()));
drop policy if exists community_feature_read on public.community_features;
create policy community_feature_read on public.community_features for select to authenticated using(status='published');
drop policy if exists community_report_owner_read on public.community_reports;
create policy community_report_owner_read on public.community_reports for select to authenticated
 using(reporter_id=auth.uid() or coalesce((public.community_my_permissions()->>'is_moderator')::boolean,false) or coalesce((public.community_my_permissions()->>'is_admin')::boolean,false));

-- Helper functions must not be callable by anonymous users.
revoke all on function public.community_my_permissions() from public,anon;
revoke all on function public.community_join_circle(uuid) from public,anon;
revoke all on function public.community_create_circle(text,text,text,text,text) from public,anon;
revoke all on function public.community_member_count() from public,anon;
grant execute on function public.community_my_permissions() to authenticated;
grant execute on function public.community_join_circle(uuid) to authenticated;
grant execute on function public.community_create_circle(text,text,text,text,text) to authenticated;
grant execute on function public.community_member_count() to authenticated;
-- Admin-managed prompts and curated features.
create or replace function public.community_publish_prompt(p_title text,p_description text,p_prompt_type text,p_deadline timestamptz default null)
returns uuid language plpgsql security definer set search_path=public,auth
as $$ declare r text; new_id uuid; begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select role into r from public.profiles where id=auth.uid();
 if r is distinct from 'admin' then raise exception 'Admin permission required'; end if;
 if p_prompt_type not in ('writing','reading','character','discussion') then raise exception 'Invalid prompt type'; end if;
 insert into public.community_prompts(created_by,title,description,prompt_type,deadline,status)
 values(auth.uid(),left(trim(p_title),180),left(trim(p_description),5000),p_prompt_type,p_deadline,'published') returning id into new_id;
 return new_id;
end $$;
create or replace function public.community_publish_feature(p_feature_type text,p_title text,p_body text,p_content_id uuid default null)
returns uuid language plpgsql security definer set search_path=public,auth
as $$ declare r text; new_id uuid; begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select role into r from public.profiles where id=auth.uid();
 if r is distinct from 'admin' then raise exception 'Admin permission required'; end if;
 if p_feature_type not in ('author','discussion','circle','prompt','contribution') then raise exception 'Invalid feature type'; end if;
 insert into public.community_features(feature_type,content_id,title,body,selected_by,status)
 values(p_feature_type,p_content_id,left(trim(p_title),180),left(trim(p_body),5000),auth.uid(),'published') returning id into new_id;
 return new_id;
end $$;
revoke all on function public.community_publish_prompt(text,text,text,timestamptz) from public,anon;
revoke all on function public.community_publish_feature(text,text,text,uuid) from public,anon;
grant execute on function public.community_publish_prompt(text,text,text,timestamptz) to authenticated;
grant execute on function public.community_publish_feature(text,text,text,uuid) to authenticated;

-- Avoid recursive RLS lookups when checking private-circle membership and staff access.
create or replace function public.community_is_circle_member(p_circle_id uuid)
returns boolean language sql stable security definer set search_path=public,auth
as $$ select exists(select 1 from public.reading_circle_members m where m.circle_id=p_circle_id and m.user_id=auth.uid() and m.status='active') $$;
create or replace function public.community_is_circle_staff(p_circle_id uuid)
returns boolean language sql stable security definer set search_path=public,auth
as $$ select exists(select 1 from public.reading_circle_members m where m.circle_id=p_circle_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','moderator')) $$;
drop policy if exists circle_read_access on public.reading_circles;
create policy circle_read_access on public.reading_circles for select to authenticated
using(visibility='public' or owner_id=auth.uid() or public.community_is_circle_member(id));
drop policy if exists circle_member_read on public.reading_circle_members;
create policy circle_member_read on public.reading_circle_members for select to authenticated
using(user_id=auth.uid() or public.community_is_circle_staff(circle_id));
drop policy if exists circle_post_read on public.reading_circle_posts;
create policy circle_post_read on public.reading_circle_posts for select to authenticated
using(public.community_is_circle_member(circle_id));
drop policy if exists circle_post_insert on public.reading_circle_posts;
create policy circle_post_insert on public.reading_circle_posts for insert to authenticated
with check(user_id=auth.uid() and public.community_is_circle_member(circle_id));
drop policy if exists circle_milestone_read on public.reading_circle_milestones;
create policy circle_milestone_read on public.reading_circle_milestones for select to authenticated
using(public.community_is_circle_member(circle_id));
drop policy if exists community_circle_milestone_insert on public.reading_circle_milestones;
create policy community_circle_milestone_insert on public.reading_circle_milestones for insert to authenticated
with check(public.community_is_circle_staff(circle_id));
drop policy if exists community_prompt_submission_update on public.community_prompt_submissions;
create policy community_prompt_submission_update on public.community_prompt_submissions for update to authenticated
using(user_id=auth.uid() and exists(select 1 from public.community_prompts p where p.id=prompt_id and p.status='published' and (p.deadline is null or p.deadline>now())))
with check(user_id=auth.uid() and exists(select 1 from public.community_prompts p where p.id=prompt_id and p.status='published' and (p.deadline is null or p.deadline>now())));
revoke all on function public.community_is_circle_member(uuid) from public,anon;
revoke all on function public.community_is_circle_staff(uuid) from public,anon;
grant execute on function public.community_is_circle_member(uuid) to authenticated;
grant execute on function public.community_is_circle_staff(uuid) to authenticated;
commit;
