create or replace function public.gidireads_set_chapter_price(p_chapter_id uuid, p_price_g_coins bigint, p_is_paid boolean default true)
returns public.wallet_chapter_pricing
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user uuid := auth.uid();
  v_story_id uuid;
  v_row public.wallet_chapter_pricing;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_chapter_id is null or p_is_paid is null then raise exception 'invalid_pricing_request'; end if;
  if p_is_paid and (p_price_g_coins < 10 or p_price_g_coins > 100) then raise exception 'chapter_price_out_of_range'; end if;
  select c.story_id into v_story_id from public.chapters c join public.stories s on s.id = c.story_id where c.id = p_chapter_id and s.author_id = v_user;
  if not found then raise exception 'chapter_not_owned'; end if;
  if p_is_paid and not exists (
    select 1 from public.creator_finance_contracts fc where fc.creator_id = v_user and fc.story_id = v_story_id
      and fc.contract_type = 'paid_chapters' and fc.status = 'approved'
      and (fc.effective_from is null or fc.effective_from <= now()) and (fc.effective_until is null or fc.effective_until > now())
  ) then raise exception 'paid_chapter_approval_required'; end if;
  insert into public.wallet_chapter_pricing(chapter_id, price_g_coins, is_paid, updated_at)
  values (p_chapter_id, case when p_is_paid then p_price_g_coins else 0 end, p_is_paid, now())
  on conflict (chapter_id) do update set price_g_coins = excluded.price_g_coins, is_paid = excluded.is_paid, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$function$;
revoke all on function public.gidireads_set_chapter_price(uuid,bigint,boolean) from public, anon;
grant execute on function public.gidireads_set_chapter_price(uuid,bigint,boolean) to authenticated;
comment on function public.gidireads_set_chapter_price(uuid,bigint,boolean) is 'Author-owned chapter pricing; paid pricing requires active approved paid_chapters contract. Does not process payments or unlock chapters.';
