-- GidiReads Batch 3: verified Echo analytics + private, optional country reporting.
-- Applied to the GidiReads production project after schema and dependency checks.
-- No payment, payout, wallet-balance, or monetisation changes are included.

-- Country-level readership data is stored separately from public profiles.
-- The deployed reader endpoint records only the two-letter country code supplied
-- by the hosting platform; it never stores the reader IP address.
create table if not exists public.reader_country_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country_code text,
  analytics_opt_in boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint reader_country_preferences_country_code_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint reader_country_preferences_opt_in_country_check
    check (not analytics_opt_in or country_code is not null)
);

alter table public.reader_country_preferences enable row level security;
revoke all on public.reader_country_preferences from anon, public;
grant select, insert, update, delete on public.reader_country_preferences to authenticated;

drop policy if exists reader_country_preferences_owner_access on public.reader_country_preferences;
create policy reader_country_preferences_owner_access
  on public.reader_country_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Correct Echo totals without double-counting chapter-level support.
-- Chapter-level support is already mirrored into public.echoes by the send RPC.
-- Novel-level support has no chapter row, so its amount is added separately.
create or replace function public.author_story_echo_summary(
  p_story_id uuid,
  p_days integer default 30
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_days integer := greatest(1, least(coalesce(p_days, 30), 3650));
  v_from timestamptz;
  v_to timestamptz := now();
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.stories s
    join public.creator_contracts c on c.story_id = s.id and c.author_id = v_user
    where s.id = p_story_id
      and s.author_id = v_user
      and c.status = 'active'
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at >= now())
  ) then
    raise exception 'No active contract was found for this story' using errcode = '42501';
  end if;

  v_from := case when p_days is null or p_days <= 0
    then 'epoch'::timestamptz
    else v_to - make_interval(days => v_days)
  end;

  with chapter_echoes as (
    select e.reader_id, e.created_at, c.story_id
    from public.echoes e
    join public.chapters c on c.id = e.chapter_id
    where c.story_id = p_story_id
      and e.created_at >= v_from and e.created_at <= v_to
  ),
  story_support as (
    select x.sender_id, x.amount, x.created_at
    from public.echo_support_events x
    where x.story_id = p_story_id
      and x.chapter_id is null
      and x.created_at >= v_from and x.created_at <= v_to
  ),
  previous_chapter_echoes as (
    select e.reader_id, e.created_at
    from public.echoes e
    join public.chapters c on c.id = e.chapter_id
    where c.story_id = p_story_id
      and p_days is not null and p_days > 0
      and e.created_at >= v_from - make_interval(days => v_days)
      and e.created_at < v_from
  ),
  previous_story_support as (
    select x.sender_id, x.amount, x.created_at
    from public.echo_support_events x
    where x.story_id = p_story_id
      and x.chapter_id is null
      and p_days is not null and p_days > 0
      and x.created_at >= v_from - make_interval(days => v_days)
      and x.created_at < v_from
  ),
  series as (
    select ds.day::date as day,
      (select count(*) from chapter_echoes ce where ce.created_at::date = ds.day::date)
      + (select coalesce(sum(ss.amount), 0) from story_support ss where ss.created_at::date = ds.day::date) as echoes
    from generate_series(
      greatest(v_from::date, (v_to - interval '365 days')::date),
      v_to::date,
      interval '1 day'
    ) as ds(day)
  ),
  senders as (
    select reader_id as sender_id from chapter_echoes
    union
    select sender_id from story_support
  )
  select jsonb_build_object(
    'echoes', (select count(*) from chapter_echoes) + (select coalesce(sum(amount), 0) from story_support),
    'unique_echo_senders', (select count(*) from senders),
    'previous_echoes', case when p_days is null or p_days <= 0 then null else
      (select count(*) from previous_chapter_echoes) + (select coalesce(sum(amount), 0) from previous_story_support)
    end,
    'series', (select coalesce(jsonb_agg(to_jsonb(series) order by day), '[]'::jsonb) from series)
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.author_story_echo_summary(uuid, integer) from public, anon;
grant execute on function public.author_story_echo_summary(uuid, integer) to authenticated;

-- Country results are anonymous aggregates only. A country is shown only when
-- at least five opted-in readers from that country have read the selected story.
create or replace function public.author_story_country_distribution(
  p_story_id uuid,
  p_days integer default 30
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_days integer := greatest(1, least(coalesce(p_days, 30), 3650));
  v_from timestamptz;
  v_to timestamptz := now();
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.stories s
    join public.creator_contracts c on c.story_id = s.id and c.author_id = v_user
    where s.id = p_story_id
      and s.author_id = v_user
      and c.status = 'active'
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at >= now())
  ) then
    raise exception 'No active contract was found for this story' using errcode = '42501';
  end if;

  v_from := case when p_days is null or p_days <= 0
    then 'epoch'::timestamptz
    else v_to - make_interval(days => v_days)
  end;

  with readers as (
    select distinct re.reader_id
    from public.reading_events re
    where re.story_id = p_story_id
      and re.reader_id is not null
      and re.event_type in ('story_opened', 'chapter_opened')
      and re.occurred_at >= v_from and re.occurred_at <= v_to
  ),
  country_counts as (
    select pref.country_code, count(distinct r.reader_id)::integer as reader_count
    from readers r
    join public.reader_country_preferences pref
      on pref.user_id = r.reader_id
     and pref.analytics_opt_in = true
     and pref.country_code is not null
    group by pref.country_code
    having count(distinct r.reader_id) >= 5
  ),
  totals as (
    select coalesce(sum(reader_count), 0)::numeric as visible_readers from country_counts
  )
  select jsonb_build_object(
    'available', exists(select 1 from country_counts),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'country_code', cc.country_code,
        'reader_count', cc.reader_count,
        'share_percent', round(cc.reader_count::numeric * 100 / nullif(t.visible_readers, 0), 1)
      ) order by cc.reader_count desc, cc.country_code)
      from country_counts cc cross join totals t
    ), '[]'::jsonb),
    'reason', case when exists(select 1 from country_counts)
      then null
      else 'Country totals will appear once at least five readers from a country have read this story.'
    end
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.author_story_country_distribution(uuid, integer) from public, anon;
grant execute on function public.author_story_country_distribution(uuid, integer) to authenticated;

