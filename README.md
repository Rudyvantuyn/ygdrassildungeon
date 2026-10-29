# Ygdrassil Dungeon

Een first-person dungeon crawler in de stijl van Etrian Odyssey, gebouwd als webgame in TypeScript.
Alles (gangen, monsters, interface) wordt in code getekend, dus er zijn geen losse afbeeldingen nodig.

## Spelen

```bash
npm install
npm run dev        # open de URL die Vite toont (meestal http://localhost:5173)
```

### Besturing

| Toets | Verkennen | Menu's / gevecht |
|---|---|---|
| ↑ / W | stap vooruit | omhoog |
| ↓ / S | stap achteruit | omlaag |
| ← / A, → / D | draai links / rechts | doelwit wisselen |
| Q / E | zijstap links / rechts | |
| Enter / Spatie | | bevestigen (tijdens een ronde: versnellen) |
| Esc | kamp-menu | terug |
| C / M | kamp-menu / grote kaart | |

De knoppen rechts op het scherm werken ook met muis of touch.

## Wat zit erin (mijlpaal 1: kernlus in de dungeon)

- **Verkennen** op een grid in first-person, met een automatische kaart die alleen laat zien waar je bent geweest.
- **Willekeurige gevechten**: de "Danger"-bol kleurt van blauw via geel naar rood naarmate het volgende gevecht dichterbij komt.
- **Beurtgevechten** met een party van 4 (Guardian, Ranger, Mystic, Arcanist): aanvallen, skills (kosten TP), verdedigen, items, vluchten.
  Voorste en achterste rij, zwaktes en resistenties (vuur/ijs/bliksem), kritieke treffers, provoke en schildmuur.
- **Ervaring en levels**: nieuwe skills op level 3 en 4.
- **3 verdiepingen** met kisten, een genezende bron (eenmalig, slaat ook op) en een **eindbaas** op B3F.
- **Opslaan** in de browser: automatisch bij elke nieuwe verdieping en bij de bron, en handmatig via het kamp-menu.

## Projectstructuur

```
src/
  core/         Spellogica zonder scherm (volledig getest)
    data/       Klassen, skills, items, vijanden en verdiepingen: hier pas je de balans en kaarten aan
    combat.ts   Gevechtssysteem
    game.ts     Spelstatus: bewegen, vijanden, kisten, trappen, opslaan
    autoplay.ts Computer-speler die het spel uitspeelt (gebruikt voor balanstests)
  render/       Canvas-tekenwerk: gang, monsters, minikaart
  ui/           Schermen, menu's, gevechtsweergave
scripts/
  screenshots.cjs  Speelt het spel automatisch in een browser en maakt screenshots
```

### Kaarten maken

Verdiepingen staan als tekst in `src/core/data/floors.ts`:

```
#  muur      .  vloer     S  start
>  trap      T  kist      ~  bron      B  eindbaas
```

De tests controleren automatisch dat elke kaart klopt: alles bereikbaar, randen dicht, en een trap of eindbaas aanwezig.

## Controles

```bash
npm run typecheck
npm test           # logica + balans (een computer-speler speelt het spel uit op 20 seeds)
npm run build      # productieversie in dist/
```
