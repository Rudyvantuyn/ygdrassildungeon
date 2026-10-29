# Ygdrassil Dungeon

Een first-person dungeon crawler met de gameplay van klassieke grid-crawlers (zoals Etrian Odyssey),
maar met een eigen wereld, eigen namen en eigen ontwerp. Gebouwd als webgame in TypeScript.
Alles (gangen, monsters, stad, interface) wordt in code getekend, dus er zijn geen losse afbeeldingen nodig.

Online spelen: **https://ygdrassil-dungeon.vercel.app**

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
| Enter / Spatie | iets openen wat voor je staat, zoals een kist (knop Act) | bevestigen (tijdens een ronde: versnellen) |
| Esc | rugzak-menu (Pack) | terug |
| C / M | rugzak-menu / kaarteditor | |

De knoppen rechts op het scherm werken ook met muis of touch.

## Wat zit erin

### De stad Lindholm (mijlpaal 2)

- **Oath Hall**: meld nieuwe avonturiers aan (eigen naam, klasse naar keuze) en stel je party samen: maximaal 4 leden,
  volgorde en rij (voor/achter) kies je zelf, en tot 12 avonturiers in totaal. Reserveleden krijgen geen XP.
- **Herberg**: uitrusten voor goud. Herstelt HP en SP, wekt gevallen leden weer tot leven en slaat op.
- **Winkel**: items (Sap Tonic, Spirit Dew, Homing Feather) en **uitrusting** per klasse.
  Nieuwe wapens en harnassen verschijnen zodra je een diepere verdieping hebt bereikt; je oude stuk ruil je in voor de halve prijs.
- **Rootdeep**: daal af in de dungeon, op elke verdieping die je al hebt bereikt.
- Terug naar de stad via de **trap omhoog** op de eerste verdieping, of overal met een **Homing Feather** (rugzak-menu).
  Bronnen vullen zich weer bij als je in de stad bent geweest.

### De dungeon (mijlpaal 1)

- **Verkennen** op een grid in first-person.
- **Zelf de kaart tekenen** (toets M of de knop Map): vloer, muren, gum, symbolen (trap omlaag/omhoog, kist, bron,
  gevaar) en notities met tekst per vakje. Tekenen met muis, touch (slepen) of toetsenbord.
  Drie kaartmodi: *Assisted* (standaard: je stappen worden ingekleurd, de rest teken je), *Manual* en *Auto*.
- **Willekeurige gevechten**: de "Danger"-bol kleurt van blauw via geel naar rood naarmate het volgende gevecht dichterbij komt.
- **Beurtgevechten** met een party van 4 (Bastion, Strider, Mender, Runecaller): aanvallen, skills (kosten SP), verdedigen, items, vluchten.
  Voorste en achterste rij, zwaktes en resistenties (vuur/vorst/storm), kritieke treffers, Challenge en Iron Formation.
- **Ervaring en levels**: nieuwe skills op level 3, 4 en 6.
- **Opwekken in de dungeon**: met Kindling Moss (winkel) of de Mender-skill Rekindle (level 6).
- **Prowlers** (vanaf verdieping 5): sterke monsters die je ziet in de gang en op de
  kaart (◆). Ze zetten één stap per stap die jij zet. Patrouilleurs lopen een vaste route, jagers komen op je af als je
  te dichtbij komt (rood). Je moet ze ontwijken of eerst trainen: pas rond level 10 heb je een kleine kans.
  Vluchten lukt in 30% van de gevallen; daarna is de Prowler een paar stappen verdoofd.
  Verslagen Prowlers komen terug als je in de stad bent geweest.
- **5 verdiepingen** met kisten (je loopt er niet doorheen: ga ervoor staan en open ze met Act) en per verdieping een genezende
  bron (eenmalig, slaat ook op). Op verdieping 3 bewaakt **The Blighted Elder** de trap naar beneden; op verdieping 5 wacht de
  laatste baas, **The Rootgnawer**.
- **Opslaan** in de browser: in de stad (herberg of menu), en automatisch bij elke trap en bij de bron.
  In de dungeon kun je niet zomaar opslaan: wie valt, begint weer bij de laatste save.

## Woordenlijst

Alle namen in het spel zijn eigen verzinsels. Nieuwe namen voeg je toe in `src/core/data/` en hier.
Gebruik nooit namen of termen uit Etrian Odyssey of andere games (zie `CLAUDE.md`).

| Onderwerp | Namen |
|---|---|
| Wereld | De stad **Lindholm**, de dungeon **de Rootdeep** onder **de Grote Boom** (Great Tree) |
| Verdiepingen | Mossy Hollow I, Rootway II, Heartwood III, Rimehollow IV, Wyrmroot V |
| Stad | The Sleeping Stag (herberg), Hilde's Supplies (winkel), Oath Hall (avonturiers aanmelden en party samenstellen) |
| Party | Bram, Sela, Wren, Orrin |
| Klassen | Bastion (schild), Strider (boog), Mender (genezer), Runecaller (elementmagie) |
| Statistieken | HP, **SP** (Spirit), ATK, DEF, MAG, RES, SPD |
| Elementen | fysiek, vuur (fire), vorst (frost), storm |
| Skills | Challenge, Bulwark Bash, Iron Formation, Twin Fang, Scatter Volley, Mend, Verdant Chorus, Rekindle, Ember/Frost/Storm Rune, Wildfire |
| Items | Sap Tonic (HP), Spirit Dew (SP), Kindling Moss (opwekken), Homing Feather (terug naar de stad) |
| Uitrusting | Copper Edge, Ashwood Bow, Oaken Rod, Hide Jerkin, Ironbark Blade, Yew Longbow, Cinder Rod, Ringmail, Mosswove Robe, Oath Edge, Galestring Bow, Starfall Rod, Bulwark Plate, Spiritweave Robe, Runehewn Axe, Hrimstring Bow, Frostbirch Rod, Scalehide Mail, Rimeweave Robe, Wyrmtooth Blade, Embersong Bow, Ashroot Rod, Emberscale Plate, Starveil Robe |
| Vijanden | Bogling, Duskwing, Briar Gnawer, Hollow Hound, Puffcap, Shellbark, Gloam Moth, Root Colossus, Hrimwolf, Frostcap, Rimeshell, Snowveil Moth, Cinderwing, Emberling, Rootfiend, Ashen Colossus; bazen **The Blighted Elder** en **The Rootgnawer** |
| Prowlers | Sterke monsters die zichtbaar over de kaart lopen: Grimtusk, Fenwraith, Root Draugr |
| Menu's | Pack (rugzak-menu in de dungeon), Map (kaarteditor), Danger-bol |

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
