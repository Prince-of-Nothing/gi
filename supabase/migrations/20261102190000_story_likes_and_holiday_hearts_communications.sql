-- GidiReads V5 pre-deployment: story likes and targeted Holiday Hearts communications.
-- Apply to production only after reviewing the V5 package and completing the agreed release sequence.

create table if not exists public.story_likes (
  story_id uuid not null references public.stories(id) on delete cascade,
  reader_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint story_likes_pkey primary key (story_id, reader_id)
);
create index if not exists story_likes_reader_id_idx on public.story_likes(reader_id, created_at desc);
create index if not exists story_likes_story_created_idx on public.story_likes(story_id, created_at desc);
alter table public.story_likes enable row level security;
drop policy if exists story_likes_public_read on public.story_likes;
create policy story_likes_public_read on public.story_likes for select to anon, authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.status in ('ongoing','completed')));
drop policy if exists story_likes_owner_insert on public.story_likes;
create policy story_likes_owner_insert on public.story_likes for insert to authenticated
  with check (reader_id = (select auth.uid()) and exists (select 1 from public.stories s where s.id = story_id and s.status in ('ongoing','completed')));
drop policy if exists story_likes_owner_delete on public.story_likes;
create policy story_likes_owner_delete on public.story_likes for delete to authenticated
  using (reader_id = (select auth.uid()));
grant select on public.story_likes to anon, authenticated;
grant insert, delete on public.story_likes to authenticated;

alter table public.platform_announcements drop constraint if exists platform_announcements_audience_check;
alter table public.platform_announcements add constraint platform_announcements_audience_check
  check (audience = any (array['all','readers','authors','holiday_participants','holiday_finalists']::text[]));

-- The existing audience policy only exposed all/readers/authors. Extend it so
-- participants see participant broadcasts and only selected finalists see finalist broadcasts.
drop policy if exists platform_announcements_audience_read on public.platform_announcements;
create policy platform_announcements_audience_read
on public.platform_announcements
for select to authenticated
using (
  status in ('published','scheduled')
  and publish_at is not null
  and publish_at <= now()
  and (expires_at is null or expires_at > now())
  and (
    audience = 'all'
    or (
      audience = 'authors'
      and exists (select 1 from public.stories s where s.author_id = (select auth.uid()))
    )
    or (
      audience = 'readers'
      and not exists (select 1 from public.stories s where s.author_id = (select auth.uid()))
    )
    or (
      audience = 'holiday_participants'
      and opportunity_id is not null
      and exists (
        select 1 from public.holiday_hearts_entries e
        where e.opportunity_id = platform_announcements.opportunity_id
          and e.author_id = (select auth.uid())
          and e.status not in ('withdrawn','rejected','disqualified')
      )
    )
    or (
      audience = 'holiday_finalists'
      and opportunity_id is not null
      and exists (
        select 1 from public.holiday_hearts_entries e
        where e.opportunity_id = platform_announcements.opportunity_id
          and e.author_id = (select auth.uid())
          and e.is_finalist is true
          and e.status = 'approved'
      )
    )
  )
);

create table if not exists public.holiday_hearts_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  email_type text not null check (email_type = 'winner'),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, recipient_user_id, email_type)
);
alter table public.holiday_hearts_email_deliveries enable row level security;
revoke all on public.holiday_hearts_email_deliveries from anon, authenticated, public;
grant all on public.holiday_hearts_email_deliveries to service_role;

