-- DEVELOPMENT ONLY. Review and apply only to the development Supabase project.
-- This records Echo support while real-money/creator payouts remain disabled.
create table if not exists public.echo_support_events (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  amount integer not null check (amount between 1 and 100),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint echo_support_events_sender_idempotency unique(sender_id,idempotency_key)
);
create index if not exists echo_support_events_story_created_idx on public.echo_support_events(story_id,created_at desc);
create index if not exists echo_support_events_chapter_created_idx on public.echo_support_events(chapter_id,created_at desc) where chapter_id is not null;
alter table public.echo_support_events enable row level security;
revoke all on public.echo_support_events from anon, authenticated;

grant usage on schema public to authenticated;
create or replace function public.gidireads_send_echo_support(
  p_story_id uuid,
  p_chapter_id uuid,
  p_amount integer,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_user uuid := auth.uid();
  v_story public.stories%rowtype;
  v_chapter public.chapters%rowtype;
  v_existing public.echo_support_events%rowtype;
  v_tx public.wallet_transactions%rowtype;
begin
  if v_user is null then return jsonb_build_object('success',false,'reason','not_authenticated'); end if;
  if p_story_id is null or p_amount is null or p_amount < 1 or p_amount > 100 or length(coalesce(p_idempotency_key,'')) < 8 then
    raise exception 'invalid_echo_request';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text||':echo-support:'||p_idempotency_key,0));
  select * into v_existing from public.echo_support_events where sender_id=v_user and idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('success',true,'replayed',true,'amount',v_existing.amount,'scope',case when v_existing.chapter_id is null then 'story' else 'chapter' end); end if;
  select * into v_story from public.stories where id=p_story_id and status in ('ongoing','completed','published');
  if not found then raise exception 'story_unavailable'; end if;
  if v_story.author_id=v_user then raise exception 'cannot_echo_own_story'; end if;
  if p_chapter_id is not null then
    select * into v_chapter from public.chapters where id=p_chapter_id and story_id=p_story_id and is_published=true;
    if not found then raise exception 'chapter_unavailable'; end if;
  end if;
  -- The launch currently uses promotional Echoes only. Paid Echoes/payouts remain disabled.
  select * into v_tx from public.wallet_transactions where user_id=v_user and idempotency_key='echo-support:'||p_idempotency_key limit 1;
  if not found then
    v_tx := private.wallet_post(v_user,'echoes_promotional',-p_amount,'spend','echo-support:'||p_idempotency_key,
      'echo_support',coalesce(p_chapter_id,p_story_id)::text,null,'Echo support',
      jsonb_build_object('story_id',p_story_id,'chapter_id',p_chapter_id,'amount',p_amount));
  end if;
  insert into public.echo_support_events(sender_id,story_id,chapter_id,amount,idempotency_key)
    values(v_user,p_story_id,p_chapter_id,p_amount,p_idempotency_key) returning * into v_existing;
  -- Keep the legacy chapter Echo feed/count in sync; repeated Echoes are intentionally permitted.
  if p_chapter_id is not null then
    insert into public.echoes(chapter_id,reader_id)
      select p_chapter_id,v_user from generate_series(1,p_amount);
  end if;
  return jsonb_build_object('success',true,'amount',p_amount,'scope',case when p_chapter_id is null then 'story' else 'chapter' end);
end;
$function$;
revoke all on function public.gidireads_send_echo_support(uuid,uuid,integer,text) from public, anon;
grant execute on function public.gidireads_send_echo_support(uuid,uuid,integer,text) to authenticated;
