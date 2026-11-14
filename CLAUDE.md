# Project rules

## Originality (most important)

The goal is a game that **plays like Etrian Odyssey** (first-person grid dungeon crawling,
mapping, turn-based party combat, town loop) but **shares nothing else with it**.

- Gameplay mechanics may follow the EO formula. Everything players can read or see must be our own:
  names of items, skills, classes, enemies, places, characters, stats, menus, UI terms and story.
- Never use names or terms from Etrian Odyssey (or any other existing game), not even "just as a placeholder".
  When in doubt, invent a new name.
- Generic fantasy/RPG words (Inn, Shop, HP, sword, fire) are fine. Distinctive or trademark-like terms are not.
- This also applies to internal ids, code comments, commit messages and docs: keep EO terms out of the codebase.
  (Describing the project as "inspired by" or "in the style of" EO in the README is fine.)

Known EO terms to avoid (not exhaustive): Medica, Amrita, Theriaca, Soma, Ariadne Thread, Warp Wire,
FOE, TP (tech points), Formula, Volt, Stratum, Geomagnetic Pole, Labyrinth (as the dungeon's name),
Yggdrasil Labyrinth, Etria, Explorers Guild, Landsknecht, Protector, Medic, Alchemist, Survivalist,
Dark Hunter, Troubadour, Ronin, Hexer, Gunner, Provoke, Shield Smite, Line Heal, Party Heal,
Chain/Link skills, Limit/Burst/Force skills, Boost, Grimoire, Floor Jump, Floor 'B1F' labels.

Decided by the owner (don't raise again):
- The title **Ygdrassil** and Norse mythology as a theme are allowed and wanted. Norse myth is public domain and
  popular with players, so names and themes from it (gods, realms, creatures, runes) are fine to use.
  Just don't copy how Etrian Odyssey uses it, e.g. no "Yggdrasil Labyrinth" as a dungeon name.

The game's own vocabulary lives in `src/core/data/` and is listed in the README glossary.
Add new names there and keep the glossary in sync.

## Design decisions (from the owner)

- **Prowlers** (visible roaming monsters) only appear from **floor 5** onward. A party should not survive a
  prowler fight before about **level 10**, and even then only barely: they are meant to be avoided, or beaten
  after training. Every prowler floor must have a route around them. Fleeing from a prowler is a fixed **30%**.
  Deeper chapters scale this up: chapter II prowlers are hopeless at level 20 and risky at about 24.
- The dungeon is told in **chapters of five floors**, each with its own theme and matching monsters, always ending
  with a boss. Chapter I is forest (floors 1–5), chapter II ocean (floors 6–10). The owner wants to draw dungeons
  themselves later (a dungeon editor). The editor (the Drafting Table) is a maker tool, not a player feature: it only
  shows with `?maker` in the address.
- **Character growth is dynamic**: skill points per level, spent in a skill tree per class; skills have ranks 1–10.
  There are also gathering skills (e.g. foraging, mining) used at gathering spots in the dungeon. More classes are
  welcome; invent them freely (own names).
- **Secret classes**: some classes are not on offer until a hidden deed is done (`SECRET_CLASSES` in
  `src/core/deeds.ts`); then a stranger comes to the Oath Hall (a story scene) and the class can be sworn in. Until then
  the Oath Hall and the website show them only as ???. The founding party always picks from the eight open classes.
  So far: Ravenspeaker (25 Raven Runs) and Hornbearer (5 expeditions). Each needs a full tree, 8 looks, gear access,
  tactics in `tactics.ts`, and the balance check in `secretClasses.test.ts`.
- **A new game starts by founding the party**: the player swears in their own adventurers (up to four, free) with
  Brynja's guidance. After that every new adventurer costs rising gold **and an Oath Token** (found on bosses,
  prowlers and in a few chests), so the roster cannot grow endlessly.
- **Descents start at a chapter's first floor** (floor 1, 6, 11, …), never mid-chapter. The next chapter opens once
  the previous chapter's final boss is beaten (its stairs are behind the boss). Expeditions follow the same rule
  (`startFloors` / `startFloorFor` in `src/core/data/chapters.ts`). The word "stratum" is an EO term: say "chapter".
- **From chapter III on, chapters are drawn as a whole** (five floors) at the Drafting Table: numbered stairs (1–9) join
  any two floors of the chapter (also back up to another part of an earlier floor), and root gates (`n`/`e`/`s`/`w`,
  the side they open from) are one-way shortcuts that stay open once opened (`progress.gatesOpen`). Chapters I and
  II stay as they are. The owner draws on a PC and sends a chapter code (`YGC1.`); turn it into floors with
  `decodeChapter` + `toFloorDefs`.
- **No difficulty setting**: everyone plays by the same rules, so expeditions stay fair.
- **The game is meant to be grindy and challenging**: XP and gold come slowly (`XP_RATE`, `GOLD_RATE` in combat.ts);
  the balance tests check that rushing fails and steady training wins.
- **Lots of tutorials**: short tips by the townsfolk the first time something comes up (`src/core/data/tutorials.ts`),
  all readable again in the Guidebook, and they can be switched off. Add a tip for every new mechanic.
- **The overarching story is written by Thijs, a friend of the owner.** `docs/verhaal-briefing.md` tells the writer what
  the game needs; `docs/verhaal.md` holds his story and how it is woven in (`src/core/data/story.ts`). The story never
  ends: every chapter resolves something and opens a deeper secret. Choices lean toward one of three roads (Asgard,
  the realms, Midgard's own third way); later chapters must react to them. Keep the canon in `docs/verhaal.md` in sync.

- **The Wyrdweave** (`src/core/wyrd.ts`): a daily run of three floors, the same for everyone (seeded by the UTC day),
  each with a rule, opening after the Blighted Elder. One try a day, own party, half XP and gold. Rewards stay scarce:
  at most 4 Wyrd Threads a day (half after a fall), gear costs 30/50/80 threads, threads cannot be sold. Don't make
  the gear cheaper or the threads more plentiful without the owner.

- **Multiplayer** means going into the dungeon together: each player brings one of their own adventurers into a
  party of up to four (an "expedition"). No shared town. Trading may come later (low priority). Leaderboards and
  contests are "events" and only come once the game is finished.
- The game is meant to be released **commercially**: keep everything we ship (art, music, names, code) cleared for
  commercial use, and keep the server authoritative so players cannot cheat.
- **Earning money (decided November 2026):** stay true to the game. Steam at version 1.0 (pay once; the browser version
  can stay the free demo), plus an optional **Supporter Pack** and later **cosmetic packs** (things to look at, e.g.
  runestone styles, portrait sets, an expedition banner), each with a plain euro price. **Never** a premium currency,
  pay-to-win (no gold, XP, Oath Tokens or shorter timers for money), ads or subscriptions. Events are free for everyone,
  with at most an optional cosmetic keepsake. Build features so cosmetics can be added later without changing the rules.
  Before any income: Vercel's free Hobby plan is non-commercial, so move to Pro (and Supabase Pro around launch).
  Start a Steam page with wishlists well before launch; visibility is the biggest risk, not cost.
- Art direction (changed after playtest feedback, November 2026): **no AI-generated images**. Players of the genre
  reject them. The AI art is being replaced, one category at a time, by:
  - real photos (our own, or CC0 / public domain / CC BY, never share-alike or non-commercial) run through
    `scripts/photo-to-art.py`, which maps everything onto one shared pixel palette so it reads as one world
    (places, and with `--texture` the dungeon walls, floors and ceilings);
  - human-made asset packs whose licence allows commercial use and that are not themselves AI-made
    (check itch.io's AI tags), e.g. game-icons.net (CC BY 3.0) for the map icons;
  - for what cannot be photographed (monsters, portraits): human-made packs, commissions or the owner's own drawings.
  Record every asset in `art/SOURCES.md`, and credit every CC BY author on a credits page.
  The owner chose (November 2026): town, dungeon and fights may each have their own look as long as it feels like one
  game, and **pixel art** is the way. Monsters are CC0 pixel art from the Dungeon Crawl Stone Soup tiles
  (`scripts/monster-tiles.json` maps enemy id to tile); add new monsters from that set. `python3 scripts/credits.py`
  writes the photo table into `public/credits.html`. Adventurers have **looks**: 8 per class (4 men, 4 women), chosen
  when they swear the oath, built from the same set's player doll parts (`scripts/hero-looks.json`, `scripts/make-looks.py`);
  a new class gets 8 looks the same way (recolour or draw a 32×32 part if the set lacks one). The portraits of the people
  of Lindholm (Brynja, Sigrid, …) stay as they are: the owner decided this (November 2026), don't raise it again.

## Working with the owner

- **Releases on itch.io: at most two a week, each with a devlog.** Don't build the itch zip (`npm run build:itch`) or
  write a devlog unless the owner asks for a release; new features can be built and pushed meanwhile.
- Don't ask the owner to test after every update. Work in larger chunks and announce a **test phase** only after
  big changes (with a short list of what to try). Keep momentum: after finishing something, pick up the next item.

## Working on the code

- `npm run typecheck`, `npm test` (logic + balance, uses a computer player) and `npm run build` must pass before pushing.
- Game logic lives in `src/core` and must stay free of DOM code so it can be tested.
- After UI changes, run the game (`npm run dev`) and check it with `node scripts/screenshots.cjs` (needs Playwright).
- Balance changes: run the balance tests and look at the numbers on purpose; don't just loosen the bounds.
- The live site is **www.ygdrassilgame.com** (Vercel project `ygdrassil-dungeon`, production from `main`; the apex redirects
  to www). The website is the front door: `index/world/classes/bestiary/devlog.html` rendered by `src/site/main.ts` from the
  game's own data plus `src/site/lore.ts` (spoiler-free lore, in line with `docs/verhaal.md`) and `src/site/devlog.ts`
  (devlog posts; itch gets a short version linking here). The game is at `/play` (`play.html`). The site's bestiary shows only the Bogling and Briar Gnawer to
  everyone (`ALWAYS_KNOWN`); a signed-in player sees every creature their cloud save has met. Visits to the old `ygdrassil-dungeon.vercel.app` move to the new address and carry
  the local save along (`src/site/transfer.ts`). Players sign in with Google (one click; a guest links Google and keeps
  everything) or e-mail; inside the itch.io frame Google cannot open, so there the button opens the site. Signed in,
  the game keeps the save with the account (at most every two minutes) and deeds in the `deeds` table; the site's
  "My Wayfinder" page shows party, medals and progress, and the bestiary shows the creatures they have met. itch.io stays the shop window: its build links to the site with
  `?from=itch`; the site always has the newest version.
- Online features use the Supabase project `ygdrassil` (`src/net/online.ts`). The `expedition` Edge Function runs
  `server/expedition.ts`, which uses the same rules as the client (`src/core/expedition.ts`). `npm run build` also
  bundles it into `server/build/expedition.js`; commit that file whenever it changes. Deploy the function after pushing,
  pinned to the pushed commit: an `index.ts` that imports
  `https://cdn.jsdelivr.net/gh/rudyvantuyn/ygdrassildungeon@<commit>/server/build/expedition.js` (verify_jwt off;
  the function checks tokens itself). Only that function writes the `expeditions` table.
- Player feedback and crash reports land in the `reports` table. Players can only insert; only the owner's confirmed
  account (rudyvantuyn@gmail.com, checked by `is_report_owner()`) can read and delete them, on `inbox.html`.
  The owner deletes what is not useful; pick up what is left (read it with SQL) and fix it.
- `public/privacy.html` (privacy and terms) promises what data is stored and for how long; keep it true when adding
  anything that stores or sends player data. Reports are deleted after 12 months by the `reports-retention` cron job.
  Fonts are bundled (`@fontsource`), so no third-party font service is contacted.