-- Safe cleanup for a pre-launch rehearsal. This can run only while rehearsal_mode is enabled,
-- and only when every entry for this opportunity is explicitly titled TEST:.
create or replace function public.hh_admin_reset_rehearsal(
  p_opportunity_id uuid,
  p_test_entry_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_opp public.platform_opportunities%rowtype;
  v_total integer;
  v_selected integer;
  v_story_ids uuid[];
  v_author_ids uuid[];
begin
  if not public.hh_is_admin() then
    return jsonb_build_object('success', false, 'reason', 'Administrator access required.');
  end if;
  select * into v_opp from public.platform_opportunities where id = p_opportunity_id and slug = 'holiday-hearts-2026';
  if not found then return jsonb_build_object('success', false, 'reason', 'Holiday Hearts opportunity not found.'); end if;
  if coalesce((v_opp.settings->>'rehearsal_mode')::boolean, false) is not true then
    return jsonb_build_object('success', false, 'reason', 'Turn on rehearsal mode in the Holiday Hearts admin settings first.');
  end if;
  if coalesce(cardinality(p_test_entry_ids), 0) = 0 then
    return jsonb_build_object('success', false, 'reason', 'Select all TEST: entries to clean up.');
  end if;

  select count(*) into v_total from public.holiday_hearts_entries where opportunity_id = p_opportunity_id;
  select count(*) into v_selected from public.holiday_hearts_entries
   where opportunity_id = p_opportunity_id and id = any(p_test_entry_ids) and title like 'TEST:%';
  if v_total = 0 or v_selected <> v_total or v_selected <> cardinality(p_test_entry_ids) then
    return jsonb_build_object('success', false, 'reason', 'Cleanup blocked. Every entry in this opportunity must be selected and every title must begin with TEST:. No real entry will be deleted.');
  end if;

  select coalesce(array_agg(story_id) filter (where story_id is not null), '{}'::uuid[]),
         coalesce(array_agg(distinct author_id), '{}'::uuid[])
    into v_story_ids, v_author_ids
    from public.holiday_hearts_entries where opportunity_id = p_opportunity_id;

  if cardinality(v_story_ids) > 0 and (
    exists (select 1 from public.contract_applications where story_id = any(v_story_ids)) or
    exists (select 1 from public.creator_contracts where story_id = any(v_story_ids))
  ) then
    return jsonb_build_object('success', false, 'reason', 'Cleanup blocked because a TEST: story has a contract record. Review it manually before cleanup.');
  end if;
  if cardinality(v_story_ids) > 0 and exists (
    select 1 from public.stories where id = any(v_story_ids) and title not like 'TEST:%'
  ) then
    return jsonb_build_object('success', false, 'reason', 'Cleanup blocked because a linked story title does not begin with TEST:. Rename/review it manually before cleanup.');
  end if;

  delete from public.holiday_hearts_votes where opportunity_id = p_opportunity_id;
  delete from public.holiday_hearts_vote_events where opportunity_id = p_opportunity_id;
  delete from public.holiday_hearts_results where opportunity_id = p_opportunity_id;
  delete from public.holiday_hearts_entry_reviews where entry_id = any(p_test_entry_ids);
  delete from public.holiday_hearts_entry_manuscripts where entry_id = any(p_test_entry_ids);
  delete from public.holiday_hearts_drafts where entry_id = any(p_test_entry_ids);
  if cardinality(v_story_ids) > 0 then
    delete from public.notifications where story_id = any(v_story_ids);
  end if;
  if cardinality(v_author_ids) > 0 then
    delete from public.notifications where user_id = any(v_author_ids) and message ilike '%TEST:%' and created_at > now() - interval '30 days';
    delete from public.holiday_hearts_email_deliveries where opportunity_id = p_opportunity_id and recipient_user_id = any(v_author_ids);
    -- Finalist badges are awarded when the finalist announcement is saved.
    -- Rehearsal cleanup removes only this event-cycle badge for these test entrants.
    delete from public.user_badges ub
    using public.badge_catalog bc
    where ub.badge_id = bc.id
      and ub.user_id = any(v_author_ids)
      and ub.cycle_key = 'holiday-hearts-2026'
      and bc.badge_slug = 'holiday-hearts-finalist';
  end if;
  delete from public.platform_announcements where opportunity_id = p_opportunity_id and title like 'TEST:%';
  delete from public.holiday_hearts_entries where opportunity_id = p_opportunity_id and id = any(p_test_entry_ids);
  if cardinality(v_story_ids) > 0 then
    delete from public.stories where id = any(v_story_ids);
  end if;

  update public.platform_opportunities
     set settings = settings - 'finalists_announced_at' - 'results_published' - 'results_confirmed_at'
   where id = p_opportunity_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason)
  values (auth.uid(), 'holiday_hearts_reset_rehearsal', 'platform_opportunities', p_opportunity_id,
          'Removed ' || v_selected || ' explicitly named TEST: entries and reset finalist/results state');
  return jsonb_build_object('success', true, 'deleted_entries', v_selected);
end;
$function$;
revoke all on function public.hh_admin_reset_rehearsal(uuid, uuid[]) from public, anon;
grant execute on function public.hh_admin_reset_rehearsal(uuid, uuid[]) to authenticated;
