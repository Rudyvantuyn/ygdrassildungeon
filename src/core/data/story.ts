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
    ready: (g) => g.state.progress[4]?.bossDefeated === true,
    lines: [
      { speaker: NARRATOR, text: 'The Rootgnawer gives a last, shuddering coil, and is still.' },
      { speaker: NARRATOR, text: 'Above you, very faintly, the roots begin to sing.' },
      { speaker: NARRATOR, text: 'Then, from below, another sound: water. Deep, slow water, breathing against the stone.' },
    ],
  },
  {
    // Kept under its old id so players who already saw it are not shown it twice.
    id: 'epilogue',
    when: 'town',
    ready: (g) => g.state.progress[4]?.bossDefeated === true,
    lines: [
      { speaker: SIGRID, text: 'Green buds on every branch, explorers. In the middle of the harvest! The Great Tree remembers you.' },
      { speaker: SIGRID, text: 'But the well-keepers tell me the wells taste of salt. Salt! A hundred leagues from any shore.' },
      { speaker: SIGRID, text: 'The oldest songs say the Great Tree drinks from a sea beneath the world. If that sea has turned against it, the roots will drown.' },
      { speaker: SIGRID, text: 'Behind the Rootgnawer’s lair, stairs lead further down. Rest. Then find out what waits in the deep water.' },
    ],
  },
  {
    id: 'saltmarsh',
    when: 'floor',
    ready: (g) => g.state.floor === 5,
    lines: [
      { speaker: NARRATOR, text: 'The roots give way to wet stone. Pools of salt water glitter in the dark, and the air smells of the sea.' },
      { speaker: NARRATOR, text: 'Somewhere ahead, waves break against walls that have never seen the sun.' },
    ],
  },
  {
    id: 'jarlFallen',
    when: 'town',
    ready: (g) => g.state.progress[7]?.bossDefeated === true,
    lines: [
      { speaker: SIGRID, text: 'A drowned jarl, still wearing his crown? The old sagas speak of a war fleet that sailed to the edge of the world and never came home.' },
      { speaker: SIGRID, text: 'Whatever pulled them under is still down there, deeper than the coral. The salt in our wells grows stronger every day.' },
      { speaker: SIGRID, text: 'The shop has new gear from the sea folk’s old trade routes. Take it. You will need it.' },
    ],
  },
  {
    id: 'aegirsHall',
    when: 'floor',
    ready: (g) => g.state.floor === 9,
    lines: [
      { speaker: NARRATOR, text: 'A hall of black water and drowned pillars. The sea here does not move with the tide. It moves with breath.' },
      { speaker: NARRATOR, text: 'Something vast lies at the bottom of it all, as big as an island, and it is waking.' },
    ],
  },
  {
    id: 'hafgufaFallen',
    when: 'victory',
    ready: (g) => g.state.cleared,
    lines: [
      { speaker: NARRATOR, text: 'The Hafgufa sinks into the black water, and the sea beneath the world falls quiet.' },
      { speaker: NARRATOR, text: 'High above, the roots of the Great Tree drink deep, and the water tastes sweet again.' },
    ],
  },
  {
    id: 'chapterTwoEnd',
    when: 'town',
    ready: (g) => g.state.cleared,
    lines: [
      { speaker: SIGRID, text: 'The wells run sweet again! Lindholm owes you twice over now, explorers.' },
      { speaker: SIGRID, text: 'Still, I wonder what woke the Hafgufa in the first place. The Rootdeep goes deeper than any of us thought.' },
      { speaker: SIGRID, text: 'For now, rest. When the Great Tree needs you again, it will let us know.' },
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
