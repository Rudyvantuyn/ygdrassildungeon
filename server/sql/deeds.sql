-- Book of Deeds kept with the account (applied as migration "deeds"). Players read and add only their own.
create table if not exists public.deeds (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  deed_id text not null check (deed_id ~ '^[A-Za-z]{1,40}$'),
  earned_at timestamptz not null default now(),
  hero text check (hero is null or char_length(hero) <= 24),
  primary key (user_id, deed_id)
);
alter table public.deeds enable row level security;
create policy "players read their own deeds" on public.deeds for select to authenticated using (user_id = (select auth.uid()));
create policy "players add their own deeds" on public.deeds for insert to authenticated with check (user_id = (select auth.uid()));
