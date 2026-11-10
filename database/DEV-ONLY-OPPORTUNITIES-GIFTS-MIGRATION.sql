-- GidiReads Opportunities / Holiday Hearts / Gift recipient search
-- DEVELOPMENT PROJECT ONLY. Do not run against production.
-- Additive migration: creates missing contest objects, adds the profile/notification fields
-- required by existing functions, and exposes a constrained recipient lookup RPC.

begin;

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.notifications add column if not exists actor_id uuid;
alter table public.wallet_gifts add column if not exists sender_visibility text not null default 'named';

create table if not exists public.platform_opportunities (
 id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
 summary text not null default '', body text not null default '', opportunity_type text not null default 'program',
 status text not null default 'draft', hero_image_url text, starts_at timestamptz, ends_at timestamptz,
 settings jsonb not null default '{}'::jsonb, created_by uuid, updated_by uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.holiday_hearts_entries (
 id uuid primary key default gen_random_uuid(), opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
 story_id uuid not null references public.stories(id) on delete cascade, author_id uuid not null references auth.users(id) on delete cascade,
 prompt text not null check(prompt in ('snowed_in','one_last_christmas','the_royal_holiday')),
 author_note text not null default '', eligibility_confirmed boolean not null default false, rights_confirmed boolean not null default false,
 status text not null default 'pending' check(status in ('pending','approved','rejected','disqualified')),
 award text not null default 'none', readers_choice boolean not null default false, reviewer_note text, final_score numeric,
 submitted_at timestamptz not null default now(), reviewed_at timestamptz,
 unique(opportunity_id,author_id), unique(opportunity_id,story_id)
);
create table if not exists public.holiday_hearts_votes (
 id uuid primary key default gen_random_uuid(), opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
 entry_id uuid not null references public.holiday_hearts_entries(id) on delete cascade,
 voter_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(),
 unique(opportunity_id,voter_id)
);
create table if not exists public.holiday_hearts_judging (
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.holiday_hearts_entries(id) on delete cascade,
 judge_id uuid not null references auth.users(id) on delete cascade,
 prompt_fit integer not null check(prompt_fit between 0 and 100), storytelling integer not null check(storytelling between 0 and 100),
 writing_quality integer not null check(writing_quality between 0 and 100), completeness integer not null check(completeness between 0 and 100),
 notes text not null default '', updated_at timestamptz not null default now(), unique(entry_id,judge_id)
);

alter table public.platform_opportunities enable row level security;
alter table public.holiday_hearts_entries enable row level security;
alter table public.holiday_hearts_votes enable row level security;
alter table public.holiday_hearts_judging enable row level security;

do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='platform_opportunities' and policyname='Published opportunities readable') then
  create policy "Published opportunities readable" on public.platform_opportunities for select to anon, authenticated using(status='published'); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='holiday_hearts_entries' and policyname='Approved contest entries readable') then
  create policy "Approved contest entries readable" on public.holiday_hearts_entries for select to anon, authenticated using(status='approved' or author_id=(select auth.uid())); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='holiday_hearts_votes' and policyname='Voters read own votes') then
  create policy "Voters read own votes" on public.holiday_hearts_votes for select to authenticated using(voter_id=(select auth.uid())); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='holiday_hearts_judging' and policyname='Judges read own scores') then
  create policy "Judges read own scores" on public.holiday_hearts_judging for select to authenticated using(judge_id=(select auth.uid())); end if;
end $$;

grant select on public.platform_opportunities, public.holiday_hearts_entries to anon, authenticated;
grant select on public.holiday_hearts_votes, public.holiday_hearts_judging to authenticated;

create or replace function public.gidireads_search_gift_recipients(p_query text)
returns table(username text, display_name text)
language plpgsql stable security definer set search_path=pg_catalog,public
as $$
declare q text:=lower(trim(regexp_replace(coalesce(p_query,''),'[^a-zA-Z0-9_. -]','','g')));
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if length(q)<2 then return; end if;
 return query select p.username, coalesce(nullif(trim(p.display_name),''),p.username)
 from public.profiles p where coalesce(p.account_status,'active')='active'
 and (lower(p.username) like '%'||q||'%' or lower(coalesce(p.display_name,'')) like '%'||q||'%')
 order by case when lower(p.username)=q then 0 when lower(p.username) like q||'%' then 1 else 2 end, p.username limit 8;
end $$;
revoke all on function public.gidireads_search_gift_recipients(text) from public, anon;
grant execute on function public.gidireads_search_gift_recipients(text) to authenticated;

