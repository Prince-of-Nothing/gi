-- GidiReads Build 02 unified development migration.
-- Includes achievements, wallet/task foundations, contracts, creator earnings, and payout requests.
-- Apply ONLY to an isolated development database first. No payment provider or automatic bank transfer is configured.

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



-- BUILD 02: Contract Center, creator earnings, payout requests, and verified task claims.
-- This is schema only. It does not enable real-money checkout or automatically pay creators.

create table if not exists public.contract_applications (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'submitted' check (status in ('submitted','reviewing','information_requested','offer_issued','accepted','declined','withdrawn')),
  author_note text,
  application_data jsonb not null default '{}'::jsonb check (jsonb_typeof(application_data)='object'),
  admin_note text,
  offer jsonb,
  offer_expires_at timestamptz,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.contract_applications add column if not exists application_data jsonb not null default '{}'::jsonb;
create index if not exists contract_applications_author_idx on public.contract_applications(author_id,submitted_at desc);
create index if not exists contract_applications_status_idx on public.contract_applications(status,submitted_at asc);
drop index if exists public.contract_applications_one_open_per_story;
create unique index contract_applications_one_open_per_story on public.contract_applications(story_id) where status in ('submitted','reviewing','information_requested','offer_issued');

create table if not exists public.creator_contracts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.contract_applications(id) on delete restrict,
  story_id uuid not null references public.stories(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict,
  contract_type text not null check (contract_type in ('non_exclusive','exclusive','echoes_only')),
  status text not null default 'active' check (status in ('active','paused','terminated','expired')),
  agreement_version text not null,
  terms_snapshot jsonb not null,
  accepted_at timestamptz not null default now(),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists creator_contracts_author_idx on public.creator_contracts(author_id,created_at desc);

create table if not exists public.creator_earnings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  story_id uuid references public.stories(id) on delete set null,
  contract_id uuid references public.creator_contracts(id) on delete set null,
  source_type text not null check (source_type in ('paid_chapter','purchased_echo','gift','advertising','bonus','adjustment','refund_reversal')),
  gross_amount numeric(14,2) not null default 0 check (gross_amount >= 0),
  creator_amount numeric(14,2) not null check (creator_amount >= 0),
  currency text not null default 'NGN' check (currency='NGN'),
  status text not null default 'pending' check (status in ('pending','available','paid','reversed')),
  source_reference text,
  idempotency_key text unique,
  payout_request_id uuid,
  note text,
  available_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists creator_earnings_creator_idx on public.creator_earnings(creator_id,status,created_at desc);

create table if not exists public.creator_payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 5000),
  currency text not null default 'NGN' check (currency='NGN'),
  destination jsonb not null,
  status text not null default 'requested' check (status in ('requested','processing','paid','failed','rejected')),
  admin_note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id) on delete set null
);
create index if not exists creator_payout_requests_status_idx on public.creator_payout_requests(status,requested_at asc);
alter table public.creator_earnings drop constraint if exists creator_earnings_payout_request_id_fkey;
alter table public.creator_earnings add constraint creator_earnings_payout_request_id_fkey foreign key (payout_request_id) references public.creator_payout_requests(id) on delete set null;

-- Admin-managed catalogues. RLS still checks the authenticated profile's admin role.
alter table public.badge_catalog enable row level security;
alter table public.task_catalog enable row level security;
alter table public.virtual_gifts enable row level security;
drop policy if exists badge_catalog_admin_manage on public.badge_catalog;
create policy badge_catalog_admin_manage on public.badge_catalog for all to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists task_catalog_admin_manage on public.task_catalog;
create policy task_catalog_admin_manage on public.task_catalog for all to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists virtual_gifts_admin_manage on public.virtual_gifts;
create policy virtual_gifts_admin_manage on public.virtual_gifts for all to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
grant insert,update,delete on public.badge_catalog,public.task_catalog,public.virtual_gifts to authenticated;

