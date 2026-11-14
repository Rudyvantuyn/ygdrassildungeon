-- Runestones and shades: traces of other players in the Rootdeep.
-- Applied to the Supabase project as migration "runestones". Players never touch these tables directly:
-- reads and votes go through the functions below; carving goes through the expedition Edge Function,
-- which checks the stone against the game's own floor maps first.

create table if not exists public.runestones (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  author text not null check (char_length(author) between 1 and 24),
  floor int not null check (floor between 0 and 199),
  x int not null check (x between 0 and 99),
  y int not null check (y between 0 and 99),
  what text not null check (what ~ '^[a-z]{1,16}$'),
  dir text not null check (dir in ('n', 'e', 's', 'w', 'here')),
  advice text check (advice is null or advice ~ '^[a-z]{1,16}$'),
  -- Room for cosmetic stone styles later (bought looks never change the rules).
  style text not null default 'plain' check (style ~ '^[a-z]{1,16}$'),
  descent text not null check (descent ~ '^[A-Za-z0-9-]{8,40}$'),
  heeds int not null default 0,
  falses int not null default 0,
  created_at timestamptz not null default now(),
  last_heed_at timestamptz,
  unique (floor, x, y),
  unique (user_id, descent)
);

create table if not exists public.runestone_votes (
  stone_id bigint not null references public.runestones (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote text not null check (vote in ('heed', 'false')),
  created_at timestamptz not null default now(),
  primary key (stone_id, user_id)
);

create table if not exists public.shades (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  floor int not null check (floor between 0 and 199),
  x int not null check (x between 0 and 99),
  y int not null check (y between 0 and 99),
  enemy text not null check (enemy ~ '^[A-Za-z]{1,40}$'),
  created_at timestamptz not null default now()
);
create index if not exists shades_floor on public.shades (floor, created_at desc);

create table if not exists public.renown (
  user_id uuid primary key references auth.users (id) on delete cascade,
  heeds_total int not null default 0,
  heeds_told int not null default 0,
  day date not null default current_date,
  gold_today int not null default 0
);

alter table public.runestones enable row level security;
alter table public.runestone_votes enable row level security;
alter table public.shades enable row level security;
alter table public.renown enable row level security;
-- No policies: only the functions below (and the service role) read or write these tables.

/** A stone counts while it is young or was heeded in the last 90 days, and until the false marks win. */
create or replace function public.runestone_alive(r public.runestones) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(r.last_heed_at, r.created_at) > now() - interval '90 days'
     and not (r.falses >= 3 and r.falses > r.heeds)
$$;

/** Carving: called by the expedition Edge Function only, after it checked the stone against the floor map. */
create or replace function public.carve_runestone(
  p_user uuid, p_author text, p_floor int, p_x int, p_y int, p_what text, p_dir text, p_advice text, p_descent text
) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
begin
  if exists (select 1 from public.runestones where user_id = p_user and descent = p_descent) then
    return json_build_object('error', 'You already carved a stone on this descent.');
  end if;
  if exists (select 1 from public.runestones where user_id = p_user and created_at > now() - interval '2 minutes') then
    return json_build_object('error', 'Your hands are still tired from the last stone. Try again in a moment.');
  end if;
  -- A stone that no longer counts frees its square.
  delete from public.runestones r where r.floor = p_floor and r.x = p_x and r.y = p_y and not public.runestone_alive(r);
  if exists (select 1 from public.runestones where floor = p_floor and x = p_x and y = p_y) then
    return json_build_object('error', 'Someone already carved a stone here.');
  end if;
  insert into public.runestones (user_id, author, floor, x, y, what, dir, advice, descent)
  values (p_user, p_author, p_floor, p_x, p_y, p_what, p_dir, nullif(p_advice, ''), p_descent)
  returning id into v_id;
  -- At most 20 stones per player: the oldest crumbles.
  delete from public.runestones where id in (
    select id from public.runestones where user_id = p_user order by created_at desc offset 20
  );
  return json_build_object('id', v_id);
end $$;
revoke all on function public.carve_runestone(uuid, text, int, int, int, text, text, text, text) from public, anon, authenticated;
grant execute on function public.carve_runestone(uuid, text, int, int, int, text, text, text, text) to service_role;

/** What a floor shows: the 12 most trusted stones and the 5 newest shades. */
create or replace function public.floor_marks(p_floor int) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'stones', coalesce((
      select json_agg(s) from (
        select r.id, r.author, r.x, r.y, r.what, r.dir, r.advice, r.style, r.heeds, r.falses,
               r.user_id = auth.uid() as mine,
               (select v.vote from public.runestone_votes v where v.stone_id = r.id and v.user_id = auth.uid()) as voted
        from public.runestones r
        where r.floor = p_floor and public.runestone_alive(r)
        order by (r.heeds - r.falses) desc, r.created_at desc
        limit 12
      ) s), '[]'::json),
    'shades', coalesce((
      select json_agg(h) from (
        select sh.id, sh.x, sh.y, sh.enemy
        from public.shades sh
        where sh.floor = p_floor and sh.created_at > now() - interval '30 days'
        order by sh.created_at desc
        limit 5
      ) h), '[]'::json)
  )
