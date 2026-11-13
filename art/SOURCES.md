# Art sources

Every image the game ships, and where it came from.

**Status (November 2026):** places, dungeon textures, props and map icons are human-made photos, CC BY icons or
code-drawn sprites. Monsters are CC0 pixel art (Dungeon Crawl Stone Soup). Hero portraits and NPC portraits are still AI-made and are being replaced. Keep this up to date: the game is meant to be
released commercially, so each asset needs a known origin and licence.

## Monsters (`public/art/monsters/<enemy-id>.webp`)

Pixel art from the Dungeon Crawl Stone Soup tiles (https://opengameart.org/content/dungeon-crawl-32x32-tiles),
CC0 (no rights reserved, commercial use allowed, no credit required; credited on `public/credits.html` anyway).
Each 32×32 tile is cropped and scaled up 12× with hard pixel edges. Which tile is which monster:
`scripts/monster-tiles.json` (enemy id → path under `monster/` in the "Dungeon Crawl Stone Soup Full" download).

## People and heroes (`public/art/people`, `heroes`), still AI-made, to be replaced

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
| heroes/bastion-a.webp | MAHZdRXRNxM |
| heroes/bastion-b.webp | MAHZdbjQY2o |
| heroes/strider-a.webp | MAHZdQlTv2U |
| heroes/strider-b.webp | MAHZdTCyX4w |
| heroes/mender-a.webp | MAHZdXkodX8 |
| heroes/mender-b.webp | MAHZdfPUZ-Y |
| heroes/runecaller-a.webp | MAHZdYDmfUA |
| heroes/runecaller-b.webp | MAHZdWRakr8 |
| heroes/skald-a.webp | MAHZfAteqUA |
| heroes/skald-b.webp | MAHZfPSY9A0 |
| heroes/berserker-a.webp | MAHZfC3Nw2A |
| heroes/berserker-b.webp | MAHZfNOjYBg |
| heroes/seeress-a.webp | MAHZfFz4yT4 |
| heroes/seeress-b.webp | MAHZfKKCKks |
| heroes/wolfkin-a.webp | MAHZfDYXyOg |
| heroes/wolfkin-b.webp | MAHZfAY-HtE |

The Skald, Berserker, Seeress and Wolfkin portraits were added on 2026-10-30 (pages 89–96 of the same design),
exported at 1024×1024 and scaled to 384 px WebP.

## Places (`public/art/places`) and dungeon textures (`public/art/dungeon`)

Real photographs from Wikimedia Commons, each under CC0, public domain or CC BY (never share-alike or
non-commercial), run through `scripts/photo-to-art.py` (cropped, mapped onto the game's one palette with ordered
dithering; textures made seamless with `--texture`; modern details painted out with `--patch`). The notices on the
notice board are drawn in code on top of the photo.

The full list, with file page, author and licence per asset, is `art/photo-sources.json`; `python3 scripts/credits.py`
writes it into `public/credits.html`, which the game links from the title screen and the System menu.

## Dungeon props (`public/art/props`)

Chests, the spring, gathering spots and the root gate are Dungeon Crawl Stone Soup tiles (CC0), like the monsters;
`scripts/prop-tiles.json` says which tile is which. Stairs are not images: the renderer builds them in 3D from the
floor's own wall texture (`stairs` / `upStairs` in `src/render/corridor.ts`).

## Map icons (`public/art/icons`)

Icons from game-icons.net (CC BY 3.0): horned-skull, locked-chest, hazard-sign, axe-in-stump, sprout, mining,
quill-ink, wolf-head and fountain by Lorc; stairs, hole-ladder, fishing-pole and tree-roots by Delapouite. Recoloured
and set in pixel medallions (a ring, a dark disc, the icon in its own colour), mapped onto the palette. Credited on
`public/credits.html`.
