-- GidiReads Phase 1: Achievements, Badges & Milestones
-- REVIEW ONLY. This file has NOT been applied to any database.
-- Review against the live schema and test in an isolated development project first.
-- Reading completion requires a server-created reading session, >=45 seconds elapsed,
-- and a reader-reported furthest progress of >=95%. This is stronger than trusting
-- reading_events, but is not proof of attention; do not use it as a financial signal.

begin;

create table if not exists public.badge_catalog (
  id uuid primary key default gen_random_uuid(),
  badge_slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null check (category in ('reader','author','community','special','membership','consistency')),
  tier text not null default 'standard' check (tier in ('standard','advanced','prestige')),
  rule_key text not null,
  threshold_value integer not null default 1 check (threshold_value >= 1),
  requirement_label text not null default '',
  image_url text not null default '',
  repeatable boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.badge_catalog drop constraint if exists badge_catalog_category_check;
alter table public.badge_catalog add constraint badge_catalog_category_check check (category in ('reader','author','community','special','membership','consistency'));
alter table public.badge_catalog add column if not exists image_url text not null default '';
alter table public.badge_catalog add column if not exists repeatable boolean not null default false;
alter table public.badge_catalog add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.badge_catalog add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badge_catalog(id) on delete restrict,
  cycle_key text not null default 'once',
  awarded_at timestamptz not null default now(),
  award_source text not null default 'automatic' check (award_source in ('automatic','admin','event','membership')),
  award_note text,
  is_public boolean not null default false,
  public_order integer not null default 100,
  unique(user_id,badge_id,cycle_key)
);
alter table public.user_badges add column if not exists cycle_key text not null default 'once';
alter table public.user_badges add column if not exists award_source text not null default 'automatic';
alter table public.user_badges add column if not exists award_note text;
alter table public.user_badges add column if not exists awarded_at timestamptz not null default now();
alter table public.user_badges add column if not exists is_public boolean not null default false;
alter table public.user_badges add column if not exists public_order integer not null default 100;
alter table public.user_badges drop constraint if exists user_badges_user_id_badge_id_key;
create unique index if not exists user_badges_user_badge_cycle_uidx on public.user_badges(user_id,badge_id,cycle_key);
create index if not exists user_badges_user_awarded_idx on public.user_badges(user_id,awarded_at desc);

create table if not exists public.user_completed_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  completed_at timestamptz not null default now(),
  qualifying_session_id uuid references public.reading_sessions(id) on delete set null,
  unique(user_id,chapter_id)
);
create index if not exists user_completed_chapters_user_time_idx on public.user_completed_chapters(user_id,completed_at desc);

create table if not exists public.milestone_catalog (
  id uuid primary key default gen_random_uuid(),
  milestone_slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null check (category in ('reading','author','community','consistency','special','membership')),
  period text not null check (period in ('lifetime','daily','weekly','monthly','once','event')),
  eligible_roles text[] not null default array['reader']::text[],
  target_value integer not null default 1 check (target_value >= 1),
  verification_key text not null,
  verification_config jsonb not null default '{}'::jsonb,
  badge_id uuid references public.badge_catalog(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published','paused','archived')),
  is_builtin boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  cycle_timezone text not null default 'UTC',
  display_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists milestone_catalog_status_order_idx on public.milestone_catalog(status,display_order);

create table if not exists public.user_milestone_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_id uuid not null references public.milestone_catalog(id) on delete restrict,
  period_key text not null,
  progress_value bigint not null default 0 check (progress_value >= 0),
  target_value bigint not null check (target_value >= 1),
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id,milestone_id,period_key)
);
create index if not exists user_milestone_progress_user_idx on public.user_milestone_progress(user_id,status,updated_at desc);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_id uuid references public.milestone_catalog(id) on delete set null,
  milestone_slug text not null,
  name_snapshot text not null,
  description_snapshot text not null default '',
  category text not null,
  period_key text not null,
  target_value bigint not null,
  final_progress bigint not null,
  completed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id,milestone_slug,period_key)
);
create index if not exists user_achievements_user_time_idx on public.user_achievements(user_id,completed_at desc);

-- Stamp catalogue ownership on the server so client payloads cannot spoof the audit identity.
create or replace function public.stamp_gidireads_catalog_editor()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is not null and not exists(select 1 from public.profiles where id=v_user and role='admin') then
    raise exception 'Administrator access required';
  end if;
  if tg_op='INSERT' then
    if v_user is not null then new.created_by:=v_user; new.updated_by:=v_user; end if;
  else
    new.created_by:=old.created_by;
    if v_user is not null then new.updated_by:=v_user; end if;
  end if;
  new.updated_at:=now();
  return new;
