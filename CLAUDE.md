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

## Working with the owner

- Don't ask the owner to test after every update. Work in larger chunks and announce a **test phase** only after
  big changes (with a short list of what to try). Keep momentum: after finishing something, pick up the next item.

## Working on the code

- `npm run typecheck`, `npm test` (logic + balance, uses a computer player) and `npm run build` must pass before pushing.
- Game logic lives in `src/core` and must stay free of DOM code so it can be tested.
- After UI changes, run the game (`npm run dev`) and check it with `node scripts/screenshots.cjs` (needs Playwright).
- Balance changes: run the balance tests and look at the numbers on purpose; don't just loosen the bounds.
- The live site (Vercel project `ygdrassil-dungeon`) deploys production from `main`.
