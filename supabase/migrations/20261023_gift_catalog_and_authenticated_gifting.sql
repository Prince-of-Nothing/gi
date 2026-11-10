create table if not exists public.wallet_gift_catalog (
  gift_key text primary key, display_name text not null, cost_echoes bigint not null check (cost_echoes > 0),
  asset_path text not null, is_active boolean not null default true, sort_order integer not null default 0, updated_at timestamptz not null default now()
);
alter table public.wallet_gift_catalog enable row level security;
drop policy if exists wallet_gift_catalog_read_active on public.wallet_gift_catalog;
create policy wallet_gift_catalog_read_active on public.wallet_gift_catalog for select to anon, authenticated using (is_active = true);
revoke insert, update, delete on public.wallet_gift_catalog from anon, authenticated;
insert into public.wallet_gift_catalog(gift_key,display_name,cost_echoes,asset_path,sort_order,is_active) values
 ('spark','Spark',10,'assets/gifts/spark.svg',1,true),('golden-bookmark','Golden Bookmark',25,'assets/gifts/golden-bookmark.svg',2,true),
 ('writers-tea','Writer’s Tea',50,'assets/gifts/writers-tea.svg',3,true),('violet-bouquet','Violet Bouquet',100,'assets/gifts/violet-bouquet.svg',4,true),
 ('the-quill','The Quill',150,'assets/gifts/the-quill.svg',5,true),('story-crown','Story Crown',250,'assets/gifts/story-crown.svg',6,true),
 ('the-phoenix','The Phoenix',500,'assets/gifts/the-phoenix.svg',7,true),('golden-library','Golden Library',1000,'assets/gifts/golden-library.svg',8,true)
on conflict(gift_key) do update set display_name=excluded.display_name,cost_echoes=excluded.cost_echoes,asset_path=excluded.asset_path,sort_order=excluded.sort_order,is_active=excluded.is_active,updated_at=now();
create or replace function public.gidireads_send_catalog_gift(p_recipient_username text,p_gift_key text,p_idempotency_key text,p_note text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $function$
declare v_sender uuid := auth.uid(); v_recipient uuid; v_gift public.wallet_gift_catalog;
begin
 if v_sender is null then raise exception 'authentication_required'; end if;
 if p_recipient_username is null or length(trim(p_recipient_username)) not between 1 and 40 then raise exception 'invalid_recipient'; end if;
 if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 200 then raise exception 'invalid_idempotency_key'; end if;
 select id into v_recipient from public.profiles where lower(username)=lower(trim(p_recipient_username));
 if not found then raise exception 'gift_recipient_not_found'; end if;
 if v_recipient=v_sender then raise exception 'cannot_gift_self'; end if;
 select * into v_gift from public.wallet_gift_catalog where gift_key=p_gift_key and is_active;
 if not found then raise exception 'gift_unavailable'; end if;
 return public.gidireads_wallet_send_gift(v_sender,v_recipient,'echoes_purchased',v_gift.cost_echoes,p_idempotency_key,left(coalesce(p_note,''),300));
end;$function$;
revoke all on function public.gidireads_send_catalog_gift(text,text,text,text) from public,anon;
grant execute on function public.gidireads_send_catalog_gift(text,text,text,text) to authenticated;
comment on function public.gidireads_send_catalog_gift(text,text,text,text) is 'Sends an active catalogue gift using the authenticated sender and server-defined Support Echoes cost. Does not process real-money payments.';
