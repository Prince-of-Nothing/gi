-- Follow-up applied: hh_admin_set_vote_excluded now stamps updated_at, and hh_admin_confirm_results refuses if votes changed after the last calculation.
-- GidiReads - Holiday Hearts, Batch 4: finalists, voting, 70/30 scoring, result confirmation.
-- Additive. No judges. Votes are private; results are admin-only until confirmed.
-- Scoring version hh-2026-v1: final = 70% vote score + 30% engagement score (settings.scoring can change the split, must total 100).

alter table public.holiday_hearts_entries
  add column if not exists is_finalist boolean not null default false,
  add column if not exists finalist_at timestamptz;

alter table public.holiday_hearts_votes
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists change_count integer not null default 0,
  add column if not exists is_excluded boolean not null default false,
  add column if not exists excluded_reason text,
  add column if not exists excluded_by uuid references auth.users(id) on delete set null;

create table if not exists public.holiday_hearts_vote_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  entry_id uuid not null references public.holiday_hearts_entries(id) on delete cascade,
  action text not null check (action in ('cast','changed')),
  created_at timestamptz not null default now()
);
create index if not exists hh_vote_events_entry_time on public.holiday_hearts_vote_events (entry_id, created_at);
alter table public.holiday_hearts_vote_events enable row level security;
drop policy if exists hh_vote_events_admin on public.holiday_hearts_vote_events;
create policy hh_vote_events_admin on public.holiday_hearts_vote_events for select using (public.hh_is_admin());

create table if not exists public.holiday_hearts_results (
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  entry_id uuid not null references public.holiday_hearts_entries(id) on delete cascade,
  vote_count integer not null default 0,
  engagement jsonb not null default '{}'::jsonb,
  vote_score numeric(6,2) not null default 0,
  engagement_score numeric(6,2) not null default 0,
  final_score numeric(6,2) not null default 0,
  rank integer,
  flags jsonb not null default '[]'::jsonb,
  scoring_version text not null,
  calculated_at timestamptz not null default now(),
  confirmed boolean not null default false,
  placement text check (placement in ('winner','first_runner_up','second_runner_up')),
  primary key (opportunity_id, entry_id)
);
alter table public.holiday_hearts_results enable row level security;
drop policy if exists hh_results_admin on public.holiday_hearts_results;
create policy hh_results_admin on public.holiday_hearts_results for all using (public.hh_is_admin()) with check (public.hh_is_admin());

-- one path for voting: switch off the old unrestricted vote function
revoke execute on function public.cast_holiday_hearts_vote(uuid) from public, anon, authenticated;

-- a story that is a live contest entry cannot be deleted by accident (would erase the entry and its votes)
create or replace function public.hh_block_entry_story_delete() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.holiday_hearts_entries e where e.story_id = old.id and e.status in ('pending','under_review','approved')) then
    raise exception 'This story is a Holiday Hearts entry. Withdraw the entry first, then you can delete the story.';
  end if;
  return old;
end $$;
drop trigger if exists hh_block_entry_story_delete on public.stories;
create trigger hh_block_entry_story_delete before delete on public.stories for each row execute function public.hh_block_entry_story_delete();

-- ---------- voting ----------
create or replace function public.hh_cast_vote(p_entry_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_e public.holiday_hearts_entries%rowtype; v_opp public.platform_opportunities%rowtype; v_old uuid;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'Log in to vote.'); end if;
  select * into v_e from public.holiday_hearts_entries where id = p_entry_id;
  if not found or v_e.status <> 'approved' or not v_e.is_finalist then return jsonb_build_object('success', false, 'reason', 'That story is not a finalist.'); end if;
  select * into v_opp from public.platform_opportunities where id = v_e.opportunity_id and status = 'published';
  if not found then return jsonb_build_object('success', false, 'reason', 'Voting is not available.'); end if;
  if v_opp.settings->>'voting_opens_at' is null or v_opp.settings->>'voting_closes_at' is null
     or now() < (v_opp.settings->>'voting_opens_at')::timestamptz or now() > (v_opp.settings->>'voting_closes_at')::timestamptz then
    return jsonb_build_object('success', false, 'reason', 'Voting is not open.');
  end if;
  if coalesce((v_opp.settings->>'results_published')::boolean, false) then return jsonb_build_object('success', false, 'reason', 'Voting has ended.'); end if;
  if v_e.author_id = v_uid then return jsonb_build_object('success', false, 'reason', 'You cannot vote for your own story.'); end if;
  select entry_id into v_old from public.holiday_hearts_votes where opportunity_id = v_e.opportunity_id and voter_id = v_uid;
  if v_old = p_entry_id then return jsonb_build_object('success', true, 'unchanged', true); end if;
  insert into public.holiday_hearts_votes (opportunity_id, entry_id, voter_id) values (v_e.opportunity_id, p_entry_id, v_uid)
  on conflict (opportunity_id, voter_id) do update set entry_id = excluded.entry_id, updated_at = now(), change_count = public.holiday_hearts_votes.change_count + 1;
  insert into public.holiday_hearts_vote_events (opportunity_id, voter_id, entry_id, action) values (v_e.opportunity_id, v_uid, p_entry_id, case when v_old is null then 'cast' else 'changed' end);
  return jsonb_build_object('success', true, 'changed', v_old is not null);