-- Tell applicants when the AE team has made a decision.
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
  v_status_changed boolean;
begin
  if not exists (select 1 from public.profiles where id = v_admin and role = 'admin') then
    raise exception 'not_authorized';
  end if;
  if p_status not in ('in_review', 'approved', 'rejected') then
    raise exception 'invalid_status';
  end if;
  select * into v_app from public.ae_applications where id = p_application_id for update;
  if v_app.id is null then raise exception 'application_not_found'; end if;
  v_status_changed := v_app.status is distinct from p_status;

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
    if v_status_changed then
      insert into public.notifications(user_id, message, link, category)
      values (v_app.user_id, 'Your Acquisition Editor application has been approved. Your AE workspace is ready.', 'ae.html', 'system');
    end if;
  elsif p_status = 'rejected' then
    update public.staff_assignments
    set is_active = false, assigned_by = v_admin, updated_at = now()
    where user_id = v_app.user_id and role_key = 'acquisitions_editor';
    if v_status_changed then
      insert into public.notifications(user_id, message, link, category)
      values (v_app.user_id, 'Your Acquisition Editor application has been reviewed. Open your application page to read the decision.', 'ae-apply.html', 'system');
    end if;
  end if;

  return jsonb_build_object('success', true, 'status', p_status, 'user_id', v_app.user_id);
end;
$function$;
revoke all on function public.admin_review_ae_application(uuid, text, text) from public, anon;
grant execute on function public.admin_review_ae_application(uuid, text, text) to authenticated;

