-- GidiReads staff roles and moderation capabilities. Additive migration; preserves existing admin checks.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.staff_roles (
  role_key text primary key,
  label text not null,
  description text not null default '',
  is_assignable boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_role_capabilities (
  role_key text not null references public.staff_roles(role_key) on delete cascade,
  capability_key text not null,
  primary key (role_key, capability_key)
);

create table if not exists public.staff_assignments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null references public.staff_roles(role_key) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, role_key)
);

insert into public.staff_roles(role_key,label,description,is_assignable)
values ('community_moderator','Community Moderator','Handles community safety reports and permitted moderation actions. Does not have access to contracts, earnings, financial settings, or owner-only platform controls.',true)
on conflict (role_key) do update set label=excluded.label, description=excluded.description, is_assignable=excluded.is_assignable;

insert into public.staff_role_capabilities(role_key,capability_key) values
('community_moderator','moderation.reports.read'),
('community_moderator','moderation.reports.manage')
on conflict do nothing;

alter table public.staff_roles enable row level security;
alter table public.staff_role_capabilities enable row level security;
alter table public.staff_assignments enable row level security;

revoke all on public.staff_roles, public.staff_role_capabilities, public.staff_assignments from anon, authenticated;
grant select on public.staff_roles, public.staff_role_capabilities, public.staff_assignments to authenticated;

drop policy if exists staff_roles_owner_read on public.staff_roles;
create policy staff_roles_owner_read on public.staff_roles for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists staff_capabilities_owner_read on public.staff_role_capabilities;
create policy staff_capabilities_owner_read on public.staff_role_capabilities for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists staff_assignments_owner_or_self_read on public.staff_assignments;
create policy staff_assignments_owner_or_self_read on public.staff_assignments for select to authenticated
using (user_id=(select auth.uid()) or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

create or replace function private.has_staff_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.staff_assignments a
    join public.staff_role_capabilities c on c.role_key=a.role_key
    where a.user_id=auth.uid() and a.is_active=true and c.capability_key=p_capability
  );
$$;
revoke all on function private.has_staff_capability(text) from public, anon;
grant execute on function private.has_staff_capability(text) to authenticated;

drop policy if exists reports_moderator_read on public.reports;
create policy reports_moderator_read on public.reports for select to authenticated
using (private.has_staff_capability('moderation.reports.read'));

create or replace function public.admin_set_staff_assignment(p_user_id uuid, p_role_key text, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, private
as $$
declare v_actor uuid := auth.uid(); v_target_role text;
begin
  if v_actor is null or not exists (select 1 from public.profiles p where p.id=v_actor and p.role='admin') then
    return jsonb_build_object('success',false,'reason','not_authorized');
  end if;
  if p_user_id is null or p_role_key is null or p_active is null then
    return jsonb_build_object('success',false,'reason','invalid_arguments');
  end if;
  select p.role into v_target_role from public.profiles p where p.id=p_user_id;
  if v_target_role is null then return jsonb_build_object('success',false,'reason','user_not_found'); end if;
  if v_target_role='admin' then return jsonb_build_object('success',false,'reason','cannot_assign_staff_role_to_owner'); end if;
  if not exists (select 1 from public.staff_roles r where r.role_key=p_role_key and r.is_assignable=true) then
    return jsonb_build_object('success',false,'reason','role_not_assignable');
  end if;
  if p_active then
    update public.staff_assignments set is_active=false,updated_at=now() where user_id=p_user_id and role_key<>p_role_key and is_active=true;
    insert into public.staff_assignments(user_id,role_key,assigned_by,is_active,updated_at)
    values(p_user_id,p_role_key,v_actor,true,now())
    on conflict(user_id,role_key) do update set assigned_by=excluded.assigned_by,is_active=true,updated_at=now();
  else
    update public.staff_assignments set is_active=false,assigned_by=v_actor,updated_at=now()
    where user_id=p_user_id and role_key=p_role_key;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,reason)
  values(v_actor,case when p_active then 'staff_role_assigned' else 'staff_role_removed' end,'staff_assignment',p_user_id,p_role_key);
  return jsonb_build_object('success',true,'user_id',p_user_id,'role_key',p_role_key,'is_active',p_active);
end;
$$;
revoke all on function public.admin_set_staff_assignment(uuid,text,boolean) from public, anon;
grant execute on function public.admin_set_staff_assignment(uuid,text,boolean) to authenticated;

create or replace function public.moderate_report(p_report_id uuid, p_status text, p_note text default null, p_action_taken text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, private
as $$
declare v_actor uuid := auth.uid(); v_is_admin boolean; v_allowed boolean; v_report public.reports%rowtype;
begin
  if v_actor is null then return jsonb_build_object('success',false,'reason','not_authenticated'); end if;
  select exists(select 1 from public.profiles p where p.id=v_actor and p.role='admin') into v_is_admin;
  v_allowed := v_is_admin or private.has_staff_capability('moderation.reports.manage');
  if not v_allowed then return jsonb_build_object('success',false,'reason','not_authorized'); end if;
  if p_status not in ('pending','under_review','resolved','rejected','escalated') then
    return jsonb_build_object('success',false,'reason','invalid_status');
  end if;
  update public.reports r set
    status=p_status,
    admin_notes=case when nullif(trim(coalesce(p_note,'')),'') is null then r.admin_notes else left(trim(p_note),4000) end,
    action_taken=case when nullif(trim(coalesce(p_action_taken,'')),'') is null then r.action_taken else left(trim(p_action_taken),1000) end,
    resolved_at=case when p_status in ('resolved','rejected') then coalesce(r.resolved_at,now()) else null end,
    assigned_admin_id=case when r.assigned_admin_id is null and not v_is_admin then v_actor else r.assigned_admin_id end
  where r.id=p_report_id returning r.* into v_report;
  if v_report.id is null then return jsonb_build_object('success',false,'reason','report_not_found'); end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,reason)
  values(v_actor,'moderation_report_'||p_status,'report',p_report_id,coalesce(nullif(trim(p_action_taken),''),nullif(trim(p_note),''),'Report updated'));
  return jsonb_build_object('success',true,'report_id',p_report_id,'status',p_status);
end;
$$;
revoke all on function public.moderate_report(uuid,text,text,text) from public, anon;
grant execute on function public.moderate_report(uuid,text,text,text) to authenticated;