end $$;

create or replace function public.hh_my_vote(p_opportunity_id uuid) returns uuid language sql stable security definer set search_path = public as $$
  select entry_id from public.holiday_hearts_votes where opportunity_id = p_opportunity_id and voter_id = auth.uid()
$$;

-- ---------- finalists ----------
create or replace function public.hh_admin_set_finalists(p_opportunity_id uuid, p_entry_ids uuid[]) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_opp public.platform_opportunities%rowtype; v_limit integer; v_n integer := coalesce(array_length(p_entry_ids, 1), 0);
begin
  if not public.hh_is_admin() then return jsonb_build_object('success', false, 'reason', 'Administrator access required.'); end if;
  select * into v_opp from public.platform_opportunities where id = p_opportunity_id;
  if not found then return jsonb_build_object('success', false, 'reason', 'Contest not found.'); end if;
  v_limit := (v_opp.settings->>'finalist_count')::integer;
  if v_limit is null or v_limit < 1 then return jsonb_build_object('success', false, 'reason', 'Set the number of finalists first.'); end if;
  if v_opp.settings->>'finalists_announced_at' is not null then return jsonb_build_object('success', false, 'reason', 'Finalists are already announced and cannot be changed.'); end if;
  if v_n > v_limit then return jsonb_build_object('success', false, 'reason', format('You can choose at most %s finalists.', v_limit)); end if;
  if (select count(*) from public.holiday_hearts_entries where id = any(p_entry_ids) and opportunity_id = p_opportunity_id and status = 'approved') <> v_n then
    return jsonb_build_object('success', false, 'reason', 'Only approved entries can be finalists.');
  end if;
  update public.holiday_hearts_entries set is_finalist = false, finalist_at = null where opportunity_id = p_opportunity_id and is_finalist;
  update public.holiday_hearts_entries set is_finalist = true, finalist_at = now() where id = any(p_entry_ids);
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason) values (auth.uid(), 'holiday_hearts_set_finalists', 'platform_opportunities', p_opportunity_id, v_n || ' finalists selected');
  return jsonb_build_object('success', true, 'finalists', v_n);
end $$;

create or replace function public.hh_admin_announce_finalists(p_opportunity_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_opp public.platform_opportunities%rowtype; r record; v_n integer;
begin
  if not public.hh_is_admin() then return jsonb_build_object('success', false, 'reason', 'Administrator access required.'); end if;
  select * into v_opp from public.platform_opportunities where id = p_opportunity_id;
  if not found then return jsonb_build_object('success', false, 'reason', 'Contest not found.'); end if;
  if v_opp.settings->>'finalists_announced_at' is not null then return jsonb_build_object('success', false, 'reason', 'Finalists were already announced.'); end if;
  select count(*) into v_n from public.holiday_hearts_entries where opportunity_id = p_opportunity_id and is_finalist and status = 'approved';
  if v_n < 1 then return jsonb_build_object('success', false, 'reason', 'Choose at least one finalist first.'); end if;
  update public.platform_opportunities set settings = settings || jsonb_build_object('finalists_announced_at', now()) where id = p_opportunity_id;
  for r in select author_id, title, story_id from public.holiday_hearts_entries where opportunity_id = p_opportunity_id and is_finalist and status = 'approved' loop
    insert into public.notifications (user_id, message, link, category, story_id) values (r.author_id, 'Congratulations! “' || r.title || '” is a Holiday Hearts finalist.', 'holiday-hearts.html#finalists', 'system', r.story_id);
  end loop;
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason) values (auth.uid(), 'holiday_hearts_announce_finalists', 'platform_opportunities', p_opportunity_id, v_n || ' finalists announced');
  return jsonb_build_object('success', true, 'finalists', v_n);
end $$;

