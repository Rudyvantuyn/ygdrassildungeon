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

Online spelen: **https://ygdrassil-dungeon.vercel.app**

## Wat zit erin

### De stad Lindholm (mijlpaal 2)

- **Herberg**: uitrusten voor goud. Herstelt HP en TP, wekt gevallen leden weer tot leven en slaat op.
- **Winkel**: items (Medica, Amrita, Ariadne-draad) en **uitrusting** per klasse.
  Nieuwe wapens en harnassen verschijnen zodra je een diepere verdieping hebt bereikt; je oude stuk ruil je in voor de halve prijs.
- **Labyrint**: ga naar binnen op elke verdieping die je al hebt bereikt.
- Terug naar de stad via de **trap omhoog** op B1F, of overal met een **Ariadne-draad** (kamp-menu). Bronnen vullen zich weer bij als je in de stad bent geweest.

### De dungeon (mijlpaal 1)

- **Verkennen** op een grid in first-person, met een automatische kaart die alleen laat zien waar je bent geweest.
- **Willekeurige gevechten**: de "Danger"-bol kleurt van blauw via geel naar rood naarmate het volgende gevecht dichterbij komt.
- **Beurtgevechten** met een party van 4 (Guardian, Ranger, Mystic, Arcanist): aanvallen, skills (kosten TP), verdedigen, items, vluchten.
  Voorste en achterste rij, zwaktes en resistenties (vuur/ijs/bliksem), kritieke treffers, provoke en schildmuur.
- **Ervaring en levels**: nieuwe skills op level 3 en 4.
- **3 verdiepingen** met kisten, een genezende bron (eenmalig, slaat ook op) en een **eindbaas** op B3F.
- **Opslaan** in de browser: in de stad (herberg of menu), en automatisch bij elke trap en bij de bron.
  In de dungeon kun je niet zomaar opslaan: wie valt, begint weer bij de laatste save.

## Projectstructuur

```
src/
  core/         Spellogica zonder scherm (volledig getest)
    data/       Klassen, skills, items, vijanden en verdiepingen: hier pas je de balans en kaarten aan
    combat.ts   Gevechtssysteem
    game.ts     Spelstatus: stad/dungeon, bewegen, vijanden, kisten, trappen, opslaan
    town.ts     Herberg en winkel
    autoplay.ts Computer-speler die het spel uitspeelt (gebruikt voor balanstests)
  render/       Canvas-tekenwerk: gang, monsters, minikaart, stad
  ui/           Schermen, menu's, gevechtsweergave
scripts/
  screenshots.cjs  Speelt het spel automatisch in een browser en maakt screenshots
```

### Kaarten maken

Verdiepingen staan als tekst in `src/core/data/floors.ts`:

```
#  muur      .  vloer     S  start (trap omhoog)
>  trap      T  kist      ~  bron      B  eindbaas
```

De tests controleren automatisch dat elke kaart klopt: alles bereikbaar, randen dicht, en een trap of eindbaas aanwezig.

## Controles

```bash
npm run typecheck
npm test           # logica + balans (een computer-speler speelt het spel uit op 20 seeds)
npm run build      # productieversie in dist/
```
