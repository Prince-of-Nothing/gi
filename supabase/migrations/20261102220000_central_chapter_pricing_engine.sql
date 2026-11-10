-- GidiReads V5 Build 3A: Central, contract-aware chapter pricing engine.
-- HOLD until after V5 deployment. Do not apply before the approved release window.
-- This migration only sets virtual G Coin prices; it does not enable checkout or payments.

create table if not exists public.chapter_pricing_schedule (
  id bigserial primary key,
  contract_type text not null check (contract_type in ('non_exclusive','exclusive')),
  min_words integer not null check (min_words >= 0),
  max_words integer,
  price_g_coins integer not null check (price_g_coins between 25 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  constraint chapter_pricing_schedule_band_unique unique(contract_type,min_words),
  constraint chapter_pricing_schedule_band_valid check (max_words is null or max_words > min_words)
);

create table if not exists public.chapter_pricing_schedule_history (
  id bigserial primary key,
  changed_by uuid not null references public.profiles(id),
  old_schedule jsonb not null,
  new_schedule jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.chapter_pricing_schedule enable row level security;
alter table public.chapter_pricing_schedule_history enable row level security;
revoke all on public.chapter_pricing_schedule from anon, authenticated;
revoke all on public.chapter_pricing_schedule_history from anon, authenticated;

insert into public.chapter_pricing_schedule(contract_type,min_words,max_words,price_g_coins)
values
 ('non_exclusive',0,999,25),
 ('non_exclusive',1000,1499,30),
 ('non_exclusive',1500,2499,35),
 ('non_exclusive',2500,3499,40),
 ('non_exclusive',3500,4499,50),
 ('non_exclusive',4500,null,60),
 ('exclusive',0,999,25),
 ('exclusive',1000,1499,30),
 ('exclusive',1500,2499,35),
 ('exclusive',2500,3499,40),
 ('exclusive',3500,4499,50),
 ('exclusive',4500,null,70)
on conflict(contract_type,min_words) do nothing;

create or replace function public.gidireads_get_automatic_price_guide(p_story_id uuid)
returns table(min_words integer,max_words integer,price_g_coins integer)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $function$
declare v_user uuid := auth.uid(); v_contract text;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.stories s where s.id=p_story_id and s.author_id=v_user) then raise exception 'chapter_not_owned'; end if;
  select cc.contract_type into v_contract
  from public.creator_contracts cc
  where cc.story_id=p_story_id and cc.author_id=v_user and cc.status='active'
    and cc.starts_at<=now() and (cc.ends_at is null or cc.ends_at>now())
    and cc.contract_type in ('non_exclusive','exclusive')
  order by cc.starts_at desc,cc.created_at desc limit 1;
  if v_contract is null then raise exception 'contract_not_eligible'; end if;
  return query select s.min_words,s.max_words,s.price_g_coins
    from public.chapter_pricing_schedule s where s.contract_type=v_contract order by s.min_words;
end;
$function$;

create or replace function public.gidireads_admin_get_pricing_schedule()
returns table(contract_type text,min_words integer,max_words integer,price_g_coins integer,updated_at timestamptz)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $function$
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') then raise exception 'admin_required'; end if;
  return query select s.contract_type,s.min_words,s.max_words,s.price_g_coins,s.updated_at
    from public.chapter_pricing_schedule s
    order by case s.contract_type when 'non_exclusive' then 1 else 2 end,s.min_words;
end;
$function$;

create or replace function public.gidireads_admin_save_pricing_schedule(p_rows jsonb)
returns integer
language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare v_actor uuid:=auth.uid(); v_old jsonb; v_new jsonb; v_count integer; v_contract text; v_min integer; v_max integer;
begin
  if v_actor is null or not exists(select 1 from public.profiles p where p.id=v_actor and p.role='admin') then raise exception 'admin_required'; end if;
  if p_rows is null or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)<>12 then raise exception 'invalid_schedule'; end if;
  if exists(
    select 1 from jsonb_to_recordset(p_rows) as x(contract_type text,min_words integer,max_words integer,price_g_coins integer)
    where contract_type not in ('non_exclusive','exclusive') or min_words is null or price_g_coins is null
      or price_g_coins < 25 or (contract_type='non_exclusive' and price_g_coins>60)
      or (contract_type='exclusive' and price_g_coins>100)
  ) then raise exception 'price_out_of_contract_range'; end if;
  if (select count(*) from jsonb_to_recordset(p_rows) as x(contract_type text,min_words integer,max_words integer,price_g_coins integer) where contract_type='non_exclusive')<>6
     or (select count(*) from jsonb_to_recordset(p_rows) as x(contract_type text,min_words integer,max_words integer,price_g_coins integer) where contract_type='exclusive')<>6 then raise exception 'invalid_schedule_bands'; end if;
  if exists(
    select 1 from (
      select contract_type,min_words,max_words,price_g_coins,
        lag(max_words) over(partition by contract_type order by min_words) prev_max,
        lag(price_g_coins) over(partition by contract_type order by min_words) prev_price,
        row_number() over(partition by contract_type order by min_words) rn,
        count(*) over(partition by contract_type) band_count
      from jsonb_to_recordset(p_rows) as x(contract_type text,min_words integer,max_words integer,price_g_coins integer)
    ) q
    where (rn=1 and min_words<>0)
      or (rn>1 and (prev_max is null or min_words<>prev_max+1 or price_g_coins<prev_price))
      or (rn=band_count and max_words is not null)
      or (rn<band_count and max_words is null)
  ) then raise exception 'invalid_schedule_bands'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('contract_type',contract_type,'min_words',min_words,'max_words',max_words,'price_g_coins',price_g_coins) order by contract_type,min_words),'[]'::jsonb)
    into v_old from public.chapter_pricing_schedule;
  select coalesce(jsonb_agg(jsonb_build_object('contract_type',x.contract_type,'min_words',x.min_words,'max_words',x.max_words,'price_g_coins',x.price_g_coins) order by x.contract_type,x.min_words),'[]'::jsonb)
    into v_new from jsonb_to_recordset(p_rows) as x(contract_type text,min_words integer,max_words integer,price_g_coins integer);
  insert into public.chapter_pricing_schedule_history(changed_by,old_schedule,new_schedule) values(v_actor,v_old,v_new);
  update public.chapter_pricing_schedule s set
    max_words=x.max_words,price_g_coins=x.price_g_coins,updated_at=now(),updated_by=v_actor
  from jsonb_to_recordset(p_rows) as x(contract_type text,min_words integer,max_words integer,price_g_coins integer)
  where s.contract_type=x.contract_type and s.min_words=x.min_words;
  get diagnostics v_count=row_count;
  return v_count;
