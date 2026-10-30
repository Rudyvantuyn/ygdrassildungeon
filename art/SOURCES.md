# Art sources

Every image the game ships, and where it came from. Keep this up to date: the game is meant to be
released commercially, so each asset needs a known origin and licence.

## Monsters (`public/art/monsters/<enemy-id>.webp`)

- Generated with Canva's AI image generator (account of the project owner), on 2026-10-29/30.
  Canva's terms grant the user the rights to use generated output, including commercially; check the
  current terms before release.
- All images were exported at 1200×1200 from the Canva design "Ygdrassil monster art sheet"
  (DAHZbPIDnaM), then processed with `scripts/process-art.py` (background removed, cropped, 560 px WebP).
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
| heroes/bastion-a.webp | MAHZdRXRNxM |
| heroes/bastion-b.webp | MAHZdbjQY2o |
| heroes/strider-a.webp | MAHZdQlTv2U |
| heroes/strider-b.webp | MAHZdTCyX4w |
| heroes/mender-a.webp | MAHZdXkodX8 |
| heroes/mender-b.webp | MAHZdfPUZ-Y |
| heroes/runecaller-a.webp | MAHZdYDmfUA |
| heroes/runecaller-b.webp | MAHZdWRakr8 |
