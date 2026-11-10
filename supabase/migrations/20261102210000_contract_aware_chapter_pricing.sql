-- Build 2: contract-aware chapter pricing.
-- Apply only after the V5 package has been deployed and the release migration window opens.
-- This migration does not enable checkout or payment processing.

create table if not exists public.story_chapter_pricing_settings (
  story_id uuid primary key references public.stories(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  pricing_mode text not null default 'automatic' check (pricing_mode in ('automatic','manual')),
  updated_at timestamptz not null default now()
);

alter table public.story_chapter_pricing_settings enable row level security;
revoke all on public.story_chapter_pricing_settings from anon, authenticated;

create or replace function public.gidireads_get_story_pricing_context(p_story_id uuid)
returns table(contract_type text, pricing_mode text, min_price bigint, max_price bigint)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user uuid := auth.uid();
  v_contract_type text;
  v_mode text;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_story_id is null then raise exception 'story_required'; end if;
  if not exists (select 1 from public.stories s where s.id = p_story_id and s.author_id = v_user) then
    raise exception 'chapter_not_owned';
  end if;

  select cc.contract_type into v_contract_type
  from public.creator_contracts cc
  where cc.story_id = p_story_id
    and cc.author_id = v_user
    and cc.status = 'active'
    and cc.starts_at <= now()
    and (cc.ends_at is null or cc.ends_at > now())
    and cc.contract_type in ('non_exclusive','exclusive')
  order by cc.starts_at desc, cc.created_at desc
  limit 1;

  if v_contract_type is null then return; end if;

  select coalesce(settings.pricing_mode, 'automatic') into v_mode
  from (select 1) seed
  left join public.story_chapter_pricing_settings settings
    on settings.story_id = p_story_id and settings.author_id = v_user;

  return query select v_contract_type, coalesce(v_mode,'automatic'), 25::bigint,
    case when v_contract_type = 'exclusive' then 100::bigint else 60::bigint end;
end;
$function$;

create or replace function public.gidireads_set_story_pricing_mode(p_story_id uuid, p_mode text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user uuid := auth.uid();
  v_contract_type text;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_mode not in ('automatic','manual') then raise exception 'invalid_pricing_mode'; end if;
  if not exists (select 1 from public.stories s where s.id = p_story_id and s.author_id = v_user) then
    raise exception 'chapter_not_owned';
  end if;
  select cc.contract_type into v_contract_type
  from public.creator_contracts cc
  where cc.story_id = p_story_id and cc.author_id = v_user
    and cc.status = 'active' and cc.starts_at <= now()
    and (cc.ends_at is null or cc.ends_at > now())
    and cc.contract_type in ('non_exclusive','exclusive')
  order by cc.starts_at desc, cc.created_at desc limit 1;
  if v_contract_type is null then raise exception 'contract_not_eligible'; end if;

  insert into public.story_chapter_pricing_settings(story_id,author_id,pricing_mode,updated_at)
  values(p_story_id,v_user,p_mode,now())
  on conflict(story_id) do update set author_id=excluded.author_id, pricing_mode=excluded.pricing_mode, updated_at=now();
  return p_mode;
end;
$function$;

create or replace function public.gidireads_apply_automatic_chapter_prices(p_story_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user uuid := auth.uid();
  v_contract_type text;
  v_max_price bigint;
  v_mode text := 'automatic';
  v_updated integer := 0;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.stories s where s.id = p_story_id and s.author_id = v_user) then
    raise exception 'chapter_not_owned';
  end if;
  select cc.contract_type into v_contract_type
  from public.creator_contracts cc
  where cc.story_id = p_story_id and cc.author_id = v_user
    and cc.status = 'active' and cc.starts_at <= now()
    and (cc.ends_at is null or cc.ends_at > now())
    and cc.contract_type in ('non_exclusive','exclusive')
  order by cc.starts_at desc, cc.created_at desc limit 1;
  if v_contract_type is null then raise exception 'contract_not_eligible'; end if;
  v_max_price := case when v_contract_type = 'exclusive' then 100 else 60 end;
  select coalesce(settings.pricing_mode,'automatic') into v_mode
  from (select 1) seed
  left join public.story_chapter_pricing_settings settings
    on settings.story_id = p_story_id and settings.author_id = v_user;
  if v_mode <> 'automatic' then raise exception 'pricing_mode_mismatch'; end if;

  update public.wallet_chapter_pricing pricing
  set price_g_coins = greatest(25::bigint, least(v_max_price,
    case
      when word_data.word_count >= 4500 then 50::bigint
      when word_data.word_count >= 3500 then 40::bigint
      when word_data.word_count >= 2500 then 30::bigint
      else 25::bigint
    end)), updated_at = now()
  from public.chapters chapter
  cross join lateral (
    select count(*)::integer as word_count
    from regexp_split_to_table(trim(coalesce(chapter.content,'')), '\s+') as token
    where token <> ''
  ) word_data
  where pricing.chapter_id = chapter.id
    and chapter.story_id = p_story_id
    and pricing.is_paid = true;
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$function$;

create or replace function public.gidireads_set_chapter_price(p_chapter_id uuid, p_price_g_coins bigint, p_is_paid boolean default true)
returns public.wallet_chapter_pricing
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user uuid := auth.uid();
  v_story_id uuid;
  v_contract_type text;
  v_mode text := 'automatic';
  v_min_price bigint := 25;
  v_max_price bigint;
  v_word_count integer := 0;
  v_final_price bigint := 0;
  v_row public.wallet_chapter_pricing;
  v_content text;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_chapter_id is null or p_is_paid is null then raise exception 'invalid_pricing_request'; end if;

  select c.story_id, coalesce(c.content,'') into v_story_id, v_content
  from public.chapters c
  join public.stories s on s.id = c.story_id
  where c.id = p_chapter_id and s.author_id = v_user;
  if not found then raise exception 'chapter_not_owned'; end if;

  select cc.contract_type into v_contract_type
  from public.creator_contracts cc
  where cc.story_id = v_story_id and cc.author_id = v_user
    and cc.status = 'active' and cc.starts_at <= now()
    and (cc.ends_at is null or cc.ends_at > now())
    and cc.contract_type in ('non_exclusive','exclusive')
  order by cc.starts_at desc, cc.created_at desc limit 1;

  if p_is_paid and v_contract_type is null then raise exception 'contract_not_eligible'; end if;
  if v_contract_type = 'exclusive' then v_max_price := 100;
  elsif v_contract_type = 'non_exclusive' then v_max_price := 60;
  else v_max_price := 0;
  end if;

  if p_is_paid then
    select coalesce(settings.pricing_mode,'automatic') into v_mode
    from (select 1) seed
    left join public.story_chapter_pricing_settings settings
      on settings.story_id = v_story_id and settings.author_id = v_user;

    if v_mode = 'automatic' then
      select count(*)::integer into v_word_count
      from regexp_split_to_table(trim(v_content), '\s+') as token
      where token <> '';
      v_final_price := case
        when v_word_count >= 4500 then 50
        when v_word_count >= 3500 then 40
        when v_word_count >= 2500 then 30
        else 25
      end;
      v_final_price := greatest(v_min_price, least(v_max_price, v_final_price));
    else
      if p_price_g_coins is null or p_price_g_coins < v_min_price or p_price_g_coins > v_max_price then
        raise exception 'chapter_price_out_of_range';
      end if;
      v_final_price := p_price_g_coins;
    end if;
  end if;

  insert into public.wallet_chapter_pricing(chapter_id, price_g_coins, is_paid, updated_at)
  values (p_chapter_id, v_final_price, p_is_paid, now())
  on conflict (chapter_id) do update
    set price_g_coins = excluded.price_g_coins, is_paid = excluded.is_paid, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$function$;

revoke all on function public.gidireads_get_story_pricing_context(uuid) from public, anon;
revoke all on function public.gidireads_set_story_pricing_mode(uuid,text) from public, anon;
revoke all on function public.gidireads_apply_automatic_chapter_prices(uuid) from public, anon;
revoke all on function public.gidireads_set_chapter_price(uuid,bigint,boolean) from public, anon;
grant execute on function public.gidireads_get_story_pricing_context(uuid) to authenticated;
grant execute on function public.gidireads_set_story_pricing_mode(uuid,text) to authenticated;
grant execute on function public.gidireads_apply_automatic_chapter_prices(uuid) to authenticated;
grant execute on function public.gidireads_set_chapter_price(uuid,bigint,boolean) to authenticated;

comment on function public.gidireads_set_chapter_price(uuid,bigint,boolean) is
'Build 2: author-owned chapter pricing for active non-exclusive and exclusive contracts only. Enforces 25-60 G Coins for non-exclusive and 25-100 G Coins for exclusive. Automatic mode calculates prices on the server from chapter word count. Does not process payments.';

update public.resource_articles set title='Set chapter prices for a contracted story', summary='Choose automatic or manual pricing and keep every chapter within your contract limit.', body='<p>Chapter pricing is only available for a story with an active non-exclusive or exclusive contract. Echo-only stories and stories without an eligible contract cannot use paid chapter pricing.</p><h2>Open the right story</h2><p>Open Authors Studio, go to My Stories and open the story you want to price. In that story Workspace, choose Chapter Pricing. The setting is for that story only.</p><h2>Choose who sets the price</h2><p>You can let GidiReads set prices based on chapter length, or choose to set each price yourself. You can change this choice later. Automatic prices are calculated on the server and stay within your contract limit.</p><h2>Know your price limit</h2><p>Non-exclusive stories can use prices from 25 to 60 G Coins per paid chapter. Exclusive stories can use prices from 25 to 100 G Coins per paid chapter. Manual prices outside the allowed range will not save.</p><h2>Keep chapters free or make them paid</h2><p>You choose which chapters are free and which chapters readers must unlock. Review the chapter and its price before saving.</p><h2>Important: purchases are not active yet</h2><p>Saving a chapter price does not turn on checkout. Paid chapter purchases remain unavailable until GidiReads connects and tests its payment system. Readers must not be asked to pay outside GidiReads.</p>' where slug='set-chapter-prices';
