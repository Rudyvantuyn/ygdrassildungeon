# Steam-pagina (voorbereiding)

Teksten en afspraken voor de Steam-storepagina van Ygdrassil. De storeteksten zijn Engels (zoals de game); de notities
eromheen Nederlands. Screenshots maak je met de game zelf op 1920×1080 (zie onderaan).

## Stappen (voor de eigenaar)

1. Steamworks-account: partner.steamgames.com, *Join the Steamworks program*. Gegevens, bank, belastingformulier
   (W-8BEN voor een particulier in Nederland), identiteitscontrole.
2. Steam Direct-fee: $100 per game (terug na $1.000 omzet). Daarna minstens 30 dagen tot een release mag.
3. App aanmaken, storepagina invullen (teksten hieronder), plaatjes uploaden, laten keuren (een paar dagen).
4. Pagina als **Coming soon** publiceren: vanaf dan kunnen mensen hem op hun wishlist zetten. Een coming-soon-pagina
   moet minstens twee weken zichtbaar zijn vóór de release.
5. Bij het indienen vraagt Steam naar **AI-gegenereerde content**. Eerlijk invullen (zie hieronder).

## Wat er technisch nog nodig is voor Steam

- Steam verkoopt een **downloadbare game**, geen website. De browserversie moet in een desktop-schil (bijvoorbeeld
  Electron of Tauri) voor Windows (en liefst macOS/Linux/Steam Deck). Dat is een apart stuk werk vóór versie 1.0.
- Saves: in de desktopversie lokaal op schijf, met Steam Cloud of het eigen account als back-up.
- Achievements: de Book of Deeds past daar precies op (elke deed een Steam-achievement).

## Korte beschrijving (max. 300 tekens)

> A first-person dungeon crawler in the roots of the Great Tree. Draw your own map square by square, lead a party of
> five through turn-based fights, and go deeper into the body of Ymir, the giant the world was built from.

## Lange beschrijving

> **The road to Asgard runs through Ymir.**
>
> Midgard was built from the body of a slain giant, and the realms have never forgiven the gods for it. Their anger
> falls on Midgard. In Lindholm, the last town before the deep, people made a pact: find a way to the sealed gate of
> Asgard, and the realms will leave Midgard in peace. Those who go down are the Wayfinders.
>
> **Explore and map.** Walk the Rootdeep square by square in first person and draw your own map: walls, doors,
> chests, springs and the things you would rather not meet again. Or let the map draw itself, if you prefer.
>
> **Five adventurers, your way.** Swear in your party at the Oath Hall from eight classes (and a few that only come
> to those who earn them). Three to a row at most: who holds the front, who works from behind? Every level brings a
> skill point for the class's skill tree; every skill has ten ranks.
>
> **Fights that ask for thought.** Turn-based battles where weaknesses matter, rows matter, and running is not always
> possible. Prowlers roam the deeper floors in plain sight: avoid them, or come back when you are ready.
>
> **A slow, honest grind.** Ygdrassil is meant to be challenging. Experience and gold come slowly; rushing ahead fails
> and steady training wins. When the whole party falls, the roots carry you home, but the deep keeps half of what you
> found on the way down.
>
> **More to find.**
> - Six chapters of the Rootdeep, from the Greenwood Roots down through the sea, the bones and the skull of Ymir and
>   Ginnungagap to Hvergelmir, where every river begins: 30 floors and 94 creatures, a guardian at the bottom of each.
> - The Wyrdweave: three new floors every day, the same for every player, each with a rule of its own.
> - Sagas: every fight is told, and your adventurers earn bynames. Bram Wolf-Feeder. Wren the Kind.
> - The Book of Deeds: over seventy hidden medals.
> - Raven Runs: send the adventurers waiting in the hall scouting while you are away.
> - Expeditions: sound the Hornstone and go down with up to four other players, each bringing one adventurer.
> - A story that remembers your choices: side with Asgard, with the realms, or find a third way for Midgard.
>
> No premium currency, no pay-to-win, no ads.

## Featurelijst (voor de "About"-sectie en de capsule)

- First-person grid exploration with hand-drawn mapping
- Party of five, eight classes plus secret classes, skill trees with ranks 1–10
- Turn-based combat with elemental weaknesses, rows and roaming prowlers
- Six chapters (30 floors, 94 creatures) and growing; a guardian at the end of every chapter
- Daily Wyrdweave run, the same for everyone
- Co-op expeditions for up to five players
- Sagas, bynames and over seventy hidden deeds
- Pixel art from human artists, places made from real photographs