alter table public.contract_applications enable row level security;
alter table public.creator_contracts enable row level security;
alter table public.creator_earnings enable row level security;
alter table public.creator_payout_requests enable row level security;
drop policy if exists contract_applications_owner_read on public.contract_applications;
create policy contract_applications_owner_read on public.contract_applications for select to authenticated using (author_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists contract_applications_admin_update on public.contract_applications;
create policy contract_applications_admin_update on public.contract_applications for update to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists creator_contracts_owner_read on public.creator_contracts;
create policy creator_contracts_owner_read on public.creator_contracts for select to authenticated using (author_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists creator_earnings_owner_read on public.creator_earnings;
create policy creator_earnings_owner_read on public.creator_earnings for select to authenticated using (creator_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists creator_payouts_owner_read on public.creator_payout_requests;
create policy creator_payouts_owner_read on public.creator_payout_requests for select to authenticated using (creator_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists creator_payouts_admin_update on public.creator_payout_requests;
create policy creator_payouts_admin_update on public.creator_payout_requests for update to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
revoke all on public.contract_applications,public.creator_contracts,public.creator_earnings,public.creator_payout_requests from anon,authenticated;
grant select on public.contract_applications,public.creator_contracts,public.creator_earnings,public.creator_payout_requests to authenticated;

drop function if exists public.submit_contract_application(uuid,text);
create or replace function public.submit_contract_application(p_story_id uuid,p_author_note text default null,p_application_data jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_words bigint; v_id uuid; v_data jsonb:=coalesce(p_application_data,'{}'::jsonb);
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(v_data)<>'object' then raise exception 'Application answers must be submitted as a structured form'; end if;
 if coalesce(trim(v_data->>'story_title'),'')='' or coalesce(trim(v_data->>'genre'),'')='' or coalesce(trim(v_data->>'protagonist'),'')='' or coalesce(trim(v_data->>'tropes'),'')='' or coalesce(trim(v_data->>'synopsis'),'')='' or coalesce(trim(v_data->>'wow_factor'),'')='' or coalesce(trim(v_data->>'format'),'')='' or coalesce(trim(v_data->>'content_type'),'')='' or coalesce(trim(v_data->>'story_status'),'')='' or coalesce(trim(v_data->>'update_schedule'),'')='' or coalesce(trim(v_data->>'chapters_per_update'),'')='' or coalesce(trim(v_data->>'expected_length'),'')='' or coalesce(trim(v_data->>'ready_status'),'')='' or coalesce(trim(v_data->>'adaptation_rights'),'')='' then raise exception 'Complete the required application questions before submitting'; end if;
 if v_data->>'content_type' in ('Fanfiction','Based on Existing Work') and coalesce(trim(v_data->>'source_work'),'')='' then raise exception 'Provide the source work for fanfiction or work based on existing material'; end if;
 if coalesce((v_data->>'owns_rights')::boolean,false) is not true or coalesce((v_data->>'no_infringement')::boolean,false) is not true or coalesce((v_data->>'truthful_information')::boolean,false) is not true or coalesce((v_data->>'review_confirmed')::boolean,false) is not true then raise exception 'All required declarations must be accepted'; end if;
 if not exists(select 1 from public.stories where id=p_story_id and author_id=v_user and status in ('ongoing','completed')) then raise exception 'Choose one of your published stories'; end if;
 select coalesce(sum(array_length(regexp_split_to_array(trim(regexp_replace(coalesce(nullif(c.content_html,''),c.content,''),'<[^>]*>',' ','g')),'\s+'),1)),0) into v_words from public.chapters c where c.story_id=p_story_id and c.is_published=true and trim(regexp_replace(coalesce(nullif(c.content_html,''),c.content,''),'<[^>]*>',' ','g'))<>'';
 if v_words < 5000 then raise exception 'This story needs at least 5,000 published words before applying'; end if;
 if exists(select 1 from public.creator_contracts where story_id=p_story_id and status='active') then raise exception 'This story already has an active contract'; end if;
 insert into public.contract_applications(story_id,author_id,author_note,application_data) values(p_story_id,v_user,nullif(trim(p_author_note),''),v_data) returning id into v_id;
 insert into public.notifications(user_id,message,link,category) values(v_user,'Your contract application has been submitted for review.','contract-center.html','system');
 return v_id;
end $$;
revoke all on function public.submit_contract_application(uuid,text,jsonb) from public,anon;
grant execute on function public.submit_contract_application(uuid,text,jsonb) to authenticated;

create or replace function public.admin_review_contract_application(p_application_id uuid,p_action text,p_note text default null,p_offer jsonb default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_admin uuid:=auth.uid(); v_app public.contract_applications%rowtype;
begin
 if v_admin is null or not exists(select 1 from public.profiles where id=v_admin and role='admin') then raise exception 'Administrator access required'; end if;
 select * into v_app from public.contract_applications where id=p_application_id for update;
 if not found then raise exception 'Application not found'; end if;
 if p_action not in ('reviewing','request_info','decline','issue_offer') then raise exception 'Unsupported review action'; end if;
 if p_action='issue_offer' then
   if p_offer is null or coalesce(p_offer->>'contract_type','') not in ('non_exclusive','exclusive','echoes_only') or coalesce(p_offer->>'agreement_version','')='' or coalesce((p_offer->>'duration_months')::integer,0) not between 1 and 120 or coalesce(p_offer->>'rights_scope','')='' or coalesce(jsonb_typeof(p_offer->'revenue_shares'),'')<>'object' or coalesce((p_offer->'revenue_shares'->>'paid_chapter_creator_percent')::numeric,-1) not between 0 and 100 or coalesce((p_offer->'revenue_shares'->>'purchased_echo_creator_percent')::numeric,-1) not between 0 and 100 or coalesce((p_offer->'revenue_shares'->>'gift_creator_percent')::numeric,-1) not between 0 and 100 or coalesce((p_offer->'revenue_shares'->>'ad_revenue_creator_percent')::numeric,-1) not between 0 and 100 then raise exception 'Offer needs a contract type, agreement version, a 1–120 month duration, rights scope, and valid revenue-share terms'; end if;
   if p_offer->>'contract_type'='echoes_only' and (coalesce((p_offer->'revenue_shares'->>'paid_chapter_creator_percent')::numeric,-1)<>0 or coalesce((p_offer->'revenue_shares'->>'gift_creator_percent')::numeric,-1)<>0 or coalesce((p_offer->'revenue_shares'->>'ad_revenue_creator_percent')::numeric,-1)<>0) then raise exception 'Echoes-only offers must set paid-chapter, gift, and ad creator shares to zero'; end if;
   update public.contract_applications set status='offer_issued',offer=p_offer,offer_expires_at=coalesce((p_offer->>'expires_at')::timestamptz,now()+interval '14 days'),admin_note=p_note,reviewed_at=now(),updated_at=now() where id=p_application_id;
 elsif p_action='request_info' then update public.contract_applications set status='information_requested',admin_note=p_note,reviewed_at=now(),updated_at=now() where id=p_application_id;
 elsif p_action='decline' then update public.contract_applications set status='declined',admin_note=p_note,reviewed_at=now(),updated_at=now() where id=p_application_id;
 else update public.contract_applications set status='reviewing',admin_note=p_note,reviewed_at=now(),updated_at=now() where id=p_application_id; end if;
 insert into public.notifications(user_id,message,link,category) values(v_app.author_id,case p_action when 'reviewing' then 'Your contract application is being reviewed.' when 'request_info' then 'GidiReads needs more information about your contract application.' when 'decline' then 'There is an update to your contract application.' else 'A contract offer is ready for your review.' end,'contract-center.html','system');
 if to_regclass('public.admin_audit_log') is not null then insert into public.admin_audit_log(admin_id,action,target_type,target_id,reason) values(v_admin,'contract_'||p_action,'contract_application',p_application_id,p_note); end if;
end $$;
revoke all on function public.admin_review_contract_application(uuid,text,text,jsonb) from public,anon;
grant execute on function public.admin_review_contract_application(uuid,text,text,jsonb) to authenticated;

create or replace function public.accept_contract_offer(p_application_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_app public.contract_applications%rowtype; v_contract uuid; v_type text;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 select * into v_app from public.contract_applications where id=p_application_id and author_id=v_user for update;
 if not found or v_app.status<>'offer_issued' then raise exception 'There is no offer ready to accept'; end if;
 if v_app.offer_expires_at is not null and v_app.offer_expires_at<now() then raise exception 'This offer has expired'; end if;
 v_type:=v_app.offer->>'contract_type';
 insert into public.creator_contracts(application_id,story_id,author_id,contract_type,agreement_version,terms_snapshot,starts_at,ends_at) values(v_app.id,v_app.story_id,v_user,v_type,v_app.offer->>'agreement_version',v_app.offer,now(),now()+make_interval(months=>coalesce((v_app.offer->>'duration_months')::integer,12))) returning id into v_contract;
 update public.contract_applications set status='accepted',updated_at=now() where id=v_app.id;
 insert into public.notifications(user_id,message,link,category) values(v_user,'You accepted the contract offer. Keep a copy of the displayed terms for your records.','contract-center.html','system');
 return v_contract;
end $$;
revoke all on function public.accept_contract_offer(uuid) from public,anon;
grant execute on function public.accept_contract_offer(uuid) to authenticated;

create or replace function public.request_creator_payout(p_destination jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_amount numeric(14,2); v_id uuid;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_destination is null or jsonb_typeof(p_destination)<>'object' or coalesce(length(trim(p_destination->>'bank_name')),0)<2 or coalesce(length(trim(p_destination->>'account_name')),0)<2 or coalesce(length(regexp_replace(coalesce(p_destination->>'account_number',''), '\D','','g')),0)<10 then raise exception 'Provide a bank name, account name, and valid account number'; end if;
 perform 1 from public.profiles where id=v_user for update;
 select coalesce(sum(creator_amount),0) into v_amount from public.creator_earnings where creator_id=v_user and status='available' and payout_request_id is null;
 if v_amount<5000 then raise exception 'At least ₦5,000 in available earnings is required'; end if;
 insert into public.creator_payout_requests(creator_id,amount,destination) values(v_user,v_amount,p_destination) returning id into v_id;
 update public.creator_earnings set payout_request_id=v_id where creator_id=v_user and status='available' and payout_request_id is null;
 insert into public.notifications(user_id,message,link,category) values(v_user,'Your payout request was received and is awaiting review.','creator-earnings.html','system');
 return v_id;
end $$;
revoke all on function public.request_creator_payout(jsonb) from public,anon;
grant execute on function public.request_creator_payout(jsonb) to authenticated;

create or replace function public.admin_award_badge(p_user_id uuid,p_badge_id uuid,p_note text default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_admin uuid:=auth.uid(); v_badge public.badge_catalog%rowtype; v_inserted uuid;
begin
 if v_admin is null or not exists(select 1 from public.profiles where id=v_admin and role='admin') then raise exception 'Administrator access required'; end if;
 select * into v_badge from public.badge_catalog where id=p_badge_id and is_active=true;
 if not found then raise exception 'Active badge not found'; end if;
 insert into public.user_badges(user_id,badge_id,award_source,award_note) values(p_user_id,p_badge_id,'admin',p_note) on conflict(user_id,badge_id) do nothing returning id into v_inserted;
 if v_inserted is not null then
   insert into public.notifications(user_id,message,link,category) values(p_user_id,'GidiReads awarded you the '||v_badge.name||' badge.','my-gidireads.html','system');
   if to_regclass('public.admin_audit_log') is not null then insert into public.admin_audit_log(admin_id,action,target_type,target_id,reason) values(v_admin,'badge_awarded','user_badge',p_user_id,p_note); end if;
   return true;
 end if;
 return false;
end $$;
revoke all on function public.admin_award_badge(uuid,uuid,text) from public,anon;
grant execute on function public.admin_award_badge(uuid,uuid,text) to authenticated;

create or replace function public.claim_gidireads_task(p_task_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_user uuid:=auth.uid(); v_task public.task_catalog%rowtype; v_period text; v_period_start timestamptz; v_metric bigint:=0; v_target bigint; v_progress public.user_task_progress%rowtype; v_wallet public.wallet_accounts%rowtype; v_badge_id uuid;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 select * into v_task from public.task_catalog where id=p_task_id and is_active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now());
 if not found then raise exception 'Task is not active'; end if;
 v_period:=case v_task.recurrence when 'daily' then to_char(now() at time zone 'UTC','YYYY-MM-DD') when 'weekly' then to_char(date_trunc('week',now() at time zone 'UTC'),'YYYY-MM-DD') when 'monthly' then to_char(now() at time zone 'UTC','YYYY-MM') else 'once' end;
 v_period_start:=case v_task.recurrence when 'daily' then date_trunc('day',now() at time zone 'UTC') at time zone 'UTC' when 'weekly' then date_trunc('week',now() at time zone 'UTC') at time zone 'UTC' when 'monthly' then date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' else '-infinity'::timestamptz end;
 v_target:=greatest(1,coalesce((v_task.verification_config->>'target')::bigint,1));
 if v_task.verification_key='chapters_completed' then select count(distinct chapter_id) into v_metric from public.reading_events where reader_id=v_user and event_type='chapter_completed' and chapter_id is not null and (v_task.recurrence not in ('daily','weekly','monthly') or occurred_at>=v_period_start);
 elsif v_task.verification_key='published_words' then select coalesce(sum(array_length(regexp_split_to_array(trim(regexp_replace(coalesce(nullif(c.content_html,''),c.content,''),'<[^>]*>',' ','g')),'\s+'),1)),0) into v_metric from public.stories s join public.chapters c on c.story_id=s.id where s.author_id=v_user and c.is_published=true;
 elsif v_task.verification_key='comments_count' then select count(*) into v_metric from public.comments where author_id=v_user and (v_task.recurrence not in ('daily','weekly','monthly') or created_at>=v_period_start);
 elsif v_task.verification_key='library_count' then select count(*) into v_metric from public.library_entries where reader_id=v_user and (v_task.recurrence not in ('daily','weekly','monthly') or created_at>=v_period_start);
 elsif v_task.verification_key='read_days' then select count(distinct occurred_at::date) into v_metric from public.reading_events where reader_id=v_user and event_type in ('chapter_opened','chapter_completed') and (v_task.recurrence not in ('daily','weekly','monthly') or occurred_at>=v_period_start);
 elsif v_task.verification_key='echoes_sent' then select count(*) into v_metric from public.echoes where reader_id=v_user and (v_task.recurrence not in ('daily','weekly','monthly') or created_at>=v_period_start);
 elsif v_task.verification_key='story_count' then select count(distinct s.id) into v_metric from public.stories s where s.author_id=v_user and s.status in ('ongoing','completed') and exists(select 1 from public.chapters c where c.story_id=s.id and c.is_published=true);
 else raise exception 'This task uses an unsupported verification rule and cannot be claimed'; end if;
 insert into public.user_task_progress(user_id,task_id,period_key,progress_value,target_value,status,completed_at) values(v_user,v_task.id,v_period,least(v_metric,2147483647)::integer,least(v_target,2147483647)::integer,case when v_metric>=v_target then 'completed' else 'in_progress' end,case when v_metric>=v_target then now() else null end) on conflict(user_id,task_id,period_key) do update set progress_value=excluded.progress_value,target_value=excluded.target_value,status=case when public.user_task_progress.status='claimed' then 'claimed' when excluded.progress_value>=excluded.target_value then 'completed' else 'in_progress' end,completed_at=case when excluded.progress_value>=excluded.target_value then coalesce(public.user_task_progress.completed_at,now()) else null end,updated_at=now() returning * into v_progress;
 if v_metric<v_target then return jsonb_build_object('status','in_progress','progress',v_metric,'target',v_target); end if;
 if v_progress.status='claimed' then return jsonb_build_object('status','already_claimed','progress',v_metric,'target',v_target); end if;
 if v_task.reward_type='badge' then
   v_badge_id:=v_task.reward_badge_id; if v_badge_id is null then raise exception 'Badge reward is not configured'; end if;
   insert into public.user_badges(user_id,badge_id,award_source,award_note) values(v_user,v_badge_id,'task',v_task.task_slug) on conflict(user_id,badge_id) do nothing;
 else
   insert into public.wallet_accounts(user_id) values(v_user) on conflict(user_id) do nothing;
   select * into v_wallet from public.wallet_accounts where user_id=v_user for update;
   if v_task.reward_type='g_coins' then update public.wallet_accounts set g_coins=g_coins+v_task.reward_amount,updated_at=now() where user_id=v_user;
   elsif v_task.reward_type='echoes_purchased' then raise exception 'Tasks cannot award purchased Echoes; use promotional Echoes instead';
   elsif v_task.reward_type='echoes_promotional' then update public.wallet_accounts set echoes_promotional=echoes_promotional+v_task.reward_amount,updated_at=now() where user_id=v_user;
   elsif v_task.reward_type='gidipasses' then update public.wallet_accounts set gidipasses=gidipasses+v_task.reward_amount,updated_at=now() where user_id=v_user;
   else raise exception 'Unsupported task reward type'; end if;
   insert into public.wallet_transactions(user_id,currency,transaction_type,amount,description,idempotency_key,metadata) values(v_user,v_task.reward_type,'task_reward',v_task.reward_amount,'Task reward: '||v_task.title,'task:'||v_task.id::text||':'||v_period,jsonb_build_object('task_slug',v_task.task_slug));
 end if;
 update public.user_task_progress set status='claimed',claimed_at=now(),updated_at=now() where id=v_progress.id;
 insert into public.notifications(user_id,message,link,category) values(v_user,'Task reward claimed: '||v_task.title||'.','my-gidireads.html','system');
 return jsonb_build_object('status','claimed','reward_type',v_task.reward_type,'reward_amount',v_task.reward_amount);
end $$;
revoke all on function public.claim_gidireads_task(uuid) from public,anon;
grant execute on function public.claim_gidireads_task(uuid) to authenticated;

-- Default tasks are inserted as inactive; an administrator must review and activate them.
insert into public.task_catalog(task_slug,title,description,category,reward_type,reward_amount,verification_key,verification_config,recurrence,icon,is_active,display_order) values
('first-chapter-complete','Finish a chapter','Complete one chapter to mark your reading progress.','reading','echoes_promotional',2,'chapters_completed','{"target":1}','once','▤',false,10),
('weekly-reader','Read across three days','Read on three distinct days in a week.','weekly','g_coins',15,'read_days','{"target":3}','weekly','◷',false,20),
('comment-contributor','Join the conversation','Leave five eligible comments.','community','echoes_promotional',3,'comments_count','{"target":5}','once','“',false,30),
('author-words','Publish 5,000 words','Reach 5,000 words across published chapters.','author','g_coins',25,'published_words','{"target":5000}','once','✎',false,40)
on conflict(task_slug) do nothing;

-- Contract and payout admin read/update policies are checked against profiles.role, not UI state.


-- Restrict direct payout status edits to the admin policy.

create or replace function public.admin_finalize_creator_payout(p_payout_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_admin uuid:=auth.uid(); v_payout public.creator_payout_requests%rowtype;
begin
 if v_admin is null or not exists(select 1 from public.profiles where id=v_admin and role='admin') then raise exception 'Administrator access required'; end if;
 if p_status not in ('requested','processing','paid','failed','rejected') then raise exception 'Unsupported payout status'; end if;
 select * into v_payout from public.creator_payout_requests where id=p_payout_id for update;
 if not found then raise exception 'Payout request not found'; end if;
 update public.creator_payout_requests set status=p_status,admin_note=p_note,processed_at=case when p_status in ('paid','failed','rejected') then now() else null end,processed_by=v_admin where id=p_payout_id;
 if p_status='paid' then
   update public.creator_earnings set status='paid' where payout_request_id=p_payout_id and status='available';
 elsif p_status in ('failed','rejected') then
   update public.creator_earnings set payout_request_id=null where payout_request_id=p_payout_id and status='available';
 end if;
 insert into public.notifications(user_id,message,link,category) values(v_payout.creator_id,case p_status when 'processing' then 'Your payout request is being processed.' when 'paid' then 'Your payout request has been marked paid by GidiReads. Check your bank account for the transfer.' when 'failed' then 'Your payout request could not be completed. Eligible earnings have been released for a future request.' when 'rejected' then 'Your payout request was rejected. Review the administrator note.' else 'Your payout request status was updated.' end,'creator-earnings.html','system');
 if to_regclass('public.admin_audit_log') is not null then insert into public.admin_audit_log(admin_id,action,target_type,target_id,reason) values(v_admin,'payout_'||p_status,'creator_payout_request',p_payout_id,p_note); end if;
end $$;
revoke all on function public.admin_finalize_creator_payout(uuid,text,text) from public,anon;
grant execute on function public.admin_finalize_creator_payout(uuid,text,text) to authenticated;

commit;

-- Refresh PostgREST's function/schema cache after the migration commits.
notify pgrst, 'reload schema';
