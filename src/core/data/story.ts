/**
 * The story of Lindholm and the Great Tree, told in short scenes.
 * `when` decides where a scene can play; `ready` whether its moment has come.
 */
import type { Game } from '../game';

export interface StoryLine {
  speaker: string;
  text: string;
}

export interface StoryScene {
  id: string;
  when: 'town' | 'floor' | 'victory';
  ready: (game: Game) => boolean;
  lines: StoryLine[];
}

const SIGRID = 'Sigrid, Warden of Lindholm';
const NARRATOR = '';

export const STORY: StoryScene[] = [
  {
    id: 'intro',
    when: 'town',
    ready: () => true,
    lines: [
      { speaker: SIGRID, text: 'So the Oath Hall sent me four more. Welcome to Lindholm, explorers.' },
      { speaker: SIGRID, text: 'Look up. The Great Tree has sheltered this town for a thousand winters. This summer, its leaves are falling.' },
      { speaker: SIGRID, text: 'Something below is sickening the roots. The old tunnels beneath our feet, the Rootdeep, have started to stir.' },
      { speaker: SIGRID, text: 'Go down. Map what you find. And come back alive, as often as you need to. The Sleeping Stag keeps a warm bed for the living.' },
      { speaker: SIGRID, text: 'The townsfolk post requests on the notice board. Lindholm takes care of those who take care of it.' },
    ],
  },
  {
    id: 'firstDescent',
    when: 'floor',
    ready: (g) => g.state.floor === 0,
    lines: [
      { speaker: NARRATOR, text: 'Damp moss, the smell of old earth, and somewhere far below, a slow creaking, like a tree in a storm.' },
      { speaker: NARRATOR, text: 'The Rootdeep has swallowed many explorers. You draw your first lines on the map and step into the dark.' },
    ],
  },
  {
    id: 'elderFallen',
    when: 'town',
    ready: (g) => g.state.progress[2]?.bossDefeated === true,
    lines: [
      { speaker: SIGRID, text: 'You felled the Blighted Elder? Then the rot was not born there. It was only fed there.' },
      { speaker: SIGRID, text: 'Our runecarvers say something is chewing at the deepest roots. Far below, where the ice gives way to embers.' },
      { speaker: SIGRID, text: 'The shop has new steel for you, and the board has new requests. Rest well. Then go deeper.' },
    ],
  },
  {
    id: 'wyrmroot',
    when: 'floor',
    ready: (g) => g.state.floor === 4,
    lines: [
      { speaker: NARRATOR, text: 'The air turns hot and sour. Between the roots, something enormous shifts in its sleep.' },
      { speaker: NARRATOR, text: 'Dark shapes roam these tunnels. If they catch your scent, they hunt. Stay out of their way until you are strong enough.' },
    ],
  },
  {
    id: 'gnawerFallen',
    when: 'victory',
    ready: (g) => g.state.cleared,
    lines: [
      { speaker: NARRATOR, text: 'The Rootgnawer gives a last, shuddering coil, and is still.' },
      { speaker: NARRATOR, text: 'Above you, very faintly, the roots begin to sing.' },
    ],
  },
  {
    id: 'epilogue',
    when: 'town',
    ready: (g) => g.state.cleared,
    lines: [
      { speaker: SIGRID, text: 'Green buds on every branch, explorers. In the middle of the harvest! The Great Tree remembers you.' },
      { speaker: SIGRID, text: 'Lindholm will sing about this for a long time. Stay as long as you like. The Rootdeep still keeps its secrets, and its treasures.' },
    ],
  },
];

/** The next unseen scene for this moment, if any. */
export function pendingScene(game: Game, when: StoryScene['when']): StoryScene | null {
  return STORY.find((s) => s.when === when && !game.state.story.includes(s.id) && s.ready(game)) ?? null;
}

export function markSeen(game: Game, id: string): void {
  if (!game.state.story.includes(id)) game.state.story.push(id);
}
