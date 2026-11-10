-- The Gathering workflow completion: staff permissions, circle requests and moderation actions.
-- Additive, transactional and safe to re-run.
begin;

-- Moderators are managed through staff_assignments, not profiles.role.
create or replace function public.community_my_permissions()
returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,public,auth
as $$
declare is_admin boolean; is_mod boolean;
begin
 if auth.uid() is null then
  return jsonb_build_object('is_moderator',false,'is_admin',false);
 end if;
 select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') into is_admin;
 select exists(select 1 from public.staff_assignments s where s.user_id=auth.uid() and s.role_key='community_moderator' and s.is_active=true) into is_mod;
 return jsonb_build_object('is_moderator',is_mod or is_admin,'is_admin',is_admin);
end $$;

-- Keep moderation-field protection aligned with the staff assignment model.
create or replace function public.community_guard_discussion_update()
returns trigger language plpgsql
set search_path=pg_catalog,public,auth
as $$
declare allowed boolean;
begin
 select coalesce((public.community_my_permissions()->>'is_moderator')::boolean,false)
   or coalesce((public.community_my_permissions()->>'is_admin')::boolean,false)
 into allowed;
 if not allowed and (new.is_pinned is distinct from old.is_pinned
   or new.is_locked is distinct from old.is_locked
   or new.status is distinct from old.status) then
  raise exception 'Only community moderators can change moderation fields';
 end if;
 return new;
end $$;

-- Public community reaction summaries can be read; each member can still mutate only their own row.
drop policy if exists community_reaction_public_read on public.community_reactions;
create policy community_reaction_public_read on public.community_reactions
 for select to authenticated using(true);

-- Circle owners/moderators can approve or reject requests without exposing a direct client-side role update.
create or replace function public.community_manage_circle_request(
 p_circle_id uuid,p_user_id uuid,p_decision text
) returns text language plpgsql security definer
set search_path=pg_catalog,public,auth
as $$
declare allowed boolean;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select public.community_is_circle_staff(p_circle_id) into allowed;
 if not coalesce(allowed,false) then raise exception 'Circle staff permission required'; end if;
 if p_decision not in ('approve','reject') then raise exception 'Invalid request decision'; end if;
 update public.reading_circle_members
 set status=case when p_decision='approve' then 'active' else 'removed' end,
     role='member'
 where circle_id=p_circle_id and user_id=p_user_id and status='requested';
 if not found then raise exception 'Pending membership request not found'; end if;
 return case when p_decision='approve' then 'approved' else 'rejected' end;
end $$;

create or replace function public.community_leave_circle(p_circle_id uuid)
returns void language plpgsql security definer
set search_path=pg_catalog,public,auth
as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 update public.reading_circle_members set status='left'
 where circle_id=p_circle_id and user_id=auth.uid() and role<>'owner' and status='active';
 if not found then raise exception 'Active circle membership not found'; end if;
end $$;

-- A moderation action changes the reported content and records the decision atomically.
create or replace function public.community_moderate_content(
 p_report_id uuid,p_content_type text,p_content_id uuid,p_action text,p_note text default ''
) returns void language plpgsql security definer
set search_path=pg_catalog,public,auth
as $$
declare allowed boolean; report_ok boolean;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select coalesce((public.community_my_permissions()->>'is_moderator')::boolean,false)
   or coalesce((public.community_my_permissions()->>'is_admin')::boolean,false) into allowed;
 if not coalesce(allowed,false) then raise exception 'Moderator permission required'; end if;
 select exists(select 1 from public.community_reports r where r.id=p_report_id
   and r.content_type=p_content_type and r.content_id=p_content_id) into report_ok;
 if not report_ok then raise exception 'Report does not match the content'; end if;
 if p_content_type='discussion' then
  if p_action='hide' then update public.community_discussions set status='removed' where id=p_content_id;
  elsif p_action='restore' then update public.community_discussions set status='published' where id=p_content_id;
  elsif p_action='lock' then update public.community_discussions set is_locked=true where id=p_content_id;
  elsif p_action='unlock' then update public.community_discussions set is_locked=false where id=p_content_id;
  else raise exception 'Unsupported discussion action'; end if;
  if not found then raise exception 'Discussion not found'; end if;
 elsif p_content_type='comment' then
  if p_action='hide' then update public.community_comments set status='hidden' where id=p_content_id;
  elsif p_action='restore' then update public.community_comments set status='published' where id=p_content_id;
  else raise exception 'Comments can only be hidden or restored'; end if;
  if not found then raise exception 'Comment not found'; end if;
 else
  raise exception 'This content type is not supported by moderation actions yet';
 end if;
 update public.community_reports set status='actioned',decision_note=left(coalesce(p_note,''),1000),assigned_to=auth.uid(),resolved_at=now() where id=p_report_id;
 insert into public.community_moderation_actions(moderator_id,report_id,content_type,content_id,action,note)
 values(auth.uid(),p_report_id,p_content_type,p_content_id,p_action,left(coalesce(p_note,''),1000));
end $$;

revoke all on function public.community_my_permissions() from public,anon;
revoke all on function public.community_manage_circle_request(uuid,uuid,text) from public,anon;
revoke all on function public.community_leave_circle(uuid) from public,anon;
revoke all on function public.community_moderate_content(uuid,text,uuid,text,text) from public,anon;
grant execute on function public.community_my_permissions() to authenticated;
grant execute on function public.community_manage_circle_request(uuid,uuid,text) to authenticated;
grant execute on function public.community_leave_circle(uuid) to authenticated;
grant execute on function public.community_moderate_content(uuid,text,uuid,text,text) to authenticated;
commit;
