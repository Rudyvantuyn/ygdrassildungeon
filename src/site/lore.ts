/**
 * The lore pages of the website: the world, the people of Lindholm and the chapters, told without spoilers.
 * The canon is Thijs's story (docs/verhaal.md); keep these texts in line with it, and never reveal its secrets here.
 */
import type { NpcId } from '../render/portraits';

export interface LoreSection {
  title: string;
  /** Paragraphs. */
  text: string[];
  /** An image under art/ to go with it. */
  image?: string;
}

export const WORLD: LoreSection[] = [
  {
    title: 'Before the world',
    image: 'places/title.webp',
    text: [
      'Before Midgard there was only Ginnungagap: the yawning gap between the ice of Niflheim and the fire of Muspelheim. Every road between the realms ran through it, and every trader, giant and god crossed it sooner or later.',
      'Where frost met flame, Ymir woke: the first of the giants, vast as a mountain range. The realms loved him. Asgard feared him, and feared what Jotunheim and Hel might trade across the gap while he stood guard over it.',
      'So Odin and his brothers Vili and Vé slew Ymir, and built the world from his body. His flesh became the earth, his blood the seas, his bones the mountains and his hair the forests. Midgard, the world of people, is a giant\'s grave.',
    ],
  },
  {
    title: 'The sealed gate',
    image: 'places/rootdeep.webp',
    text: [
      'The realms did not forgive. When they marched on Asgard, Heimdall saw them coming, and the gods spoke a spell that no one can pass: since that day, no road leads to Asgard.',
      'The anger of the realms had to fall somewhere. It fell on Midgard. Frost crept up from below, fire from the other side, and things came out of the dark that people had no names for. Nobody in Midgard understood why.',
    ],
  },
  {
    title: 'The Pact of the Gap',
    image: 'places/hall.webp',
    text: [
      'In Lindholm, the last town before the deep, people made a bargain with the realms: if Midgard opens a way to Asgard, the realms will leave Midgard in peace. It is called the Pact of the Gap.',
      'Those who go down to find that way are the Wayfinders. They swear the Pact in the Oath Hall, on an Oath Token: a splinter of Ymir\'s bone. The realms honour no oath that is not sworn on a piece of him.',
    ],
  },
  {
    title: 'The Great Tree and the Rootdeep',
    image: 'places/town.webp',
    text: [
      'The roots of the Great Tree reach down through Ymir\'s body toward the place where the gap once was. If any road to Asgard is left, it lies down there. The Wayfinders call it the Rootdeep.',
      'Before the Pact nobody was allowed down, so nobody ever mapped it. Wayfinders draw their own maps, square by square. And the Rootdeep does not stay empty: Ymir still dreams, and what dies inside him grows back.',
      'One comfort remains. The roots of the Great Tree always lead home: whoever climbs, comes out in Lindholm. And every town that swore the Pact has a Hornstone; sound it, and Wayfinders from other halls will answer and go down with you.',
    ],
  },
  {
    title: 'Three roads',
    image: 'places/hornstone.webp',
    text: [
      'The Pact asks Midgard to open the way. It does not say what Midgard should do once the way is open.',
      'Along the road you will be asked to choose, again and again: side with Asgard, side with the realms, or find a third way for Midgard itself. The story remembers. The deeper you go, the more it answers to what you chose.',
    ],
  },
];

/** The people of Lindholm, as players first meet them. */
export const PEOPLE: { id: NpcId; name: string; text: string }[] = [
  { id: 'sigrid', name: 'Sigrid, Warden of Lindholm', text: 'She signed the Pact with her own hand, and keeps the town standing with stubbornness and plain sense. Ask her anything; she will tell you most of it.' },
  { id: 'brynja', name: 'Brynja, Master of the Oath Hall', text: 'She swears in every Wayfinder and sends them down. She knows what the Oath Tokens really are, and she does not waste words on the faint-hearted.' },
  { id: 'gerd', name: 'Gerd of the Sleeping Stag', text: 'Keeps the inn, the fire and the stew going. Every party that comes back sleeps under her roof. She counts the ones who do not.' },
  { id: 'hilde', name: 'Hilde of the shop', text: 'Buys what you drag out of the deep and forges it into what you need to go deeper. Bring her enough of one thing and she will make something special of it.' },
  { id: 'ketil', name: 'Ketil the Hornwarden', text: 'Guards the Hornstone. When it sounds, Wayfinders from other halls answer, and Ketil remembers every one of them.' },
  { id: 'aske', name: 'Brother Aske, healer', text: 'Patches up the wounded and asks the questions nobody else dares to. He has never trusted the Pact.' },
  { id: 'hjalmar', name: 'Hjalmar the miller', text: 'Grinds the grain that keeps Lindholm fed, and always has a job for someone with strong arms and an empty purse.' },
  { id: 'ylva', name: 'Ylva the shepherd', text: 'Knows every path above ground and, lately, too many things that come up from below.' },
  { id: 'torvald', name: 'Torvald the carver', text: 'Carves wood, bone and gossip with the same steady hand. If something strange happened in Lindholm, Torvald heard it first.' },
  { id: 'hrodna', name: 'Hrodna, Envoy of the Frost Court', text: 'An ice giantess from Jotunheim who speaks for every realm that signed. Cool, honest in her own way, and not known for patience.' },
  { id: 'eira', name: 'Eira the Wanderer', text: 'A wanderer with a lantern that never flickers. She knows the roots better than anyone in Lindholm. Nobody has ever seen her eat.' },
];

export const CHAPTERS: { numeral: string; name: string; floors: string; image: string; text: string }[] = [
  {
    numeral: 'I',
    name: 'The Greenwood Roots',
    floors: 'Floors 1–5',
    image: 'site/ch1.webp',
    text: 'Ymir\'s hair became the forests and his flesh the earth. Down here the roots grow through both: mossy hollows, heartwood halls, and, deeper, frost creeping up from Niflheim and heat from the other side. Something is rotting the roots.',
  },
  {
    numeral: 'II',
    name: 'The Drowned Roots',
    floors: 'Floors 6–10',
    image: 'site/ch2.webp',
    text: 'Below the forest lies Ymir\'s blood: a sea under the world. Salt marshes, kelp forests and coral vaults, and the wreck of something that came here long before Lindholm\'s Wayfinders did.',
  },
  {
    numeral: 'III',
    name: 'The Marrowdeep',
    floors: 'Floors 11–15',
    image: 'site/ch3.webp',
    text: 'Ymir\'s bones, turned to stone: the old trade roads of the giants, with every place name scratched away. For the first time the deep is drawn as one whole, with stairs that lead back up and roots that open shortcuts.',
  },
];
