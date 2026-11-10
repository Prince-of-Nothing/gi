-- Use the newest meaningful chapter timestamp for Recently Updated.
-- Some publishing flows can set published_at slightly later than updated_at.
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
security invoker
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
      max(greatest(
        coalesce(c.updated_at, '-infinity'::timestamptz),
        coalesce(c.published_at, '-infinity'::timestamptz),
        coalesce(c.created_at, '-infinity'::timestamptz)
      )) as latest_chapter_at,
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
