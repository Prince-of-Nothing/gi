-- Superseding correction applied after the first live function test.
-- The echoes table stores chapter_id; story_id is obtained through chapters.
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
    where e.created_at >= v_from
    group by c.story_id
    union all
    select x.story_id, count(*)::bigint as echo_count
    from public.echo_support_events x
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

notify pgrst, 'reload schema';
