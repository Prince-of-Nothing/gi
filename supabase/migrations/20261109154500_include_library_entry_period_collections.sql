-- Ensure period collection totals include both reader-list additions and main-Library saves.
create or replace function private.gidireads_novel_rankings_engagement_impl(
  p_period text default 'weekly',
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  rank bigint,
  story_id uuid,
  title text,
  story_status text,
  cover_url text,
  primary_genre text,
  author_username text,
  author_display_name text,
  chapter_count bigint,
  completed_chapters bigint,
  unique_readers bigint,
  period_reads bigint,
  period_echoes bigint,
  period_collections bigint,
  period_reviews bigint,
  lifetime_reads bigint,
  lifetime_echoes bigint,
  lifetime_collections bigint,
  lifetime_reviews bigint,
  rank_score numeric
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_period text := lower(coalesce(p_period, 'weekly'));
  v_from timestamptz;
begin
  if v_period not in ('weekly','monthly','90d','180d','all') then
    raise exception 'unsupported_ranking_period' using errcode = '22023';
  end if;

  v_from := case v_period
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
  read_activity as (
    -- A story_opened event is the platform's read event. For all-time,
    -- use the established lifetime counter so reads from before event tracking
    -- was introduced are not lost.
    select re.story_id, count(*)::bigint as reads
    from public.reading_events re
    join public.stories s on s.id = re.story_id
      and s.author_id <> re.reader_id
    where re.event_type = 'story_opened'
      and re.occurred_at >= v_from
    group by re.story_id
  ),
  echo_activity as (
    -- Chapter-level support is mirrored into echoes; count it there once.
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

    -- Chapterless support stores Echo units in amount.
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
  collection_people as (
    -- A reader counts once per novel, even if they save it in more than one
    -- private/public list or also save it to their main Library.
    select rli.story_id, rl.owner_id as reader_id
    from public.reading_list_items rli
    join public.reading_lists rl on rl.id = rli.list_id
    join public.stories s on s.id = rli.story_id
      and s.author_id <> rl.owner_id
    where rli.added_at >= v_from

    union

    select re.story_id, re.reader_id
    from public.reading_events re
    join public.stories s on s.id = re.story_id
      and s.author_id <> re.reader_id
    where re.event_type = 'library_added'
      and re.occurred_at >= v_from

    union

    select le.story_id, le.reader_id
    from public.library_entries le
    join public.stories s on s.id = le.story_id
      and s.author_id <> le.reader_id
    where le.created_at >= v_from
  ),
  collection_totals as (
    select cp.story_id, count(distinct cp.reader_id)::bigint as collections
    from collection_people cp
    group by cp.story_id
  ),
  lifetime_collection_people as (
    select rli.story_id, rl.owner_id as reader_id
    from public.reading_list_items rli
    join public.reading_lists rl on rl.id = rli.list_id
    join public.stories s on s.id = rli.story_id
      and s.author_id <> rl.owner_id
    union
    select le.story_id, le.reader_id
    from public.library_entries le
    join public.stories s on s.id = le.story_id
      and s.author_id <> le.reader_id
  ),
  lifetime_collection_totals as (
    select lcp.story_id, count(distinct lcp.reader_id)::bigint as collections
    from lifetime_collection_people lcp
    group by lcp.story_id
  ),
  review_totals as (
    select rv.story_id, count(*)::bigint as reviews
    from public.reviews rv
    join public.stories s on s.id = rv.story_id
      and s.author_id <> rv.reader_id
    where rv.created_at >= v_from
    group by rv.story_id
  ),
  lifetime_review_totals as (
    select rv.story_id, count(*)::bigint as reviews
    from public.reviews rv
    join public.stories s on s.id = rv.story_id
      and s.author_id <> rv.reader_id
    group by rv.story_id
  ),
  metrics as (
    select
      s.id as story_id,
      s.title,
      s.status as story_status,
      s.cover_url,
      s.primary_genre,
      p.username as author_username,
      p.display_name as author_display_name,
      cs.chapter_count,
      coalesce(c.completed_chapters, 0)::bigint as completed_chapters,
      coalesce(rd.unique_readers, 0)::bigint as unique_readers,
      (case when v_period = 'all' then coalesce(s.reads, 0) else coalesce(ra.reads, 0) end)::bigint as period_reads,
      coalesce(et.echoes, 0)::bigint as period_echoes,
      coalesce(ct.collections, 0)::bigint as period_collections,
      coalesce(rt.reviews, 0)::bigint as period_reviews,
      coalesce(s.reads, 0)::bigint as lifetime_reads,
      coalesce(s.echo_count, 0)::bigint as lifetime_echoes,
      coalesce(lct.collections, 0)::bigint as lifetime_collections,
      coalesce(lrt.reviews, 0)::bigint as lifetime_reviews
    from public.stories s
    join chapter_stats cs on cs.story_id = s.id
    left join public.profiles p on p.id = s.author_id
    left join completions c on c.story_id = s.id
    left join readers rd on rd.story_id = s.id
    left join read_activity ra on ra.story_id = s.id
    left join echo_totals et on et.story_id = s.id
    left join collection_totals ct on ct.story_id = s.id
    left join lifetime_collection_totals lct on lct.story_id = s.id
    left join review_totals rt on rt.story_id = s.id
    left join lifetime_review_totals lrt on lrt.story_id = s.id
    where s.status <> 'draft'
  ),
  scored as (
    select m.*,
      (
        coalesce(25.0 * m.period_reads / nullif(max(m.period_reads) over (), 0), 0)
        + coalesce(25.0 * m.period_echoes / nullif(max(m.period_echoes) over (), 0), 0)
        + coalesce(25.0 * m.period_collections / nullif(max(m.period_collections) over (), 0), 0)
        + coalesce(25.0 * m.period_reviews / nullif(max(m.period_reviews) over (), 0), 0)
      )::numeric as rank_score
    from metrics m
  ),
  ranked as (
    select
      row_number() over (
        order by sc.rank_score desc,
          sc.period_reads desc,
          sc.period_echoes desc,
          sc.period_collections desc,
          sc.period_reviews desc,
          sc.title asc
      ) as row_rank,
      sc.*
    from scored sc
    where sc.period_reads > 0
      or sc.period_echoes > 0
      or sc.period_collections > 0
      or sc.period_reviews > 0
  )
  select
    r.row_rank,
    r.story_id,
    r.title,
    r.story_status,
    r.cover_url,
    r.primary_genre,
    r.author_username,
    r.author_display_name,
    r.chapter_count,
    r.completed_chapters,
    r.unique_readers,
    r.period_reads,
    r.period_echoes,
    r.period_collections,
    r.period_reviews,
    r.lifetime_reads,
    r.lifetime_echoes,
    r.lifetime_collections,
    r.lifetime_reviews,
    r.rank_score
  from ranked r
  where r.row_rank > greatest(coalesce(p_offset, 0), 0)
    and r.row_rank <= greatest(coalesce(p_offset, 0), 0)
      + least(greatest(coalesce(p_limit, 100), 1), 500)
  order by r.row_rank;
end;
$function$;

revoke all on function private.gidireads_novel_rankings_engagement_impl(text, integer, integer) from public;
grant execute on function private.gidireads_novel_rankings_engagement_impl(text, integer, integer) to anon, authenticated;
notify pgrst, 'reload schema';
