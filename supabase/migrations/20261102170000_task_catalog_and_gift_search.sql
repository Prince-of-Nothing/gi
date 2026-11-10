-- GidiReads task catalogue + secure task claims + creator gift search.
-- Designed against the current production wallet, badge, profile and activity schema.
-- Apply only after deploying the matching V5 frontend. This file is NOT applied by this build.

begin;

create table if not exists public.task_catalog (
  id uuid primary key default gen_random_uuid(),
  task_slug text not null unique check (task_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 2 and 90),
  description text not null default '',
  category text not null check (category in ('daily','weekly','reading','author','community','milestone','special')),
  reward_type text not null check (reward_type in ('g_coins','echoes_promotional','echoes_free','echoes_bonus','gidipasses','badge')),
  reward_amount integer not null default 1 check (reward_amount between 1 and 100000),
  reward_badge_id uuid references public.badge_catalog(id) on delete restrict,
  verification_key text not null check (verification_key in ('chapters_completed','published_words','comments_count','library_count','read_days','echoes_sent','story_count')),
  verification_config jsonb not null default '{}'::jsonb,
  recurrence text not null default 'once' check (recurrence in ('once','daily','weekly','monthly','event')),
  starts_at timestamptz,
  ends_at timestamptz,
  icon text not null default '✧',
  is_active boolean not null default false,
  display_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_catalog_badge_reward_check check ((reward_type='badge' and reward_badge_id is not null) or (reward_type<>'badge' and reward_badge_id is null)),
  constraint task_catalog_date_range_check check (starts_at is null or ends_at is null or ends_at>starts_at)
);

create table if not exists public.user_task_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.task_catalog(id) on delete restrict,
  period_key text not null default 'once',
  progress_value integer not null default 0 check (progress_value>=0),
  target_value integer not null default 1 check (target_value>=1),
  status text not null default 'in_progress' check (status in ('in_progress','completed','claimed','expired','rejected')),
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,task_id,period_key)
);

create index if not exists task_catalog_active_order_idx on public.task_catalog(is_active,display_order);
create index if not exists user_task_progress_user_updated_idx on public.user_task_progress(user_id,updated_at desc);
create index if not exists comments_task_metric_idx on public.comments(author_id,created_at desc);
create index if not exists library_entries_task_metric_idx on public.library_entries(reader_id,created_at desc);
create index if not exists echoes_task_metric_idx on public.echoes(reader_id,created_at desc);
create index if not exists profiles_username_prefix_idx on public.profiles(lower(username));
create index if not exists profiles_display_name_prefix_idx on public.profiles(lower(display_name));

alter table public.task_catalog enable row level security;
alter table public.user_task_progress enable row level security;

drop policy if exists task_catalog_active_read on public.task_catalog;
drop policy if exists task_catalog_admin_manage on public.task_catalog;
drop policy if exists task_catalog_read on public.task_catalog;
drop policy if exists task_catalog_admin_insert on public.task_catalog;
drop policy if exists task_catalog_admin_update on public.task_catalog;
drop policy if exists task_catalog_admin_delete on public.task_catalog;
create policy task_catalog_read on public.task_catalog
  for select to authenticated
  using (
    (is_active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()))
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
  );
create policy task_catalog_admin_insert on public.task_catalog
  for insert to authenticated
  with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
create policy task_catalog_admin_update on public.task_catalog
  for update to authenticated
  using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
  with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
create policy task_catalog_admin_delete on public.task_catalog
  for delete to authenticated
  using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists user_task_progress_owner_read on public.user_task_progress;
create policy user_task_progress_owner_read on public.user_task_progress
  for select to authenticated using (user_id=(select auth.uid()));

revoke all on public.task_catalog,public.user_task_progress from anon,authenticated;
grant select,insert,update,delete on public.task_catalog to authenticated;
grant select on public.user_task_progress to authenticated;

