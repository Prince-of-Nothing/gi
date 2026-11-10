-- =====================================================================
-- GidiReads - Opportunities Centre, Batch 1
-- REVIEW ONLY. This file has NOT been applied to any database.
-- Target: the GidiReads (production) Supabase project, after you approve it.
--
-- What it does (all additive, nothing is deleted or rewritten):
--   1. Adds two new opportunity types ('contract', 'campaign') to the allowed list,
--      keeping every existing type.
--   2. Creates platform_opportunity_slides: the admin-controlled hero slideshow.
--   3. Adds row-level security: anyone can read ACTIVE slides inside their date window;
--      only admins can create, edit, reorder, or read inactive slides.
--   4. Seeds five starter slides that use the five Holiday Hearts images,
--      only if the table is empty. Admins can edit or replace them in the dashboard.
--
-- It does not touch stories, users, entries, votes, wallets or any existing data.
-- =====================================================================

begin;

-- 1. Wider opportunity types (existing values kept) -------------------------------
alter table public.platform_opportunities
  drop constraint if exists platform_opportunities_opportunity_type_check;
alter table public.platform_opportunities
  add constraint platform_opportunities_opportunity_type_check
  check (opportunity_type = any (array['contest','program','adaptation','grant','announcement','contract','campaign']));

-- 2. Hero slideshow table ------------------------------------------------------------
create table if not exists public.platform_opportunity_slides (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid references public.platform_opportunities(id) on delete set null,
  image_url       text not null,
  mobile_image_url text,
  alt_text        text,
  eyebrow         text,
  headline        text not null,
  description     text,
  button_label    text,
  button_url      text,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint slide_headline_len   check (char_length(btrim(headline)) between 1 and 120),
  constraint slide_description_len check (description is null or char_length(description) <= 400),
  constraint slide_dates_valid    check (ends_at is null or starts_at is null or ends_at > starts_at),
  -- images: our own asset folder or https only
  constraint slide_image_safe     check (image_url ~* '^(https://|assets/)'),
  constraint slide_mobile_safe    check (mobile_image_url is null or mobile_image_url ~* '^(https://|assets/)'),
  -- links: https or a relative page on this site; blocks javascript: and similar
  constraint slide_button_safe    check (button_url is null or button_url ~* '^(https://|[a-z0-9][a-z0-9._/?=&#%-]*$)')
);

create index if not exists platform_opportunity_slides_order_idx
  on public.platform_opportunity_slides (is_active, sort_order);

-- 3. Row level security --------------------------------------------------------------
alter table public.platform_opportunity_slides enable row level security;

drop policy if exists platform_opportunity_slides_public_read on public.platform_opportunity_slides;
create policy platform_opportunity_slides_public_read
  on public.platform_opportunity_slides for select
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())
  );

drop policy if exists platform_opportunity_slides_admin_manage on public.platform_opportunity_slides;
create policy platform_opportunity_slides_admin_manage
  on public.platform_opportunity_slides for all
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- keep updated_at honest
create or replace function public.touch_platform_opportunity_slides()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists touch_platform_opportunity_slides on public.platform_opportunity_slides;
create trigger touch_platform_opportunity_slides
  before update on public.platform_opportunity_slides
  for each row execute function public.touch_platform_opportunity_slides();

-- 4. Starter slides (only when the table is empty) -----------------------------------
insert into public.platform_opportunity_slides
  (opportunity_id, image_url, alt_text, eyebrow, headline, description, button_label, button_url, sort_order)
select o.id, v.image_url, v.alt_text, v.eyebrow, v.headline, v.description, v.button_label, v.button_url, v.sort_order
from (select id from public.platform_opportunities where slug = 'holiday-hearts-2026' limit 1) o
cross join (values
  ('assets/Opportunities/holiday-hearts-main.jpg',    'Holiday Hearts poster: a couple dancing at a winter orchestra',
   'HOLIDAY HEARTS 2026', 'Pick your prompt',
   'Three holiday romance prompts. One story that is yours. Choose the one that calls to you.',
   'See the prompts', 'holiday-hearts.html#prompts', 10),
  ('assets/Opportunities/holiday-hearts-contest.jpg', 'Holiday Hearts poster: Win a contract offer',
   'THE PRIZE', 'Win a contract offer',
   'The top three stories receive contract offers, subject to eligibility, editorial review and agreed terms.',
   'View the prizes', 'holiday-hearts.html#prizes', 20),
  ('assets/Opportunities/snowed-in.jpg',              'Holiday Hearts prompt: Snowed In',
   'PROMPT 01', 'Snowed In',
   'Two people. One cabin. Zero escape.',
   'Read the prompt', 'holiday-hearts.html#prompts', 30),
  ('assets/Opportunities/one-last-christmas.jpg',     'Holiday Hearts prompt: One Last Christmas',
   'PROMPT 02', 'One Last Christmas',
   'An ex, a snowy town, and everything unsaid.',
   'Read the prompt', 'holiday-hearts.html#prompts', 40),
  ('assets/Opportunities/royal-holiday.jpg',          'Holiday Hearts prompt: The Royal Holiday',
   'PROMPT 03', 'The Royal Holiday',
   'A prince in disguise at a winter festival.',
   'Read the prompt', 'holiday-hearts.html#prompts', 50)
) as v(image_url, alt_text, eyebrow, headline, description, button_label, button_url, sort_order)
where not exists (select 1 from public.platform_opportunity_slides);

commit;

-- ROLLBACK (only if ever needed; removes slides, not opportunities):
--   drop table if exists public.platform_opportunity_slides;
