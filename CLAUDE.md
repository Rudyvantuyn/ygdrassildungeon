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

The game's own vocabulary lives in `src/core/data/` and is listed in the README glossary.
Add new names there and keep the glossary in sync.

## Working on the code

- `npm run typecheck`, `npm test` (logic + balance, uses a computer player) and `npm run build` must pass before pushing.
- Game logic lives in `src/core` and must stay free of DOM code so it can be tested.
- After UI changes, run the game (`npm run dev`) and check it with `node scripts/screenshots.cjs` (needs Playwright).
- Balance changes: run the balance tests and look at the numbers on purpose; don't just loosen the bounds.
- The live site (Vercel project `ygdrassil-dungeon`) deploys production from `main`.
