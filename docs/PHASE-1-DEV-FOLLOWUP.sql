-- GidiReads Phase 1 follow-up migration
-- Purpose: install/reinstall the milestone achievement refresh function and harden
-- manual badge awarding with a clear missing-badge validation.
-- Applied and transaction-tested on the Padres development project only.
-- NOT applied to GidiReads production. Review before any future production use.

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
revoke all on function public.refresh_my_achievements() from public, anon;
grant execute on function public.refresh_my_achievements() to authenticated;

create or replace function public.admin_award_badge(p_user_id uuid,p_badge_id uuid,p_note text default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_admin uuid:=auth.uid(); v_new uuid;
begin
  if v_admin is null or not exists(select 1 from public.profiles where id=v_admin and role='admin') then raise exception 'Administrator access required'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'Recipient profile not found'; end if;
  if not exists(select 1 from public.badge_catalog where id=p_badge_id) then raise exception 'Badge not found'; end if;
  insert into public.user_badges(user_id,badge_id,cycle_key,award_source,award_note) values(p_user_id,p_badge_id,'once','admin',nullif(trim(p_note),'')) on conflict(user_id,badge_id,cycle_key) do nothing returning id into v_new;
  if v_new is not null then insert into public.notifications(user_id,message,link,category) select p_user_id,'A GidiReads administrator awarded you the '||name||' badge.','my-gidireads.html','system' from public.badge_catalog where id=p_badge_id; end if;
  return v_new is not null;
end; $$;
revoke all on function public.admin_award_badge(uuid,uuid,text) from public, anon;
grant execute on function public.admin_award_badge(uuid,uuid,text) to authenticated;