end;
$function$;

-- Saving a newly paid chapter also uses the central schedule in automatic mode.
create or replace function public.gidireads_set_chapter_price(p_chapter_id uuid,p_price_g_coins bigint,p_is_paid boolean default true)
returns public.wallet_chapter_pricing
language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user uuid:=auth.uid(); v_story_id uuid; v_contract text; v_mode text:='automatic';
  v_min integer:=25; v_max integer; v_words integer:=0; v_price integer; v_row public.wallet_chapter_pricing; v_content text;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_chapter_id is null or p_is_paid is null then raise exception 'invalid_pricing_request'; end if;
  select c.story_id,coalesce(c.content,'') into v_story_id,v_content
  from public.chapters c join public.stories s on s.id=c.story_id
  where c.id=p_chapter_id and s.author_id=v_user;
  if not found then raise exception 'chapter_not_owned'; end if;
  select cc.contract_type into v_contract from public.creator_contracts cc
  where cc.story_id=v_story_id and cc.author_id=v_user and cc.status='active'
    and cc.starts_at<=now() and (cc.ends_at is null or cc.ends_at>now())
    and cc.contract_type in ('non_exclusive','exclusive')
  order by cc.starts_at desc,cc.created_at desc limit 1;
  if p_is_paid and v_contract is null then raise exception 'contract_not_eligible'; end if;
  v_max:=case when v_contract='exclusive' then 100 when v_contract='non_exclusive' then 60 else 0 end;
  if p_is_paid then
    select coalesce(settings.pricing_mode,'automatic') into v_mode from (select 1) seed
      left join public.story_chapter_pricing_settings settings on settings.story_id=v_story_id and settings.author_id=v_user;
    if v_mode='automatic' then
      select count(*)::integer into v_words from regexp_split_to_table(trim(v_content),'\s+') as words(word) where word<>'';
      select schedule.price_g_coins into v_price from public.chapter_pricing_schedule schedule
      where schedule.contract_type=v_contract and schedule.min_words<=v_words
        and (schedule.max_words is null or v_words<=schedule.max_words)
      order by schedule.min_words desc limit 1;
      if v_price is null then raise exception 'pricing_schedule_missing'; end if;
    else
      if p_price_g_coins is null or p_price_g_coins<v_min or p_price_g_coins>v_max then raise exception 'chapter_price_out_of_range'; end if;
      v_price:=p_price_g_coins::integer;
    end if;
  else
    v_price:=0;
  end if;
  insert into public.wallet_chapter_pricing(chapter_id,price_g_coins,is_paid,updated_at)
  values(p_chapter_id,coalesce(v_price,0),p_is_paid,now())
  on conflict(chapter_id) do update set price_g_coins=excluded.price_g_coins,is_paid=excluded.is_paid,updated_at=now()
  returning * into v_row;
  return v_row;
end;
$function$;

