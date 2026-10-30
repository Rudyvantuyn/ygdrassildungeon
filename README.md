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

### Geschilderde wereld (mijlpaal 6)

- **Lindholm** is geschilderd: het stadsbeeld toont de plek die je in het menu kiest (herberg, Oath Hall, winkel,
  prikbord, Rootdeep, Hornstone), met een zachte overgang. Het titelscherm heeft eigen art.
- **De Rootdeep** is geschilderd: muren, vloeren en plafonds hebben geschilderde texturen per thema (bos, winterbos,
  brandende wortels), met mist in de diepte en het licht van je fakkels. Thema per verdieping: `palette.textures` in
  `src/core/data/floors.ts`; texturen maak je naadloos met `scripts/make-tiles.py`.
- **Personages** hebben portretten: Gerd, Brynja, Hilde en Ketil staan bij hun venster; opdrachtgevers bij hun
  opdracht; Sigrid in de verhaalscènes. Je eigen avonturiers krijgen een geschilderd portret per klasse (twee
  varianten, gekozen op naam).

- Alle 21 vijanden, prowlers en eindbazen zijn nu geschilderde AI-illustraties in één stijl (in plaats van getekende
  vormen). Ze ademen licht, en de prowlers in de gangen gebruiken hun silhouet.
- Herkomst en prompts staan in `art/SOURCES.md`; `scripts/process-art.py` knipt de achtergrond weg en maakt er
  WebP-sprites van (`public/art/monsters/`). Zolang een plaatje laadt, tekent het spel de oude vorm.

### Samen spelen (mijlpaal 5)

- **Hornstone** (in Lindholm): log in met e-mail of als gast, en ga met andere spelers op **expeditie**. Elke speler
  neemt één eigen avonturier mee; samen vormen jullie een party van maximaal 4. De host leidt in de gangen, in
  gevechten kiest iedereen het commando voor de eigen avonturier (40 seconden, daarna handelt die zelf).
- **Sound the Horn** start een expeditie met een code van vier letters; **Answer a Horn** of **Join by code** om mee
  te doen. De host kan lege plekken opvullen met eigen avonturiers.
- Na afloop brengt iedereen zijn deel mee naar huis: XP en levels, een gelijk deel van het goud en de materialen.
  Valt de party, dan blijft de XP maar is de buit weg. Wie tussentijds vertrekt, haalt zijn deel later op bij de Hornstone.
- **Cloud-save**: zet je spel online (Account in de Hornstone) en speel verder op een ander apparaat.
- De server (Supabase Edge Function, `server/expedition.ts`) draait dezelfde spelregels (`src/core/expedition.ts`)
  en beslist alles; spelers kunnen alleen acties sturen. Avonturiers worden gecontroleerd bij het meedoen.

### Verhaal, quests en materialen (mijlpaal 4)

- **Verhaal**: Sigrid, de hoedster van Lindholm, vertelt waarom de Grote Boom ziek is. Scènes bij de start, bij je eerste
  afdaling, na de Blighted Elder, op Wyrmroot V en na de Rootgnawer, met een epiloog en een aftiteling.
- **Notice Board**: twaalf opdrachten van de inwoners (vijanden verslaan, materialen brengen, dieper gaan, bazen verslaan).
  Nieuwe opdrachten verschijnen naarmate je dieper komt.
- **Materialen**: elke vijand laat onderdelen achter. Verkoop ze in de winkel; wie genoeg van één soort verkoopt,
  ontgrendelt speciale uitrusting (★ in de winkel).
- **Statuseffecten**: gif (schade per ronde), slaap (beurt overslaan, wakker bij een treffer) en verlamming (kans om een
  beurt te missen). Genezen met de Mender-skill Cleanse of het item Clearwater. Eindbazen slapen nooit.
- **Portretten**: elke avonturier krijgt een eigen getekend gezicht, afhankelijk van naam en klasse.
- **Help-scherm** (H, of How to Play op het titelscherm).

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

### Geluid en muziek (mijlpaal 3)

- Alle muziek en geluidseffecten worden in code gemaakt (Web Audio), er zijn geen geluidsbestanden.
- Elke situatie heeft een eigen, procedureel gecomponeerd muziekthema: titel, stad, elke verdieping, gevecht,
  Prowler-gevecht en eindbaas. Thema's vloeien in elkaar over.
- Effecten voor lopen, draaien, muren, menu's, kisten, trappen, bronnen, treffers per element, genezen, opwekken,
  overwinning, nederlaag en level-up.
- Volume voor muziek en effecten apart: menu **Sound** in de stad of in het Pack-menu.

## Woordenlijst

Alle namen in het spel zijn eigen verzinsels. Nieuwe namen voeg je toe in `src/core/data/` en hier.
Gebruik nooit namen of termen uit Etrian Odyssey of andere games (zie `CLAUDE.md`).