-- ---------- vote moderation ----------
create or replace function public.hh_admin_set_vote_excluded(p_vote_id uuid, p_excluded boolean, p_reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_v public.holiday_hearts_votes%rowtype; v_opp public.platform_opportunities%rowtype;
begin
  if not public.hh_is_admin() then return jsonb_build_object('success', false, 'reason', 'Administrator access required.'); end if;
  select * into v_v from public.holiday_hearts_votes where id = p_vote_id;
  if not found then return jsonb_build_object('success', false, 'reason', 'Vote not found.'); end if;
  select * into v_opp from public.platform_opportunities where id = v_v.opportunity_id;
  if coalesce((v_opp.settings->>'results_published')::boolean, false) then return jsonb_build_object('success', false, 'reason', 'Results are published. Reopen them first.'); end if;
  if p_excluded and char_length(btrim(coalesce(p_reason, ''))) < 10 then return jsonb_build_object('success', false, 'reason', 'Write a reason (at least 10 characters).'); end if;
  update public.holiday_hearts_votes set is_excluded = p_excluded, excluded_reason = case when p_excluded then left(btrim(p_reason), 500) else null end, excluded_by = case when p_excluded then auth.uid() else null end where id = p_vote_id;
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason) values (auth.uid(), case when p_excluded then 'holiday_hearts_exclude_vote' else 'holiday_hearts_restore_vote' end, 'holiday_hearts_votes', p_vote_id, left(coalesce(p_reason, ''), 500));
  return jsonb_build_object('success', true);
end $$;

-- ---------- scoring ----------
create or replace function public.hh_admin_calculate_results(p_opportunity_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_opp public.platform_opportunities%rowtype; v_vw numeric; v_ew numeric; v_start timestamptz; v_open timestamptz; v_end timestamptz; v_n integer;
  v_version constant text := 'hh-2026-v1';
begin
  if not public.hh_is_admin() then return jsonb_build_object('success', false, 'reason', 'Administrator access required.'); end if;
  select * into v_opp from public.platform_opportunities where id = p_opportunity_id;
  if not found then return jsonb_build_object('success', false, 'reason', 'Contest not found.'); end if;
  if coalesce((v_opp.settings->>'results_published')::boolean, false) then return jsonb_build_object('success', false, 'reason', 'Results are published. Reopen them before recalculating.'); end if;
  v_vw := coalesce((v_opp.settings->'scoring'->>'voting_weight')::numeric, 70);
  v_ew := coalesce((v_opp.settings->'scoring'->>'engagement_weight')::numeric, 30);
  if v_vw + v_ew <> 100 then return jsonb_build_object('success', false, 'reason', 'The voting and engagement weights must add up to 100.'); end if;
  v_start := (v_opp.settings->>'submission_opens_at')::timestamptz;
  v_open := (v_opp.settings->>'voting_opens_at')::timestamptz;
  v_end := least(coalesce((v_opp.settings->>'voting_closes_at')::timestamptz, now()), now());
  select count(*) into v_n from public.holiday_hearts_entries where opportunity_id = p_opportunity_id and is_finalist and status = 'approved';
  if v_n < 1 then return jsonb_build_object('success', false, 'reason', 'There are no finalists to score.'); end if;

  delete from public.holiday_hearts_results where opportunity_id = p_opportunity_id and not confirmed;

  with f as (
    select e.id as entry_id, e.author_id, e.story_id, e.submitted_at, greatest(coalesce(s.first_published_at, v_start), v_start) as win_start
    from public.holiday_hearts_entries e left join public.stories s on s.id = e.story_id
    where e.opportunity_id = p_opportunity_id and e.is_finalist and e.status = 'approved'),
  vt as (
    select v.entry_id, count(*) filter (where not v.is_excluded) as votes_n,
           count(*) filter (where not v.is_excluded and p.created_at > v_open) as new_n
    from public.holiday_hearts_votes v join public.profiles p on p.id = v.voter_id
    where v.opportunity_id = p_opportunity_id group by v.entry_id),
  lib as (
    select f.entry_id, count(distinct l.reader_id) as n from f join public.library_entries l on l.story_id = f.story_id
    where l.reader_id <> f.author_id and l.created_at >= f.win_start and l.created_at <= v_end group by f.entry_id),
  rev as (
    select f.entry_id, count(distinct r.reader_id) as n from f join public.reviews r on r.story_id = f.story_id
    where r.reader_id <> f.author_id and r.created_at >= f.win_start and r.created_at <= v_end and char_length(btrim(coalesce(r.review_text, ''))) >= 20 group by f.entry_id),
  com as (
    select f.entry_id, count(distinct c.author_id) as n from f join public.chapters ch on ch.story_id = f.story_id join public.comments c on c.chapter_id = ch.id
    where c.author_id <> f.author_id and c.created_at >= f.win_start and c.created_at <= v_end and char_length(btrim(coalesce(c.content, ''))) >= 10 group by f.entry_id),
  base as (
    select f.entry_id, f.submitted_at, coalesce(vt.votes_n, 0)::int as votes_n, coalesce(vt.new_n, 0)::int as new_n,
           coalesce(lib.n, 0)::int as lib_n, coalesce(rev.n, 0)::int as rev_n, coalesce(com.n, 0)::int as com_n
    from f left join vt on vt.entry_id = f.entry_id left join lib on lib.entry_id = f.entry_id left join rev on rev.entry_id = f.entry_id left join com on com.entry_id = f.entry_id),
  mx as (select max(votes_n) as mv, max(lib_n) as ml, max(rev_n) as mr, max(com_n) as mc from base),
  scored as (
    select b.*, case when mx.mv > 0 then 100.0 * b.votes_n / mx.mv else 0 end as vs,
           100.0 * ((case when mx.ml > 0 then b.lib_n::numeric / mx.ml else 0 end) + (case when mx.mr > 0 then b.rev_n::numeric / mx.mr else 0 end) + (case when mx.mc > 0 then b.com_n::numeric / mx.mc else 0 end)) / 3 as es
    from base b cross join mx),
  ranked as (select s.*, round(v_vw / 100 * s.vs + v_ew / 100 * s.es, 2) as fs from scored s),
  ordered as (select r.*, row_number() over (order by r.fs desc, r.votes_n desc, r.submitted_at asc) as rk from ranked r)
  insert into public.holiday_hearts_results (opportunity_id, entry_id, vote_count, engagement, vote_score, engagement_score, final_score, rank, flags, scoring_version, calculated_at)
  select p_opportunity_id, o.entry_id, o.votes_n,
         jsonb_build_object('library_adds', o.lib_n, 'reviews', o.rev_n, 'comments', o.com_n),
         round(o.vs, 2), round(o.es, 2), o.fs, o.rk::int,
         to_jsonb(array_remove(array[
           case when o.votes_n >= 5 and o.new_n::numeric / o.votes_n > 0.5 then 'most_votes_from_accounts_created_after_voting_opened' end,
           case when exists (select 1 from public.holiday_hearts_vote_events ev where ev.entry_id = o.entry_id group by date_trunc('minute', ev.created_at) having count(*) >= 20) then 'vote_burst_20_in_a_minute' end
         ], null)),
         v_version, now()
  from ordered o
  on conflict (opportunity_id, entry_id) do update set vote_count = excluded.vote_count, engagement = excluded.engagement, vote_score = excluded.vote_score,
     engagement_score = excluded.engagement_score, final_score = excluded.final_score, rank = excluded.rank, flags = excluded.flags, scoring_version = excluded.scoring_version, calculated_at = excluded.calculated_at;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason) values (auth.uid(), 'holiday_hearts_calculate_results', 'platform_opportunities', p_opportunity_id, v_version || ' ' || v_vw || '/' || v_ew);
  return jsonb_build_object('success', true, 'finalists', v_n, 'scoring_version', v_version);
