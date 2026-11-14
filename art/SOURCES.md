# Art sources

Every image the game ships, and where it came from.

**Status (November 2026):** places and dungeon textures are human-made photos, map icons are CC BY icons, and the
dungeon props are modelled in code. Monsters and the adventurers' looks are CC0 pixel art (Dungeon Crawl Stone Soup). The portraits of the people of Lindholm are still AI-made: the owner chose to keep them for now (November 2026). Keep this up to date: the game is meant to be
released commercially, so each asset needs a known origin and licence.

## Monsters (`public/art/monsters/<enemy-id>.webp`)

Pixel art from the Dungeon Crawl Stone Soup tiles (https://opengameart.org/content/dungeon-crawl-32x32-tiles),
CC0 (no rights reserved, commercial use allowed, no credit required; credited on `public/credits.html` anyway).
Each 32×32 tile is cropped and scaled up 12× with hard pixel edges. Which tile is which monster:
`scripts/monster-tiles.json` (enemy id → path under `monster/` in the "Dungeon Crawl Stone Soup Full" download).

## People of Lindholm (`public/art/people`), AI-made, kept for now (owner's choice)

- Generated the same way (Canva AI, 2026-10-30), exported from pages 23–47 of the same Canva design, then resized
  to WebP (places 1280×720, portraits 384×384).
- Places use: *Painterly dark-fantasy game background, ... hand-painted texture, high detail, no text.* Portraits use:
  *Painterly dark-fantasy character portrait, head and shoulders, three-quarter view, looking at the viewer, warm rim
  light, dark muted plain background, hand-painted texture, high detail, no text, no border.* plus a description.

| File | Canva media id |
|---|---|
| people/gerd.webp | MAHZdcF-e90 |
| people/hilde.webp | MAHZdcM75LI |
| people/brynja.webp | MAHZdQIM02s |
| people/sigrid.webp | MAHZdSonhuc |
| people/ketil.webp | MAHZdRvjo6s |
| people/hjalmar.webp | MAHZdf2xUfo |
| people/ylva.webp | MAHZdXG4ibw |
| people/aske.webp | MAHZdf8GuyE |
| people/torvald.webp | MAHZdUExJQk |
| people/hrodna.webp | MAHZfU0QrEo (page 97) |
| people/eira.webp | MAHZfQNkAB8 (page 98) |

The AI-made hero portraits (heroes/<class>-a/b.webp) were removed in November 2026 for the looks below.

## Adventurers' looks (`public/art/heroes/<class>-<0..7>.webp`)

Built by `scripts/make-looks.py` from the player doll parts of the Dungeon Crawl Stone Soup tiles
(https://opengameart.org/content/dungeon-crawl-32x32-tiles), CC0: body, armour, hair, beard, headgear, cloak and what
they hold, layered per look as listed in `scripts/hero-looks.json` (looks 0–3 men, 4–7 women; some get a darker skin
tone by recolouring the body layer). Each 32×32 figure is scaled up 8× with hard pixel edges.

## Medal signs (`public/art/medals/icons.json`)

Icons from game-icons.net (CC BY 3.0), stored as SVG paths and drawn into the medals of the Book of Deeds
(`src/render/medals.ts`; the medals themselves are drawn in code). by Delapouite: stairs, tree-roots, brick-wall, kraken-tentacle, heart-beats, coins, shaking-hands, crossroad; by Lorc: wave-crest, ribcage, treasure-map, crossed-swords, sword-clash, dead-wood, wolf-head, magnifying-glass, book-cover, knapsack, laurels, run, broken-shield, sprout, anvil, castle, flying-flag, crown, raven, feather, hunting-horn, rune-stone, tied-scroll; by Skoll: open-chest, fangs. Credited on `public/credits.html`.

## Places (`public/art/places`) and dungeon textures (`public/art/dungeon`)

Real photographs from Wikimedia Commons, each under CC0, public domain or CC BY (never share-alike or
non-commercial), run through `scripts/photo-to-art.py` (cropped, mapped onto the game's one palette with ordered
dithering; textures made seamless with `--texture`; modern details painted out with `--patch`). The notices on the
notice board are drawn in code on top of the photo.

The full list, with file page, author and licence per asset, is `art/photo-sources.json`; `python3 scripts/credits.py`
writes it into `public/credits.html`, which the game links from the title screen and the System menu.

## Dungeon props

Chests, springs, stairs, gathering spots and root gates are not images: the renderer models them in 3D in code, from
the floor's own wall texture and the shared palette, and draws them at a third of the resolution so they get the same
chunky pixels as the walls (`src/render/corridor.ts`). Nothing to credit.

## Map icons (`public/art/icons`)

Icons from game-icons.net (CC BY 3.0): horned-skull, locked-chest, hazard-sign, axe-in-stump, sprout, mining,
quill-ink, wolf-head and fountain by Lorc, and for the four elements broadsword, small-fire, snowflake-2 and
lightning-helix by Lorc (`public/art/icons/el-*.webp`); stairs, hole-ladder, fishing-pole and tree-roots by Delapouite. Recoloured
and set in pixel medallions (a ring, a dark disc, the icon in its own colour), mapped onto the palette. Credited on
`public/credits.html`.
