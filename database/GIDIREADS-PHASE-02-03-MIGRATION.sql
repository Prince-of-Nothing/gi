-- GidiReads Phase 2 + 3: Homepage/Explore presentation settings and in-app announcements.
-- Review and run in Supabase SQL Editor. This migration does not alter existing stories or user records.

create table if not exists public.homepage_admin_settings (
  id boolean primary key default true check (id = true),
  settings jsonb not null default '{
    "hero":{"enabled":true,"eyebrow":"GidiReads","title":"Find a story worth staying for.","description":"Discover novels, new voices and worlds you can disappear into.","cta_label":"Explore stories","cta_url":"explore.html","image_url":"","story_id":""},
    "sections":{"featured":{"enabled":true,"order":1,"kicker":"A place to begin","title":"Featured for you"},"trending":{"enabled":true,"order":2,"kicker":"What readers are picking up","title":"Trending now"},"updated":{"enabled":true,"order":3,"kicker":"New chapters to catch up on","title":"Recently updated"},"new":{"enabled":true,"order":4,"kicker":"Fresh on the platform","title":"New releases"},"genres":{"enabled":true,"order":5,"kicker":"Find your kind of story","title":"Explore by genre"},"tropes":{"enabled":true,"order":6,"kicker":"Looking for a particular dynamic?","title":"Discover by trope"}},
    "explore":{"featured_enabled":true,"featured_title":"Featured stories","featured_subtitle":"Hand-picked stories from the GidiReads community","featured_max":2},
    "featured_story_order":[]
  }'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.homepage_admin_settings(id) values(true) on conflict(id) do nothing;
alter table public.homepage_admin_settings enable row level security;
drop policy if exists homepage_settings_public_read on public.homepage_admin_settings;
create policy homepage_settings_public_read on public.homepage_admin_settings for select to anon, authenticated using (true);
drop policy if exists homepage_settings_admin_write on public.homepage_admin_settings;
create policy homepage_settings_admin_write on public.homepage_admin_settings for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
grant select on public.homepage_admin_settings to anon, authenticated;
grant insert, update, delete on public.homepage_admin_settings to authenticated;

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  message text not null check (char_length(trim(message)) between 1 and 1800),
  audience text not null default 'all' check (audience in ('all','readers','authors')),
  category text not null default 'platform' check (category in ('platform','community','contest','maintenance','policy')),
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  status text not null default 'draft' check (status in ('draft','published','scheduled','archived')),
  link_url text,
  publish_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_announcements_schedule_valid check (status <> 'scheduled' or publish_at is not null),
  constraint platform_announcements_expiry_valid check (expires_at is null or publish_at is null or expires_at > publish_at)
);
create index if not exists platform_announcements_status_publish_idx on public.platform_announcements(status, publish_at desc);
create index if not exists platform_announcements_audience_idx on public.platform_announcements(audience);
alter table public.platform_announcements enable row level security;
drop policy if exists platform_announcements_admin_manage on public.platform_announcements;
create policy platform_announcements_admin_manage on public.platform_announcements for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists platform_announcements_audience_read on public.platform_announcements;
create policy platform_announcements_audience_read on public.platform_announcements for select to authenticated using (
  status in ('published','scheduled') and publish_at is not null and publish_at <= now() and (expires_at is null or expires_at > now()) and (
    audience='all' or
    (audience='authors' and exists(select 1 from public.stories s where s.author_id=(select auth.uid()))) or
    (audience='readers' and not exists(select 1 from public.stories s where s.author_id=(select auth.uid())))
  )
);
grant select on public.platform_announcements to authenticated;
grant insert, update, delete on public.platform_announcements to authenticated;

create table if not exists public.platform_announcement_reads (
  announcement_id uuid not null references public.platform_announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key(announcement_id,user_id)
);
create index if not exists platform_announcement_reads_user_idx on public.platform_announcement_reads(user_id, read_at desc);
alter table public.platform_announcement_reads enable row level security;
drop policy if exists platform_announcement_reads_owner_select on public.platform_announcement_reads;
create policy platform_announcement_reads_owner_select on public.platform_announcement_reads for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists platform_announcement_reads_owner_insert on public.platform_announcement_reads;
create policy platform_announcement_reads_owner_insert on public.platform_announcement_reads for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists platform_announcement_reads_owner_update on public.platform_announcement_reads;
create policy platform_announcement_reads_owner_update on public.platform_announcement_reads for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
grant select, insert, update on public.platform_announcement_reads to authenticated;

-- Admin publication changes are recorded in the existing audit log by admin.js.
-- Announcements are in-app only. No email, SMS or push integration is implied by this schema.