end $$;

-- ---------- confirm / reopen ----------
create or replace function public.hh_admin_confirm_results(p_opportunity_id uuid, p_readers_choice_entry uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_opp public.platform_opportunities%rowtype; r record; v_cnt integer;
begin
  if not public.hh_is_admin() then return jsonb_build_object('success', false, 'reason', 'Administrator access required.'); end if;
  select * into v_opp from public.platform_opportunities where id = p_opportunity_id;
  if not found then return jsonb_build_object('success', false, 'reason', 'Contest not found.'); end if;
  if coalesce((v_opp.settings->>'results_published')::boolean, false) then return jsonb_build_object('success', false, 'reason', 'Results are already published.'); end if;
  if v_opp.settings->>'voting_closes_at' is null or now() <= (v_opp.settings->>'voting_closes_at')::timestamptz then return jsonb_build_object('success', false, 'reason', 'Voting is still open. Results can only be confirmed after it closes.'); end if;
  select count(*) into v_cnt from public.holiday_hearts_results where opportunity_id = p_opportunity_id;
  if v_cnt < 1 then return jsonb_build_object('success', false, 'reason', 'Calculate the results first.'); end if;
  if exists (select 1 from public.holiday_hearts_results where opportunity_id = p_opportunity_id and calculated_at < (v_opp.settings->>'voting_closes_at')::timestamptz) then
    return jsonb_build_object('success', false, 'reason', 'These results were calculated before voting closed. Recalculate them now.');
  end if;
  if p_readers_choice_entry is not null and not exists (select 1 from public.holiday_hearts_results where opportunity_id = p_opportunity_id and entry_id = p_readers_choice_entry) then
    return jsonb_build_object('success', false, 'reason', 'Reader''s Choice must be one of the finalists.');
  end if;

  update public.holiday_hearts_results set confirmed = true,
    placement = case rank when 1 then 'winner' when 2 then 'first_runner_up' when 3 then 'second_runner_up' else null end
  where opportunity_id = p_opportunity_id;
  update public.holiday_hearts_entries set award = 'participant', readers_choice = false where opportunity_id = p_opportunity_id and status = 'approved';
  update public.holiday_hearts_entries e set award = case res.rank when 1 then 'first_prize' when 2 then 'second_prize' when 3 then 'third_prize' else e.award end
  from public.holiday_hearts_results res where res.entry_id = e.id and res.opportunity_id = p_opportunity_id and res.rank <= 3;
  if p_readers_choice_entry is not null then update public.holiday_hearts_entries set readers_choice = true where id = p_readers_choice_entry; end if;
  update public.platform_opportunities set settings = settings || jsonb_build_object('results_published', true, 'results_confirmed_at', now()) where id = p_opportunity_id;

  for r in select e.author_id, e.title, e.story_id, res.placement from public.holiday_hearts_results res join public.holiday_hearts_entries e on e.id = res.entry_id
           where res.opportunity_id = p_opportunity_id and res.placement is not null loop
    insert into public.notifications (user_id, message, link, category, story_id)
    values (r.author_id, 'Congratulations! “' || r.title || '” placed in Holiday Hearts. The GidiReads team will contact you about next steps.', 'holiday-hearts.html#results', 'system', r.story_id);
  end loop;
  if p_readers_choice_entry is not null then
    insert into public.notifications (user_id, message, link, category, story_id)
    select e.author_id, 'Congratulations! “' || e.title || '” won the Holiday Hearts Reader''s Choice badge.', 'holiday-hearts.html#results', 'system', e.story_id from public.holiday_hearts_entries e where e.id = p_readers_choice_entry;
  end if;
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason) values (auth.uid(), 'holiday_hearts_confirm_results', 'platform_opportunities', p_opportunity_id, 'results confirmed and published');
  return jsonb_build_object('success', true);