$$;
revoke all on function public.floor_marks(int) from public, anon;
grant execute on function public.floor_marks(int) to authenticated;

/** Heed or False, once per player per stone; never on your own stone. */
create or replace function public.vote_runestone(p_stone bigint, p_vote text) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then return json_build_object('error', 'Please sign in first.'); end if;
  if p_vote not in ('heed', 'false') then return json_build_object('error', 'Unknown vote.'); end if;
  select user_id into v_owner from public.runestones where id = p_stone;
  if v_owner is null then return json_build_object('error', 'The stone has crumbled.'); end if;
  if v_owner = auth.uid() then return json_build_object('error', 'That is your own stone.'); end if;
  insert into public.runestone_votes (stone_id, user_id, vote) values (p_stone, auth.uid(), p_vote)
  on conflict do nothing;
  if not found then return json_build_object('error', 'You already judged this stone.'); end if;
  if p_vote = 'heed' then
    update public.runestones set heeds = heeds + 1, last_heed_at = now() where id = p_stone;
    insert into public.renown (user_id, heeds_total) values (v_owner, 1)
    on conflict (user_id) do update set heeds_total = public.renown.heeds_total + 1;
  else
    update public.runestones set falses = falses + 1 where id = p_stone;
  end if;
  return json_build_object('ok', true);
end $$;
revoke all on function public.vote_runestone(bigint, text) from public, anon;
grant execute on function public.vote_runestone(bigint, text) to authenticated;

/** A whole party fell: a shade on that square (anonymous to everyone else). One per player every few minutes. */
create or replace function public.report_shade(p_floor int, p_x int, p_y int, p_enemy text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return json_build_object('error', 'Please sign in first.'); end if;
  if exists (select 1 from public.shades where user_id = auth.uid() and created_at > now() - interval '3 minutes') then
    return json_build_object('ok', false);
  end if;
  insert into public.shades (user_id, floor, x, y, enemy) values (auth.uid(), p_floor, p_x, p_y, p_enemy);
  return json_build_object('ok', true);
end $$;
revoke all on function public.report_shade(int, int, int, text) from public, anon;
grant execute on function public.report_shade(int, int, int, text) to authenticated;

/** Heeds received since last asked, and the gold they bring: 25 G each, at most 100 G a day. */
create or replace function public.claim_renown() returns json
language plpgsql security definer set search_path = '' as $$
declare
  v public.renown;
  v_new int;
  v_gold int;
begin
  if auth.uid() is null then return json_build_object('heeds', 0, 'gold', 0, 'total', 0); end if;
  select * into v from public.renown where user_id = auth.uid() for update;
  if not found then return json_build_object('heeds', 0, 'gold', 0, 'total', 0); end if;
  if v.day <> current_date then v.day := current_date; v.gold_today := 0; end if;
  v_new := v.heeds_total - v.heeds_told;
  v_gold := greatest(0, least(v_new * 25, 100 - v.gold_today));
  update public.renown set heeds_told = v.heeds_total, day = v.day, gold_today = v.gold_today + v_gold where user_id = auth.uid();
  return json_build_object('heeds', v_new, 'gold', v_gold, 'total', v.heeds_total);
end $$;
revoke all on function public.claim_renown() from public, anon;
grant execute on function public.claim_renown() to authenticated;

-- Stones that no longer count, and shades older than 30 days, are deleted every night.
select cron.schedule('runestones-retention', '29 3 * * *', $c$
  delete from public.runestones r where not public.runestone_alive(r);
  delete from public.shades where created_at < now() - interval '30 days';
$c$);
