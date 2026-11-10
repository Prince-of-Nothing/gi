-- Add the missing creator-economy gift tables.
-- Production was missing virtual_gifts and gift_transactions, which made
-- admin-economy.html show the "tables are not installed" warning and left the
-- gift catalogue empty.

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

-- RLS and narrow grants.
alter table public.virtual_gifts enable row level security;
alter table public.gift_transactions enable row level security;

drop policy if exists virtual_gifts_active_read on public.virtual_gifts;
create policy virtual_gifts_active_read on public.virtual_gifts for select to anon, authenticated using (is_active=true);

drop policy if exists gift_transactions_participant_read on public.gift_transactions;
create policy gift_transactions_participant_read on public.gift_transactions for select to authenticated using (sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));

revoke all on public.virtual_gifts, public.gift_transactions from anon, authenticated;
grant select on public.virtual_gifts to anon, authenticated;

-- Admin-managed catalogue. RLS still checks the authenticated profile's admin role.
drop policy if exists virtual_gifts_admin_manage on public.virtual_gifts;
create policy virtual_gifts_admin_manage on public.virtual_gifts for all to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
grant insert,update,delete on public.virtual_gifts to authenticated;
