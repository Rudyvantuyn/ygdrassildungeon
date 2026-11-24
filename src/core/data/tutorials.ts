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
      'This is Lindholm. Rest at the Sleeping Stag, buy supplies and gear at Hilde\'s, take paid requests from the notice board, and form your party at the Oath Hall.',
      'The Rootdeep lies past the well. Wayfinders who rush in die; those who come back a little stronger each time reach the bottom.',
    ],
  },
  {
    id: 'firstStep',
    title: 'Into the Rootdeep',
    speaker: 'sigrid',
    pages: [
      'Walk with the arrow keys, WASD or the buttons. On a phone, swipe the view: up to walk, sideways to turn.',
      'Act opens chests, drinks from springs and gathers. The menu (Esc or ☰) holds your party, bag, journal and options. The stairs up always lead back toward Lindholm.',
    ],
  },
  {
    id: 'danger',
    title: 'The danger orb',
    speaker: 'sigrid',
    pages: ['See the orb by the map turning yellow? It goes from blue to yellow to red as you walk. Red means a fight is close.'],
  },
  {
    id: 'map',
    title: 'Drawing the map',
    speaker: 'ylva',
    pages: [
      'The Rootdeep has never been mapped. The map in the corner fills in where you walk and marks the stairs, chests, springs and gathering spots you come upon. Draw the walls yourself, here or on the small map.',
      'Not one for drawing? Under Map drawing in Settings, Auto draws everything and Manual leaves everything to you.',
    ],
  },
  {
    id: 'battle',
    title: 'Your first fight',
    speaker: 'brynja',
    pages: [
      'Choose a command for every adventurer, then the round plays out. The front row takes most blows; the back row is safer, but only bows hit at full strength from there.',
      'Every foe is weak to fire, frost or storm: a weakness hit does half again as much. Skills cost SP. R repeats last round, O lets the party fight on its own.',
    ],
  },
  {
    id: 'victory',
    title: 'Growing stronger',
    speaker: 'brynja',
    pages: [
      'Every fight gives experience and often materials to sell at Hilde\'s. Levels come slowly; that is how the Rootdeep is.',
      'Each level brings a skill point. A ✦ on a card means points are waiting.',
    ],
  },
  {
    id: 'skillPoints',
    title: 'Skill points',
    speaker: 'brynja',
    pages: [
      'Spend skill points in the Oath Hall or from the menu (Party, Skill tree). Every skill goes from rank 1 to 10; some need a level or another skill first.',
      'Skills marked ◇ work on their own and raise a stat for good. Choose with care: unlearning everything at the Oath Hall costs gold.',
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
      'Glowing medallions over the floor mark gathering spots: plants, ore, wood and fish. Someone in the party needs the matching skill (Forage, Mine, Fell or Fish); every skill tree has them.',
      'Each spot gives two tries per descent. Higher ranks find more, and rarer things. The noise can draw monsters.',
    ],
  },
  {
    id: 'ailment',
    title: 'Ailments',
    speaker: 'aske',
    pages: [
      'Poison hurts every round. Sleep skips turns until you are hit. Paralysis makes you freeze now and then.',
      'Clearwater or the Mender\'s Cleanse washes them away. Ailments also wear off after a few rounds, and always end with the fight.',
    ],
  },
  {
    id: 'buffs',
    title: 'Buffs and curses',
    speaker: 'brynja',
    pages: [
      'Some skills raise or lower attack, defence, magic or resistance for a few rounds: ATK▲ or DEF▼ on the cards and under foes. Plus 20% attack means 20% more damage.',
      'They do not stack: each stat holds one effect, the stronger one stays. Spread them out: attack on the hitters, defence on the front row. More magic on a healer means stronger heals.',
    ],
  },
  {
    id: 'fallen',
    title: 'A fallen friend',
    speaker: 'aske',
    pages: [
      'An adventurer at 0 HP has fallen and earns nothing until back on their feet. Kindling Moss or the Mender\'s Rekindle wakes them; a night at the inn heals everyone.',
      'If the whole party falls, the roots carry you home to Lindholm, but the deep keeps half of what you found on the way down.',
    ],
  },
  {
    id: 'prowler',
    title: 'Prowlers',
    speaker: 'sigrid',
    pages: [
      'That shape in the dark is a prowler: a beast that gorged on Ymir\'s flesh and grew far stronger than anything around it. Do not fight one until you are much stronger. There is always a way around; some hunt you if you come close.',
      'Running from a prowler works only three times in ten. The first one you bring down leaves an Oath Token. It is back once you have been to town; its token is not.',
    ],
  },
  {
    id: 'boss',
    title: 'A guardian',
    speaker: 'sigrid',
    pages: [
      'That red horned skull marks a guardian: something that rules this part of the Rootdeep.',
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
    id: 'carriedHome',
    title: 'When the party falls',
    speaker: 'gerd',
    pages: [
      'You were lucky. The roots carried you up, as they always do, and someone found you at the foot of the Great Tree.',
      'The deep keeps half of what you found on this descent. What you set out with is safe, and so are your gear and Oath Tokens. Rest before you go down again: tonight it costs nothing.',
    ],
  },
  {
    id: 'oath',
    title: 'Oaths and tokens',
    speaker: 'brynja',
    pages: [
      'Your first party swore for free. Every oath after that costs gold, more each time, and an Oath Token: a shard of Ymir\'s bone, held by guardians, prowlers (once each), a few chests and the hardest requests.',
      'Adventurers waiting in the hall can swap into the party whenever you are in town.',
    ],
  },
  {
    id: 'ravens',
    title: 'Raven Runs',
    speaker: 'brynja',
    pages: [
      'Adventurers waiting in the hall can go scouting on a floor your party has reached, with Huginn and Muninn. A run takes real hours: 3, 8 or 14. Scouts bring materials home, never gold, and learn nothing.',
      'Every fight on the way is a chance to fall. Send them too deep and they come back wounded and empty-handed, and need twelve hours of rest or the healer at the Sleeping Stag.',
    ],
  },
  {
    id: 'runestones',
    title: 'Runestones',
    speaker: 'ketil',
    pages: [
      'Wayfinders from other halls carve runestones to warn or guide whoever comes next: step on one to read it. Heed one that helped you, or mark a lying one False: enough of those and it crumbles.',
      'You may carve one stone on every descent (Journal, Carve a runestone), with fixed words only. Where a whole party fell, a shade lingers. Learn from it.',
    ],
  },
  {
    id: 'deeds',
    title: 'The Book of Deeds',
    speaker: 'brynja',
    pages: [
      'That was a deed worth a medal. Lindholm keeps a book of them in your Journal. Nobody will tell you what counts as a deed.',
    ],
  },
  {
    id: 'fragments',
    title: 'Fragments',
    speaker: 'torvald',
    pages: [
      'You found something the Rootdeep kept. Old notes, carved marks, things others left behind. Lindholm knows less about the deep than it pretends.',
      'Fragments lie in a few old chests and in the hearts of guardians. Read them again in the Journal; signed in, they also appear on the World page of the Wayfinders\' site.',
    ],
  },
  {
    id: 'memories',
    title: 'Memory shards',
    speaker: 'torvald',
    pages: [
      'That glow is not from any torch. It is a shard of a memory, older than Lindholm, older than the Tree, maybe. Every memory has fifteen shards; the last always comes last, and only the whole memory tells you whose it is.',
      'Read them in the Journal, under Memories. Signed in, they also appear on the Memories page of the Wayfinders\' site.',
    ],
  },
  {
    id: 'echoes',
    title: 'The Hall of Echoes',
    speaker: 'torvald',
    pages: [
      'Burn ten Dream Embers on the hearth and a guardian you have beaten answers as an echo, as strong as you choose, up to your strongest adventurer. A stronger echo is likelier to leave a memory shard.',
      'The embers are spent win or lose; lose, and you keep everything else. The fifth guardian leaves a first handful, after that they come from the monsters deeper down.',
    ],
  },
  {
    id: 'sagas',
    title: 'Sagas and bynames',
    speaker: 'brynja',
    pages: [
      'The skalds of Lindholm are already singing about one of yours. Every fight is told, and doing enough of something earns a byname.',
      'Read each adventurer\'s saga in the Party menu or at the Oath Hall, and choose which byname they bear. A byname is honour only: it changes nothing in a fight.',
    ],
  },
  {
    id: 'wyrdweave',
    title: 'The Wyrdweave',
    speaker: 'ylva',
    pages: [
      'At the Well of Urd the Norns weave three floors a day, the same for every Wayfinder, each with a rule of its own. Reach a floor\'s way down and take your Wyrd Threads home, or go deeper: fall, and half of them slip away.',
      'One try a day, and fights there pay half. Threads cannot be sold; Hilde weaves them into gear with a gift, slowly: the first piece takes thirty.',
    ],
  },
  {
    id: 'choice',
    title: 'Choices',
    speaker: 'sigrid',
    pages: [
      'Some moments ask you to choose. Every choice is remembered, and the people of the Pact will remember it too.',
      'There is no wrong answer, only roads. Read the story again, choices and all, in the Chronicle (menu, Journal).',
    ],
  },
  {
    id: 'gate',
    title: 'Root gates',
    speaker: 'torvald',
    pages: [
      'Some passages are closed by root gates. They only open from the deep side, and once pulled open they stay open for good.',
      'Deeper chapters wind back on themselves: stairs lead up as well as down. Open gates are your shortcuts.',
    ],
  },
  {
    id: 'bestiary',
    title: 'The bestiary',
    speaker: 'ylva',
    pages: [
      'Every beast you meet goes in here. Defeat one and you will know its strength and what it leaves behind.',
      'Its weaknesses only show once you have tried them: hit it with fire, frost or storm and see what happens.',
    ],
  },
  {
    id: 'quests',
    title: 'The notice board',
    speaker: 'hjalmar',
    pages: ['Folk post their troubles here. Take a request, do it down below, and come back for the reward.'],
  },
  {
    id: 'chapterHome',
    title: 'The way home',
    speaker: 'sigrid',
    pages: [
      'A new chapter lies below! Its wards let no one in halfway, but they do know the way out.',
      'Worn out after a guardian? Go down, not back up: on the first floor of every chapter, the stairs up take you straight home to Lindholm.',
    ],
  },
  {
    id: 'flasks',
    title: 'Flasks',
    speaker: 'hilde',
    pages: [
      'Some of what waits down there only falls to fire, frost or storm. No caster in your party? Throw a flask: Ember, Rime or Storm. Each hits like a rune at the thrower\'s level. They are dear, and a guardian takes a good many.',
    ],
  },
  {
    id: 'deeperOath',
    title: 'Deeper oaths',
    speaker: 'brynja',
    pages: [
      'Oath Tokens are not only for new faces. Give them to someone you already trust and they swear a deeper oath: each adds a little to their own strength, at every level. The next oath opens with every chapter you finish, and asks for some levels.',
      'A token also lets an adventurer swear again as another class. They keep their level and oath, and learn their skills anew. Gear their new class cannot wear, Hilde buys back.',
    ],
  },
  {
    id: 'maps',
    title: "Sigrid's maps",
    speaker: 'sigrid',
    pages: [
      'Lindholm needs to know what lies below. Walk a floor nearly end to end, nine squares in ten, and I will buy its map when you come home. Once per floor, and the deeper, the more it is worth. The map shows how much you have seen.',
    ],
  },
  {
    id: 'advice',
    title: "Brynja's advice",
    speaker: 'brynja',
    pages: [
      'Not sure what to do next? Look under the town\'s name: I keep one line there with the next thing worth doing. Click it and I will take you to the right place. If you would rather find your own way, switch it off under Options, Settings.',
    ],
  },
  {
    id: 'patchUp',
    title: 'Mending between fights',
    speaker: 'aske',
    pages: [
      'Bruised already? Your healers need not wait for the next fight. Menu, Party, Patch up: they mend everyone with their own SP, and wake the fallen if they can.',
    ],
  },
  {
    id: 'photo',
    title: 'A picture for the saga',
    speaker: 'brynja',
    pages: [
      'Deeper already! Some sights down there deserve to be remembered.',
      'Press P (or Take a picture under Journal in the menu) for a clean picture of what you see, with your party under it. Save it, copy it into a chat or share it from your phone.',
    ],
  },
  {
    id: 'discord',
    title: 'Tales by the fire',
    speaker: 'gerd',
    pages: [
      'A guardian fallen! The whole Stag will hear about this one. Wayfinders from every hall trade tales like that in the Discord.',
      'Find it under Options in the menu, or on the title screen. Bring your bynames, your Wyrdweave runs and your bugs: the makers read along, and the best byname ideas end up in the game.',
    ],
  },
  {
    id: 'hornstone',
    title: 'The Hornstone',
    speaker: 'ketil',
    pages: [
      'Blow the Hornstone and Wayfinders from other halls answer: each brings one adventurer, up to five make an expedition. What you find is shared at the end; levels and XP always come home. You need an account to use it.',
      'If the party falls, or everyone leaves mid-fight, the haul is lost, and expeditions win no Oath Tokens. Want only friends? Make the horn private and share the password.',
    ],
  },
];

export const TIP_BY_ID: Record<string, TipDef> = Object.fromEntries(TIPS.map((t) => [t.id, t]));
