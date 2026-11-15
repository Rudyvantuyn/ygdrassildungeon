/**
 * The changelog on the website: every change a player can notice, big and small, newest first. The devlog tells
 * the story of a release; this is the plain list. Add a line here with every player-visible change (no spoilers:
 * secret classes, hidden deeds and story turns stay vague).
 */
export interface ChangeDay {
  date: string;
  changes: string[];
}

export const CHANGES: ChangeDay[] = [
  {
    date: '2026-11-15',
    changes: [
      'New: chapter V, Ginnungagap (floors 21–25): below the skull, the gap of ice and fire the world was built over.',
      'New: ten creatures, two prowlers and two guardians in chapter V, each with its own lines in the bestiary.',
      'New: chapter V gear, materials and gathering finds, four new requests, two fragments and five more deeds.',
      'New: chapter IV, the Dreaming Skull (floors 16–20): the inside of the sky, where Ymir\'s brains drift as clouds and still dream.',
      'New: ten creatures, two prowlers and two guardians in chapter IV, each with its own lines in the bestiary.',
      'New: chapter IV gear, materials and gathering finds, four new requests, two fragments and five more deeds.',
      'Changed: the "to be continued" moment now comes at the end of the newest chapter, not after chapter II.',
      'New: a party is now five strong, with at most three in a row (front or back, as you like).',
      'New: five adventurers swear the oath for free when you found your party. Older saves can add a fifth from the Oath Hall.',
      'New: expeditions take up to five players.',
      'New: an experience bar under every adventurer, filling up toward the next level once a fight is won.',
      'Changed: a fallen party is no longer the end. The roots carry it home to Lindholm, but the deep keeps half your gold, items and materials (gear and Oath Tokens are kept).',
      'New: a deed for the first time the roots carry you home.',
      'Fixed: signing in with Google sometimes only worked the second time.',
      'Site: a Memories page for signed-in players, where gathered memory shards are kept, story by story.',
      'New: every creature has a few lines of its own in the bestiary, in the game and on the site.',
      'New: the byname an adventurer bears shows under their name in the party bar, also for the others on an expedition.',
      'New: seven more bynames for the long road, and five more deeds, among them one per chapter for finding every weakness.',
      'New: memory shards in the game: a golden moment when one turns up, and a Memories page in the Journal with every shard in its place.',
      'New: a seventh place in Lindholm, for those who go deep enough.',
      'Site: click a creature you have met in the bestiary to read about it, with the weaknesses you found and, once defeated, its numbers.',
      'Changed: monsters, prowlers and guardians are stronger, to match a party of five. Raven Run scouts meet them as before.',
    ],
  },
  {
    date: '2026-11-14',
    changes: [
      'New: the Wyrdweave, three floors a day with a rule each, the same for every Wayfinder. Opens after the Blighted Elder.',
      'New: Wyrd Threads, and Wyrd gear from Hilde that takes weeks to earn.',
      'New: sagas. Every fight is told, and deeds earn adventurers bynames. Choose one in the Party menu or at the Oath Hall.',
      'New: fourteen more deeds in the Book of Deeds, over fifty in all.',
      'New: fragments in a few chests and with the guardians, readable again in the Journal.',
      'New: secret classes, each found by doing something particular.',
      'New: Raven Runs. Adventurers in the Oath Hall go scouting for real hours and bring back parts.',
      'New: runestones and shades, traces that other Wayfinders leave in the Rootdeep.',
      'New: every class has 8 looks (4 men, 4 women), chosen when the oath is sworn.',
      'Changed: Raven Runs bring home three of every four parts instead of half.',
      'Changed: each floor has its own colour and wall decor, so floors look less alike.',
      'Changed: the map has a mark for each kind of gathering spot, and the full map fits its window.',
      'Changed: walking glides (turning pans, stepping moves); Settings, Walking, Quick brings back the old cut.',
      'Changed: back-row adventurers sit a little lower in the party bar, and the maps can zoom.',
      'Changed: saving from the menu shows a confirmation, and the menu has Quit to homepage.',
      'Fixed: expeditions no longer freeze after gathering or drinking from a spring.',
      'Site: the game has a home at ygdrassilgame.com, with the world, classes, bestiary and devlog.',
      'Site: sign in with Google, and see your party, medals and sagas on My Wayfinder.',
      'Site: chapters, people, fragments and creatures open up as you reach and meet them.',
      'Site: this changelog.',
      'Fixed: on expeditions the Norn-Spun Mantle saved its wearer every round instead of once a fight.',
      'Fixed: Lick Wounds did nothing when chosen in a fight, and outside fights it could be used on others.',
      'Fixed: a foe felled by poison now counts in the saga of whoever poisoned it, guardians and prowlers too.',
      'Fixed: deeds count what happens in the Wyrdweave, and on floors joined by numbered stairs.',
      'Fixed: older saves keep credit for guardians beaten before the bestiary, fragments and sagas existed.',
      'Fixed: chests on expeditions no longer give Oath Tokens (they give gold instead).',
      'Fixed: Gate-Opener and Root Walker were the same deed. Gate-Opener is now for your first root gate.',
      'Fixed: only expeditions with other Wayfinders count toward the Hornstone deeds.',
      'Fixed: crashes on older browsers, and when the sound device changes while playing.',
      'Changed: in the Wyrdweave, The Hunt sends no prowler after a party that has not yet reached floor 5.',
      'Changed: adventurers in Wyrd gear can join expeditions from level 10.',
      'Changed: tips that come up in town show in town, not on the next descent.',
    ],
  },
  {
    date: '2026-11-13',
    changes: [
      'New: chapter III, the Marrowdeep (floors 11–15), drawn as one whole with stairs between floors and root gates that open shortcuts.',
      'New: a bestiary in the game.',
      'New: element icons, a RESIST mark when a foe shrugs off an element, and more elemental skills.',
      'New: the Wayfinders\' Stone, a name field and playing time.',
      'New: draw on the small map while you walk.',
      'New: a calm dungeon look (Settings, Dungeon look).',
      'Changed: the automatic map only shows what your party has seen.',
      'Changed: pixel-art monsters, and windows in one pixel style with one font.',
      'Changed: stairs and dungeon props are built from the floor\'s own stone.',
      'Changed: a balance pass and a round of fixes from a player\'s report.',
    ],
  },
  {
    date: '2026-11-10',
    changes: [
      'Changed: one menu with four tabs (Party, Bag, Journal, Options) instead of three, and fewer buttons on screen.',
      'Changed: calmer blue-slate colours.',
      'Changed: no more flashing. Encounters darken smoothly and hit enemies dim once.',
      'Changed: the action button only shows when there is something to do, above the message bar.',
      'Changed: gathering is only offered when someone in the party has the skill.',
      'New: an option to side-step with A and D, and the map drawing mode in Settings.',
    ],
  },
  {
    date: '2026-11-09',
    changes: [
      'Changed: Lindholm\'s places and the dungeon walls are made from real photographs, turned into pixel art.',
      'Changed: new map icons.',
      'New: a credits page for everyone whose work is in the game.',
    ],
  },
  {
    date: '2026-11-08',
    changes: [
      'New: private expeditions with a password. A leader who goes quiet hands on the lead.',
      'New: Settings and Feedback on the title screen.',
      'Changed: How to Play reads well on phones; touch Back, and tap to speed up fights.',
    ],
  },
  {
    date: '2026-10-31',
    changes: [
      'Changed: faster corridors and fights, and a lighter first load.',
      'Changed: Oath Tokens are not found on expeditions.',
      'Fixed: a round of fixes from a full test of town, dungeon and fights.',
    ],
  },
  {
    date: '2026-10-30',
    changes: [
      'New: chapter II, the Drowned Roots (floors 6–10).',
      'New: skill points and a skill tree for each class, with ranks 1–10.',
      'New: four classes: Skald, Berserker, Seeress and Wolfkin.',
      'New: gathering. Forage, mine, fell and fish at spots in the dungeon.',
      'New: found your own party. Later adventurers cost gold and an Oath Token.',
      'New: the story of the Pact of the Gap, written by Thijs.',
      'New: tips from the townsfolk the first time something comes up, all in the Guidebook.',
      'New: settings, battle speed, auto-battle, and a Feedback button.',
      'New: phones: swipe to walk, larger buttons, full screen.',
      'Changed: Lindholm is a row of places to tap.',
      'Changed: descents start at a chapter\'s first floor. No difficulty setting: everyone plays by the same rules.',
      'New: a privacy and terms page.',
    ],
  },
  {
    date: '2026-10-29',
    changes: [
      'The first playable Ygdrassil: Lindholm with its inn and shop, the Oath Hall, floors 1–5 with a guardian at the end.',
      'New: draw your own map, square by square.',
      'New: prowlers, strong monsters that roam the map from floor 5 on.',
      'New: story, requests, materials, ailments, music and sound.',
      'New: expeditions: go down with other players, each bringing one adventurer. Accounts and cloud saves.',
    ],
  },
];
