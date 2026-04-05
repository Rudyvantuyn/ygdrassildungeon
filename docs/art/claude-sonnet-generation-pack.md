# Ygdrassil Art Generation Pack (Claude Sonnet)

Gebruik dit document als vaste bron voor alle image-generatie, zodat alle assets dezelfde stijl, framing en sfeer houden.

## 1) Master Style Lock (plak boven elke prompt)

```text
Style: high-fantasy anime, painterly 2D illustration, premium JRPG UI art direction, inspired by classic dungeon crawlers (Etrian vibe) but original IP.
Mood: mysterious, adventurous, slightly melancholic, heroic.
Rendering: clean silhouette readability, soft painterly shading, controlled linework, subtle texture, rich atmospheric lighting, no photorealism.
Palette: deep navy/teal shadows, warm amber highlights, desaturated stone/wood neutrals, selective gold accents.
Composition rules: clear focal subject, strong depth layers (foreground/mid/background), avoid visual clutter in center UI-safe area unless explicitly requested.
Output quality: production-ready game asset, no watermark, no signature, no embedded text, no logo.
Consistency: same world, same materials, same lighting language, same art direction as previous generated assets.
```

## 2) Technical Rules

- Output format: `PNG`, `sRGB`, high quality.
- Keep clean edges and avoid compression artifacts.
- No text in images (UI text is drawn by game code).
- For **character/NPC portraits**: transparent or very simple dark background so they sit well on ornate UI panels.
- For **full backgrounds**: no important details in the exact screen center where panels/buttons often overlay.

## 3) Asset List (Wave 1 - current placeholders)

Genereer in deze volgorde. Bestandsnamen zijn exact, zodat integratie straks snel gaat.

| Priority | Asset purpose | Target filename | Recommended size | Notes |
|---|---|---|---|---|
| P0 | City hub background | `city-hub-final.png` | 2560x1440 | Must read instantly as main city menu map |
| P0 | Shop interior background | `shop-interior-final.png` | 2560x1440 | Cozy guild market with depth |
| P0 | Shopkeeper portrait | `npc-shopkeeper-final.png` | 1400x1800 | Vertical portrait, readable at medium size |
| P1 | Shared service fallback bg | `bg-service-fallback-final.png` | 2560x1440 | Neutral guild interior for service screens |
| P1 | Mission NPC | `npc-mission-keeper-final.png` | 1200x1600 | Contract-master vibe |
| P1 | Training NPC | `npc-training-master-final.png` | 1200x1600 | Martial instructor vibe |
| P1 | Blacksmith NPC | `npc-blacksmith-master-final.png` | 1200x1600 | Forge master vibe |
| P1 | Season/Guild NPC | `npc-guild-master-final.png` | 1200x1600 | Noble guild steward/herald |
| P1 | Profile emblem | `ui-profile-emblem-final.png` | 1024x1024 | Circular/sigil-friendly, iconic |
| P1 | Co-op banner | `ui-coop-board-final.png` | 1600x700 | Horizontal decorative banner |
| P1 | Guild hall banner | `ui-guild-hall-banner-final.png` | 1600x700 | Horizontal hero banner |

## 4) Copy/Paste Prompts Per Asset

### A) `city-hub-final.png` (2560x1440)

```text
[MASTER STYLE LOCK]
Create a panoramic high-fantasy anime city hub viewed from a slightly elevated angle, designed for a game main menu with clickable districts.
District readability is critical: include clearly distinct areas for market, training hall, guild hall, blacksmith, mission board, season tower, and forest gate.
Environment: stone bridges, banners, warm lanterns, layered rooftops, distant tower silhouette, subtle magic glow.
Composition: strong depth, with natural visual lanes between districts; avoid heavy detail in exact center and lower-left where UI command panels may overlap.
Lighting: late afternoon to blue hour transition, warm windows vs cool ambient sky.
No characters in close-up; this is an environmental key-art background.
No text, no watermark, no logos.
```

### B) `shop-interior-final.png` (2560x1440)

```text
[MASTER STYLE LOCK]
Create an interior of a fantasy guild market shop, rich but believable, for a JRPG service screen.
Scene elements: shelves with potions/relics, counter area, hanging lamps, warm wood and brass materials, subtle magical artifacts.
Must leave visual calm on left-mid area where shopkeeper portrait and UI boxes will overlay.
Atmosphere: warm and inviting, safe city vibe, not dark dungeon.
No text, no watermark, no logos.
```

### C) `npc-shopkeeper-final.png` (1400x1800)

