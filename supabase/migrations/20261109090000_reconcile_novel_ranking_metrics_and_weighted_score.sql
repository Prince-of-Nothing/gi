-- Reconcile novel ranking metrics and use a normalized 50/30/20 score.
-- Published chapter completions: 50%; qualifying unique readers: 30%;
-- external Echo support units: 20%.
create or replace function private.gidireads_novel_rankings_impl(
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
    select ucc.story_id, count(*)::bigint as completed_chapters
    from public.user_completed_chapters ucc
    join public.chapters c on c.id = ucc.chapter_id
      and c.story_id = ucc.story_id
      and c.is_published = true
      and c.archived_at is null
    join public.stories s on s.id = ucc.story_id
      and s.author_id <> ucc.user_id
    where ucc.completed_at >= v_from
    group by ucc.story_id
  ),
  readers as (
    select rs.story_id, count(distinct rs.reader_id)::bigint as unique_readers
    from public.reading_sessions rs
    join public.chapters c on c.id = rs.chapter_id
      and c.story_id = rs.story_id
      and c.is_published = true
      and c.archived_at is null
    join public.stories s on s.id = rs.story_id
      and s.author_id <> rs.reader_id
    where rs.started_at >= v_from
      and (rs.max_chapter_progress >= 20
        or (rs.active_seconds >= 45 and rs.max_chapter_progress >= 5))
    group by rs.story_id
  ),
  echo_activity as (
    -- One row in echoes represents one Echo transaction.
    select c.story_id, count(*)::bigint as echo_units
    from public.echoes e
    join public.chapters c on c.id = e.chapter_id
      and c.is_published = true
      and c.archived_at is null
    join public.stories s on s.id = c.story_id
      and s.author_id <> e.reader_id
    where e.created_at >= v_from
    group by c.story_id

    union all

    -- Chapterless support stores the number of Echo units in amount.
    select x.story_id, sum(x.amount)::bigint as echo_units
    from public.echo_support_events x
    join public.stories s on s.id = x.story_id
      and s.author_id <> x.sender_id
    where x.created_at >= v_from
      and x.chapter_id is null
    group by x.story_id
  ),
  echo_totals as (
    select ea.story_id, sum(ea.echo_units)::bigint as echoes
    from echo_activity ea
    group by ea.story_id
  ),
  metrics as (
    select
      s.id as story_id,
      s.title,
      s.cover_url,
      s.primary_genre,
      p.username as author_username,
      p.display_name as author_display_name,
      cs.chapter_count,
      coalesce(c.completed_chapters, 0)::bigint as completed_chapters,
      coalesce(r.unique_readers, 0)::bigint as unique_readers,
      coalesce(et.echoes, 0)::bigint as echoes
    from public.stories s
    join chapter_stats cs on cs.story_id = s.id
    left join public.profiles p on p.id = s.author_id
    left join completions c on c.story_id = s.id
    left join readers r on r.story_id = s.id
    left join echo_totals et on et.story_id = s.id
    where s.status <> 'draft'
  ),
  scored as (
    select m.*,
      (
        50.0 * m.completed_chapters / nullif(max(m.completed_chapters) over (), 0)
        + 30.0 * m.unique_readers / nullif(max(m.unique_readers) over (), 0)
        + 20.0 * m.echoes / nullif(max(m.echoes) over (), 0)
      )::numeric as rank_score
    from metrics m
  ),
  ranked as (
    select
      row_number() over (
        order by sc.rank_score desc,
          sc.completed_chapters desc,
          sc.unique_readers desc,
          sc.echoes desc,
          sc.title asc
      ) as row_rank,
      sc.*
    from scored sc
    where sc.completed_chapters > 0
      or sc.unique_readers > 0
      or sc.echoes > 0
  )
  select
    r.row_rank,
    r.story_id,
    r.title,
    r.cover_url,
    r.primary_genre,
    r.author_username,
    r.author_display_name,
    r.chapter_count,
    r.completed_chapters,
    r.unique_readers,
    r.echoes,
    r.rank_score
  from ranked r
  where r.row_rank > greatest(coalesce(p_offset, 0), 0)
    and r.row_rank <= greatest(coalesce(p_offset, 0), 0)
      + least(greatest(coalesce(p_limit, 100), 1), 500)
  order by r.row_rank;
end;
$function$;

revoke all on function private.gidireads_novel_rankings_impl(text, integer, integer) from public, anon, authenticated;
grant execute on function private.gidireads_novel_rankings_impl(text, integer, integer) to anon, authenticated;
