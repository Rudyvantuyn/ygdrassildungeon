-- The shop (server/shop.ts): payments through Stripe and the cosmetics each account owns.
-- payments: one row per paid Stripe Checkout session (so a session never counts twice), for the owner's records.
-- entitlements: what each account owns (src/core/data/cosmetics.ts). Players may read their own rows; only the
-- shop function (service role) writes either table.
create table if not exists public.payments (
  session_id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('pack', 'donation')),
  item text not null default '',
  amount integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;

create table if not exists public.entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  item text not null,
  source text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table public.entitlements enable row level security;
drop policy if exists "own entitlements" on public.entitlements;
create policy "own entitlements" on public.entitlements for select to authenticated using ((select auth.uid()) = user_id);
