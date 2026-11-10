-- NOTE: applied to production on 2026-10-31. Two follow-up fixes were also applied: array_append fix in hh_submit_entry, and dropping the old holiday_hearts_entries_status_check.
-- =====================================================================
-- GidiReads - Holiday Hearts, Batch 3: contest entry workflow
-- Additive migration. Does not delete or rewrite any existing data.
--
--  * Contest drafts are private and separate from ordinary stories.
--  * Submitting creates an ENTRY (private) with a manuscript snapshot.
--  * Nothing becomes a public story until an admin approves the entry.
--  * Approval publishes the story with the system-managed "Holiday Hearts" tag.
--  * Withdrawn / rejected / disqualified entries are never public.
--  * The old story-based submit function is switched off so there is one entry path.
-- =====================================================================

-- ---------- helpers ----------------------------------------------------------------
create or replace function public.hh_word_count(p_text text)
returns integer language sql immutable as $$
  select coalesce(array_length(regexp_split_to_array(nullif(btrim(coalesce(p_text,'')), ''), '\s+'), 1), 0)
$$;

create or replace function public.hh_text_to_html(p_text text)
returns text language sql immutable as $$
  select coalesce(string_agg(
           '<p>' || replace(replace(replace(replace(replace(btrim(p), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), E'\r', ''), E'\n', '<br>') || '</p>', ''), '')
  from unnest(regexp_split_to_array(coalesce(p_text, ''), '\r?\n[[:space:]]*\r?\n')) as p
  where btrim(p) <> ''
$$;

create or replace function public.hh_chapters_words(p_chapters jsonb)
returns integer language sql immutable as $$
  select coalesce(sum(public.hh_word_count(ch->>'content')), 0)::integer
  from jsonb_array_elements(case when jsonb_typeof(p_chapters) = 'array' then p_chapters else '[]'::jsonb end) ch
$$;

create or replace function public.hh_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
$$;

-- ---------- entries: new columns ---------------------------------------------------
alter table public.holiday_hearts_entries alter column story_id drop not null;
alter table public.holiday_hearts_entries
  add column if not exists title            text,
  add column if not exists synopsis         text,
  add column if not exists word_count       integer,
  add column if not exists draft_id         uuid,
  add column if not exists source           text not null default 'contest_draft',
  add column if not exists contest_tag      text not null default 'Holiday Hearts',
  add column if not exists decision_message text,
  add column if not exists withdrawn_at     timestamptz,
  add column if not exists reviewed_by      uuid references auth.users(id) on delete set null;

alter table public.holiday_hearts_entries drop constraint if exists hh_entries_status_check;
alter table public.holiday_hearts_entries add constraint hh_entries_status_check
  check (status in ('pending','under_review','approved','rejected','withdrawn','disqualified'));
alter table public.holiday_hearts_entries drop constraint if exists hh_entries_source_check;
alter table public.holiday_hearts_entries add constraint hh_entries_source_check
  check (source in ('contest_draft','story'));

-- ---------- private contest drafts -------------------------------------------------
create table if not exists public.holiday_hearts_drafts (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  author_id      uuid not null references public.profiles(id) on delete cascade,
  prompt         text check (prompt is null or prompt in ('snowed_in','one_last_christmas','the_royal_holiday')),
  title          text not null default '' check (char_length(title) <= 120),
  synopsis       text not null default '' check (char_length(synopsis) <= 1500),
  chapters       jsonb not null default '[]'::jsonb,
  word_count     integer not null default 0,
  status         text not null default 'draft' check (status in ('draft','submitted','discarded')),
  entry_id       uuid references public.holiday_hearts_entries(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists hh_drafts_one_open_per_author
  on public.holiday_hearts_drafts (opportunity_id, author_id) where status = 'draft';

alter table public.holiday_hearts_drafts enable row level security;
drop policy if exists hh_drafts_owner_read on public.holiday_hearts_drafts;
create policy hh_drafts_owner_read on public.holiday_hearts_drafts for select
  using (author_id = (select auth.uid()) or public.hh_is_admin());
-- no insert/update/delete policies: drafts are written only through hh_save_draft()

-- ---------- manuscript snapshot at submission (private until approval) -------------
create table if not exists public.holiday_hearts_entry_manuscripts (
  entry_id   uuid primary key references public.holiday_hearts_entries(id) on delete cascade,
  chapters   jsonb not null,
  word_count integer not null,
  created_at timestamptz not null default now()
);
alter table public.holiday_hearts_entry_manuscripts enable row level security;
drop policy if exists hh_manuscripts_read on public.holiday_hearts_entry_manuscripts;
create policy hh_manuscripts_read on public.holiday_hearts_entry_manuscripts for select
  using (public.hh_is_admin()
         or exists (select 1 from public.holiday_hearts_entries e where e.id = entry_id and e.author_id = (select auth.uid())));

-- ---------- internal review notes (admin only, never visible to authors) -----------
create table if not exists public.holiday_hearts_entry_reviews (
  entry_id       uuid primary key references public.holiday_hearts_entries(id) on delete cascade,
  internal_notes text not null default '',
  flags          jsonb not null default '[]'::jsonb,
  updated_by     uuid references auth.users(id) on delete set null,
  updated_at     timestamptz not null default now()
);
alter table public.holiday_hearts_entry_reviews enable row level security;
drop policy if exists hh_reviews_admin on public.holiday_hearts_entry_reviews;
create policy hh_reviews_admin on public.holiday_hearts_entry_reviews for all
  using (public.hh_is_admin()) with check (public.hh_is_admin());

-- ---------- save a draft -----------------------------------------------------------
create or replace function public.hh_save_draft(p_opportunity_id uuid, p_prompt text, p_title text, p_synopsis text, p_chapters jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_opp public.platform_opportunities%rowtype;
  v_words integer; v_id uuid; v_ch jsonb;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'Log in to save your draft.'); end if;
  select * into v_opp from public.platform_opportunities where id = p_opportunity_id and slug = 'holiday-hearts-2026' and status = 'published';
  if not found then return jsonb_build_object('success', false, 'reason', 'Holiday Hearts is not accepting entries.'); end if;
  if not public.hh_is_admin() and (now() < (v_opp.settings->>'submission_opens_at')::timestamptz or now() > (v_opp.settings->>'submission_closes_at')::timestamptz) then
    return jsonb_build_object('success', false, 'reason', 'Drafts can only be saved while submissions are open.');
  end if;
  if exists (select 1 from public.holiday_hearts_entries where opportunity_id = v_opp.id and author_id = v_uid and status in ('pending','under_review','approved','disqualified')) then
    return jsonb_build_object('success', false, 'reason', 'You already have a Holiday Hearts entry.');
  end if;
  if p_prompt is not null and p_prompt not in ('snowed_in','one_last_christmas','the_royal_holiday') then
    return jsonb_build_object('success', false, 'reason', 'Choose one of the three official prompts.');
  end if;
  v_ch := coalesce(p_chapters, '[]'::jsonb);
  if jsonb_typeof(v_ch) <> 'array' or jsonb_array_length(v_ch) > 60 then
    return jsonb_build_object('success', false, 'reason', 'A story can have up to 60 chapters.');
  end if;
  if exists (select 1 from jsonb_array_elements(v_ch) c where jsonb_typeof(c) <> 'object' or char_length(coalesce(c->>'title','')) > 120) then
    return jsonb_build_object('success', false, 'reason', 'Chapter titles must be 120 characters or fewer.');
  end if;
  if char_length(v_ch::text) > 600000 then
    return jsonb_build_object('success', false, 'reason', 'This draft is too long to save. Contest entries are limited to 30,000 words.');
  end if;
  if char_length(coalesce(p_title,'')) > 120 or char_length(coalesce(p_synopsis,'')) > 1500 then
    return jsonb_build_object('success', false, 'reason', 'The title or synopsis is too long.');
  end if;
  v_words := public.hh_chapters_words(v_ch);

  select id into v_id from public.holiday_hearts_drafts where opportunity_id = v_opp.id and author_id = v_uid and status = 'draft';
  if v_id is null then
    insert into public.holiday_hearts_drafts (opportunity_id, author_id, prompt, title, synopsis, chapters, word_count)
    values (v_opp.id, v_uid, p_prompt, btrim(coalesce(p_title,'')), btrim(coalesce(p_synopsis,'')), v_ch, v_words) returning id into v_id;
  else
    update public.holiday_hearts_drafts set prompt = p_prompt, title = btrim(coalesce(p_title,'')), synopsis = btrim(coalesce(p_synopsis,'')),
           chapters = v_ch, word_count = v_words, updated_at = now() where id = v_id;
  end if;
  return jsonb_build_object('success', true, 'draft_id', v_id, 'word_count', v_words, 'saved_at', now());
end $$;

-- ---------- submit an entry --------------------------------------------------------
create or replace function public.hh_submit_entry(p_draft_id uuid, p_eligibility_confirmed boolean, p_rights_confirmed boolean, p_acknowledged boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_draft public.holiday_hearts_drafts%rowtype; v_opp public.platform_opportunities%rowtype;
  v_existing public.holiday_hearts_entries%rowtype; v_errors text[] := '{}';
  v_min integer; v_max integer; v_words integer; v_entry_id uuid; v_has boolean;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'errors', jsonb_build_array('Log in to submit your entry.')); end if;
  select * into v_draft from public.holiday_hearts_drafts where id = p_draft_id and author_id = v_uid and status = 'draft';
  if not found then return jsonb_build_object('success', false, 'errors', jsonb_build_array('We could not find your draft. Save it and try again.')); end if;
  select * into v_opp from public.platform_opportunities where id = v_draft.opportunity_id and slug = 'holiday-hearts-2026' and status = 'published';
  if not found then return jsonb_build_object('success', false, 'errors', jsonb_build_array('Holiday Hearts is not accepting entries.')); end if;
  if now() < (v_opp.settings->>'submission_opens_at')::timestamptz then v_errors := v_errors || 'Submissions have not opened yet.'; end if;
  if now() > (v_opp.settings->>'submission_closes_at')::timestamptz then v_errors := v_errors || 'The submission deadline has passed. Late entries cannot be accepted.'; end if;

  v_min := coalesce((v_opp.settings->>'min_words')::integer, 5000);
  v_max := coalesce((v_opp.settings->>'max_words')::integer, 30000);
  v_words := public.hh_chapters_words(v_draft.chapters);

  if v_draft.prompt is null then v_errors := v_errors || 'Choose one of the three official prompts.'; end if;
  if char_length(btrim(v_draft.title)) = 0 then v_errors := v_errors || 'Add a title for your story.'; end if;
  if char_length(btrim(v_draft.synopsis)) < 30 then v_errors := v_errors || 'Add a short synopsis of at least 30 characters.'; end if;
  if v_words < v_min then v_errors := v_errors || format('Your story has %s words. The minimum is %s.', v_words, v_min); end if;
  if v_words > v_max then v_errors := v_errors || format('Your story has %s words. The maximum is %s.', v_words, v_max); end if;
  if exists (select 1 from jsonb_array_elements(v_draft.chapters) c where char_length(btrim(coalesce(c->>'content',''))) = 0) then
    v_errors := v_errors || 'One of your chapters is empty. Add text or remove it.';
  end if;
  if not coalesce(p_eligibility_confirmed, false) then v_errors := v_errors || 'Confirm that you meet the eligibility rules.'; end if;
  if not coalesce(p_rights_confirmed, false) then v_errors := v_errors || 'Confirm that this is your original work and you hold the rights.'; end if;
  if not coalesce(p_acknowledged, false) then v_errors := v_errors || 'Confirm that you understand eligible participants may be publicly acknowledged.'; end if;

  select * into v_existing from public.holiday_hearts_entries where opportunity_id = v_opp.id and author_id = v_uid;
  v_has := found;
  if v_has and (v_existing.status in ('pending','under_review','approved','disqualified') or v_existing.story_id is not null) then
    v_errors := v_errors || 'You already have a Holiday Hearts entry. Only one entry per author is allowed.';
  end if;

  if array_length(v_errors, 1) > 0 then return jsonb_build_object('success', false, 'errors', to_jsonb(v_errors)); end if;

  if v_has then
    update public.holiday_hearts_entries set prompt = v_draft.prompt, title = btrim(v_draft.title), synopsis = btrim(v_draft.synopsis), word_count = v_words,
           draft_id = v_draft.id, status = 'pending', submitted_at = now(), decision_message = null, withdrawn_at = null, reviewed_at = null, reviewed_by = null,
           eligibility_confirmed = true, rights_confirmed = true, source = 'contest_draft'
     where id = v_existing.id returning id into v_entry_id;
  else
    insert into public.holiday_hearts_entries (opportunity_id, author_id, prompt, title, synopsis, word_count, draft_id, status, eligibility_confirmed, rights_confirmed, source)
    values (v_opp.id, v_uid, v_draft.prompt, btrim(v_draft.title), btrim(v_draft.synopsis), v_words, v_draft.id, 'pending', true, true, 'contest_draft') returning id into v_entry_id;
  end if;

  insert into public.holiday_hearts_entry_manuscripts (entry_id, chapters, word_count) values (v_entry_id, v_draft.chapters, v_words)
  on conflict (entry_id) do update set chapters = excluded.chapters, word_count = excluded.word_count, created_at = now();

  update public.holiday_hearts_drafts set status = 'submitted', entry_id = v_entry_id, updated_at = now() where id = v_draft.id;

  insert into public.notifications (user_id, message, link, category)
  values (v_uid, 'Your Holiday Hearts entry “' || btrim(v_draft.title) || '” was submitted and is waiting for review.', 'holiday-hearts-entry.html', 'system');

  return jsonb_build_object('success', true, 'entry_id', v_entry_id, 'word_count', v_words, 'submitted_at', now());
end $$;

-- ---------- withdraw ---------------------------------------------------------------
create or replace function public.hh_withdraw_entry(p_entry_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_e public.holiday_hearts_entries%rowtype;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'reason', 'Log in first.'); end if;
  select * into v_e from public.holiday_hearts_entries where id = p_entry_id and author_id = v_uid;
  if not found then return jsonb_build_object('success', false, 'reason', 'We could not find that entry.'); end if;
  if v_e.status not in ('pending','under_review','approved') then return jsonb_build_object('success', false, 'reason', 'This entry cannot be withdrawn.'); end if;
  update public.holiday_hearts_entries set status = 'withdrawn', withdrawn_at = now() where id = v_e.id;
  if v_e.story_id is not null then update public.stories set status = 'draft' where id = v_e.story_id; end if;  -- hides the public story
  return jsonb_build_object('success', true);
end $$;

-- ---------- admin decision ---------------------------------------------------------
create or replace function public.hh_admin_review_entry(p_entry_id uuid, p_decision text, p_message text, p_internal_notes text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_e public.holiday_hearts_entries%rowtype; v_m public.holiday_hearts_entry_manuscripts%rowtype;
  v_story_id uuid; v_label text; v_msg text := nullif(btrim(coalesce(p_message,'')), '');
begin
  if not public.hh_is_admin() then return jsonb_build_object('success', false, 'reason', 'Administrator access required.'); end if;
  select * into v_e from public.holiday_hearts_entries where id = p_entry_id;
  if not found then return jsonb_build_object('success', false, 'reason', 'Entry not found.'); end if;
  if p_decision not in ('approve','reject','disqualify','under_review') then return jsonb_build_object('success', false, 'reason', 'Unknown decision.'); end if;
  if v_e.status = 'withdrawn' then return jsonb_build_object('success', false, 'reason', 'This entry was withdrawn by the author.'); end if;
  v_label := case v_e.prompt when 'snowed_in' then 'Snowed In' when 'one_last_christmas' then 'One Last Christmas' else 'The Royal Holiday' end;

  if p_decision in ('reject','disqualify') and (v_msg is null or char_length(v_msg) < 10) then
    return jsonb_build_object('success', false, 'reason', 'Write a clear message to the author (at least 10 characters) explaining the decision.');
  end if;

  if p_decision = 'approve' then
    if v_e.status = 'approved' then return jsonb_build_object('success', false, 'reason', 'Already approved.'); end if;
    if v_e.story_id is null then
      select * into v_m from public.holiday_hearts_entry_manuscripts where entry_id = v_e.id;
      if not found then return jsonb_build_object('success', false, 'reason', 'This entry has no manuscript to publish.'); end if;
      insert into public.stories (author_id, title, description, primary_genre, status, language, tags, content_rating, rights_confirmed, adaptation_availability, first_published_at)
      values (v_e.author_id, v_e.title, v_e.synopsis, 'Romance', 'completed', 'English', array['Holiday Hearts', v_label], 'Teen', true, 'Not Available', now())
      returning id into v_story_id;
      insert into public.chapters (story_id, chapter_number, display_order, title, content, content_html, is_published, content_type, created_at, updated_at, published_at)
      select v_story_id, ord::integer, ord::integer, coalesce(nullif(btrim(c->>'title'), ''), 'Chapter ' || ord), c->>'content', public.hh_text_to_html(c->>'content'), true, 'chapter', now(), now(), now()
      from jsonb_array_elements(v_m.chapters) with ordinality as t(c, ord);
    else
      v_story_id := v_e.story_id;
      update public.stories set status = 'completed' where id = v_story_id and status = 'draft';   -- re-publish if previously hidden
    end if;
    update public.holiday_hearts_entries set status = 'approved', story_id = v_story_id, reviewed_at = now(), reviewed_by = v_uid, decision_message = v_msg where id = v_e.id;
    insert into public.notifications (user_id, message, link, category, story_id)
    values (v_e.author_id, 'Your Holiday Hearts entry “' || v_e.title || '” was approved and is now in the Holiday Hearts collection.', 'story.html?id=' || v_story_id, 'system', v_story_id);
  elsif p_decision = 'reject' then
    update public.holiday_hearts_entries set status = 'rejected', reviewed_at = now(), reviewed_by = v_uid, decision_message = v_msg where id = v_e.id;
    if v_e.story_id is not null then update public.stories set status = 'draft' where id = v_e.story_id; end if;
    insert into public.notifications (user_id, message, link, category)
    values (v_e.author_id, 'Your Holiday Hearts entry “' || v_e.title || '” was not approved. ' || v_msg, 'holiday-hearts-entry.html', 'system');
  elsif p_decision = 'disqualify' then
    update public.holiday_hearts_entries set status = 'disqualified', reviewed_at = now(), reviewed_by = v_uid, decision_message = v_msg where id = v_e.id;
    if v_e.story_id is not null then update public.stories set status = 'draft' where id = v_e.story_id; end if;
    insert into public.notifications (user_id, message, link, category)
    values (v_e.author_id, 'Your Holiday Hearts entry “' || v_e.title || '” was disqualified. ' || v_msg, 'holiday-hearts-entry.html', 'system');
  else
    update public.holiday_hearts_entries set status = 'under_review', reviewed_by = v_uid where id = v_e.id;
  end if;

  if p_internal_notes is not null then
    insert into public.holiday_hearts_entry_reviews (entry_id, internal_notes, updated_by, updated_at) values (v_e.id, left(p_internal_notes, 4000), v_uid, now())
    on conflict (entry_id) do update set internal_notes = excluded.internal_notes, updated_by = excluded.updated_by, updated_at = now();
  end if;
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason)
  values (v_uid, 'holiday_hearts_entry_' || p_decision, 'holiday_hearts_entries', v_e.id, left(coalesce(v_msg, ''), 500));
  return jsonb_build_object('success', true, 'story_id', v_story_id);
end $$;

-- ---------- the system "Holiday Hearts" tag cannot be removed from approved entries --
create or replace function public.hh_keep_contest_tag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.holiday_hearts_entries e where e.story_id = new.id and e.status = 'approved')
     and not exists (select 1 from unnest(coalesce(new.tags, '{}'::text[])) t where lower(btrim(t)) = 'holiday hearts') then
    new.tags := coalesce(new.tags, '{}'::text[]) || array['Holiday Hearts'];
  end if;
  return new;
end $$;
drop trigger if exists hh_keep_contest_tag on public.stories;
create trigger hh_keep_contest_tag before update of tags on public.stories for each row execute function public.hh_keep_contest_tag();

-- ---------- permissions --------------------------------------------------------------
revoke all on function public.hh_save_draft(uuid, text, text, text, jsonb) from public, anon;
revoke all on function public.hh_submit_entry(uuid, boolean, boolean, boolean) from public, anon;
revoke all on function public.hh_withdraw_entry(uuid) from public, anon;
revoke all on function public.hh_admin_review_entry(uuid, text, text, text) from public, anon;
grant execute on function public.hh_save_draft(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.hh_submit_entry(uuid, boolean, boolean, boolean) to authenticated;
grant execute on function public.hh_withdraw_entry(uuid) to authenticated;
grant execute on function public.hh_admin_review_entry(uuid, text, text, text) to authenticated;

-- one entry path only: switch off the old story-based submission function
revoke execute on function public.submit_holiday_hearts_entry(uuid, uuid, text, text, boolean, boolean) from public, anon, authenticated;
