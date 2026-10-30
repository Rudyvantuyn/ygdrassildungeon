# Art sources

Every image the game ships, and where it came from. Keep this up to date: the game is meant to be
released commercially, so each asset needs a known origin and licence.

## Monsters (`public/art/monsters/<enemy-id>.webp`)

- Generated with Canva's AI image generator (account of the project owner), on 2026-10-29/30.
  Canva's terms grant the user the rights to use generated output, including commercially; check the
  current terms before release.
- All images were exported at 1200×1200 from the Canva design "Ygdrassil monster art sheet"
  (DAHZbPIDnaM), then processed with `scripts/process-art.py` (background removed, cropped, 560 px WebP).
  Chapter II monsters (brineling … hafgufa) were generated on 2026-10-30 and exported at 1024×1024.
- Shared style prompt: *Painterly dark-fantasy game monster illustration, full body, centered, isolated
  on a plain flat dark charcoal background, Norse folklore mood, dramatic top lighting, soft rim light,
  hand-painted texture, high detail, no text, no border.* followed by a short description of the creature.

| Enemy id | Canva media id |
|---|---|
| ashenColossus | MAHZc45NhbE |
| blightedElder | MAHZc5-Jigs |
| bogling | MAHZayw3CTQ |
| briarGnawer | MAHZc093TR4 |
| cinderwing | MAHZc3LVWtA |
| duskwing | MAHZc4Jcw6w |
| emberling | MAHZcwYn9kE |
| fenwraith | MAHZc2e2c8g |
| frostcap | MAHZcwqR540 |
| gloamMoth | MAHZc1bJA0E |
| hollowHound | MAHZc_zTOEk |
| hrimwolf | MAHZcyCOdTE |
| puffcap | MAHZc2PLmh0 |
| rimeshell | MAHZc0cTCvU |
| rootColossus | MAHZc57b7-Q |
| rootDraugr | MAHZc-ZrC3k |
| rootfiend | MAHZc5gWoa4 |
| rootgnawer | MAHZc38RjEs |
| shellbark | MAHZc6FbP0Y |
| snowveil | MAHZc-j_m-4 |
| grimtusk | MAHZc-q9TLM |
| brineling | MAHZeU6lHPo |
| skerrywing | MAHZeZj4RVc |
| reefclaw | MAHZeZuuERo |
| kelpStrangler | MAHZecN5iJw |
| brinecap | MAHZef_T8bs |
| pearlmoth | MAHZefp6fNU |
| coralback | MAHZea9sWbk |
| tidecaller | MAHZefEYeEY |
| nykur | MAHZeXcnQoM |
| seahound | MAHZeRS56i0 |
| saltwight | MAHZeQ1CHQk |
| gloomEel | MAHZeWD8D2U |
| deepmaw | MAHZeVe93sI |
| wavemaid | MAHZeRt_dnM |
| fathomstone | MAHZeTHHISI |
| skerryjaw | MAHZeeEVoFs |
| brineDraugr | MAHZeTp3IDI |
| tidecoil | MAHZefZiBNw |
| drownedJarl | MAHZeZ8maFI |
| hafgufa | MAHZeZot0-M |

## Town, people and heroes (`public/art/places`, `people`, `heroes`)

- Generated the same way (Canva AI, 2026-10-30), exported from pages 23–47 of the same Canva design, then resized
  to WebP (places 1280×720, portraits 384×384).
- Places use: *Painterly dark-fantasy game background, ... hand-painted texture, high detail, no text.* Portraits use:
  *Painterly dark-fantasy character portrait, head and shoulders, three-quarter view, looking at the viewer, warm rim
  light, dark muted plain background, hand-painted texture, high detail, no text, no border.* plus a description.

| File | Canva media id |
|---|---|
| places/hall.webp | MAHZdfn1nwc |
| places/shop.webp | MAHZddr7ZWU |
| places/board.webp | MAHZdX05bKc |
| places/town.webp | MAHZdQYCk5I |
| places/inn.webp | MAHZdc4jvHk |
| places/rootdeep.webp | MAHZdaOmySw |
| places/hornstone.webp | MAHZdYugJ34 |
| places/title.webp | MAHZdfaKrjo |
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

## Dungeon textures (`public/art/dungeon/<set>-wall|floor|ceiling.webp`)

- Generated with Canva AI (2026-10-30), exported from pages 48–56 of the same Canva design, then made seamless and
  resized with `scripts/make-tiles.py`. Prompts: *Seamless tileable texture, flat orthographic view, no perspective,
  no vignette, even lighting, painterly hand-painted dark fantasy game texture: ...* (stone wall with roots and moss /
  forest floor / root ceiling; frosted versions; charred versions with ember cracks).

| File | Canva media id |
|---|---|
| forest-wall | MAHZd3kjK24 |
| forest-floor | MAHZd2DHrpk |
| forest-ceiling | MAHZd2HV4hk |
| frostwood-wall | MAHZd3Ra5Zk |
| frostwood-floor | MAHZd0TGfR0 |
| frostwood-ceiling | MAHZd9vA_xk |
| emberroot-wall | MAHZd3ws7c0 |
| emberroot-floor | MAHZdyuoIDE |
| emberroot-ceiling | MAHZd9_u4L8 |
| tidewater-wall | MAHZeTE52_4 |
| tidewater-floor | MAHZeWWUgdk |
| tidewater-ceiling | MAHZefAPiP0 |
| coral-wall | MAHZeQ9rGaQ |
| coral-floor | MAHZeWaFT8w |
| coral-ceiling | MAHZeQs2k9I |
| abyss-wall | MAHZee2KK7s |
| abyss-floor | MAHZed0Af8s |
| abyss-ceiling | MAHZeb0mye8 |

## Dungeon props (`public/art/props/<name>.webp`)

- Generated with Canva's AI image generator on 2026-10-30, exported from the art sheet (DAHZbPIDnaM) at
  1024×1024 and cut out with `scripts/process-art.py`.
- Style prompt: *Painterly dark-fantasy game prop illustration, centered, isolated on a plain flat dark charcoal
  background, dramatic top lighting, soft rim light, hand-painted texture, high detail, no text, no border.*
  followed by a short description of the prop.

| File | Canva media id |
|---|---|
| chest | MAHZeb7Z0H4 |
| chest-open | MAHZeSMxMkQ |
| spring | MAHZeQ7Kilc |