-- Notify both sides when an author is assigned to an approved AE.
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
  if not exists (select 1 from public.profiles where id = v_admin and role = 'admin') then
    raise exception 'not_authorized';
  end if;
  if p_active and not exists (
    select 1 from public.staff_assignments
    where user_id = p_ae_user_id and role_key = 'acquisitions_editor' and is_active = true
  ) then raise exception 'ae_not_approved'; end if;
  if p_active and not exists (
    select 1 from public.creator_contracts
    where author_id = p_author_id
      and status = 'active'
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
  ) then raise exception 'author_has_no_active_contract'; end if;

  select coalesce(is_active, false) into v_was_active
  from public.ae_author_assignments
  where ae_user_id = p_ae_user_id and author_id = p_author_id
  for update;

  insert into public.ae_author_assignments(ae_user_id, author_id, assigned_by, is_active, updated_at)
  values (p_ae_user_id, p_author_id, v_admin, p_active, now())
  on conflict (ae_user_id, author_id) do update
    set assigned_by = excluded.assigned_by, is_active = excluded.is_active, updated_at = now();

  if p_active and not coalesce(v_was_active, false) then
    select coalesce(display_name, username, 'your author') into v_author_name from public.profiles where id = p_author_id;
    select coalesce(display_name, username, 'your editor') into v_ae_name from public.profiles where id = p_ae_user_id;
    insert into public.notifications(user_id, actor_id, message, link, category)
    values
      (p_ae_user_id, v_admin, 'You have been assigned to support ' || coalesce(v_author_name, 'an author') || '. Open your AE workspace to view their contracted stories.', 'ae.html', 'system'),
      (p_author_id, v_admin, coalesce(v_ae_name, 'An Acquisition Editor') || ' has been assigned to support your contracted stories.', 'authors-studio.html', 'system');
  end if;

  return jsonb_build_object('success', true, 'active', p_active);
end;
$function$;
revoke all on function public.admin_assign_ae_author(uuid, uuid, boolean) from public, anon;
grant execute on function public.admin_assign_ae_author(uuid, uuid, boolean) to authenticated;

-- Include the author's avatar and keep all active contract states visible to the assigned AE.
create or replace function public.ae_get_workspace()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null or not exists (
    select 1 from public.staff_assignments
    where user_id = v_user and role_key = 'acquisitions_editor' and is_active = true
  ) then raise exception 'not_authorized'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'story_id', s.id,
    'story_title', s.title,
    'author_id', p.id,
    'author_name', coalesce(p.display_name, p.username, 'GidiReads author'),
    'author_avatar_url', p.avatar_url,
    'contract_type', cc.contract_type,
    'contract_status', cc.status,
    'chapter_count', coalesce(ch.chapter_count, 0),
    'word_count', coalesce(ch.word_count, 0)
  ) order by s.title), '[]'::jsonb) into v_result
  from public.ae_author_assignments aa
  join public.creator_contracts cc on cc.author_id = aa.author_id
    and cc.status = 'active'
    and (cc.starts_at is null or cc.starts_at <= now())
    and (cc.ends_at is null or cc.ends_at >= now())
  join public.stories s on s.id = cc.story_id
  join public.profiles p on p.id = aa.author_id
  left join lateral (
    select
      count(*) filter (where c.is_published = true) as chapter_count,
      coalesce(sum(array_length(regexp_split_to_array(trim(coalesce(c.content, '')), '\s+'), 1)) filter (where c.is_published = true), 0) as word_count
    from public.chapters c where c.story_id = s.id
  ) ch on true
  where aa.ae_user_id = v_user and aa.is_active = true;

  return v_result;
end;
$function$;
revoke all on function public.ae_get_workspace() from public, anon;
grant execute on function public.ae_get_workspace() to authenticated;

notify pgrst, 'reload schema';