end; $$;
drop trigger if exists trg_stamp_badge_catalog_editor on public.badge_catalog;
create trigger trg_stamp_badge_catalog_editor before insert or update on public.badge_catalog for each row execute function public.stamp_gidireads_catalog_editor();
drop trigger if exists trg_stamp_milestone_catalog_editor on public.milestone_catalog;
create trigger trg_stamp_milestone_catalog_editor before insert or update on public.milestone_catalog for each row execute function public.stamp_gidireads_catalog_editor();

-- Record the moment a chapter becomes published; used for publication-day milestones.
alter table public.chapters add column if not exists published_at timestamptz;
update public.chapters set published_at=coalesce(published_at,updated_at,created_at,now()) where is_published=true and published_at is null;
create or replace function public.set_chapter_published_at()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then
    if new.is_published then new.published_at:=coalesce(new.published_at,now()); else new.published_at:=null; end if;
  elsif new.is_published and not old.is_published then new.published_at:=now();
  elsif not new.is_published then new.published_at:=null;
  elsif new.published_at is null then new.published_at:=coalesce(old.published_at,now());
  end if;
  return new;
end; $$;
drop trigger if exists trg_set_chapter_published_at on public.chapters;
create trigger trg_set_chapter_published_at before insert or update of is_published on public.chapters for each row execute function public.set_chapter_published_at();

