-- GidiReads Build 01: achievement catalogue, wallet foundation, task foundation.
-- Review and run once in the Supabase SQL Editor for the GidiReads project.
-- This migration does not create payment checkout or allow browser-side balance changes.

begin;

create table if not exists public.badge_catalog (
  id uuid primary key default gen_random_uuid(),
  badge_slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null check (category in ('reader','author','community','special','membership')),
  tier text not null default 'standard' check (tier in ('standard','advanced','prestige')),
  rule_key text not null,
  threshold_value integer not null default 1 check (threshold_value >= 1),
  requirement_label text not null default '',
  is_active boolean not null default true,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badge_catalog(id) on delete restrict,
  awarded_at timestamptz not null default now(),
  award_source text not null default 'automatic',
  award_note text,
  unique (user_id, badge_id)
);
create index if not exists user_badges_user_awarded_idx on public.user_badges(user_id, awarded_at desc);

create table if not exists public.wallet_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  g_coins bigint not null default 0 check (g_coins >= 0),
  echoes_purchased bigint not null default 0 check (echoes_purchased >= 0),
  echoes_promotional bigint not null default 0 check (echoes_promotional >= 0),
  gidipasses bigint not null default 0 check (gidipasses >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  currency text not null check (currency in ('g_coins','echoes_purchased','echoes_promotional','gidipasses')),
  transaction_type text not null check (transaction_type in ('purchase','task_reward','promotion','chapter_unlock','gift_sent','gift_received','refund','adjustment','pass_redemption','expiry')),
  amount bigint not null,
  description text not null default '',
  reference_type text,
  reference_id text,
  idempotency_key text,
  status text not null default 'posted' check (status in ('pending','posted','reversed','failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index if not exists wallet_transactions_user_created_idx on public.wallet_transactions(user_id, created_at desc);

create table if not exists public.virtual_gifts (
  id uuid primary key default gen_random_uuid(),
  gift_slug text not null unique,
  name text not null,
  description text not null default '',
  icon_key text not null default 'gift',
  price_gcoins integer not null check (price_gcoins > 0),
  display_order integer not null default 100,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_transactions (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete restrict,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  gift_id uuid not null references public.virtual_gifts(id) on delete restrict,
  story_id uuid references public.stories(id) on delete set null,
  message text,
  price_gcoins integer not null check (price_gcoins > 0),
  status text not null default 'pending' check (status in ('pending','posted','reversed','failed')),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique(sender_id, idempotency_key)
);
create index if not exists gift_transactions_recipient_idx on public.gift_transactions(recipient_id, created_at desc);

create table if not exists public.task_catalog (
  id uuid primary key default gen_random_uuid(),
  task_slug text not null unique,
  title text not null,
  description text not null default '',
  category text not null check (category in ('daily','weekly','reading','author','community','milestone','special')),
  reward_type text not null check (reward_type in ('g_coins','echoes_purchased','echoes_promotional','gidipasses','badge')),
  reward_amount integer not null default 1 check (reward_amount >= 1),
  reward_badge_id uuid references public.badge_catalog(id) on delete restrict,
  verification_key text not null,
  verification_config jsonb not null default '{}'::jsonb,
  recurrence text not null default 'once' check (recurrence in ('once','daily','weekly','monthly','event')),
  starts_at timestamptz,
  ends_at timestamptz,
  max_completions_per_user integer not null default 1 check (max_completions_per_user >= 1),
  icon text not null default '✧',
  is_active boolean not null default false,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((reward_type = 'badge' and reward_badge_id is not null) or reward_type <> 'badge')
);

create table if not exists public.user_task_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.task_catalog(id) on delete restrict,
  period_key text not null default 'once',
  progress_value integer not null default 0 check (progress_value >= 0),
  target_value integer not null default 1 check (target_value >= 1),
  status text not null default 'in_progress' check (status in ('in_progress','completed','claimed','expired','rejected')),
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, task_id, period_key)
);
create index if not exists user_task_progress_user_idx on public.user_task_progress(user_id, status, updated_at desc);

-- Keep one wallet account per profile. Balances are only readable by the owner;
-- clients receive no INSERT/UPDATE/DELETE grants for wallet or ledger tables.
create or replace function public.create_gidireads_wallet_account()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.wallet_accounts(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_gidireads_wallet_account() from public, anon, authenticated;
drop trigger if exists trg_create_gidireads_wallet_account on public.profiles;
create trigger trg_create_gidireads_wallet_account
after insert on public.profiles
for each row execute function public.create_gidireads_wallet_account();
insert into public.wallet_accounts(user_id) select id from public.profiles on conflict (user_id) do nothing;

-- Award milestones from existing verified database activity. No browser-supplied counts are accepted.
create or replace function public.refresh_my_achievements()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_words bigint := 0;
  v_published_stories bigint := 0;
  v_completed_author_stories bigint := 0;
  v_completed_chapters bigint := 0;
  v_read_novels bigint := 0;
  v_library_count bigint := 0;
  v_finished_novels bigint := 0;
  v_read_days bigint := 0;
  v_comments_given bigint := 0;
  v_likes_given bigint := 0;
  v_likes_received bigint := 0;
  v_echoes_sent bigint := 0;
  v_echoes_received bigint := 0;
  v_badge record;
  v_earned boolean;
  v_new_badge uuid;
  v_awarded integer := 0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select coalesce(sum(case when trim(regexp_replace(coalesce(c.content_html, c.content, ''), '<[^>]*>', ' ', 'g')) = '' then 0 else cardinality(regexp_split_to_array(trim(regexp_replace(coalesce(c.content_html, c.content, ''), '<[^>]*>', ' ', 'g')), '\s+')) end),0)
    into v_words
  from public.stories s join public.chapters c on c.story_id=s.id
  where s.author_id=v_user and c.is_published=true;

  select count(distinct s.id) into v_published_stories
  from public.stories s where s.author_id=v_user and s.status in ('ongoing','completed')
    and exists(select 1 from public.chapters c where c.story_id=s.id and c.is_published=true);

  select count(distinct s.id) into v_completed_author_stories
  from public.stories s where s.author_id=v_user and s.status='completed'
    and exists(select 1 from public.chapters c where c.story_id=s.id and c.is_published=true);

  select count(distinct chapter_id) into v_completed_chapters from (
    select e.chapter_id from public.reading_events e where e.reader_id=v_user and e.event_type='chapter_completed' and e.chapter_id is not null
    union select rp.chapter_id from public.reading_progress rp where rp.reader_id=v_user and rp.completed_at is not null and rp.chapter_id is not null
  ) q;

  select count(distinct story_id) into v_read_novels from public.reading_events e where e.reader_id=v_user and e.event_type in ('chapter_opened','chapter_completed','story_completed');
  select count(*) into v_library_count from public.library_entries le where le.reader_id=v_user;
  select count(*) into v_finished_novels from public.library_entries le where le.reader_id=v_user and le.status='completed';
  select count(distinct occurred_at::date) into v_read_days from public.reading_events e where e.reader_id=v_user and e.event_type in ('chapter_opened','chapter_completed');
  select count(*) into v_comments_given from public.comments c where c.author_id=v_user;
  select count(*) into v_likes_given from public.comment_likes cl where cl.reader_id=v_user;
  select count(*) into v_likes_received from public.comment_likes cl join public.comments c on c.id=cl.comment_id where c.author_id=v_user and cl.reader_id<>v_user;
  select count(*) into v_echoes_sent from public.echoes e where e.reader_id=v_user;
  select count(*) into v_echoes_received from public.echoes e join public.chapters c on c.id=e.chapter_id join public.stories s on s.id=c.story_id where s.author_id=v_user and e.reader_id<>v_user;

  for v_badge in select * from public.badge_catalog where is_active=true loop
    v_earned := case v_badge.rule_key
      when 'author_words' then v_words >= v_badge.threshold_value
      when 'author_first_publication' then v_published_stories >= v_badge.threshold_value
      when 'author_story_count' then v_published_stories >= v_badge.threshold_value
      when 'author_story_completed' then v_completed_author_stories >= v_badge.threshold_value
      when 'reader_chapters' then v_completed_chapters >= v_badge.threshold_value
      when 'reader_novels' then v_read_novels >= v_badge.threshold_value
      when 'reader_library' then v_library_count >= v_badge.threshold_value
      when 'reader_completed' then v_finished_novels >= v_badge.threshold_value
      when 'reader_days' then v_read_days >= v_badge.threshold_value
      when 'reader_comments' then v_comments_given >= v_badge.threshold_value
      when 'reader_likes' then v_likes_given >= v_badge.threshold_value
      when 'author_received_likes' then v_likes_received >= v_badge.threshold_value
      when 'reader_echoes' then v_echoes_sent >= v_badge.threshold_value
      when 'author_echoes' then v_echoes_received >= v_badge.threshold_value
      else false
    end;
    if v_earned then
      v_new_badge := null;
      insert into public.user_badges(user_id,badge_id,award_source)
      values(v_user,v_badge.id,'automatic')
      on conflict(user_id,badge_id) do nothing
      returning id into v_new_badge;
      if v_new_badge is not null then
        v_awarded := v_awarded + 1;
        insert into public.notifications(user_id,message,link,category)
        values(v_user,'You earned the ' || v_badge.name || ' badge.','my-gidireads.html','system');
      end if;
    end if;
  end loop;
  return v_awarded;
end;
$$;
revoke all on function public.refresh_my_achievements() from public, anon;
grant execute on function public.refresh_my_achievements() to authenticated;

-- RLS and narrow grants for new tables.
alter table public.badge_catalog enable row level security;
alter table public.user_badges enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.virtual_gifts enable row level security;
alter table public.gift_transactions enable row level security;
alter table public.task_catalog enable row level security;
alter table public.user_task_progress enable row level security;

drop policy if exists badge_catalog_active_read on public.badge_catalog;
create policy badge_catalog_active_read on public.badge_catalog for select to anon, authenticated using (is_active=true);
drop policy if exists user_badges_owner_read on public.user_badges;
create policy user_badges_owner_read on public.user_badges for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists wallet_accounts_owner_read on public.wallet_accounts;
create policy wallet_accounts_owner_read on public.wallet_accounts for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists wallet_transactions_owner_read on public.wallet_transactions;
create policy wallet_transactions_owner_read on public.wallet_transactions for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists virtual_gifts_active_read on public.virtual_gifts;
create policy virtual_gifts_active_read on public.virtual_gifts for select to anon, authenticated using (is_active=true);
drop policy if exists gift_transactions_participant_read on public.gift_transactions;
create policy gift_transactions_participant_read on public.gift_transactions for select to authenticated using (sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
drop policy if exists task_catalog_active_read on public.task_catalog;
create policy task_catalog_active_read on public.task_catalog for select to authenticated using (is_active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
drop policy if exists user_task_progress_owner_read on public.user_task_progress;
create policy user_task_progress_owner_read on public.user_task_progress for select to authenticated using (user_id=(select auth.uid()));

revoke all on public.badge_catalog, public.user_badges, public.wallet_accounts, public.wallet_transactions, public.virtual_gifts, public.gift_transactions, public.task_catalog, public.user_task_progress from anon, authenticated;
grant select on public.badge_catalog, public.virtual_gifts to anon, authenticated;
grant select on public.user_badges, public.wallet_accounts, public.wallet_transactions, public.gift_transactions, public.task_catalog, public.user_task_progress to authenticated;

-- Starter catalogue: real milestone definitions. Admin award/task configuration comes in a later build.
insert into public.badge_catalog(badge_slug,name,description,category,tier,rule_key,threshold_value,requirement_label,display_order) values
('first-publication','First Publication','Publish your first eligible story on GidiReads.','author','standard','author_first_publication',1,'Publish a story with at least one published chapter',10),
('emerging-voice','Emerging Voice','Your published words have begun to accumulate.','author','standard','author_words',10000,'10,000 published words',20),
('storyteller-30k','Storyteller','Reach 30,000 published words.','author','standard','author_words',30000,'30,000 published words',30),
('wordsmith-50k','Wordsmith','Reach 50,000 published words.','author','advanced','author_words',50000,'50,000 published words',40),
('master-storyteller','Master Storyteller','Reach 100,000 published words.','author','advanced','author_words',100000,'100,000 published words',50),
('legendary-wordsmith','Legendary Wordsmith','Reach 500,000 published words.','author','prestige','author_words',500000,'500,000 published words',60),
('growing-catalogue','Growing Catalogue','Publish three eligible stories.','author','standard','author_story_count',3,'Publish 3 eligible stories',70),
('prolific-author','Prolific Author','Publish five eligible stories.','author','advanced','author_story_count',5,'Publish 5 eligible stories',80),
('story-completed','Story Completed','Complete and publish a story ending.','author','advanced','author_story_completed',1,'Complete 1 published story',90),
('first-page','First Page','Complete your first chapter on GidiReads.','reader','standard','reader_chapters',1,'Complete 1 chapter',100),
('page-turner','Page Turner','Complete ten chapters.','reader','standard','reader_chapters',10,'Complete 10 chapters',110),
('avid-reader','Avid Reader','Complete fifty chapters.','reader','standard','reader_chapters',50,'Complete 50 chapters',120),
('bookworm','Bookworm','Complete one hundred chapters.','reader','advanced','reader_chapters',100,'Complete 100 chapters',130),
('novel-explorer','Novel Explorer','Read eligible chapters from five different stories.','reader','standard','reader_novels',5,'Read from 5 different stories',140),
('story-collector','Story Collector','Add ten stories to your library.','reader','standard','reader_library',10,'Save 10 stories to your library',150),
('the-finisher','The Finisher','Mark one story as completed in your library.','reader','standard','reader_completed',1,'Complete 1 story',160),
('grand-finisher','Grand Finisher','Complete ten stories in your library.','reader','prestige','reader_completed',10,'Complete 10 stories',170),
('reading-regular','Reading Regular','Read on seven distinct days.','reader','standard','reader_days',7,'Read on 7 different days',180),
('devoted-reader','Devoted Reader','Read on thirty distinct days.','reader','advanced','reader_days',30,'Read on 30 different days',190),
('first-comment','First Words of Welcome','Post your first comment.','community','standard','reader_comments',1,'Post 1 eligible comment',200),
('conversation-starter','Conversation Starter','Post ten comments.','community','standard','reader_comments',10,'Post 10 eligible comments',210),
('first-appreciation','First Appreciation','Like your first eligible comment.','community','standard','reader_likes',1,'Like 1 eligible comment',220),
('first-fan','First Fan','Receive your first eligible like on a comment you wrote.','author','standard','author_received_likes',1,'Receive 1 eligible like',230),
('first-echo-sent','First Echo Sent','Send your first Echo.','community','standard','reader_echoes',1,'Send 1 Echo',240),
('first-echo-received','First Echo Received','Receive your first eligible Echo as a creator.','author','standard','author_echoes',1,'Receive 1 eligible Echo',250)
on conflict (badge_slug) do update set name=excluded.name,description=excluded.description,category=excluded.category,tier=excluded.tier,rule_key=excluded.rule_key,threshold_value=excluded.threshold_value,requirement_label=excluded.requirement_label,display_order=excluded.display_order,updated_at=now();

-- Gift price examples are deliberately inactive until the owner approves final pricing and the secure send-gift operation is built.
insert into public.virtual_gifts(gift_slug,name,description,icon_key,price_gcoins,display_order,is_active) values
('rose','Rose','A small sign of appreciation.','rose',5,10,false),
('golden-star','Golden Star','A bright thank-you for a story.','star',10,20,false),
('storybook','Storybook','Celebrate a tale worth remembering.','book',25,30,false),
('royal-bouquet','Royal Bouquet','A generous bouquet of appreciation.','bouquet',50,40,false),
('royal-crown','Royal Crown','A regal salute to a creator.','crown',100,50,false),
('amethyst-diamond','Amethyst Diamond','A rare-looking token of support.','diamond',250,60,false),
('golden-yacht','Golden Yacht','A grand celebratory gift.','yacht',500,70,false),
('cosmic-rocket','Cosmic Rocket','Send a story into the stars.','rocket',1000,80,false),
('enchanted-castle','Enchanted Castle','A monumental literary celebration.','castle',2500,90,false),
('gidireads-galaxy','GidiReads Galaxy','A spectacular gift for a beloved creator.','galaxy',5000,100,false)
on conflict (gift_slug) do nothing;

commit;
