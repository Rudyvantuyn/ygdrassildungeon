# High-Fantasy Anime Art Direction (Balanced Epic)

## Visual Identity

- Distinctive high-fantasy anime look: elegant silhouettes, ornate trims, magical runes.
- Balanced epic tone: luminous heroes against ominous dungeon architecture.
- Consistent shape language:
  - Heroes: clean edges, warm highlights, jewel accents.
  - Enemies: harsher contrast, angular shadows, corrupted glow.
  - UI: gold filigree + arcane cyan accents on dark lacquer panels.

## Palette

- Core night tones: `#0A1228`, `#09040E`, `#1D2237`
- Hero accents: `#F4B942`, `#7DD181`, `#5BC0EB`
- Danger accents: `#FF7F50`, `#D64045`, `#EAC435`
- Text hierarchy:
  - Primary: `#F7F2E8`
  - Secondary: `#C9C0B4`

## Asset Rules

- Use only original assets authored in this project.
- Keep line weight and edge softness consistent across portraits.
- Lighting direction defaults to upper-left.
- All portrait crops framed for 3:4 display.
- VFX are additive-friendly (bright core, soft falloff).

## Naming Convention

- `backgrounds/<scene>-<theme>.svg`
- `portraits/classes/<class>.svg`
- `portraits/enemies/<id>.svg`
- `ui/icon-<skill>.svg`
- `vfx/<effect>.svg`

## Quality Checklist

- Readability at 1280x720 and 960x540
- No clashing saturation between UI and portraits
- Turn-critical effects (targeting, boss warnings) visibly distinct
- Boss cues readable within 0.5s