create or replace function public.submit_holiday_hearts_entry(
 p_opportunity_id uuid,p_story_id uuid,p_prompt text,p_author_note text,p_eligibility_confirmed boolean,p_rights_confirmed boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid:=auth.uid(); opp public.platform_opportunities%rowtype; st public.stories%rowtype; wc integer; eid uuid;
begin
 if uid is null then return jsonb_build_object('success',false,'reason','Sign in to submit an entry.'); end if;
 select * into opp from public.platform_opportunities where id=p_opportunity_id and slug='holiday-hearts-2026' and status='published';
 if not found then return jsonb_build_object('success',false,'reason','This contest is not accepting entries.'); end if;
 if now()<nullif(opp.settings->>'submission_opens_at','')::timestamptz or now()>nullif(opp.settings->>'submission_closes_at','')::timestamptz then return jsonb_build_object('success',false,'reason','The submission window is closed.'); end if;
 if p_prompt not in ('snowed_in','one_last_christmas','the_royal_holiday') then return jsonb_build_object('success',false,'reason','Choose one official contest prompt.'); end if;
 if not coalesce(p_eligibility_confirmed,false) or not coalesce(p_rights_confirmed,false) then return jsonb_build_object('success',false,'reason','Confirm eligibility and original-work/rights declarations.'); end if;
 select * into st from public.stories where id=p_story_id and author_id=uid and status in ('ongoing','completed');
 if not found then return jsonb_build_object('success',false,'reason','Choose one of your published stories.'); end if;
 if st.first_published_at is null or st.first_published_at<'2026-11-01T00:00:00+01:00'::timestamptz or st.first_published_at>(opp.settings->>'submission_closes_at')::timestamptz then return jsonb_build_object('success',false,'reason','The first public chapter must be published between Nov 1 and the submission deadline.'); end if;
 if not exists(select 1 from unnest(coalesce(st.tags,'{}'::text[])) t where lower(trim(t))='holiday hearts') then return jsonb_build_object('success',false,'reason','Add the exact Holiday Hearts tag before submitting.'); end if;
 select coalesce(sum(array_length(regexp_split_to_array(trim(regexp_replace(regexp_replace(coalesce(nullif(c.content_html,''),c.content,''),'<[^>]+>',' ','g'),'&nbsp;|&amp;|&quot;',' ','g')), '\s+'),1)),0)::integer into wc from public.chapters c where c.story_id=p_story_id and c.is_published;
 if wc<coalesce((opp.settings->>'min_words')::int,5000) or wc>coalesce((opp.settings->>'max_words')::int,30000) then return jsonb_build_object('success',false,'reason',format('Published word count is %s; allowed range is %s–%s.',wc,coalesce((opp.settings->>'min_words')::int,5000),coalesce((opp.settings->>'max_words')::int,30000))); end if;
 insert into public.holiday_hearts_entries(opportunity_id,story_id,author_id,prompt,author_note,eligibility_confirmed,rights_confirmed)
 values(opp.id,p_story_id,uid,p_prompt,left(coalesce(p_author_note,''),1500),true,true) returning id into eid;
 return jsonb_build_object('success',true,'entry_id',eid,'word_count',wc);
exception when unique_violation then return jsonb_build_object('success',false,'reason','Only one entry per author is allowed.');
end $$;

create or replace function public.cast_holiday_hearts_vote(p_entry_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare uid uuid:=auth.uid(); ent public.holiday_hearts_entries%rowtype; opp public.platform_opportunities%rowtype;
begin
 if uid is null then return jsonb_build_object('success',false,'reason','Sign in to vote.'); end if;
 select * into ent from public.holiday_hearts_entries where id=p_entry_id and status='approved';
 if not found then return jsonb_build_object('success',false,'reason','This entry is not open for voting.'); end if;
 select * into opp from public.platform_opportunities where id=ent.opportunity_id and slug='holiday-hearts-2026' and status='published';
 if not found or now()<nullif(opp.settings->>'voting_opens_at','')::timestamptz or now()>nullif(opp.settings->>'voting_closes_at','')::timestamptz then return jsonb_build_object('success',false,'reason','Reader voting is not open right now.'); end if;
 if ent.author_id=uid then return jsonb_build_object('success',false,'reason','You cannot vote for your own entry.'); end if;
 insert into public.holiday_hearts_votes(opportunity_id,entry_id,voter_id) values(opp.id,ent.id,uid);
 return jsonb_build_object('success',true);
exception when unique_violation then return jsonb_build_object('success',false,'reason','You have already used your reader vote for this contest.');
end $$;
revoke all on function public.submit_holiday_hearts_entry(uuid,uuid,text,text,boolean,boolean) from public,anon;
grant execute on function public.submit_holiday_hearts_entry(uuid,uuid,text,text,boolean,boolean) to authenticated;
revoke all on function public.cast_holiday_hearts_vote(uuid) from public,anon;
grant execute on function public.cast_holiday_hearts_vote(uuid) to authenticated;

commit;
