-- Count a completed novel only when the reader has a verified completed chapter in that story.
create or replace function public.gidireads_readerboard(
  p_period text default 'weekly',
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  chapters_read bigint,
  active_days bigint,
  current_streak bigint,
  completed_novels bigint,
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
    raise exception 'unsupported_readerboard_period' using errcode = '22023';
  end if;
  v_from := case lower(coalesce(p_period, 'weekly'))
    when 'weekly' then now() - interval '7 days'
    when 'monthly' then now() - interval '30 days'
    when '90d' then now() - interval '90 days'
    when '180d' then now() - interval '180 days'
    else '-infinity'::timestamptz
  end;

  return query
  with valid_completions as (
    select ucc.user_id, ucc.story_id, ucc.completed_at,
      (ucc.completed_at at time zone 'Africa/Lagos')::date as activity_day
    from public.user_completed_chapters ucc
    join public.chapters c on c.id = ucc.chapter_id
      and c.story_id = ucc.story_id
      and c.is_published = true and c.archived_at is null
    where ucc.completed_at >= v_from
  ),
  chapter_totals as (
    select vc.user_id, count(*)::bigint as chapters_read,
      count(distinct vc.activity_day)::bigint as active_days
    from valid_completions vc group by vc.user_id
  ),
  daily as (
    select distinct ucc.user_id,
      (ucc.completed_at at time zone 'Africa/Lagos')::date as activity_day
    from public.user_completed_chapters ucc
    join public.chapters c on c.id = ucc.chapter_id
      and c.story_id = ucc.story_id
      and c.is_published = true and c.archived_at is null
    where ucc.completed_at >= v_from
  ),
  islands as (
    select d.user_id, d.activity_day,
      d.activity_day - (row_number() over (partition by d.user_id order by d.activity_day))::integer as island_key
    from daily d
  ),
  streaks as (
    select i.user_id, count(*)::bigint as current_streak
    from islands i
    group by i.user_id, i.island_key
    having max(i.activity_day) >= (now() at time zone 'Africa/Lagos')::date - 1
  ),
  current_streaks as (
    select st.user_id, max(st.current_streak)::bigint as current_streak
    from streaks st group by st.user_id
  ),
  novel_totals as (
    select rp.reader_id as user_id, count(distinct rp.story_id)::bigint as completed_novels
    from public.reading_progress rp
    where rp.completed_at is not null and rp.completed_at >= v_from
      and exists (
        select 1 from public.user_completed_chapters ucc
        join public.chapters c on c.id = ucc.chapter_id and c.story_id = ucc.story_id
          and c.is_published = true and c.archived_at is null
        where ucc.user_id = rp.reader_id and ucc.story_id = rp.story_id
      )
    group by rp.reader_id
  ),
  metrics as (
    select p.id as user_id, p.username, p.display_name, p.avatar_url,
      coalesce(ct.chapters_read, 0)::bigint as chapters_read,
      coalesce(ct.active_days, 0)::bigint as active_days,
      coalesce(cs.current_streak, 0)::bigint as current_streak,
      coalesce(nt.completed_novels, 0)::bigint as completed_novels,
      (coalesce(ct.chapters_read, 0) * 5
        + coalesce(ct.active_days, 0) * 2
        + coalesce(cs.current_streak, 0) * 3
        + coalesce(nt.completed_novels, 0) * 10)::numeric as rank_score
    from public.profiles p
    left join chapter_totals ct on ct.user_id = p.id
    left join current_streaks cs on cs.user_id = p.id
    left join novel_totals nt on nt.user_id = p.id
    where p.account_status = 'active'
  ),
  ranked as (
    select row_number() over (order by m.rank_score desc, m.chapters_read desc,
      m.current_streak desc, m.username asc) as row_rank, m.*
    from metrics m
    where m.rank_score > 0
  )
  select r.row_rank, r.user_id, r.username, r.display_name, r.avatar_url,
    r.chapters_read, r.active_days, r.current_streak, r.completed_novels, r.rank_score
  from ranked r
  where r.row_rank > greatest(coalesce(p_offset, 0), 0)
    and r.row_rank <= greatest(coalesce(p_offset, 0), 0) + least(greatest(coalesce(p_limit, 100), 1), 500)
  order by r.row_rank;
end;
$function$;

notify pgrst, 'reload schema';