-- One chapter edit updates only that chapter's automatic price. There is no full-library scan.
create or replace function public.gidireads_reprice_automatic_chapter()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare v_contract text; v_mode text:='automatic'; v_words integer; v_price integer;
begin
  if new.story_id is null then return new; end if;
  select cc.contract_type into v_contract
  from public.creator_contracts cc join public.stories s on s.id=cc.story_id
  where cc.story_id=new.story_id and cc.author_id=s.author_id and cc.status='active'
    and cc.starts_at<=now() and (cc.ends_at is null or cc.ends_at>now())
    and cc.contract_type in ('non_exclusive','exclusive')
  order by cc.starts_at desc,cc.created_at desc limit 1;
  if v_contract is null then return new; end if;
  select coalesce(settings.pricing_mode,'automatic') into v_mode
  from (select 1) seed left join public.story_chapter_pricing_settings settings on settings.story_id=new.story_id;
  if v_mode<>'automatic' then return new; end if;
  select count(*)::integer into v_words from regexp_split_to_table(trim(coalesce(new.content,'')),'\s+') as words(word) where word<>'';
  select price_g_coins into v_price from public.chapter_pricing_schedule
    where contract_type=v_contract and min_words<=v_words and (max_words is null or v_words<=max_words)
    order by min_words desc limit 1;
  if v_price is not null then
    update public.wallet_chapter_pricing set price_g_coins=v_price,updated_at=now()
    where chapter_id=new.id and is_paid=true;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_gidireads_reprice_automatic_chapter on public.chapters;
create trigger trg_gidireads_reprice_automatic_chapter
after update of content on public.chapters
for each row when (old.content is distinct from new.content)
execute function public.gidireads_reprice_automatic_chapter();

-- Replace the Build 2 hard-coded schedule with the central schedule table.
create or replace function public.gidireads_apply_automatic_chapter_prices(p_story_id uuid)
returns integer language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare v_user uuid:=auth.uid(); v_contract text; v_mode text:='automatic'; v_updated integer:=0;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.stories s where s.id=p_story_id and s.author_id=v_user) then raise exception 'chapter_not_owned'; end if;
  select cc.contract_type into v_contract from public.creator_contracts cc
  where cc.story_id=p_story_id and cc.author_id=v_user and cc.status='active' and cc.starts_at<=now()
    and (cc.ends_at is null or cc.ends_at>now()) and cc.contract_type in ('non_exclusive','exclusive')
  order by cc.starts_at desc,cc.created_at desc limit 1;
  if v_contract is null then raise exception 'contract_not_eligible'; end if;
  select coalesce(settings.pricing_mode,'automatic') into v_mode from (select 1) seed
    left join public.story_chapter_pricing_settings settings on settings.story_id=p_story_id and settings.author_id=v_user;
  if v_mode<>'automatic' then raise exception 'pricing_mode_mismatch'; end if;
  update public.wallet_chapter_pricing pricing set price_g_coins=schedule.price_g_coins,updated_at=now()
  from public.chapters chapter
  cross join lateral (select count(*)::integer word_count from regexp_split_to_table(trim(coalesce(chapter.content,'')),'\s+') as words(word) where word<>'') wc
  join lateral (select s.price_g_coins from public.chapter_pricing_schedule s where s.contract_type=v_contract
    and s.min_words<=wc.word_count and (s.max_words is null or wc.word_count<=s.max_words) order by s.min_words desc limit 1) schedule on true
  where pricing.chapter_id=chapter.id and chapter.story_id=p_story_id and pricing.is_paid=true;
  get diagnostics v_updated=row_count;
  return v_updated;
end;
$function$;

revoke all on function public.gidireads_get_automatic_price_guide(uuid) from public,anon;
revoke all on function public.gidireads_admin_get_pricing_schedule() from public,anon;
revoke all on function public.gidireads_admin_save_pricing_schedule(jsonb) from public,anon;
revoke all on function public.gidireads_reprice_automatic_chapter() from public,anon,authenticated;
revoke all on function public.gidireads_apply_automatic_chapter_prices(uuid) from public,anon;
revoke all on function public.gidireads_set_chapter_price(uuid,bigint,boolean) from public,anon;
grant execute on function public.gidireads_get_automatic_price_guide(uuid) to authenticated;
grant execute on function public.gidireads_admin_get_pricing_schedule() to authenticated;
grant execute on function public.gidireads_admin_save_pricing_schedule(jsonb) to authenticated;
grant execute on function public.gidireads_apply_automatic_chapter_prices(uuid) to authenticated;
grant execute on function public.gidireads_set_chapter_price(uuid,bigint,boolean) to authenticated;

comment on table public.chapter_pricing_schedule is 'Central automatic chapter price bands. Authors cannot edit this table; administrators use the validated admin RPC.';
comment on table public.chapter_pricing_schedule_history is 'Audit history for administrator changes to the central chapter pricing schedule.';
