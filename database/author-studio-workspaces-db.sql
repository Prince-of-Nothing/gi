-- GidiReads Authors Studio: persistent Story Bible and Author Notes
-- Applied to the connected GidiReads Supabase project on 2026-10-17.
-- Safe to keep as project documentation. The current project already has these tables.

create table if not exists public.story_bible_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  category text not null check (category in ('Characters','Locations','Worldbuilding','Magic Systems','Timelines','Relationships')),
  title text not null,
  details text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists story_bible_entries_user_story_idx on public.story_bible_entries(user_id, story_id);
alter table public.story_bible_entries enable row level security;
grant select, insert, update, delete on public.story_bible_entries to authenticated;
drop policy if exists "Authors manage their own story bible entries" on public.story_bible_entries;
create policy "Authors manage their own story bible entries" on public.story_bible_entries
  for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.stories s where s.id = story_bible_entries.story_id and s.author_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.stories s where s.id = story_bible_entries.story_id and s.author_id = (select auth.uid())));

create table if not exists public.author_story_notes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  title text not null,
  type text not null check (type in ('Plot Idea','Future Scene','Research','Reminder','Character','Worldbuilding','General')),
  body text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists author_story_notes_user_story_idx on public.author_story_notes(user_id, story_id);
alter table public.author_story_notes enable row level security;
grant select, insert, update, delete on public.author_story_notes to authenticated;
drop policy if exists "Authors manage their own story notes" on public.author_story_notes;
create policy "Authors manage their own story notes" on public.author_story_notes
  for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.stories s where s.id = author_story_notes.story_id and s.author_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.stories s where s.id = author_story_notes.story_id and s.author_id = (select auth.uid())));

-- Allow the two newly selectable profile header keys.
alter table public.profiles drop constraint if exists profiles_profile_header_check;
alter table public.profiles add constraint profiles_profile_header_check
  check (profile_header = any (array['moonveil','shadow-prince','starweaver','nightguard','enchanted-forest','royal-library','ice-profile-companion','cat-profile-companion']::text[]));

notify pgrst, 'reload schema';
