# Ygdrassil: het verhaal (canon)

Het grote verhaal is van **Thijs**. Dit document legt vast wat hij leverde, hoe het in de game zit, en welke draden
nog open liggen. De scènes zelf staan in `src/core/data/story.ts`.

## 1. Wat Thijs leverde

- Voor Midgard was er alleen **Ginnungagap**: de oerleegte tussen Niflheim (ijs) en Muspelheim (vuur). Ginnungagap
  maakte handel tussen de andere acht werelden mogelijk.
- Uit kou en hitte ontstond **Ymir**. Dat bracht oorlog tussen de werelden: Asgard wilde niet dat de reuzen van
  Jotunheim en Hel (Loki's verstoten dochter) handel dreven. Zo ontstond strijd om Ginnungagap.
- Odin, Vili en Vé doodden Ymir. Uit zijn lichaam maakten ze de wereld: vlees werd aarde, bloed de zeeën, botten de
  bergen.
- De andere volken hielden van Ymir en wilden oorlog tegen Asgard. Heimdall zag het aankomen, en de goden spraken een
  spreuk uit waardoor niemand Asgard meer kan bereiken.
- Daarom vallen de woedende werelden Midgard aan. De mensen begrijpen niet waarom.
- Een deel van de mensheid sloot een pact met de andere werelden: als zij een doorgang naar Asgard maken, laten de
  werelden Midgard met rust.
- De avonturiers zijn een speciaal samengestelde groep met uitzonderlijke kracht, kennis en magie, gevormd om Midgard
  te redden. Vinden ze de doorgang, en wat vindt Asgard van hun "verraad"?
- Mogelijke lijn: eerst zoeken naar de doorgang; daarna probeert iemand van Asgard hen te manipuleren.
- Drie mogelijke uitkomsten:
  1. aansluiten bij Asgard en de andere werelden vernietigen;
  2. aansluiten bij de andere werelden en Asgard vernietigen;
  3. een weg vinden waarbij niets vernietigd wordt.
- Er is geen einde: de dungeon wordt steeds uitgebreid.

## 2. Hoe het in de game zit

| Spelonderdeel | In het verhaal |
|---|---|
| Lindholm | De laatste stad voor de diepte. Hier werd het **Pact of the Gap** gesloten. |
| De Grote Boom en de Rootdeep | De wortels van de Grote Boom lopen door Ymirs lichaam omlaag naar waar Ginnungagap was. Als er nog een weg naar Asgard bestaat, ligt die daar. |
| Hoofdstuk I (bos, 1–5) | Ymirs haar (de bossen) en vlees (de aarde). Vanuit Niflheim kruipt ijs omhoog, vanuit Muspelheim hitte. |
| Hoofdstuk II (zee, 6–10) | Ymirs bloed: de zee onder de wereld. |
| Latere hoofdstukken (voorstel) | III: Ymirs botten (bergen, grotten). Daarna bijvoorbeeld zijn schedel en hersenen (hemel, wolken), en uiteindelijk Ginnungagap zelf. |
| De avonturiers | **Wayfinders**: gezworen op het Pact in de Oath Hall. |
| Oath Tokens | Botsplinters van Ymir. De werelden erkennen geen eed die niet op een stukje van hem gezworen is. |
| Prowlers | Beesten die van Ymirs vlees vraten; in hun hart zit een splinter van hem (daarom laten ze een Oath Token achter). |
| Monsters keren terug | Ymirs lichaam droomt nog: wat erin sterft, groeit terug. |
| Zelf de kaart tekenen | Voor het Pact mocht niemand naar beneden; de Rootdeep is nooit in kaart gebracht. |
| Altijd terug naar de stad | De wortels van de Grote Boom leiden altijd naar huis. |
| Hornstone en expedities | Elke stad die het Pact zwoer heeft een Hornstone; zo komen Wayfinders uit andere hallen samen. |
| Bazen | Sommige zijn **wards**: sloten van de spreuk van de goden. In hun hart zit een gouden rune. |

### Personages

- **Sigrid**, Warden of Lindholm: tekende het Pact. Pragmatisch, en ze heeft iets verzwegen (Hallvard).
- **Hrodna**, Envoy of the Frost Court: ijsreuzin uit Jotunheim, spreekt namens alle werelden die tekenden. Koel,
  eerlijk op haar manier, ongeduldig.
- **Eira the Wanderer**: zwerfster met een lantaarn die niet flakkert. Ze eet nooit en weet dingen die niemand kan
  weten. In werkelijkheid is ze **de manipulator van Asgard**. Dat is nog niet onthuld; de speler krijgt alleen hints.
- **Brynja** (Oath Hall) vertelt wat Oath Tokens echt zijn. **Broeder Aske** is de sceptische stem.
- **Jarl Hallvard**: leidde honderd winters geleden het eerste Pact. Hij vond de weg, maar werd tegengehouden door
  "iemand die glimlachte" (Eira). Hij werd de Drowned Jarl.

### Geheimen (wat de speler nu weet, en wat nog komt)

1. **Lindholm is niet de eerste.** Er was een eerder pact, met Hallvards vloot. Onthuld in hoofdstuk II.
2. **De gouden runen.** Het rot (de Blighted Elder) en de Hafgufa droegen een gouden rune: het zijn wards van de goden.
   Na de Hafgufa klinkt een hoorn in Asgard: Asgard weet nu dat er iemand komt.
3. **Wie stuurde de Rootgnawer?** Hrodna zegt Asgard, Eira zegt Hel. Dat staat nog open; Thijs mag het beslissen.
4. **Wie is Eira?** Er zijn hints: de lantaarn, de veer, ze eet nooit, en "een vrouw met een lantaarn wacht daar" in
   Hallvards logboek. De onthulling is gepland voor hoofdstuk III of later.
5. **Het rot.** Was het van Asgard (om de weg te blokkeren) of van de werelden (om Lindholm wanhopig genoeg te maken
   voor het Pact)? Dit staat nog open.

### Keuzes (de drie wegen)

Op drie momenten kiest de speler. Dat wordt opgeslagen (`state.choices`) en telt op richting **asgard**, **realms**
of **midgard** (de derde weg):

| Moment | Hrodna (werelden) | Eira (Asgard) | Midgard zelf |
|---|---|---|---|
| Na de Blighted Elder: de gouden rune | aan Hrodna | aan Eira | in de Oath Hall |
| Na de Drowned Jarl: Hallvards logboek | aan Hrodna | Eira verbrandt het | zelf lezen (je leert over de lantaarn) |
| Na de Hafgufa: scherf van de ward | aan Hrodna | aan Eira ("iemand zal blij zijn hem terug te zien") | verborgen in Lindholm |

Na de eerste keuze volgt in hoofdstuk II een korte scène die erop reageert. Latere hoofdstukken moeten er ook op
reageren. Uiteindelijk kunnen de drie uitkomsten van Thijs hier vandaan vertakken.

## 3. Wat nog van Thijs nodig is (voor hoofdstuk III en verder)

1. **Hoofdstuk III**: het thema (voorstel: Ymirs botten, de bergen en de oude reuzenwegen), de baas, en wat daar
   onthuld wordt.
2. **Wanneer en hoe Eira ontmaskerd wordt**, en wie ze echt is: een godin, een dienares van Heimdall, of iets anders.
3. **Wie stuurde de Rootgnawer en het rot?** Asgard, Hel, of allebei.
4. **Hoeveel wards er zijn**, en of elk hoofdstuk er één breekt.
5. **De drie eindes**: wat gebeurt er bij elke weg, en vanaf welk hoofdstuk splitst het verhaal echt?
6. Of **Hel en Jotunheim** zelf een stem krijgen (een tweede gezant naast Hrodna?), en of **Loki** een rol speelt.
7. Correcties: alles in sectie 2 is een voorstel. Wat niet klopt met zijn visie, pas ik aan.