-- Allow valid usernames containing underscores in gift-recipient search.
-- Prefix matching uses LEFT() rather than LIKE, so %, _ and backslashes are safe.
create or replace function public.gidireads_search_gift_recipients(p_query text)
returns table(username text, display_name text)
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
  select p.username, coalesce(nullif(btrim(p.display_name), ''), p.username)
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.account_status = 'active'
    and p.role <> 'admin'
    and length(btrim(coalesce(p_query, ''))) between 2 and 40
    and (
      left(lower(coalesce(p.username, '')), length(btrim(p_query))) = lower(btrim(p_query))
      or left(lower(coalesce(p.display_name, '')), length(btrim(p_query))) = lower(btrim(p_query))
    )
  order by
    case when left(lower(coalesce(p.username, '')), length(btrim(p_query))) = lower(btrim(p_query)) then 0 else 1 end,
    lower(coalesce(p.username, ''))
  limit 8;
$function$;
revoke all on function public.gidireads_search_gift_recipients(text) from public, anon;
grant execute on function public.gidireads_search_gift_recipients(text) to authenticated;

notify pgrst, 'reload schema';

-- Authors can share selected drafts with an AE who is already assigned to them.
-- The AE can read only the draft that was explicitly shared.
create table if not exists public.ae_draft_shares (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  ae_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  shared_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (story_id, author_id, ae_user_id)
);
create index if not exists ae_draft_shares_ae_idx
  on public.ae_draft_shares(ae_user_id, shared_at desc) where status = 'active';

alter table public.ae_draft_shares enable row level security;
revoke all on public.ae_draft_shares from public, anon, authenticated;

create or replace function public.author_get_assigned_aes()
returns table(ae_user_id uuid, display_name text, username text, avatar_url text)
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
  select p.id, coalesce(nullif(btrim(p.display_name), ''), p.username), p.username, p.avatar_url
  from public.ae_author_assignments aa
  join public.staff_assignments sa on sa.user_id = aa.ae_user_id
    and sa.role_key = 'acquisitions_editor' and sa.is_active = true
  join public.profiles p on p.id = aa.ae_user_id
  where aa.author_id = auth.uid() and aa.is_active = true
  order by coalesce(nullif(btrim(p.display_name), ''), p.username);
$function$;
revoke all on function public.author_get_assigned_aes() from public, anon;
grant execute on function public.author_get_assigned_aes() to authenticated;