```text
[MASTER STYLE LOCK]
Create a full-body to three-quarter portrait of a charismatic fantasy shopkeeper (adult), anime style, friendly but shrewd.
Clothing: layered merchant-guild outfit, practical luxury, small gold accents, pouch/key motifs.
Pose: welcoming hand gesture as if offering buy/sell/talk options.
Background: transparent or very simple dark gradient background suitable for UI panel placement.
Framing: subject centered and fully visible, no cut-off head/hands.
No text, no watermark, no logos.
```

### D) `bg-service-fallback-final.png` (2560x1440)

```text
[MASTER STYLE LOCK]
Create a neutral fantasy guild interior backdrop usable across multiple service screens.
Architecture: stone arches, polished wood, hanging lamps, subtle banners, depth corridors.
Keep center and left portions visually quiet for overlay panels.
Mood: calm operational hub, not combat.
No text, no watermark, no logos.
```

### E) `npc-mission-keeper-final.png` (1200x1600)

```text
[MASTER STYLE LOCK]
Create a portrait of a mission board keeper NPC (adult), organized and tactical, anime fantasy style.
Design language: parchment, map pins, guild insignia, messenger satchel.
Expression: focused but approachable.
Background: transparent or minimal dark backdrop.
Framing: clear silhouette, no crop issues.
No text, no watermark, no logos.
```

### F) `npc-training-master-final.png` (1200x1600)

```text
[MASTER STYLE LOCK]
Create a portrait of a training hall master NPC (adult), disciplined martial mentor.
Design language: leather/cloth combat attire, sparring scars, training insignia.
Pose: instructive stance, one hand indicating technique.
Background: transparent or minimal dark backdrop.
Framing: complete figure visible for UI card usage.
No text, no watermark, no logos.
```

### G) `npc-blacksmith-master-final.png` (1200x1600)

```text
[MASTER STYLE LOCK]
Create a portrait of a master blacksmith NPC (adult), strong presence, craft-focused.
Design language: forge apron, heat-tempered gloves, glowing ember reflections, engraved tools.
Pose: holding a half-finished weapon or inspecting a blade.
Background: transparent or minimal dark backdrop.
No text, no watermark, no logos.
```

### H) `npc-guild-master-final.png` (1200x1600)

```text
[MASTER STYLE LOCK]
Create a portrait of a guild master / season herald NPC (adult), authoritative and noble.
Design language: ceremonial guild attire, cloak, subtle seasonal motif (stars/moons/laurel), leadership aura.
Pose: formal but warm, as if presenting rankings and season rewards.
Background: transparent or minimal dark backdrop.
No text, no watermark, no logos.
```

### I) `ui-profile-emblem-final.png` (1024x1024)

```text
[MASTER STYLE LOCK]
Create a stylized guild profile emblem icon for UI usage.
Shape language: circular crest with layered sigils, sword/compass/laurel motifs, high readability at small size.
Need clean center and edge contrast.
Background should be transparent.
No text, no watermark, no logos.
```

### J) `ui-coop-board-final.png` (1600x700)

```text
[MASTER STYLE LOCK]
Create a horizontal co-op party banner illustration: adventurers gathered around a strategy board before descent.
Tone: teamwork, anticipation, city safety before danger.
Composition: cinematic wide layout, center-safe.
No text, no watermark, no logos.
```

### K) `ui-guild-hall-banner-final.png` (1600x700)

```text
[MASTER STYLE LOCK]
Create a horizontal guild hall hero banner: bustling adventurer hall with bulletin board, map tables, and warm lantern lighting.
Tone: home base, progression, community.
Composition: wide decorative mural suitable for top panel embedding.
No text, no watermark, no logos.
```

## 5) Negative Prompt Add-on (optional, recommended)

```text
Avoid: photorealistic skin, 3D render look, chibi proportions, modern sci-fi props, over-saturated neon, blurry details, extra fingers, cropped heads/hands, text overlays, logos, watermark, signature.
```

## 6) Acceptance Checklist (before importing)

- Same style family across all outputs (as if one art director approved all).
- Subject fully visible (no accidental crop of head/hands/weapon).
- No embedded text.
- Correct resolution and PNG export.
- Visual readability still good at 60-70% scale.

## 7) Implementation Notes (for this repo)

Current runtime keys are tied to existing placeholder/background paths.  
After generation we either:

1) overwrite current placeholder files with final art equivalents, or  
2) add new files and update `client/src/assets/manifest.ts` + `client/src/scenes/BootScene.ts`.

Aanrader: eerst optie 2 op een aparte pass, zodat we placeholders als backup houden.
