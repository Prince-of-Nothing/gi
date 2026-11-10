-- GidiReads browser push subscriptions. Applied to the live project on 2026-10-20.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription jsonb not null check (jsonb_typeof(subscription) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_owner_select on public.push_subscriptions;
create policy push_subscriptions_owner_select on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists push_subscriptions_owner_insert on public.push_subscriptions;
create policy push_subscriptions_owner_insert on public.push_subscriptions for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists push_subscriptions_owner_update on public.push_subscriptions;
create policy push_subscriptions_owner_update on public.push_subscriptions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists push_subscriptions_owner_delete on public.push_subscriptions;
create policy push_subscriptions_owner_delete on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, update, delete on public.push_subscriptions to authenticated;
