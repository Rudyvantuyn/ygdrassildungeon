-- The daily Wyrdweave post on Discord (server/wyrd-discord.ts).
-- wyrd_posts: one row per day already posted, so a day is never posted twice. Only the function (service role)
-- touches it: row level security is on and there are no policies, so no player can read or write it.
create extension if not exists pg_net;

create table if not exists public.wyrd_posts (
  day integer primary key,
  posted_at timestamptz not null default now()
);
alter table public.wyrd_posts enable row level security;

-- Just after midnight UTC, when the Norns weave a new day.
select cron.schedule('wyrd-discord', '2 0 * * *', $c$
  select net.http_post(url := 'https://prcwekmvndxddqbgdnbf.supabase.co/functions/v1/wyrd-discord', body := '{}'::jsonb);
$c$);
