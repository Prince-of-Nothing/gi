-- Keep public RPC endpoints invoker-security. Aggregate implementations live
-- in the non-exposed private schema and return only public leaderboard data.
alter function public.gidireads_homepage_shelf(text,integer) security invoker;

do $migration$
declare v_definition text;
begin
  select pg_get_functiondef('public.gidireads_novel_rankings(text,integer,integer)'::regprocedure)
    into v_definition;
  v_definition := replace(v_definition,
    'FUNCTION public.gidireads_novel_rankings',
    'FUNCTION private.gidireads_novel_rankings_impl');
  execute v_definition;

  select pg_get_functiondef('public.gidireads_readerboard(text,integer,integer)'::regprocedure)
    into v_definition;
  v_definition := replace(v_definition,
    'FUNCTION public.gidireads_readerboard',
    'FUNCTION private.gidireads_readerboard_impl');
  execute v_definition;
end;
$migration$;

create or replace function public.gidireads_novel_rankings(
  p_period text default 'weekly', p_limit integer default 100, p_offset integer default 0
)
returns table (
  rank bigint, story_id uuid, title text, cover_url text, primary_genre text,
  author_username text, author_display_name text, chapter_count bigint,
  completed_chapters bigint, unique_readers bigint, echoes bigint, rank_score numeric
)
language sql stable security invoker
set search_path = pg_catalog, public
as $function$
  select * from private.gidireads_novel_rankings_impl(p_period,p_limit,p_offset);
$function$;

create or replace function public.gidireads_readerboard(
  p_period text default 'weekly', p_limit integer default 100, p_offset integer default 0
)
returns table (
  rank bigint, user_id uuid, username text, display_name text, avatar_url text,
  chapters_read bigint, active_days bigint, current_streak bigint, completed_novels bigint, rank_score numeric
)
language sql stable security invoker
set search_path = pg_catalog, public
as $function$
  select * from private.gidireads_readerboard_impl(p_period,p_limit,p_offset);
$function$;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
revoke all on function private.gidireads_novel_rankings_impl(text,integer,integer) from public, anon, authenticated;
revoke all on function private.gidireads_readerboard_impl(text,integer,integer) from public, anon, authenticated;
grant execute on function private.gidireads_novel_rankings_impl(text,integer,integer) to anon, authenticated;
grant execute on function private.gidireads_readerboard_impl(text,integer,integer) to anon, authenticated;

revoke all on function public.gidireads_homepage_shelf(text,integer) from public, anon, authenticated;
revoke all on function public.gidireads_novel_rankings(text,integer,integer) from public, anon, authenticated;
revoke all on function public.gidireads_readerboard(text,integer,integer) from public, anon, authenticated;
grant execute on function public.gidireads_homepage_shelf(text,integer) to anon, authenticated;
grant execute on function public.gidireads_novel_rankings(text,integer,integer) to anon, authenticated;
grant execute on function public.gidireads_readerboard(text,integer,integer) to anon, authenticated;

notify pgrst,'reload schema';