end $$;

create or replace function public.hh_admin_reopen_results(p_opportunity_id uuid, p_reason text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.hh_is_admin() then return jsonb_build_object('success', false, 'reason', 'Administrator access required.'); end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 10 then return jsonb_build_object('success', false, 'reason', 'Write the reason for reopening (at least 10 characters).'); end if;
  update public.platform_opportunities set settings = (settings - 'results_published' - 'results_confirmed_at') where id = p_opportunity_id;
  update public.holiday_hearts_results set confirmed = false, placement = null where opportunity_id = p_opportunity_id;
  update public.holiday_hearts_entries set award = 'none', readers_choice = false where opportunity_id = p_opportunity_id;
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason) values (auth.uid(), 'holiday_hearts_reopen_results', 'platform_opportunities', p_opportunity_id, left(p_reason, 500));
  return jsonb_build_object('success', true);
end $$;

-- ---------- permissions ----------
revoke all on function public.hh_cast_vote(uuid) from public, anon;
revoke all on function public.hh_my_vote(uuid) from public, anon;
revoke all on function public.hh_admin_set_finalists(uuid, uuid[]) from public, anon;
revoke all on function public.hh_admin_announce_finalists(uuid) from public, anon;
revoke all on function public.hh_admin_set_vote_excluded(uuid, boolean, text) from public, anon;
revoke all on function public.hh_admin_calculate_results(uuid) from public, anon;
revoke all on function public.hh_admin_confirm_results(uuid, uuid) from public, anon;
revoke all on function public.hh_admin_reopen_results(uuid, text) from public, anon;
grant execute on function public.hh_cast_vote(uuid) to authenticated;
grant execute on function public.hh_my_vote(uuid) to authenticated;
grant execute on function public.hh_admin_set_finalists(uuid, uuid[]) to authenticated;
grant execute on function public.hh_admin_announce_finalists(uuid) to authenticated;
grant execute on function public.hh_admin_set_vote_excluded(uuid, boolean, text) to authenticated;
grant execute on function public.hh_admin_calculate_results(uuid) to authenticated;
grant execute on function public.hh_admin_confirm_results(uuid, uuid) to authenticated;
grant execute on function public.hh_admin_reopen_results(uuid, text) to authenticated;
