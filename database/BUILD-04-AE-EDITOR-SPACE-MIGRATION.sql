-- GidiReads Build 4: AE applications, approval, author assignments and scoped workspace.
-- Additive only. Review before applying after the approved V5 deployment.

insert into public.staff_roles(role_key,label,description,is_assignable)
values ('acquisitions_editor','Acquisitions & Developmental Editor','Reviews assigned contracted stories, supports authors, scouts writers and recommends promotions. Cannot approve contracts, payments or final public promotions.',true)
on conflict(role_key) do update set label=excluded.label,description=excluded.description,is_assignable=true;
insert into public.staff_role_capabilities(role_key,capability_key) values
('acquisitions_editor','ae.workspace.read'),('acquisitions_editor','ae.authors.read'),('acquisitions_editor','ae.editorial.recommend'),('acquisitions_editor','ae.scouting.manage'),('acquisitions_editor','ae.promotions.recommend') on conflict do nothing;

create table if not exists public.ae_applications(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 answers jsonb not null check(jsonb_typeof(answers)='object'), status text not null default 'in_review' check(status in ('in_review','approved','rejected')),
 admin_note text, reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz,
 submitted_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists ae_one_pending_application_per_user on public.ae_applications(user_id) where status='in_review';
create table if not exists public.ae_author_assignments(
 id uuid primary key default gen_random_uuid(), ae_user_id uuid not null references public.profiles(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade, assigned_by uuid references public.profiles(id) on delete set null,
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(ae_user_id,author_id)
);
create index if not exists ae_assignments_author_idx on public.ae_author_assignments(author_id) where is_active=true;
alter table public.ae_applications enable row level security;
alter table public.ae_author_assignments enable row level security;
revoke all on public.ae_applications,public.ae_author_assignments from anon,authenticated;
grant select on public.ae_applications,public.ae_author_assignments to authenticated;
drop policy if exists ae_applicant_or_admin_read on public.ae_applications;
drop policy if exists ae_applicant_or_admin_read on public.ae_applications;
create policy ae_applicant_or_admin_read on public.ae_applications for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists ae_assignment_admin_or_self_read on public.ae_author_assignments;
drop policy if exists ae_assignment_admin_or_self_read on public.ae_author_assignments;
create policy ae_assignment_admin_or_self_read on public.ae_author_assignments for select to authenticated using(ae_user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

create or replace function public.submit_ae_application(p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
 if v_user is null then raise exception 'sign_in_required'; end if;
 if jsonb_typeof(p_answers)<>'object' or length(coalesce(p_answers->>'experience',''))<30 or length(coalesce(p_answers->>'approach',''))<40 or length(coalesce(p_answers->>'platform_understanding',''))<30 or length(coalesce(p_answers->>'sample_feedback',''))<30 or coalesce(p_answers->>'availability','')='' then raise exception 'Please answer all required questions.'; end if;
 if exists(select 1 from public.staff_assignments where user_id=v_user and role_key='acquisitions_editor' and is_active=true) then raise exception 'This account already has AE access.'; end if;
 insert into public.ae_applications(user_id,answers) values(v_user,p_answers) returning id into v_id;
 return jsonb_build_object('success',true,'application_id',v_id);
exception when unique_violation then raise exception 'already_applied';
end $$;
revoke all on function public.submit_ae_application(jsonb) from public,anon;
grant execute on function public.submit_ae_application(jsonb) to authenticated;

create or replace function public.admin_review_ae_application(p_application_id uuid,p_status text,p_note text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_admin uuid:=auth.uid(); v_app public.ae_applications%rowtype;
begin
 if not exists(select 1 from public.profiles where id=v_admin and role='admin') then raise exception 'not_authorized'; end if;
 if p_status not in ('in_review','approved','rejected') then raise exception 'invalid_status'; end if;
 select * into v_app from public.ae_applications where id=p_application_id for update;
 if v_app.id is null then raise exception 'application_not_found'; end if;
 update public.ae_applications set status=p_status,admin_note=nullif(left(trim(coalesce(p_note,'')),2000),''),reviewed_by=v_admin,reviewed_at=now(),updated_at=now() where id=p_application_id;
 if p_status='approved' then
  insert into public.staff_assignments(user_id,role_key,assigned_by,is_active,updated_at) values(v_app.user_id,'acquisitions_editor',v_admin,true,now()) on conflict(user_id,role_key) do update set assigned_by=excluded.assigned_by,is_active=true,updated_at=now();
 elsif p_status='rejected' then
  update public.staff_assignments set is_active=false,assigned_by=v_admin,updated_at=now() where user_id=v_app.user_id and role_key='acquisitions_editor';
 end if;
 return jsonb_build_object('success',true,'status',p_status,'user_id',v_app.user_id);
end $$;
revoke all on function public.admin_review_ae_application(uuid,text,text) from public,anon;
grant execute on function public.admin_review_ae_application(uuid,text,text) to authenticated;

create or replace function public.admin_assign_ae_author(p_ae_user_id uuid,p_author_id uuid,p_active boolean default true)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_admin uuid:=auth.uid();
begin
 if not exists(select 1 from public.profiles where id=v_admin and role='admin') then raise exception 'not_authorized'; end if;
 if p_active and not exists(select 1 from public.staff_assignments where user_id=p_ae_user_id and role_key='acquisitions_editor' and is_active=true) then raise exception 'ae_not_approved'; end if;
 if p_active and not exists(select 1 from public.creator_contracts where author_id=p_author_id and status='active') then raise exception 'author_has_no_active_contract'; end if;
 insert into public.ae_author_assignments(ae_user_id,author_id,assigned_by,is_active,updated_at) values(p_ae_user_id,p_author_id,v_admin,p_active,now()) on conflict(ae_user_id,author_id) do update set assigned_by=v_admin,is_active=excluded.is_active,updated_at=now();
 return jsonb_build_object('success',true,'active',p_active);
end $$;
revoke all on function public.admin_assign_ae_author(uuid,uuid,boolean) from public,anon;
grant execute on function public.admin_assign_ae_author(uuid,uuid,boolean) to authenticated;

create or replace function public.ae_get_workspace()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,auth as $$
declare v_user uuid:=auth.uid(); v_result jsonb;
begin
 if v_user is null or not exists(select 1 from public.staff_assignments where user_id=v_user and role_key='acquisitions_editor' and is_active=true) then raise exception 'not_authorized'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('story_id',s.id,'story_title',s.title,'author_id',p.id,'author_name',coalesce(p.display_name,p.username,'GidiReads author'),'contract_type',cc.contract_type,'contract_status',cc.status,'chapter_count',coalesce(ch.chapter_count,0),'word_count',coalesce(ch.word_count,0)) order by s.title),'[]'::jsonb) into v_result
 from public.ae_author_assignments aa join public.creator_contracts cc on cc.author_id=aa.author_id and cc.status='active'
 join public.stories s on s.id=cc.story_id join public.profiles p on p.id=aa.author_id
 left join lateral(select count(*) filter(where c.is_published=true) as chapter_count,coalesce(sum(array_length(regexp_split_to_array(trim(coalesce(c.content,'')),'\s+'),1)) filter(where c.is_published=true),0) as word_count from public.chapters c where c.story_id=s.id) ch on true
 where aa.ae_user_id=v_user and aa.is_active=true;
 return v_result;
end $$;
revoke all on function public.ae_get_workspace() from public,anon;
grant execute on function public.ae_get_workspace() to authenticated;

-- Admin-only application listing is protected by RLS. AEs receive only assigned contracted story summaries via the RPC.
notify pgrst,'reload schema';

-- Editorial work, scouting leads and promotion recommendations.
create table if not exists public.ae_editorial_reviews(
 id uuid primary key default gen_random_uuid(), ae_user_id uuid not null references public.profiles(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade, story_id uuid not null references public.stories(id) on delete cascade,
 review_type text not null default 'developmental' check(review_type in ('developmental','chapter','continuity')),
 focus text not null, feedback text not null check(length(trim(feedback)) between 40 and 6000), status text not null default 'sent' check(status in ('draft','sent','author_replied','resolved')),
 author_reply text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ae_reviews_story_idx on public.ae_editorial_reviews(story_id,created_at desc);
create table if not exists public.ae_scouting_leads(
 id uuid primary key default gen_random_uuid(), ae_user_id uuid not null references public.profiles(id) on delete cascade,
 pen_name text not null, platform text not null, profile_url text, contact_method text, notes text,
 status text not null default 'discovered' check(status in ('discovered','contacted','interested','onboarding','joined','declined','unresponsive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ae_promotion_recommendations(
 id uuid primary key default gen_random_uuid(), ae_user_id uuid not null references public.profiles(id) on delete cascade,
 story_id uuid not null references public.stories(id) on delete cascade, placement text not null check(placement in ('homepage','explore','collection','campaign','author_spotlight')),
 reason text not null check(length(trim(reason)) between 30 and 2000), status text not null default 'pending' check(status in ('pending','approved','rejected','withdrawn')),
 admin_note text, reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.ae_editorial_reviews enable row level security;
alter table public.ae_scouting_leads enable row level security;
alter table public.ae_promotion_recommendations enable row level security;
revoke all on public.ae_editorial_reviews,public.ae_scouting_leads,public.ae_promotion_recommendations from anon,authenticated;
grant select on public.ae_editorial_reviews,public.ae_scouting_leads,public.ae_promotion_recommendations to authenticated;
drop policy if exists ae_review_parties_read on public.ae_editorial_reviews;
create policy ae_review_parties_read on public.ae_editorial_reviews for select to authenticated using(ae_user_id=(select auth.uid()) or author_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists ae_scouting_owner_read on public.ae_scouting_leads;
create policy ae_scouting_owner_read on public.ae_scouting_leads for select to authenticated using(ae_user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists ae_promotion_parties_read on public.ae_promotion_recommendations;
create policy ae_promotion_parties_read on public.ae_promotion_recommendations for select to authenticated using(ae_user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

create or replace function public.ae_get_story_review(p_story_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,auth as $$
declare v_user uuid:=auth.uid(); v_result jsonb;
begin
 if v_user is null or not exists(select 1 from public.ae_author_assignments aa join public.creator_contracts cc on cc.author_id=aa.author_id and cc.story_id=p_story_id and cc.status='active' where aa.ae_user_id=v_user and aa.is_active=true) then raise exception 'not_authorized'; end if;
 select jsonb_build_object('story',jsonb_build_object('id',s.id,'title',s.title,'author_id',p.id,'author_name',coalesce(p.display_name,p.username,'Author')),'chapters',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'chapter_number',c.chapter_number,'title',c.title,'content',c.content,'word_count',array_length(regexp_split_to_array(trim(coalesce(c.content,'')),'\s+'),1)) order by c.chapter_number) from public.chapters c where c.story_id=s.id and c.is_published=true),'[]'::jsonb),'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from public.ae_editorial_reviews r where r.story_id=s.id),'[]'::jsonb)) into v_result
 from public.stories s join public.profiles p on p.id=s.author_id where s.id=p_story_id;
 if v_result is null then raise exception 'story_not_found'; end if; return v_result;
end $$;
revoke all on function public.ae_get_story_review(uuid) from public,anon; grant execute on function public.ae_get_story_review(uuid) to authenticated;

create or replace function public.ae_submit_editorial_review(p_story_id uuid,p_type text,p_focus text,p_feedback text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_user uuid:=auth.uid(); v_author uuid; v_id uuid;
begin
 if v_user is null or not exists(select 1 from public.staff_assignments where user_id=v_user and role_key='acquisitions_editor' and is_active=true) then raise exception 'not_authorized'; end if;
 select aa.author_id into v_author from public.ae_author_assignments aa join public.creator_contracts cc on cc.author_id=aa.author_id and cc.story_id=p_story_id and cc.status='active' where aa.ae_user_id=v_user and aa.is_active=true limit 1;
 if v_author is null then raise exception 'story_not_assigned'; end if;
 if p_type not in ('developmental','chapter','continuity') or length(trim(coalesce(p_focus,'')))<3 or length(trim(coalesce(p_feedback,'')))<40 then raise exception 'Please add a clear focus and at least 40 characters of feedback.'; end if;
 insert into public.ae_editorial_reviews(ae_user_id,author_id,story_id,review_type,focus,feedback,status) values(v_user,v_author,p_story_id,p_type,left(trim(p_focus),120),left(trim(p_feedback),6000),'sent') returning id into v_id;
 return jsonb_build_object('success',true,'review_id',v_id);
end $$;
revoke all on function public.ae_submit_editorial_review(uuid,text,text,text) from public,anon; grant execute on function public.ae_submit_editorial_review(uuid,text,text,text) to authenticated;

create or replace function public.ae_save_scouting_lead(p_id uuid,p_pen_name text,p_platform text,p_url text,p_contact text,p_notes text,p_status text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
 if v_user is null or not exists(select 1 from public.staff_assignments where user_id=v_user and role_key='acquisitions_editor' and is_active=true) then raise exception 'not_authorized'; end if;
 if length(trim(coalesce(p_pen_name,'')))<2 or length(trim(coalesce(p_platform,'')))<2 or p_status not in ('discovered','contacted','interested','onboarding','joined','declined','unresponsive') then raise exception 'Please add the writer name, platform and a valid status.'; end if;
 if p_id is null then insert into public.ae_scouting_leads(ae_user_id,pen_name,platform,profile_url,contact_method,notes,status) values(v_user,left(trim(p_pen_name),160),left(trim(p_platform),120),nullif(left(trim(coalesce(p_url,'')),500),''),nullif(left(trim(coalesce(p_contact,'')),300),''),nullif(left(trim(coalesce(p_notes,'')),2000),''),p_status) returning id into v_id;
 else update public.ae_scouting_leads set pen_name=left(trim(p_pen_name),160),platform=left(trim(p_platform),120),profile_url=nullif(left(trim(coalesce(p_url,'')),500),''),contact_method=nullif(left(trim(coalesce(p_contact,'')),300),''),notes=nullif(left(trim(coalesce(p_notes,'')),2000),''),status=p_status,updated_at=now() where id=p_id and ae_user_id=v_user returning id into v_id; if v_id is null then raise exception 'lead_not_found'; end if; end if;
 return jsonb_build_object('success',true,'lead_id',v_id);
end $$;
revoke all on function public.ae_save_scouting_lead(uuid,text,text,text,text,text,text) from public,anon; grant execute on function public.ae_save_scouting_lead(uuid,text,text,text,text,text,text) to authenticated;

create or replace function public.ae_recommend_promotion(p_story_id uuid,p_placement text,p_reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
 if v_user is null or not exists(select 1 from public.staff_assignments where user_id=v_user and role_key='acquisitions_editor' and is_active=true) then raise exception 'not_authorized'; end if;
 if not exists(select 1 from public.ae_author_assignments aa join public.creator_contracts cc on cc.author_id=aa.author_id and cc.story_id=p_story_id and cc.status='active' where aa.ae_user_id=v_user and aa.is_active=true) then raise exception 'story_not_assigned'; end if;
 if p_placement not in ('homepage','explore','collection','campaign','author_spotlight') or length(trim(coalesce(p_reason,'')))<30 then raise exception 'Please choose a placement and explain your recommendation.'; end if;
 insert into public.ae_promotion_recommendations(ae_user_id,story_id,placement,reason) values(v_user,p_story_id,p_placement,left(trim(p_reason),2000)) returning id into v_id;
 return jsonb_build_object('success',true,'recommendation_id',v_id);
end $$;
revoke all on function public.ae_recommend_promotion(uuid,text,text) from public,anon; grant execute on function public.ae_recommend_promotion(uuid,text,text) to authenticated;

create or replace function public.admin_review_ae_promotion(p_id uuid,p_status text,p_note text default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_admin uuid:=auth.uid();
begin
 if not exists(select 1 from public.profiles where id=v_admin and role='admin') then raise exception 'not_authorized'; end if;
 if p_status not in ('approved','rejected') then raise exception 'invalid_status'; end if;
 update public.ae_promotion_recommendations set status=p_status,admin_note=nullif(left(trim(coalesce(p_note,'')),1500),''),reviewed_by=v_admin,reviewed_at=now() where id=p_id;
 if not found then raise exception 'recommendation_not_found'; end if;
 return jsonb_build_object('success',true,'status',p_status);
end $$;
revoke all on function public.admin_review_ae_promotion(uuid,text,text) from public,anon; grant execute on function public.admin_review_ae_promotion(uuid,text,text) to authenticated;

create or replace function public.ae_get_performance() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,auth as $$
declare v_user uuid:=auth.uid(); v_result jsonb;
begin
 if v_user is null or not exists(select 1 from public.staff_assignments where user_id=v_user and role_key='acquisitions_editor' and is_active=true) then raise exception 'not_authorized'; end if;
 select jsonb_build_object('assigned_authors',(select count(*) from public.ae_author_assignments where ae_user_id=v_user and is_active=true),'reviews_sent',(select count(*) from public.ae_editorial_reviews where ae_user_id=v_user and status<>'draft'),'leads',(select count(*) from public.ae_scouting_leads where ae_user_id=v_user),'promotions_pending',(select count(*) from public.ae_promotion_recommendations where ae_user_id=v_user and status='pending'),'promotions_approved',(select count(*) from public.ae_promotion_recommendations where ae_user_id=v_user and status='approved')) into v_result;
 return v_result;
end $$;
revoke all on function public.ae_get_performance() from public,anon; grant execute on function public.ae_get_performance() to authenticated;

-- Authors can reply to feedback on their own assigned stories; they cannot edit the review.
create or replace function public.author_reply_ae_review(p_review_id uuid,p_reply text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or length(trim(coalesce(p_reply,'')))<2 then raise exception 'Please enter a reply.'; end if;
 update public.ae_editorial_reviews set author_reply=left(trim(p_reply),3000),status='author_replied',updated_at=now() where id=p_review_id and author_id=v_user;
 if not found then raise exception 'review_not_found'; end if;
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.author_reply_ae_review(uuid,text) from public,anon; grant execute on function public.author_reply_ae_review(uuid,text) to authenticated;

notify pgrst,'reload schema';