-- Seed the reviewed starter tasks as active. Administrators can edit, pause,
-- reactivate, change rewards, link badges, and change dates from Creator Economy.
insert into public.task_catalog(task_slug,title,description,category,reward_type,reward_amount,verification_key,verification_config,recurrence,icon,is_active,display_order)
values
 ('first-chapter-complete','Finish a chapter','Complete one published chapter to receive a small appreciation reward.','reading','echoes_promotional',2,'chapters_completed','{"target":1}'::jsonb,'once','▤',true,10),
 ('weekly-reader','Read across three days','Open or complete chapters on three different days this week.','weekly','g_coins',15,'read_days','{"target":3}'::jsonb,'weekly','◷',true,20),
 ('comment-contributor','Join the conversation','Leave five comments on stories and chapters.','community','echoes_promotional',3,'comments_count','{"target":5}'::jsonb,'once','“',true,30),
 ('author-words','Publish 5,000 words','Reach 5,000 words across your published chapters.','author','g_coins',25,'published_words','{"target":5000}'::jsonb,'once','✎',true,40)
on conflict(task_slug) do update set is_active=true,updated_at=now();

create or replace function public.claim_gidireads_task(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $function$
declare
  v_user uuid:=auth.uid();
  v_task public.task_catalog%rowtype;
  v_period text;
  v_period_start timestamptz;
  v_metric bigint:=0;
  v_target bigint;
  v_progress public.user_task_progress%rowtype;
  v_badge public.badge_catalog%rowtype;
  v_badge_inserted uuid;
  v_currency text;
  v_tx public.wallet_transactions%rowtype;
  v_word_text text;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into v_task from public.task_catalog
   where id=p_task_id and is_active=true
     and (starts_at is null or starts_at<=now())
     and (ends_at is null or ends_at>now());
  if not found then raise exception 'task_not_active'; end if;

  v_period:=case v_task.recurrence
    when 'daily' then to_char(now() at time zone 'UTC','YYYY-MM-DD')
    when 'weekly' then to_char(now() at time zone 'UTC','IYYY-"W"IW')
    when 'monthly' then to_char(now() at time zone 'UTC','YYYY-MM')
    when 'event' then 'event:'||v_task.task_slug
    else 'once' end;
  v_period_start:=case v_task.recurrence
    when 'daily' then date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'
    when 'weekly' then date_trunc('week',now() at time zone 'UTC') at time zone 'UTC'
    when 'monthly' then date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'
    else '-infinity'::timestamptz end;
  v_target:=greatest(1,coalesce((v_task.verification_config->>'target')::bigint,1));

  case v_task.verification_key
    when 'chapters_completed' then
      select count(distinct re.chapter_id) into v_metric from public.reading_events re
       where re.reader_id=v_user and re.event_type='chapter_completed' and re.chapter_id is not null
         and (v_task.recurrence not in ('daily','weekly','monthly') or re.occurred_at>=v_period_start);
    when 'published_words' then
      select coalesce(sum(case when trim(regexp_replace(coalesce(nullif(c.content_html,''),c.content,''),'<[^>]*>',' ','g'))='' then 0
        else cardinality(regexp_split_to_array(trim(regexp_replace(coalesce(nullif(c.content_html,''),c.content,''),'<[^>]*>',' ','g')),E'\\s+')) end),0)
        into v_metric from public.stories s join public.chapters c on c.story_id=s.id
       where s.author_id=v_user and s.status in ('ongoing','completed') and c.is_published=true;
    when 'comments_count' then
      select count(*) into v_metric from public.comments cm where cm.author_id=v_user
       and (v_task.recurrence not in ('daily','weekly','monthly') or cm.created_at>=v_period_start);
    when 'library_count' then
      select count(distinct le.story_id) into v_metric from public.library_entries le
       where le.reader_id=v_user and (v_task.recurrence not in ('daily','weekly','monthly') or le.created_at>=v_period_start);
    when 'read_days' then
      select count(distinct (re.occurred_at at time zone 'UTC')::date) into v_metric from public.reading_events re
       where re.reader_id=v_user and re.event_type in ('chapter_opened','chapter_completed')
         and (v_task.recurrence not in ('daily','weekly','monthly') or re.occurred_at>=v_period_start);
    when 'echoes_sent' then
      select count(*) into v_metric from public.echoes e where e.reader_id=v_user
       and (v_task.recurrence not in ('daily','weekly','monthly') or e.created_at>=v_period_start);
    when 'story_count' then
      select count(*) into v_metric from public.stories s where s.author_id=v_user and s.status in ('ongoing','completed')
       and exists(select 1 from public.chapters c where c.story_id=s.id and c.is_published=true);
    else raise exception 'unsupported_task_verification_rule';
  end case;

  insert into public.user_task_progress(user_id,task_id,period_key,progress_value,target_value,status,completed_at)
  values(v_user,v_task.id,v_period,least(v_metric,2147483647)::integer,least(v_target,2147483647)::integer,
    case when v_metric>=v_target then 'completed' else 'in_progress' end,
    case when v_metric>=v_target then now() else null end)
  on conflict(user_id,task_id,period_key) do update set
    progress_value=case when public.user_task_progress.status='claimed' then public.user_task_progress.progress_value else excluded.progress_value end,
    target_value=excluded.target_value,
    status=case when public.user_task_progress.status='claimed' then 'claimed' when excluded.progress_value>=excluded.target_value then 'completed' else 'in_progress' end,
    completed_at=case when public.user_task_progress.status='claimed' then public.user_task_progress.completed_at when excluded.progress_value>=excluded.target_value then coalesce(public.user_task_progress.completed_at,now()) else null end,
    updated_at=now()
  returning * into v_progress;

  if v_metric<v_target then
    return jsonb_build_object('status','in_progress','progress',v_metric,'target',v_target);
  end if;
  if v_progress.status='claimed' then
    return jsonb_build_object('status','already_claimed','progress',v_metric,'target',v_target);
  end if;

  if v_task.reward_type='badge' then
    select * into v_badge from public.badge_catalog where id=v_task.reward_badge_id and is_active=true;
    if not found then raise exception 'task_badge_reward_unavailable'; end if;
    insert into public.user_badges(user_id,badge_id,cycle_key,award_source,award_note)
    values(v_user,v_badge.id,case when v_badge.repeatable and v_task.recurrence<>'once' then v_period else 'once' end,'task',v_task.task_slug)
    on conflict(user_id,badge_id,cycle_key) do nothing returning id into v_badge_inserted;
    if v_badge_inserted is not null then
      insert into public.notifications(user_id,message,link,category)
      values(v_user,'You earned the '||v_badge.name||' badge from a GidiReads task.','my-gidireads.html','system');
    end if;
  else
    v_currency:=v_task.reward_type;
    if v_currency not in ('g_coins','echoes_promotional','echoes_free','echoes_bonus','gidipasses') then
      raise exception 'unsupported_task_reward_type';
    end if;
    v_tx:=private.wallet_post(v_user,v_currency,v_task.reward_amount,'task_reward',
      'task:'||v_task.id::text||':'||v_period,'task',v_task.task_slug||':'||v_period,null,
      'Task reward: '||v_task.title,jsonb_build_object('task_id',v_task.id,'task_slug',v_task.task_slug,'period_key',v_period));
  end if;

  update public.user_task_progress set status='claimed',claimed_at=now(),updated_at=now() where id=v_progress.id;
  insert into public.notifications(user_id,message,link,category)
  values(v_user,'Task completed: '||v_task.title||'.','my-gidireads.html','system');
  return jsonb_build_object('status','claimed','progress',v_metric,'target',v_target,'reward_type',v_task.reward_type,'reward_amount',v_task.reward_amount,'reward_badge_id',v_task.reward_badge_id);
end;
$function$;
revoke all on function public.claim_gidireads_task(uuid) from public,anon;
grant execute on function public.claim_gidireads_task(uuid) to authenticated;

-- Gift autocomplete returns only public-facing identity fields. It does not
-- expose email, account IDs, private profile fields, or administrator accounts.
create or replace function public.gidireads_search_gift_recipients(p_query text)
returns table(username text,display_name text)
language sql
stable
security definer
set search_path=pg_catalog,public
as $function$
  select p.username,coalesce(nullif(btrim(p.display_name),''),p.username)
  from public.profiles p
  where auth.uid() is not null
    and p.id<>auth.uid()
    and p.account_status='active'
    and p.role<>'admin'
    and length(btrim(coalesce(p_query,''))) between 2 and 40
    and position('%' in btrim(p_query))=0
    and position('_' in btrim(p_query))=0
    and position(chr(92) in btrim(p_query))=0
    and (
      lower(coalesce(p.username,'')) like lower(btrim(p_query))||'%'
      or lower(coalesce(p.display_name,'')) like lower(btrim(p_query))||'%'
    )
  order by case when lower(coalesce(p.username,'')) like lower(btrim(p_query))||'%' then 0 else 1 end,
           lower(coalesce(p.username,''))
  limit 8;
$function$;
revoke all on function public.gidireads_search_gift_recipients(text) from public,anon;
grant execute on function public.gidireads_search_gift_recipients(text) to authenticated;

commit;