create or replace function public.author_share_draft_with_ae(p_story_id uuid, p_ae_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_story public.stories%rowtype;
  v_author_name text;
  v_was_active boolean := false;
  v_share_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into v_story from public.stories where id = p_story_id and author_id = v_user for update;
  if not found then raise exception 'story_not_found_or_not_owned'; end if;
  if not exists (
    select 1 from public.ae_author_assignments aa
    join public.staff_assignments sa on sa.user_id = aa.ae_user_id
      and sa.role_key = 'acquisitions_editor' and sa.is_active = true
    where aa.author_id = v_user and aa.ae_user_id = p_ae_user_id and aa.is_active = true
  ) then raise exception 'editor_not_assigned'; end if;
  if v_story.status <> 'draft' and not exists (
    select 1 from public.chapters c
    where c.story_id = p_story_id and c.is_published = false and c.archived_at is null
  ) then raise exception 'no_draft_chapters_to_share'; end if;

  select coalesce(status = 'active', false) into v_was_active
  from public.ae_draft_shares where story_id = p_story_id and author_id = v_user and ae_user_id = p_ae_user_id
  for update;

  insert into public.ae_draft_shares(story_id, author_id, ae_user_id, status, shared_at, revoked_at)
  values (p_story_id, v_user, p_ae_user_id, 'active', now(), null)
  on conflict (story_id, author_id, ae_user_id) do update
    set status = 'active', shared_at = now(), revoked_at = null
  returning id into v_share_id;

  select coalesce(nullif(btrim(display_name), ''), username, 'an author')
    into v_author_name from public.profiles where id = v_user;
  if not coalesce(v_was_active, false) then
    insert into public.notifications(user_id, actor_id, message, link, category)
    values (p_ae_user_id, v_user,
      'A draft of “' || coalesce(v_story.title, 'a story') || '” has been shared with you by ' || coalesce(v_author_name, 'an assigned author') || '.',
      'ae.html?pane=drafts', 'system');
  end if;

  return jsonb_build_object('success', true, 'share_id', v_share_id);
end;
$function$;
revoke all on function public.author_share_draft_with_ae(uuid, uuid) from public, anon;
grant execute on function public.author_share_draft_with_ae(uuid, uuid) to authenticated;

create or replace function public.ae_get_shared_drafts()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null or not exists (
    select 1 from public.staff_assignments
    where user_id = v_user and role_key = 'acquisitions_editor' and is_active = true
  ) then raise exception 'not_authorized'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'story_id', s.id,
    'story_title', s.title,
    'author_id', p.id,
    'author_name', coalesce(p.display_name, p.username, 'GidiReads author'),
    'author_avatar_url', p.avatar_url,
    'shared_at', ds.shared_at,
    'draft_chapter_count', coalesce(ch.chapter_count, 0)
  ) order by ds.shared_at desc), '[]'::jsonb) into v_result
  from public.ae_draft_shares ds
  join public.stories s on s.id = ds.story_id and s.author_id = ds.author_id
  join public.profiles p on p.id = ds.author_id
  left join lateral (
    select count(*) as chapter_count
    from public.chapters c
    where c.story_id = s.id and c.is_published = false and c.archived_at is null
  ) ch on true
  where ds.ae_user_id = v_user and ds.status = 'active'
    and exists (select 1 from public.ae_author_assignments aa where aa.ae_user_id = v_user and aa.author_id = ds.author_id and aa.is_active = true)
    and exists (select 1 from public.staff_assignments sa where sa.user_id = v_user and sa.role_key = 'acquisitions_editor' and sa.is_active = true);

  return v_result;
end;
$function$;
revoke all on function public.ae_get_shared_drafts() from public, anon;
grant execute on function public.ae_get_shared_drafts() to authenticated;

create or replace function public.ae_get_shared_draft(p_story_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null or not exists (
    select 1
    from public.ae_draft_shares ds
    join public.ae_author_assignments aa on aa.ae_user_id = ds.ae_user_id
      and aa.author_id = ds.author_id and aa.is_active = true
    join public.stories shared_story on shared_story.id = ds.story_id and shared_story.author_id = ds.author_id
    join public.staff_assignments sa on sa.user_id = ds.ae_user_id
      and sa.role_key = 'acquisitions_editor' and sa.is_active = true
    where ds.story_id = p_story_id and ds.ae_user_id = v_user and ds.status = 'active'
  ) then raise exception 'draft_not_shared_with_this_editor' using errcode = '42501'; end if;

  select jsonb_build_object(
    'story', jsonb_build_object(
      'id', s.id, 'title', s.title, 'description', s.description,
      'author_id', p.id, 'author_name', coalesce(p.display_name, p.username, 'GidiReads author'),
      'author_avatar_url', p.avatar_url
    ),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'chapter_number', c.chapter_number, 'title', c.title,
        'content', c.content, 'updated_at', c.updated_at
      ) order by c.chapter_number, c.created_at)
      from public.chapters c
      where c.story_id = s.id and c.is_published = false and c.archived_at is null
    ), '[]'::jsonb)
  ) into v_result
  from public.stories s
  join public.profiles p on p.id = s.author_id
  where s.id = p_story_id;

  return v_result;
end;
$function$;
revoke all on function public.ae_get_shared_draft(uuid) from public, anon;
grant execute on function public.ae_get_shared_draft(uuid) to authenticated;

notify pgrst, 'reload schema';
