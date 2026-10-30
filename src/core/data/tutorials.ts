/**
 * Tips that explain the game the first time something comes up, told by the people of Lindholm.
 * Every tip can be read again in the Guidebook. Keep pages short: one or two sentences each.
 */
import type { NpcId } from '../../render/portraits';

export interface TipDef {
  id: string;
  title: string;
  speaker: NpcId;
  pages: string[];
}

export const TIPS: TipDef[] = [
  {
    id: 'town',
    title: 'Lindholm',
    speaker: 'sigrid',
    pages: [
      'This is Lindholm. Everything you need before a descent is here.',
      'Rest at the Sleeping Stag to heal. Hilde\'s shop sells supplies and gear. The notice board has paid requests.',
      'The Oath Hall is where Wayfinders swear the Pact and parties are formed. The Rootdeep entrance is past the well.',
      'Explorers who rush in die. Explorers who come back, a little stronger each time, reach the bottom.',
    ],
  },
  {
    id: 'firstStep',
    title: 'Into the Rootdeep',
    speaker: 'sigrid',
    pages: [
      'Move with the arrow keys or the buttons. On a phone you can also swipe the view: up to walk, sideways to turn.',
      'The danger orb grows brighter as you walk. When it burns, a fight is close.',
      'The roots of the Great Tree always lead home: the stairs up take you back toward Lindholm. Turning back in time is no shame.',
      'But every descent starts at the beginning of a chapter. Only when its guardian falls can you begin from the next one.',
      'Use Act to open chests, drink from springs and gather. Pack holds your items, skills and options.',
    ],
  },
  {
    id: 'map',
    title: 'Drawing the map',
    speaker: 'ylva',
    pages: [
      'The Rootdeep has never been mapped: before the Pact, nobody was allowed down. The map in the corner fills in where you have walked.',
      'Open Map to draw walls, floor and marks yourself: chests, springs, danger, notes.',
      'Change the map mode there: draw everything yourself, let your steps be filled in, or let the map draw itself.',
    ],
  },
  {
    id: 'battle',
    title: 'Your first fight',
    speaker: 'brynja',
    pages: [
      'Choose a command for every adventurer, then the round plays out. Faster fighters act first.',
      'The front row takes most blows. The back row is safer, but weapons hit for half there, except bows.',
      'Skills cost SP. Every foe is weak to something: fire, frost or storm. A weakness hit does half again as much.',
      'Defend halves the damage you take this round. Fleeing works often against small fry, never against a boss.',
      'Repeat does last round again. Auto lets the party fight on its own; stop it with Esc or a tap. Battle speed is in Settings.',
    ],
  },
  {
    id: 'victory',
    title: 'Growing stronger',
    speaker: 'brynja',
    pages: [
      'Every fight gives experience. Levels come slowly; that is how the Rootdeep is. What dies in Ymir\'s body grows back, so there is always more to fight.',
      'Each level brings a skill point. A ✦ on a card means points are waiting to be spent.',
      'Monsters also leave materials. Sell them at Hilde\'s shop for gold.',
    ],
  },
  {
    id: 'skillPoints',
    title: 'Skill points',
    speaker: 'brynja',
    pages: [
      'Spend skill points in the Oath Hall (Skills) or down in the Rootdeep (Pack, then Skill tree).',
      'Every skill goes from rank 1 to 10 and gets stronger with each rank. Some need a level, or another skill first.',
      'Skills marked ◇ work on their own: they raise a stat for good.',
      'Choose with care: the Oath Hall can let an adventurer unlearn everything, but it costs gold.',
    ],
  },
  {
    id: 'chest',
    title: 'Chests',
    speaker: 'hilde',
    pages: ['A chest! Face it and press Act to open it. Each chest opens only once.'],
  },
  {
    id: 'spring',
    title: 'Healing springs',
    speaker: 'aske',
    pages: [
      'A healing spring. Drinking restores the whole party and saves your game.',
      'Each spring works once per descent. It fills again while you are back in town.',
    ],
  },
  {
    id: 'gather',
    title: 'Gathering',
    speaker: 'torvald',
    pages: [
      'Glowing signs on the floor are gathering spots: ✿ plants, ◆ ore, ♠ wood, ≈ fish.',
      'Someone in the party needs the matching skill: Forage, Mine, Fell or Fish. They are in every skill tree.',
      'Each spot gives two tries per descent. Higher ranks find more, and rarer things. The noise can draw monsters.',
    ],
  },
  {
    id: 'ailment',
    title: 'Ailments',
    speaker: 'aske',
    pages: [
      'Poison hurts every round. Sleep skips turns until you are hit. Paralysis makes you freeze now and then.',
      'Clearwater or the Mender\'s Cleanse washes them away. Ailments also wear off after a few rounds.',
    ],
  },
  {
    id: 'buffs',
    title: 'Buffs and curses',
    speaker: 'brynja',
    pages: [
      'Some skills raise or lower attack, defence, magic or resistance for a few rounds.',
      'You see them as ATK▲ or DEF▼ on the cards and under foes. Plus 20% attack means 20% more damage.',
    ],
  },
  {
    id: 'fallen',
    title: 'A fallen friend',
    speaker: 'aske',
    pages: [
      'An adventurer at 0 HP has fallen. They earn nothing until they are back on their feet.',
      'Kindling Moss or the Mender\'s Rekindle wakes them. A night at the inn heals everyone, fallen or not.',
      'If the whole party falls, the expedition is lost and you go back to your last save.',
    ],
  },
  {
    id: 'prowler',
    title: 'Prowlers',
    speaker: 'sigrid',
    pages: [
      'That shape in the dark is a prowler: a beast that gorged on Ymir\'s flesh and grew far stronger than anything around it.',
      'Do not fight one until you are much stronger. There is always a way around; some hunt you if you come close.',
      'Running from a prowler works only about one time in three.',
      'Those who do bring one down carry home an Oath Token, and the Oath Hall needs those.',
    ],
  },
  {
    id: 'boss',
    title: 'A guardian',
    speaker: 'sigrid',
    pages: [
      'That red sigil marks a guardian: something that rules this part of the Rootdeep.',
      'Rest first, fill your pack, and come at full strength. You cannot flee from a guardian.',
    ],
  },
  {
    id: 'inn',
    title: 'The Sleeping Stag',
    speaker: 'gerd',
    pages: [
      'A night here heals everyone and wakes the fallen. The price rises as your party grows stronger.',
      'Your game is saved whenever you rest, drink from a spring or take the stairs.',
    ],
  },
  {
    id: 'shop',
    title: 'Hilde\'s Supplies',
    speaker: 'hilde',
    pages: [
      'Tonics, dew and moss keep you alive down there. Never descend without them.',
      'New gear comes in as explorers reach deeper floors. Sell me enough of a material and I can make something special from it.',
    ],
  },
  {
    id: 'oath',
    title: 'Oaths and tokens',
    speaker: 'brynja',
    pages: [
      'Your first party swore for free. Every oath after that costs gold, more each time, and an Oath Token.',
      'Oath Tokens are shards of Ymir\'s bone. The realms honour no oath sworn without one. Guardians and prowlers carry them, and a few chests hold one.',
      'Adventurers in the hall can swap into the party at any time.',
    ],
  },
  {
    id: 'choice',
    title: 'Choices',
    speaker: 'sigrid',
    pages: [
      'Some moments ask you to choose. Every choice is remembered, and the people of the Pact will remember it too.',
      'There is no wrong answer, only roads. Read the story again, choices and all, in the Chronicle (Pack).',
    ],
  },
  {
    id: 'quests',
    title: 'The notice board',
    speaker: 'hjalmar',
    pages: ['Folk post their troubles here. Take a request, do it down below, and come back for the reward.'],
  },
  {
    id: 'hornstone',
    title: 'The Hornstone',
    speaker: 'ketil',
    pages: [
      'Every town that swore the Pact has a Hornstone. Blow it and Wayfinders from other halls can answer. Each brings one adventurer; four make an expedition.',
      'What you find on an expedition is shared when it ends. You need an account to use the horn.',
    ],
  },
];

export const TIP_BY_ID: Record<string, TipDef> = Object.fromEntries(TIPS.map((t) => [t.id, t]));
