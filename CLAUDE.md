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
- **A new game starts by founding the party**: the player swears in their own adventurers (up to four, free) with
  Brynja's guidance. After that every new adventurer costs rising gold **and an Oath Token** (found on bosses,
  prowlers and in a few chests), so the roster cannot grow endlessly.
- **The game is meant to be grindy and challenging**: XP and gold come slowly (`XP_RATE`, `GOLD_RATE` in combat.ts);
  the balance tests check that rushing fails and steady training wins.
- **Lots of tutorials**: short tips by the townsfolk the first time something comes up (`src/core/data/tutorials.ts`),
  all readable again in the Guidebook, and they can be switched off. Add a tip for every new mechanic.
- **The overarching story is written by Thijs, a friend of the owner.** `docs/verhaal-briefing.md` tells the writer what
  the game needs; `docs/verhaal.md` holds his story and how it is woven in (`src/core/data/story.ts`). The story never
  ends: every chapter resolves something and opens a deeper secret. Choices lean toward one of three roads (Asgard,
  the realms, Midgard's own third way); later chapters must react to them. Keep the canon in `docs/verhaal.md` in sync.

- **Multiplayer** means going into the dungeon together: each player brings one of their own adventurers into a
  party of up to four (an "expedition"). No shared town. Trading may come later (low priority). Leaderboards and
  contests are "events" and only come once the game is finished.
- The game is meant to be released **commercially**: keep everything we ship (art, music, names, code) cleared for
  commercial use, and keep the server authoritative so players cannot cheat.
- Art direction: **AI-generated art** in one consistent style is the plan for the "fantastic graphics" goal; only use
  tools/models whose terms allow commercial use, and keep a record of where each asset came from.

## Working with the owner

- Don't ask the owner to test after every update. Work in larger chunks and announce a **test phase** only after
  big changes (with a short list of what to try). Keep momentum: after finishing something, pick up the next item.

## Working on the code

- `npm run typecheck`, `npm test` (logic + balance, uses a computer player) and `npm run build` must pass before pushing.
- Game logic lives in `src/core` and must stay free of DOM code so it can be tested.
- After UI changes, run the game (`npm run dev`) and check it with `node scripts/screenshots.cjs` (needs Playwright).
- Balance changes: run the balance tests and look at the numbers on purpose; don't just loosen the bounds.
- The live site (Vercel project `ygdrassil-dungeon`) deploys production from `main`.
- Online features use the Supabase project `ygdrassil` (`src/net/online.ts`). The `expedition` Edge Function runs
  `server/expedition.ts`, which uses the same rules as the client (`src/core/expedition.ts`). `npm run build` also
  bundles it into `server/build/expedition.js`; commit that file whenever it changes. Deploy the function after pushing,
  pinned to the pushed commit: an `index.ts` that imports
  `https://cdn.jsdelivr.net/gh/rudyvantuyn/ygdrassildungeon@<commit>/server/build/expedition.js` (verify_jwt off;
  the function checks tokens itself). Only that function writes the `expeditions` table.
- Player feedback and crash reports land in the `reports` table. Players can only insert; only the owner's confirmed
  account (rudyvantuyn@gmail.com, checked by `is_report_owner()`) can read and delete them, on `inbox.html`.
  The owner deletes what is not useful; pick up what is left (read it with SQL) and fix it.