## Tags (voorstel)

Dungeon Crawler, RPG, Turn-Based Combat, First-Person, Party-Based RPG, Grid-Based Movement, Pixel Graphics,
Mythology (Norse), Exploration, Difficult, Co-op, Fantasy, Retro, Singleplayer, Online Co-Op.

## AI-content (eerlijk invullen)

Volgens de huidige stand:
- **Niet AI:** monsters en avonturiers (CC0-pixelart uit Dungeon Crawl Stone Soup), plekken en dungeon-texturen
  (eigen gefilterde foto's, CC0/CC BY), icoontjes (game-icons.net), muziek en geluid (door de code zelf gemaakt),
  verhaal (Thijs).
- **Wel AI (pre-generated):** de portretten van de inwoners van Lindholm (Brynja, Sigrid, Gerd, …).
- **Code:** geschreven met hulp van een AI-codeerassistent (staat ook op de creditspagina).
Steam vraagt om "pre-generated" (vooraf gemaakt) en "live-generated" (tijdens het spelen) content; hier is alleen
pre-generated van toepassing (de portretten). Overweeg die portretten vóór de Steam-release te vervangen, omdat
spelers van het genre AI-art afwijzen.

## Screenshots en plaatjes (klaar, november 2026)

- **Screenshots** (1920×1080, zonder webbalk, playtest-bordje of onderschriften): titel, de eed met uiterlijk, Lindholm,
  het bos met de kaart, een gevecht, de zes hoofdstukken en Níðhöggr. Steam wil er minstens vijf. Echte voortgang
  uit je eigen save ziet er nog beter uit; vervang ze gerust later.
- **Capsules en bibliotheek**: `node scripts/steam-capsules.cjs <map>` tekent ze uit de eigen art van de game
  (CC0-wortelfoto door het pixelfilter, de CC0-sprites van de groep en Níðhöggr, de pixelfont):
  header 920×430, small 462×174, main 1232×706, vertical 748×896, library capsule 600×900, library header 920×430,
  library hero 3840×1240 (zonder tekst), library logo 1280×720 (doorzichtig), page background 1438×810.
  Controleer de maten in Steamworks voor je uploadt; Valve past ze soms aan.
- **Trailer**: de trailer van november 2026 (62 s, 1080p). Steam toont de eerste trailer bovenaan de pagina.

## Wishlists: van pagina naar fanbase

1. Zodra de pagina als *Coming soon* live staat: zet de link in `STEAM_URL` (`src/ui/links.ts`). Dan staat
   "Wishlist on Steam" vanzelf op de site (menu, voorpagina, voet), op het titelscherm en in het menu van de game.
2. Zet de link ook in Discord (#welcome en #announcements), op itch.io en onder elke Reddit-post.
3. **Steam Next Fest** (drie keer per jaar) is de grootste wishlist-motor voor kleine games. Daarvoor is een
   speelbare **demo op Steam** nodig, dus een desktopversie (zie hierboven). De browserversie mag gratis blijven.
4. Een vaste ritme helpt meer dan één grote post: elke grote update een devlog op de site, een *event* op de
   Steam-pagina (dat zien mensen met de game op hun wishlist) en een bericht in Discord.

## Later: een app voor iOS en Android (idee, november 2026)

Pas na Steam 1.0. Meer dan de helft van de bezoekers van /play zit op een telefoon (vooral via de Reddit-app), maar
kopers van dit genre zitten vooral op Steam; de app is de tweede stap.

- Dezelfde code als app via Capacitor; geen tweede spel. Apple Developer $99 per jaar, Google Play eenmalig $25.
- Model: gratis downloaden met hoofdstuk I, één keer betalen (bijv. €7,99) voor de rest. Past bij "één keer betalen,
  nooit pay-to-win"; de browserversie blijft de demo.
- Apple houdt 15% (kleine ontwikkelaars) tot 30% in. Wie in de app met Google laat inloggen, moet ook "Sign in with
  Apple" bieden. Cosmetica in de app gaan via Apples eigen aankopen.
- Liggend spelen blijft de bedoeling (de eigenaar wil geen staande versie).