| Onderwerp | Namen |
|---|---|
| Wereld | De stad **Lindholm**, de dungeon **de Rootdeep** onder **de Grote Boom** (Great Tree) |
| Verdiepingen | Mossy Hollow I, Rootway II, Heartwood III, Rimewood IV, Wyrmroot V |
| Stad | The Sleeping Stag (herberg), Hilde's Supplies (winkel), Oath Hall (avonturiers aanmelden en party samenstellen) |
| Personages | Sigrid (hoedster van Lindholm), Gerd (herbergierster van The Sleeping Stag), Brynja (meesteres van de Oath Hall), Ketil (hoornwachter van de Hornstone), Hjalmar (molenaar), Hilde (winkel), Ylva (herderin), broeder Aske (genezer), Torvald (houtsnijder) |
| Party | Bram, Sela, Wren, Orrin |
| Klassen | Bastion (schild), Strider (boog), Mender (genezer), Runecaller (elementmagie) |
| Statistieken | HP, **SP** (Spirit), ATK, DEF, MAG, RES, SPD |
| Elementen | fysiek, vuur (fire), vorst (frost), storm |
| Skills | Challenge, Bulwark Bash, Iron Formation, Twin Fang, Venom Arrow, Scatter Volley, Mend, Cleanse, Verdant Chorus, Rekindle, Ember/Frost/Storm Rune, Wildfire, Slumber Rune |
| Statuseffecten | Poison, Sleep, Paralysis |
| Items | Sap Tonic (HP), Spirit Dew (SP), Clearwater (statuseffecten), Kindling Moss (opwekken), Homing Feather (terug naar de stad) |
| Uitrusting | Copper Edge, Ashwood Bow, Oaken Rod, Hide Jerkin, Ironbark Blade, Yew Longbow, Cinder Rod, Ringmail, Mosswove Robe, Oath Edge, Galestring Bow, Starfall Rod, Bulwark Plate, Spiritweave Robe, Runehewn Axe, Hrimstring Bow, Frostbirch Rod, Scalehide Mail, Rimeweave Robe, Wyrmtooth Blade, Embersong Bow, Ashroot Rod, Emberscale Plate, Starveil Robe |
| Vijanden | Bogling, Duskwing, Briar Gnawer, Hollow Hound, Puffcap, Shellbark, Gloam Moth, Root Colossus, Hrimwolf, Frostcap, Rimeshell, Snowveil Moth, Cinderwing, Emberling, Rootfiend, Ashen Colossus; bazen **The Blighted Elder** en **The Rootgnawer** |
| Prowlers | Sterke monsters die zichtbaar over de kaart lopen: Grimtusk, Fenwraith, Root Draugr |
| Materialen | Bog Jelly, Dusk Membrane, Briar Quill, Hollow Fang, Puffcap Spores, Bark Shell, Gloam Scale, Heartwood Knot, Rime Pelt, Frost Gill, Ice Carapace, Snowveil Wing, Cinder Feather, Ember Core, Fiend Root, Ash Slab, Grim Tusk, Wraith Silk, Draugr Bone, Blighted Heartwood, Gnawer Fang |
| Speciale uitrusting | Briarthorn Spear, Duskweave Cloak, Barkshell Mail, Gloamscale Robe, Heartknot Staff, Elderheart Mail, Rimefang Blade, Snowveil Bow, Embercore Rod, Grimtusk Cleaver, Draugrbone Bow, Wraithsilk Robe |
| Samen spelen | **Hornstone** (ontmoetingssteen), expeditie, Sound the Horn, Answer a Horn, gathering (lobby), share (je deel van de buit) |
| Menu's | Pack (rugzak-menu in de dungeon), Map (kaarteditor), Notice Board (quests), System, Danger-bol |

## Projectstructuur

```
src/
  core/         Spellogica zonder scherm (volledig getest)
    data/       Klassen, skills, items, vijanden en verdiepingen: hier pas je de balans en kaarten aan
    combat.ts   Gevechtssysteem
    game.ts     Spelstatus: stad/dungeon, bewegen, vijanden, kisten, trappen, opslaan
    town.ts     Herberg en winkel
    expedition.ts Spelregels van expedities met meerdere spelers (draait op de server)
    tactics.ts  Hoe de computer commando's kiest (autoplay en afwezige spelers)
    autoplay.ts Computer-speler die het spel uitspeelt (gebruikt voor balanstests)
  render/       Canvas-tekenwerk: gang, monsters (sprites + reservevormen), minikaart, stad
public/art/     Geschilderde sprites (herkomst: art/SOURCES.md)
  audio/        Muziek (compose.ts: componeert de loops, getest) en geluid (audio.ts: Web Audio)
  net/          Online: accounts, cloud-save, expedities (Supabase)
  ui/           Schermen, menu's, gevechtsweergave, Hornstone en expedities
server/
  expedition.ts De expeditie-server (Supabase Edge Function); `npm run build` bundelt hem in dist/server/
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