-- Server-owned reading-session lifecycle. Client cannot directly create fake completion rows.
create or replace function public.start_gidireads_reading_session(p_story_id uuid,p_chapter_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.chapters c join public.stories s on s.id=c.story_id where c.id=p_chapter_id and c.story_id=p_story_id and c.is_published=true and s.status in ('ongoing','completed')) then
    raise exception 'This chapter is not available for reading';
  end if;
  insert into public.reading_sessions(reader_id,story_id,chapter_id,started_at,active_seconds,max_chapter_progress)
  values(v_user,p_story_id,p_chapter_id,now(),0,0) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.save_gidireads_reading_progress(p_story_id uuid,p_chapter_id uuid,p_progress numeric,p_position_offset integer,p_session_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_user uuid:=auth.uid(); v_session public.reading_sessions%rowtype; v_elapsed integer; v_progress numeric;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_progress is null or p_progress<0 or p_progress>100 then raise exception 'Invalid reading progress'; end if;
  if p_position_offset is null or p_position_offset<0 then raise exception 'Invalid reading position'; end if;
  select * into v_session from public.reading_sessions rs where rs.id=p_session_id and rs.reader_id=v_user and rs.story_id=p_story_id and rs.chapter_id=p_chapter_id and rs.ended_at is null for update;
  if not found then raise exception 'Reading session is unavailable; reopen the chapter and try again'; end if;
  if not exists(select 1 from public.chapters c join public.stories s on s.id=c.story_id where c.id=p_chapter_id and c.story_id=p_story_id and c.is_published=true and s.status in ('ongoing','completed')) then raise exception 'This chapter is no longer eligible'; end if;
  v_elapsed:=greatest(0,floor(extract(epoch from (now()-v_session.started_at)))::integer);
  v_progress:=greatest(coalesce(v_session.max_chapter_progress,0),p_progress);
  update public.reading_sessions set active_seconds=v_elapsed,max_chapter_progress=v_progress where id=v_session.id;
  insert into public.reading_progress as rp(reader_id,story_id,chapter_id,progress_percent,chapter_progress_percent,position_offset,last_read_at,completed_at,created_at,updated_at)
  values(v_user,p_story_id,p_chapter_id,p_progress,p_progress,p_position_offset,now(),case when p_progress>=95 and v_elapsed>=45 then now() else null end,now(),now())
  on conflict(reader_id,story_id) do update set chapter_id=excluded.chapter_id,progress_percent=case when rp.chapter_id=excluded.chapter_id then greatest(rp.progress_percent,excluded.progress_percent) else excluded.progress_percent end,chapter_progress_percent=case when rp.chapter_id=excluded.chapter_id then greatest(rp.chapter_progress_percent,excluded.chapter_progress_percent) else excluded.chapter_progress_percent end,position_offset=excluded.position_offset,last_read_at=now(),completed_at=case when rp.chapter_id=excluded.chapter_id and rp.completed_at is not null then rp.completed_at when excluded.progress_percent>=95 and v_elapsed>=45 then now() else null end,updated_at=now();
  if p_progress>=95 and v_elapsed>=45 and exists(select 1 from public.stories s where s.id=p_story_id and s.author_id<>v_user) then
    insert into public.user_completed_chapters(user_id,story_id,chapter_id,completed_at,qualifying_session_id)
    values(v_user,p_story_id,p_chapter_id,now(),v_session.id) on conflict(user_id,chapter_id) do nothing;
    insert into public.reading_events(reader_id,story_id,chapter_id,event_type,occurred_at,metadata)
    values(v_user,p_story_id,p_chapter_id,'chapter_completed',now(),jsonb_build_object('source','server_verified_session','session_seconds',v_elapsed))
    on conflict do nothing;
  end if;
  return (p_progress>=95 and v_elapsed>=45 and exists(select 1 from public.stories s where s.id=p_story_id and s.author_id<>v_user));
end; $$;

create or replace function public.end_gidireads_reading_session(p_session_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  update public.reading_sessions set ended_at=coalesce(ended_at,now()),active_seconds=greatest(active_seconds,floor(extract(epoch from (coalesce(ended_at,now())-started_at)))::integer)
  where id=p_session_id and reader_id=v_user and ended_at is null;
  return found;
end; $$;

-- Progress is written only through the guarded functions above.
drop policy if exists "Readers can insert their own reading progress" on public.reading_progress;
drop policy if exists "Readers can update their own reading progress" on public.reading_progress;
drop policy if exists "Readers can insert their own reading sessions" on public.reading_sessions;
drop policy if exists "Readers can update their own reading sessions" on public.reading_sessions;
revoke insert,update,delete on public.reading_progress,public.reading_sessions from anon,authenticated;
grant select on public.reading_progress,public.reading_sessions to authenticated;

-- Only supported server-verifiable rules may be published.
create or replace function public.guard_milestone_publish()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.status='published' and new.verification_key not in (
    'reader_completed_chapters','reader_finished_novels','reader_distinct_authors','reader_library_count',
    'author_published_chapters','author_published_words','author_published_stories','author_completed_stories',
    'author_publish_days_week','author_reader_interactions','community_first_contribution','community_comments',
    'community_active_days','community_spirit','reader_active_day','reader_active_days','reader_active_days_week',
    'reader_read_days_week','reader_echoes_sent','founding_reader','founding_author','event_participation','membership_first','membership_months'
  ) then raise exception 'This verification rule is not supported by the current GidiReads build'; end if;
  if new.status='published' and new.verification_key in ('founding_reader','founding_author','event_participation','membership_first','membership_months') then raise exception 'This rule is not ready to publish: its eligibility or supporting feature is not implemented yet'; end if;
  if new.status='published' and new.period='event' then raise exception 'Event-period milestones cannot be published until event verification is implemented'; end if;
  if new.status='published' and new.category='membership' then raise exception 'Membership milestones cannot be published until subscription verification is implemented'; end if;
  if new.status='published' and new.category='special' then raise exception 'Special milestones need their configured founding or event verification rule'; end if;
  if new.status='published' and new.verification_key='reader_active_day' and new.period<>'daily' then raise exception 'Eligible activity today must use the Daily period'; end if;
  if new.status='published' and new.verification_key in ('reader_active_days_week','reader_read_days_week','author_publish_days_week') and new.period<>'weekly' then raise exception 'This verification rule must use the Weekly period'; end if;
  if new.status='published' and new.verification_key not in ('reader_active_day','reader_active_days_week','reader_read_days_week','author_publish_days_week','founding_reader','founding_author','event_participation','membership_first','membership_months') and new.period not in ('lifetime','once') then raise exception 'This verification rule supports only lifetime or one-time measurement'; end if;
  if new.status='published' and new.ends_at is not null and new.ends_at<=now() then raise exception 'An expired milestone cannot be published'; end if;
  return new;
end; $$;
drop trigger if exists trg_guard_milestone_publish on public.milestone_catalog;
create trigger trg_guard_milestone_publish before insert or update of status,verification_key,starts_at,ends_at,period,category on public.milestone_catalog for each row execute function public.guard_milestone_publish();

create or replace function public.refresh_my_achievements()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_user uuid:=auth.uid(); m record; v_progress bigint; v_target bigint; v_cycle text; v_local timestamp; v_status text; v_new integer:=0; v_badge_new uuid; v_awarded_cycle text; v_had_completed boolean; v_achievement_new boolean;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  for m in select * from public.milestone_catalog where status='published' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) order by display_order loop
    v_local:=now() at time zone coalesce(nullif(m.cycle_timezone,''),'UTC');
    v_cycle:=case m.period when 'daily' then to_char(v_local,'YYYY-MM-DD') when 'weekly' then to_char(date_trunc('week',v_local),'IYYY-"W"IW') when 'monthly' then to_char(v_local,'YYYY-MM') when 'event' then 'event-'||m.milestone_slug else 'lifetime' end;
    v_target:=m.target_value;
    v_progress:=case m.verification_key
      when 'reader_completed_chapters' then (select count(*) from public.user_completed_chapters ucc join public.chapters c on c.id=ucc.chapter_id join public.stories s on s.id=ucc.story_id where ucc.user_id=v_user and c.is_published=true and s.status in ('ongoing','completed') and s.author_id<>v_user)
      when 'reader_finished_novels' then (select count(*) from public.stories s where s.status='completed' and s.author_id<>v_user and exists(select 1 from public.chapters c where c.story_id=s.id and c.is_published=true) and not exists(select 1 from public.chapters c where c.story_id=s.id and c.is_published=true and not exists(select 1 from public.user_completed_chapters ucc where ucc.user_id=v_user and ucc.chapter_id=c.id)))
      when 'reader_distinct_authors' then (select count(distinct s.author_id) from public.user_completed_chapters ucc join public.stories s on s.id=ucc.story_id join public.chapters c on c.id=ucc.chapter_id where ucc.user_id=v_user and c.is_published=true and s.author_id<>v_user)
      when 'reader_library_count' then (select count(distinct le.story_id) from public.library_entries le join public.stories s on s.id=le.story_id where le.reader_id=v_user and s.status in ('ongoing','completed') and s.author_id<>v_user)
      when 'author_published_chapters' then (select count(*) from public.chapters c join public.stories s on s.id=c.story_id where s.author_id=v_user and s.status in ('ongoing','completed') and c.is_published=true)
      when 'author_published_words' then (select coalesce(sum(cardinality(regexp_split_to_array(nullif(trim(regexp_replace(coalesce(c.content_html,c.content,''),'<[^>]*>',' ','g')),''),E'\\s+'))),0) from public.chapters c join public.stories s on s.id=c.story_id where s.author_id=v_user and s.status in ('ongoing','completed') and c.is_published=true)
      when 'author_published_stories' then (select count(*) from public.stories s where s.author_id=v_user and s.status in ('ongoing','completed') and exists(select 1 from public.chapters c where c.story_id=s.id and c.is_published=true))
      when 'author_completed_stories' then (select count(*) from public.stories s where s.author_id=v_user and s.status='completed' and exists(select 1 from public.chapters c where c.story_id=s.id and c.is_published=true))
      when 'author_publish_days_week' then (select count(distinct (c.published_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date) from public.chapters c join public.stories s on s.id=c.story_id where s.author_id=v_user and c.is_published=true and c.published_at >= (date_trunc('week',v_local) at time zone coalesce(nullif(m.cycle_timezone,''),'UTC')) and c.published_at < ((date_trunc('week',v_local)+interval '7 days') at time zone coalesce(nullif(m.cycle_timezone,''),'UTC')))
      when 'author_reader_interactions' then (select count(*) from public.comments cm join public.chapters c on c.id=cm.chapter_id join public.stories s on s.id=c.story_id where s.author_id=v_user and cm.author_id<>v_user)+(select count(*) from public.echoes e join public.chapters c on c.id=e.chapter_id join public.stories s on s.id=c.story_id where s.author_id=v_user and e.reader_id<>v_user)
      when 'community_first_contribution' then (select count(*) from public.comments where author_id=v_user)+(select count(*) from public.echoes where reader_id=v_user)
      when 'community_comments' then (select count(*) from public.comments where author_id=v_user)
      when 'community_active_days' then (select count(distinct activity_day) from (select (created_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date activity_day from public.comments where author_id=v_user union select (created_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date from public.echoes where reader_id=v_user) a)
      when 'community_spirit' then (select count(*) from public.comments where author_id=v_user)+(select count(*) from public.echoes where reader_id=v_user)
      when 'reader_active_day' then case when exists(select 1 from public.user_completed_chapters where user_id=v_user and (completed_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date=v_local::date) or exists(select 1 from public.comments where author_id=v_user and (created_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date=v_local::date) or exists(select 1 from public.echoes where reader_id=v_user and (created_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date=v_local::date) then 1 else 0 end
      when 'reader_active_days' then (select count(distinct activity_day) from (select (completed_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date activity_day from public.user_completed_chapters where user_id=v_user union select (created_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date from public.comments where author_id=v_user union select (created_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date from public.echoes where reader_id=v_user) a)
      when 'reader_active_days_week' then (select count(distinct activity_day) from (select (completed_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date activity_day from public.user_completed_chapters where user_id=v_user union select (created_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date from public.comments where author_id=v_user union select (created_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date from public.echoes where reader_id=v_user) a where activity_day>=date_trunc('week',v_local)::date and activity_day<(date_trunc('week',v_local)+interval '7 days')::date)
      when 'reader_read_days_week' then (select count(distinct (completed_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date) from public.user_completed_chapters where user_id=v_user and (completed_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date>=date_trunc('week',v_local)::date and (completed_at at time zone coalesce(nullif(m.cycle_timezone,''),'UTC'))::date<(date_trunc('week',v_local)+interval '7 days')::date)
      when 'reader_echoes_sent' then (select count(*) from public.echoes where reader_id=v_user)
      else 0 end;
    if m.verification_key in ('reader_active_day') then v_progress:=least(v_progress,1); end if;
    insert into public.user_milestone_progress as ump(user_id,milestone_id,period_key,progress_value,target_value,status,completed_at,updated_at)
    values(v_user,m.id,v_cycle,v_progress,v_target,case when v_progress>=v_target then 'completed' else 'in_progress' end,case when v_progress>=v_target then now() else null end,now())
    on conflict(user_id,milestone_id,period_key) do update set progress_value=case when ump.status='completed' then greatest(ump.progress_value,excluded.progress_value) else excluded.progress_value end,target_value=case when ump.status='completed' then ump.target_value else excluded.target_value end,status=case when ump.status='completed' or excluded.progress_value>=excluded.target_value then 'completed' else 'in_progress' end,completed_at=coalesce(ump.completed_at,case when excluded.progress_value>=excluded.target_value then now() else null end),updated_at=now();
    select status='completed' into v_had_completed from public.user_milestone_progress where user_id=v_user and milestone_id=m.id and period_key=v_cycle;
    if v_had_completed then
      insert into public.user_achievements(user_id,milestone_id,milestone_slug,name_snapshot,description_snapshot,category,period_key,target_value,final_progress,metadata)
      values(v_user,m.id,m.milestone_slug,m.name,m.description,m.category,v_cycle,v_target,v_progress,jsonb_build_object('verification_key',m.verification_key,'cycle_timezone',m.cycle_timezone,'badge_id_at_completion',m.badge_id))
      on conflict(user_id,milestone_slug,period_key) do nothing;
      v_achievement_new:=found;
      if v_achievement_new then
        v_new:=v_new+1;
        insert into public.notifications(user_id,message,link,category) values(v_user,'Milestone completed: '||m.name,'my-gidireads.html','system');
      end if;
      -- Badge rewards are tied to the configuration at the moment the achievement is recorded;
      -- linking a badge later does not silently award it retroactively to old completions.
      if m.badge_id is not null and v_achievement_new then
        select case when bc.repeatable then v_cycle else 'once' end into v_awarded_cycle from public.badge_catalog bc where bc.id=m.badge_id and bc.is_active=true;
        if v_awarded_cycle is not null then
          v_badge_new:=null;
          insert into public.user_badges(user_id,badge_id,cycle_key,award_source) values(v_user,m.badge_id,v_awarded_cycle,'automatic') on conflict(user_id,badge_id,cycle_key) do nothing returning id into v_badge_new;
          if v_badge_new is not null then insert into public.notifications(user_id,message,link,category) select v_user,'You earned the '||bc.name||' badge.','my-gidireads.html','system' from public.badge_catalog bc where bc.id=m.badge_id; end if;
        end if;
      end if;
    end if;
  end loop;
  return v_new;
end; $$;

create or replace function public.set_my_badge_visibility(p_badge_id uuid,p_is_public boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  update public.user_badges set is_public=p_is_public where user_id=v_user and badge_id=p_badge_id;
  if not found and p_is_public then raise exception 'You have not earned this badge'; end if;
  return found;
end; $$;

create or replace function public.admin_award_badge(p_user_id uuid,p_badge_id uuid,p_note text default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_admin uuid:=auth.uid(); v_new uuid;
begin
  if v_admin is null or not exists(select 1 from public.profiles where id=v_admin and role='admin') then raise exception 'Administrator access required'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'Recipient profile not found'; end if;
  insert into public.user_badges(user_id,badge_id,cycle_key,award_source,award_note) values(p_user_id,p_badge_id,'once','admin',nullif(trim(p_note),'')) on conflict(user_id,badge_id,cycle_key) do nothing returning id into v_new;
  if v_new is not null then insert into public.notifications(user_id,message,link,category) select p_user_id,'A GidiReads administrator awarded you the '||name||' badge.','my-gidireads.html','system' from public.badge_catalog where id=p_badge_id; end if;
  return v_new is not null;
end; $$;

-- Public artwork bucket. Admin-only writes; public can fetch published badge images.
insert into storage.buckets(id,name,public) values('gidireads-badges','gidireads-badges',true) on conflict(id) do update set public=true;
drop policy if exists gidireads_badges_public_read on storage.objects;
create policy gidireads_badges_public_read on storage.objects for select to anon,authenticated using(bucket_id='gidireads-badges');
drop policy if exists gidireads_badges_admin_insert on storage.objects;
create policy gidireads_badges_admin_insert on storage.objects for insert to authenticated with check(bucket_id='gidireads-badges' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists gidireads_badges_admin_update on storage.objects;
create policy gidireads_badges_admin_update on storage.objects for update to authenticated using(bucket_id='gidireads-badges' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check(bucket_id='gidireads-badges' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists gidireads_badges_admin_delete on storage.objects;
create policy gidireads_badges_admin_delete on storage.objects for delete to authenticated using(bucket_id='gidireads-badges' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

-- RLS: public can read only published milestone definitions and badges; private progress/history is owner-only.
alter table public.badge_catalog enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_completed_chapters enable row level security;
alter table public.milestone_catalog enable row level security;
alter table public.user_milestone_progress enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists badge_catalog_active_read on public.badge_catalog;
create policy badge_catalog_active_read on public.badge_catalog for select to anon,authenticated using(is_active=true);
drop policy if exists badge_catalog_earned_read on public.badge_catalog;
create policy badge_catalog_earned_read on public.badge_catalog for select to authenticated using(exists(select 1 from public.user_badges ub where ub.badge_id=badge_catalog.id and ub.user_id=(select auth.uid())) or exists(select 1 from public.user_badges ub where ub.badge_id=badge_catalog.id and ub.is_public=true));
drop policy if exists badge_catalog_public_awarded_read on public.badge_catalog;
create policy badge_catalog_public_awarded_read on public.badge_catalog for select to anon,authenticated using(exists(select 1 from public.user_badges ub where ub.badge_id=badge_catalog.id and ub.is_public=true));
drop policy if exists badge_catalog_admin_manage on public.badge_catalog;
create policy badge_catalog_admin_manage on public.badge_catalog for all to authenticated using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists user_badges_owner_read on public.user_badges;
create policy user_badges_owner_read on public.user_badges for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists user_badges_public_read on public.user_badges;
create policy user_badges_public_read on public.user_badges for select to anon,authenticated using(is_public=true);
drop policy if exists user_badges_owner_visibility_update on public.user_badges;
create policy user_badges_owner_visibility_update on public.user_badges for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists user_completed_chapters_owner_read on public.user_completed_chapters;
create policy user_completed_chapters_owner_read on public.user_completed_chapters for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists milestone_catalog_published_read on public.milestone_catalog;
create policy milestone_catalog_published_read on public.milestone_catalog for select to anon,authenticated using(status='published' or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists milestone_catalog_admin_manage on public.milestone_catalog;
create policy milestone_catalog_admin_manage on public.milestone_catalog for all to authenticated using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists user_milestone_progress_owner_read on public.user_milestone_progress;
create policy user_milestone_progress_owner_read on public.user_milestone_progress for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists user_achievements_owner_read on public.user_achievements;
create policy user_achievements_owner_read on public.user_achievements for select to authenticated using(user_id=(select auth.uid()));

revoke all on public.badge_catalog,public.user_badges,public.user_completed_chapters,public.milestone_catalog,public.user_milestone_progress,public.user_achievements from anon,authenticated;
grant select on public.badge_catalog,public.milestone_catalog to anon,authenticated;
-- Column-level SELECT prevents public profile queries from exposing award_source, award_note, or other internal award metadata.
grant select (user_id,badge_id,awarded_at,cycle_key,is_public,public_order) on public.user_badges to anon,authenticated;
grant update(is_public,public_order) on public.user_badges to authenticated;
grant select on public.user_completed_chapters,public.user_milestone_progress,public.user_achievements to authenticated;
revoke all on function public.start_gidireads_reading_session(uuid,uuid) from public,anon;
revoke all on function public.save_gidireads_reading_progress(uuid,uuid,numeric,integer,uuid) from public,anon;
revoke all on function public.end_gidireads_reading_session(uuid) from public,anon;
revoke all on function public.refresh_my_achievements() from public,anon;
revoke all on function public.set_my_badge_visibility(uuid,boolean) from public,anon;
revoke all on function public.admin_award_badge(uuid,uuid,text) from public,anon;
grant execute on function public.start_gidireads_reading_session(uuid,uuid) to authenticated;
grant execute on function public.save_gidireads_reading_progress(uuid,uuid,numeric,integer,uuid) to authenticated;
grant execute on function public.end_gidireads_reading_session(uuid) to authenticated;
grant execute on function public.refresh_my_achievements() to authenticated;
grant execute on function public.set_my_badge_visibility(uuid,boolean) to authenticated;
grant execute on function public.admin_award_badge(uuid,uuid,text) to authenticated;

-- Built-in badge records. SVG artwork is shipped in assets/badges/ with the frontend files.
insert into public.badge_catalog(badge_slug,name,description,category,tier,rule_key,threshold_value,requirement_label,image_url,display_order,is_active) values
('curious-reader','The Curious Reader','Three distinct chapters completed.','reader','standard','reader_completed_chapters',3,'Complete 3 distinct chapters','assets/badges/curious-reader.svg',10,true),
('turning-pages','Turning the Pages','Ten distinct chapters completed.','reader','standard','reader_completed_chapters',10,'Complete 10 distinct chapters','assets/badges/turning-pages.svg',20,true),
('story-voyager','Story Voyager','Finish five completed novels.','reader','advanced','reader_finished_novels',5,'Finish 5 novels','assets/badges/story-voyager.svg',30,true),
('literary-explorer','Literary Explorer','Read completed chapters from five different authors.','reader','standard','reader_distinct_authors',5,'Read from 5 authors','assets/badges/literary-explorer.svg',40,true),
('story-for-later','A Story for Later','Save ten eligible stories to your library.','reader','standard','reader_library_count',10,'Save 10 stories','assets/badges/story-for-later.svg',50,true),
('voice-is-born','A Voice Is Born','Publish your first eligible story.','author','standard','author_published_stories',1,'Publish your first story','assets/badges/voice-is-born.svg',60,true),
('the-storyteller','The Storyteller','Publish your first completed novel.','author','advanced','author_completed_stories',1,'Publish a completed novel','assets/badges/the-storyteller.svg',70,true),
('growing-library','A Growing Library','Publish three eligible stories.','author','standard','author_published_stories',3,'Publish 3 stories','assets/badges/growing-library.svg',80,true),
('thoughtful-words','Thoughtful Words','Post ten eligible comments.','community','standard','community_comments',10,'Post 10 comments','assets/badges/thoughtful-words.svg',90,true),
('supporting-stories','Supporting Stories','Send five eligible Echoes.','community','standard','reader_echoes_sent',5,'Send 5 Echoes','assets/badges/supporting-stories.svg',100,true),
('daily-return','Daily Return','Complete qualifying activity today.','consistency','standard','reader_active_day',1,'Complete eligible activity today','assets/badges/daily-return.svg',110,true),
('weekly-explorer','Weekly Explorer','Read eligible chapters on three days in one week.','consistency','standard','reader_read_days_week',3,'Read on 3 days this week','assets/badges/weekly-explorer.svg',120,true),
('founding-reader','Founding Reader','Official founding-reader recognition.','special','prestige','founding_reader',1,'Qualify under founding-reader rules','assets/badges/founding-reader.svg',130,false),
('first-membership','First Membership','Activate an eligible GidiReads membership.','membership','standard','membership_first',1,'Activate an eligible membership','assets/badges/first-membership.svg',140,false)
on conflict(badge_slug) do nothing;

-- 30 proposed milestones. Unsupported rules remain drafts and cannot be published until their source features exist.
insert into public.milestone_catalog as existing(milestone_slug,name,description,category,period,eligible_roles,target_value,verification_key,badge_id,status,is_builtin,display_order,cycle_timezone)
select x.milestone_slug,x.name,x.description,x.category,x.period,x.eligible_roles,x.target_value,x.verification_key,bc.id,x.status,true,x.display_order,'UTC'
from (values
('curious-reader','The Curious Reader','Complete three distinct eligible chapters.','reading','lifetime',array['reader']::text[],3,'reader_completed_chapters','curious-reader','draft',10),
('turning-the-pages','Turning the Pages','Complete ten distinct eligible chapters.','reading','lifetime',array['reader']::text[],10,'reader_completed_chapters','turning-pages','draft',20),
('book-wanderer','Book Wanderer','Complete 25 distinct eligible chapters.','reading','lifetime',array['reader']::text[],25,'reader_completed_chapters',null,'draft',30),
('story-voyager','Story Voyager','Finish five completed novels by reading all published chapters.','reading','lifetime',array['reader']::text[],5,'reader_finished_novels','story-voyager','draft',40),
('world-of-stories','A World of Stories','Finish ten completed novels by reading all published chapters.','reading','lifetime',array['reader']::text[],10,'reader_finished_novels',null,'draft',50),
('literary-explorer','Literary Explorer','Complete chapters from five different authors.','reading','lifetime',array['reader']::text[],5,'reader_distinct_authors','literary-explorer','draft',60),
('story-for-later','A Story for Later','Save ten eligible stories to your library.','reading','lifetime',array['reader']::text[],10,'reader_library_count','story-for-later','draft',70),
('voice-is-born','A Voice Is Born','Publish the first eligible story with at least one published chapter.','author','lifetime',array['author']::text[],1,'author_published_stories','voice-is-born','draft',80),
('next-chapter','The Next Chapter','Publish five eligible chapters.','author','lifetime',array['author']::text[],5,'author_published_chapters',null,'draft',90),
('words-take-flight','Words Take Flight','Publish 10,000 eligible words.','author','lifetime',array['author']::text[],10000,'author_published_words',null,'draft',100),
('the-storyteller','The Storyteller','Publish the first novel marked completed with published chapters.','author','lifetime',array['author']::text[],1,'author_completed_stories','the-storyteller','draft',110),
('growing-library','A Growing Library','Publish three eligible stories.','author','lifetime',array['author']::text[],3,'author_published_stories','growing-library','draft',120),
('consistent-author','The Consistent Author','Publish eligible chapters on four distinct days in one week.','author','weekly',array['author']::text[],4,'author_publish_days_week',null,'draft',130),
('readers-are-listening','Readers Are Listening','Receive 25 eligible comments and Echoes on your published chapters.','author','lifetime',array['author']::text[],25,'author_reader_interactions',null,'draft',140),
('warm-welcome','A Warm Welcome','Make your first eligible community contribution through a comment or Echo.','community','lifetime',array['reader']::text[],1,'community_first_contribution',null,'draft',150),
('thoughtful-words','Thoughtful Words','Post ten eligible comments.','community','lifetime',array['reader']::text[],10,'community_comments','thoughtful-words','draft',160),
('familiar-voice','A Familiar Voice','Participate on five distinct days through reading, comments or Echoes.','community','lifetime',array['reader']::text[],5,'community_active_days',null,'draft',170),
('supporting-stories','Supporting Stories','Send five eligible Echoes to stories.','community','lifetime',array['reader']::text[],5,'reader_echoes_sent','supporting-stories','draft',180),
('community-spirit','Community Spirit','Complete 20 eligible comments and Echoes.','community','lifetime',array['reader']::text[],20,'community_spirit',null,'draft',190),
('daily-return','Daily Return','Complete at least one eligible activity in a daily cycle.','consistency','daily',array['reader']::text[],1,'reader_active_day','daily-return','draft',200),
('three-day-rhythm','Three-Day Rhythm','Complete eligible activity on three distinct days.','consistency','lifetime',array['reader']::text[],3,'reader_active_days',null,'draft',210),
('week-of-stories','A Week of Stories','Complete eligible activity on five days in one week.','consistency','weekly',array['reader']::text[],5,'reader_active_days_week',null,'draft',220),
('weekly-explorer','Weekly Explorer','Complete reading activity on three days in one week.','reading','weekly',array['reader']::text[],3,'reader_read_days_week','weekly-explorer','draft',230),
('weekly-author','The Weekly Author','Publish eligible chapters on two days in one week.','author','weekly',array['author']::text[],2,'author_publish_days_week',null,'draft',240),
('founding-reader','Founding Reader','Founding-reader recognition; cutoff and eligibility are not yet configured.','special','once',array['reader']::text[],1,'founding_reader','founding-reader','draft',250),
('founding-author','Founding Author','Founding-author recognition; cutoff and eligibility are not yet configured.','special','once',array['author']::text[],1,'founding_author',null,'draft',260),
('moment-in-gidireads','A Moment in GidiReads','Participate in a designated platform event.','special','event',array['reader']::text[],1,'event_participation',null,'draft',270),
('first-membership','First Membership','Activate an eligible GidiReads membership.','membership','once',array['reader']::text[],1,'membership_first','first-membership','draft',280),
('month-together','A Month Together','Complete one defined month of eligible membership.','membership','monthly',array['reader']::text[],1,'membership_months',null,'draft',290),
('membership-milestone','Membership Milestone','Reach a longer-term eligible membership milestone.','membership','monthly',array['reader']::text[],6,'membership_months',null,'draft',300)
) as x(milestone_slug,name,description,category,period,eligible_roles,target_value,verification_key,badge_slug,status,display_order)
left join public.badge_catalog bc on bc.badge_slug=x.badge_slug
on conflict(milestone_slug) do update set badge_id=coalesce(existing.badge_id,excluded.badge_id),updated_at=now();

-- Restrict direct write paths. Admin CRUD goes through RLS-protected catalogues; awards/progress go through RPCs.
grant select,insert,update,delete on public.badge_catalog,public.milestone_catalog to authenticated;
grant select on public.user_badges,public.user_milestone_progress,public.user_achievements,public.user_completed_chapters to authenticated;
revoke insert,update,delete on public.user_badges,public.user_milestone_progress,public.user_achievements,public.user_completed_chapters from anon,authenticated;

commit;
