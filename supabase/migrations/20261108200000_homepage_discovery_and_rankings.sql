-- GidiReads Batch 1 & 2: automatic discovery shelves, novel rankings and readerboard.
-- Rankings are based on verified chapter completions and recorded Echo activity.

create index if not exists chapters_public_story_updated_idx
  on public.chapters (story_id, updated_at desc)
  where is_published = true and archived_at is null;
create index if not exists completed_chapters_period_reader_idx
  on public.user_completed_chapters (completed_at desc, user_id, story_id);
create index if not exists reading_events_discovery_period_idx
  on public.reading_events (occurred_at desc, event_type, story_id, reader_id);
create index if not exists echoes_discovery_period_idx
  on public.echoes (created_at desc, chapter_id, reader_id);
create index if not exists echo_support_discovery_period_idx
  on public.echo_support_events (created_at desc, story_id, chapter_id);
create index if not exists reading_progress_completion_period_idx
  on public.reading_progress (completed_at desc, reader_id, story_id)
  where completed_at is not null;

create or replace function public.gidireads_homepage_shelf(
  p_shelf text,
  p_limit integer default 6
)
returns table (
  id uuid,
  title text,
  description text,
  primary_genre text,
  cover_url text,
  reads integer,
  echo_count integer,
  created_at timestamptz,
  first_published_at timestamptz,
  author_username text,
  author_display_name text,
  chapter_count bigint,
  latest_chapter_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if coalesce(p_shelf, '') not in ('recently_updated', 'new_releases') then
    raise exception 'unsupported_homepage_shelf' using errcode = '22023';
  end if;

  return query
  with chapter_stats as (
    select
      c.story_id,
      count(*)::bigint as chapter_count,
      max(coalesce(c.updated_at, c.published_at, c.created_at)) as latest_chapter_at,
      min(coalesce(c.published_at, c.created_at)) as first_chapter_at
    from public.chapters c
    where c.is_published = true
      and c.archived_at is null
    group by c.story_id
  )
  select
    s.id,
    s.title,
    s.description,
    s.primary_genre,
    s.cover_url,
    coalesce(s.reads, 0)::integer,
    coalesce(s.echo_count, 0)::integer,
    s.created_at,
    coalesce(s.first_published_at, cs.first_chapter_at),
    p.username,
    p.display_name,
    cs.chapter_count,
    cs.latest_chapter_at
  from public.stories s
  join chapter_stats cs on cs.story_id = s.id
  left join public.profiles p on p.id = s.author_id
  where s.status <> 'draft'
  order by
    case when p_shelf = 'recently_updated' then cs.latest_chapter_at end desc nulls last,
    case when p_shelf = 'new_releases' then coalesce(s.first_published_at, cs.first_chapter_at, s.created_at) end desc nulls last,
    s.id
  limit least(greatest(coalesce(p_limit, 6), 1), 100);
end;
$function$;

create or replace function public.gidireads_novel_rankings(
  p_period text default 'weekly',
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  rank bigint,
  story_id uuid,
  title text,
  cover_url text,
  primary_genre text,
  author_username text,
  author_display_name text,
  chapter_count bigint,
  completed_chapters bigint,
  unique_readers bigint,
  echoes bigint,
  rank_score numeric
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_from timestamptz;
begin
  if lower(coalesce(p_period, 'weekly')) not in ('weekly','monthly','90d','180d','all') then
    raise exception 'unsupported_ranking_period' using errcode = '22023';
  end if;
  v_from := case lower(coalesce(p_period, 'weekly'))
    when 'weekly' then now() - interval '7 days'
    when 'monthly' then now() - interval '30 days'
    when '90d' then now() - interval '90 days'
    when '180d' then now() - interval '180 days'
    else '-infinity'::timestamptz
  end;

  return query
  with chapter_stats as (
    select c.story_id, count(*)::bigint as chapter_count
    from public.chapters c
    where c.is_published = true and c.archived_at is null
    group by c.story_id
  ),
  completions as (
    select ucc.story_id,
      count(*)::bigint as completed_chapters,
      count(distinct ucc.user_id)::bigint as completing_readers
    from public.user_completed_chapters ucc
    join public.chapters c on c.id = ucc.chapter_id
      and c.story_id = ucc.story_id
      and c.is_published = true
      and c.archived_at is null
    where ucc.completed_at >= v_from
    group by ucc.story_id
  ),
  readers as (
    select re.story_id, count(distinct re.reader_id)::bigint as unique_readers
    from public.reading_events re
    join public.stories s on s.id = re.story_id and s.author_id <> re.reader_id
    where re.occurred_at >= v_from
      and re.event_type in ('story_opened', 'chapter_opened')
      and re.reader_id is not null
    group by re.story_id
  ),
  echo_activity as (
    select c.story_id, count(*)::bigint as echo_count
    from public.echoes e
    join public.chapters c on c.id = e.chapter_id
      and c.is_published = true and c.archived_at is null
    join public.stories s on s.id = c.story_id and s.author_id <> e.reader_id
    where e.created_at >= v_from
    group by c.story_id
    union all
    select x.story_id, count(*)::bigint as echo_count
    from public.echo_support_events x
    join public.stories s on s.id = x.story_id and s.author_id <> x.sender_id
    where x.created_at >= v_from and x.chapter_id is null
    group by x.story_id
  ),
  echo_totals as (
    select ea.story_id, sum(ea.echo_count)::bigint as echoes
    from echo_activity ea group by ea.story_id
  ),
  metrics as (
    select s.id as story_id, s.title, s.cover_url, s.primary_genre,
      p.username as author_username, p.display_name as author_display_name,
      cs.chapter_count,
      coalesce(c.completed_chapters, 0)::bigint as completed_chapters,
      coalesce(r.unique_readers, 0)::bigint as unique_readers,
      coalesce(et.echoes, 0)::bigint as echoes,
      (coalesce(c.completed_chapters, 0) * 5
        + coalesce(r.unique_readers, 0) * 2
        + coalesce(et.echoes, 0) * 2)::numeric as rank_score
    from public.stories s
    join chapter_stats cs on cs.story_id = s.id
    left join public.profiles p on p.id = s.author_id
    left join completions c on c.story_id = s.id
    left join readers r on r.story_id = s.id
    left join echo_totals et on et.story_id = s.id
    where s.status <> 'draft'
  ),
  ranked as (
    select row_number() over (order by m.rank_score desc, m.completed_chapters desc,
      m.unique_readers desc, m.echoes desc, m.title asc) as row_rank, m.*
    from metrics m
    where m.rank_score > 0
  )
  select r.row_rank, r.story_id, r.title, r.cover_url, r.primary_genre,
    r.author_username, r.author_display_name, r.chapter_count,
    r.completed_chapters, r.unique_readers, r.echoes, r.rank_score
  from ranked r
  where r.row_rank > greatest(coalesce(p_offset, 0), 0)
    and r.row_rank <= greatest(coalesce(p_offset, 0), 0) + least(greatest(coalesce(p_limit, 100), 1), 500)
  order by r.row_rank;
end;
$function$;

create or replace function public.gidireads_readerboard(
  p_period text default 'weekly', p_limit integer default 100, p_offset integer default 0
)
returns table (
  rank bigint, user_id uuid, username text, display_name text, avatar_url text,
  chapters_read bigint, active_days bigint, current_streak bigint, completed_novels bigint, rank_score numeric
)
language plpgsql stable security definer set search_path = pg_catalog, public
as $function$
declare v_from timestamptz;
begin
  if lower(coalesce(p_period,'weekly')) not in ('weekly','monthly','90d','180d','all') then
    raise exception 'unsupported_readerboard_period' using errcode = '22023';
  end if;
  v_from := case lower(coalesce(p_period,'weekly'))
    when 'weekly' then now()-interval '7 days'
    when 'monthly' then now()-interval '30 days'
    when '90d' then now()-interval '90 days'
    when '180d' then now()-interval '180 days'
    else '-infinity'::timestamptz end;
  return query
  with valid_completions as (
    select ucc.user_id,ucc.story_id,ucc.completed_at
    from public.user_completed_chapters ucc
    join public.chapters c on c.id=ucc.chapter_id and c.story_id=ucc.story_id
      and c.is_published=true and c.archived_at is null
    where ucc.completed_at>=v_from
  ), chapter_totals as (
    select vc.user_id,count(*)::bigint as chapters_read from valid_completions vc group by vc.user_id
  ), daily as (
    select distinct rs.reader_id as user_id,(rs.started_at at time zone 'Africa/Lagos')::date as activity_day
    from public.reading_sessions rs
    join public.chapters c on c.id=rs.chapter_id and c.story_id=rs.story_id
      and c.is_published=true and c.archived_at is null
    join public.stories s on s.id=rs.story_id and s.author_id<>rs.reader_id
    where rs.started_at>=v_from
      and (rs.max_chapter_progress>=20 or (rs.active_seconds>=45 and rs.max_chapter_progress>=5))
  ), active_day_totals as (
    select d.user_id,count(*)::bigint as active_days from daily d group by d.user_id
  ), islands as (
    select d.user_id,d.activity_day,
      d.activity_day-(row_number() over(partition by d.user_id order by d.activity_day))::integer as island_key
    from daily d
  ), streaks as (
    select i.user_id,count(*)::bigint as current_streak from islands i
    group by i.user_id,i.island_key
    having max(i.activity_day)>=(now() at time zone 'Africa/Lagos')::date-1
  ), current_streaks as (
    select st.user_id,max(st.current_streak)::bigint as current_streak from streaks st group by st.user_id
  ), novel_totals as (
    select rp.reader_id as user_id,count(distinct rp.story_id)::bigint as completed_novels
    from public.reading_progress rp
    where rp.completed_at is not null and rp.completed_at>=v_from
      and exists (
        select 1 from public.user_completed_chapters ucc
        join public.chapters c on c.id=ucc.chapter_id and c.story_id=ucc.story_id
          and c.is_published=true and c.archived_at is null
        where ucc.user_id=rp.reader_id and ucc.story_id=rp.story_id
      )
    group by rp.reader_id
  ), metrics as (
    select p.id as user_id,p.username,p.display_name,p.avatar_url,
      coalesce(ct.chapters_read,0)::bigint as chapters_read,
      coalesce(ad.active_days,0)::bigint as active_days,
      coalesce(cs.current_streak,0)::bigint as current_streak,
      coalesce(nt.completed_novels,0)::bigint as completed_novels,
      (coalesce(ct.chapters_read,0)*10+coalesce(ad.active_days,0)*2
        +coalesce(cs.current_streak,0)*3+coalesce(nt.completed_novels,0)*5)::numeric as rank_score
    from public.profiles p
    left join chapter_totals ct on ct.user_id=p.id
    left join active_day_totals ad on ad.user_id=p.id
    left join current_streaks cs on cs.user_id=p.id
    left join novel_totals nt on nt.user_id=p.id
    where p.account_status='active'
  ), ranked as (
    select row_number() over(order by m.rank_score desc,m.chapters_read desc,m.current_streak desc,m.username asc) as row_rank,m.*
    from metrics m where m.rank_score>0
  )
  select r.row_rank,r.user_id,r.username,r.display_name,r.avatar_url,r.chapters_read,r.active_days,r.current_streak,r.completed_novels,r.rank_score
  from ranked r
  where r.row_rank>greatest(coalesce(p_offset,0),0)
    and r.row_rank<=greatest(coalesce(p_offset,0),0)+least(greatest(coalesce(p_limit,100),1),500)
  order by r.row_rank;
end;
$function$;

revoke all on function public.gidireads_homepage_shelf(text, integer) from public, anon, authenticated;
revoke all on function public.gidireads_novel_rankings(text, integer, integer) from public, anon, authenticated;
revoke all on function public.gidireads_readerboard(text, integer, integer) from public, anon, authenticated;
grant execute on function public.gidireads_homepage_shelf(text, integer) to anon, authenticated;
grant execute on function public.gidireads_novel_rankings(text, integer, integer) to anon, authenticated;
grant execute on function public.gidireads_readerboard(text, integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';
