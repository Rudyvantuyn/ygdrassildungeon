/**
 * The great story, told in short scenes. Written from the story by Thijs (see docs/verhaal.md).
 *
 * Before Midgard there was only Ginnungagap, the void between ice and fire where the realms met to trade.
 * Ymir rose from it; Asgard's gods slew him and built Midgard from his body, then sealed Asgard away.
 * The other realms, who loved Ymir, now strike at Midgard. Lindholm swore the Pact of the Gap: find them
 * a way to Asgard, and Midgard will be spared. The Rootdeep is the road down through Ymir's body.
 *
 * `when` decides where a scene can play; `ready` whether its moment has come. A scene can end in a
 * choice; each choice leans the party toward Asgard, the realms, or a third way (Midgard's own).
 */
import type { Game } from '../game';

export interface StoryLine {
  speaker: string;
  text: string;
}

/** Who a choice favours. The three roads the story will one day split into. */
export type Leaning = 'asgard' | 'realms' | 'midgard';

export interface StoryOption {
  id: string;
  label: string;
  leaning: Leaning;
  /** What is said after the choice. */
  reply: StoryLine[];
}

export interface StoryChoice {
  prompt: string;
  options: StoryOption[];
}

export interface StoryScene {
  id: string;
  /** Name in the Chronicle, where seen scenes can be read again. */
  title: string;
  when: 'town' | 'floor' | 'victory';
  ready: (game: Game) => boolean;
  lines: StoryLine[];
  choice?: StoryChoice;
}

export const SIGRID = 'Sigrid, Warden of Lindholm';
export const HRODNA = 'Hrodna, Envoy of the Frost Court';
export const EIRA = 'Eira the Wanderer';
const BRYNJA = 'Brynja, Master of the Oath Hall';
const ASKE = 'Brother Aske, healer';
const NARRATOR = '';

const beaten = (floor: number) => (g: Game) => g.state.progress[floor]?.bossDefeated === true;
const chose = (scene: string, option: string) => (g: Game) => g.state.choices?.[scene] === option;
const on = (floor: number) => (g: Game) => g.state.floor === floor;

export const STORY: StoryScene[] = [
  // ── Prologue ───────────────────────────────────────────────────────────────
  {
    id: 'prologue',
    title: 'Before the world',
    when: 'town',
    ready: () => true,
    lines: [
      { speaker: NARRATOR, text: 'Before Midgard there was only Ginnungagap: the yawning void between the ice of Niflheim and the fire of Muspelheim.' },
      { speaker: NARRATOR, text: 'It belonged to no one. Across it, the realms met, bargained and traded. It was the crossroads of everything.' },
      { speaker: NARRATOR, text: 'Where cold met heat, Ymir woke: the first giant, vast as the void. And the realms began to quarrel over him and over the Gap.' },
      { speaker: NARRATOR, text: 'Asgard would not see the giants of Jotunheim, or Hel and her outcast kin, trade freely. Words became war.' },
      { speaker: NARRATOR, text: 'So three gods of Asgard slew Ymir. From his flesh they made the earth, from his blood the seas, from his bones the mountains.' },
      { speaker: NARRATOR, text: 'That world is Midgard. Ours. Built on a body the other realms had loved.' },
      { speaker: NARRATOR, text: 'The realms swore revenge. But Asgard\'s watchman foresaw it, and the gods wove a spell so that no road would lead to Asgard again.' },
      { speaker: NARRATOR, text: 'Unable to reach the gods, the realms turned on the world the gods had made. On us. Humans did not even know why.' },
    ],
  },
  {
    id: 'pact',
    title: 'The Pact of the Gap',
    when: 'town',
    ready: (g) => g.state.story.includes('prologue'),
    lines: [
      { speaker: SIGRID, text: 'So the Oath Hall sent me its new Wayfinders. Welcome to Lindholm, the last town before the deep.' },
      { speaker: SIGRID, text: 'You know why you are here. Frost on our fields in summer. Fire from the mountains. Shapes in the night that take our children.' },
      { speaker: SIGRID, text: 'Some of us made a bargain to end it. The Pact of the Gap: find the realms a road to Asgard, and they will leave Midgard in peace.' },
      { speaker: HRODNA, text: 'And the realms keep their word, Warden. Which is more than the gods ever did.' },
      { speaker: SIGRID, text: 'Hrodna speaks for the Frost Court, and for every realm that signed. She will be watching you. So will I.' },
      { speaker: SIGRID, text: 'The Great Tree\'s roots run down through Ymir\'s body, all the way to where the Gap once was. If a road still exists, it is down there.' },
      { speaker: SIGRID, text: 'We call that road the Rootdeep. Map it. Come back alive, as often as you need to. Nobody else is going to do this for us.' },
    ],
  },

  // ── Chapter I: The Greenwood Roots (Ymir's hair and flesh) ─────────────────
  {
    id: 'firstDescent',
    title: 'Into Ymir',
    when: 'floor',
    ready: on(0),
    lines: [
      { speaker: NARRATOR, text: 'Damp moss and old earth. Then you notice the walls are warm, and somewhere far below, something like a slow heartbeat.' },
      { speaker: NARRATOR, text: 'The forests of Midgard grew from Ymir\'s hair, the songs say. Down here, the roots are tangled in it still.' },
      { speaker: NARRATOR, text: 'No one has ever mapped this place. No one was allowed to. You draw your first lines and step into the dark.' },
    ],
  },
  {
    id: 'rootway',
    title: 'Footprints',
    when: 'floor',
    ready: on(1),
    lines: [
      { speaker: NARRATOR, text: 'In the mud between two roots: boot prints, old and hardened. Human. Someone walked this way long before the Pact.' },
      { speaker: NARRATOR, text: 'The prints lead deeper. None of them come back up.' },
    ],
  },
  {
    id: 'wanderer',
    title: 'A light in the roots',
    when: 'town',
    ready: (g) => g.state.deepest >= 1,
    lines: [
      { speaker: NARRATOR, text: 'A stranger sits by the well, a small lantern at her feet. Its flame does not flicker, though the wind does.' },
      { speaker: EIRA, text: 'You are the new Wayfinders. I saw your lantern-light from the second roots. You walk well, for beginners.' },
      { speaker: EIRA, text: 'I am Eira. I wander. I have walked the roots longer than Lindholm has had a wall.' },
      { speaker: EIRA, text: 'A word, freely given: the realms are generous with promises. Ask the envoy what happens to Midgard after they have their road.' },
      { speaker: SIGRID, text: 'She comes and goes. Nobody knows from where. Gerd swears she has never once seen her eat.' },
    ],
  },
  {
    id: 'heartwood',
    title: 'The sick heart',
    when: 'floor',
    ready: on(2),
    lines: [
      { speaker: NARRATOR, text: 'The roots here are grey and weeping. A rot has crept into the wood, and the air tastes of ash.' },
      { speaker: NARRATOR, text: 'At the heart of it all, something old and blighted has taken root, and it does not want you to pass.' },
    ],
  },
  {
    id: 'elderVictory',
    title: 'Gold in the rot',
    when: 'victory',
    ready: beaten(2),
    lines: [
      { speaker: NARRATOR, text: 'The Blighted Elder splits open. In its heart lies no seed, but a small plate of gold, carved with a rune none of you know.' },
      { speaker: NARRATOR, text: 'It is warm to the touch. Someone put it here. Someone made this rot.' },
    ],
  },
  {
    id: 'elderFallen',
    title: 'The golden rune',
    when: 'town',
    ready: beaten(2),
    lines: [
      { speaker: SIGRID, text: 'A golden rune in the heart of the rot. Then the Elder was not a sickness. It was a lock, or a guard.' },
      { speaker: HRODNA, text: 'Gold is the gods\' metal. Asgard sickens Midgard\'s roots so that no one finds the way down. Give it to me.' },
      { speaker: EIRA, text: 'Or the realms grew the rot themselves, to make Lindholm desperate enough to sign their Pact. Think before you hand it over.' },
    ],
    choice: {
      prompt: 'Who gets the golden rune?',
      options: [
        {
          id: 'hrodna', label: 'Give it to Hrodna', leaning: 'realms',
          reply: [
            { speaker: HRODNA, text: 'Wise. The Frost Court will read it. And the Court remembers who helped.' },
            { speaker: EIRA, text: 'Remembering is not the same as rewarding. Walk carefully, Wayfinders.' },
          ],
        },
        {
          id: 'eira', label: 'Give it to Eira', leaning: 'asgard',
          reply: [
            { speaker: EIRA, text: 'Thank you. I will keep it far from those who would melt it down. You will understand why, one day.' },
            { speaker: HRODNA, text: 'A stranger with no hall and no oath. You trust strangely, Wayfinders. The Court will note it.' },
          ],
        },
        {
          id: 'keep', label: 'Keep it in the Oath Hall', leaning: 'midgard',
          reply: [
            { speaker: SIGRID, text: 'Good. Midgard found it; Midgard keeps it. Brynja will lock it with the oath-rolls.' },
            { speaker: HRODNA, text: 'As you wish. For now.' },
            { speaker: EIRA, text: 'Hm. Neither of us, then. How interesting.' },
          ],
        },
      ],
    },
  },
  {
    id: 'rimewood',
    title: 'Frost from elsewhere',
    when: 'floor',
    ready: on(3),
    lines: [
      { speaker: NARRATOR, text: 'Ice grips the roots, though no winter reaches this deep. It is the cold of Niflheim, seeping up through Ymir\'s flesh.' },
      { speaker: NARRATOR, text: 'Scratched into the frost on a wall: a tally of days, and a name. "Hallvard\'s fleet. Still going down."' },
    ],
  },
  {
    id: 'oathTruth',
    title: 'What an oath is made of',
    when: 'town',
    ready: (g) => g.state.deepest >= 3,
    lines: [
      { speaker: BRYNJA, text: 'You asked why every new oath needs a token. Very well. They are not carved wood. They are shards of Ymir\'s bone.' },
      { speaker: BRYNJA, text: 'The realms loved Ymir. They will honour no oath unless it is sworn on a piece of him. That is the Pact\'s first rule.' },
      { speaker: BRYNJA, text: 'The prowlers you meet down there have gorged on his body. A shard of him sits in each of their hearts.' },
      { speaker: BRYNJA, text: 'So every Wayfinder in this hall is sworn to the realms, on the body of their dead. Remember that, the next time you swear someone in.' },
    ],
  },
  {
    id: 'wyrmroot',
    title: 'The gnawing',
    when: 'floor',
    ready: on(4),
    lines: [
      { speaker: NARRATOR, text: 'The air turns hot and sour. From Muspelheim, far below, comes heat. And from the dark ahead, a sound: teeth on wood.' },
      { speaker: NARRATOR, text: 'Dark shapes roam these tunnels. If they catch your scent, they hunt. Stay out of their way until you are strong enough.' },
    ],
  },
  {
    id: 'gnawerFallen',
    title: 'Beneath the roots',
    when: 'victory',
    ready: beaten(4),
    lines: [
      { speaker: NARRATOR, text: 'The Rootgnawer gives a last, shuddering coil, and is still. Above you, very faintly, the roots begin to sing.' },
      { speaker: NARRATOR, text: 'Then, from below, another sound: water. Deep, slow water, red-dark in the lantern light. Ymir\'s blood, still flowing.' },
    ],
  },
  {
    // Kept under its old id so players who already saw it are not shown it twice.
    id: 'epilogue',
    title: 'The end of the forest',
    when: 'town',
    ready: beaten(4),
    lines: [
      { speaker: SIGRID, text: 'The Great Tree buds again, in the middle of harvest. And the frost on the north fields has stopped. For now.' },
      { speaker: HRODNA, text: 'The Court sends its thanks. The Rootgnawer was Asgard\'s beast, set to chew through the road. You have opened it.' },
      { speaker: EIRA, text: 'Asgard\'s beast? Look at its teeth, envoy. Gnawers come from Hel\'s side of the Gap. Everyone down there knows it.' },
      { speaker: SIGRID, text: 'Enough. Our wells now taste of salt, a hundred leagues from any shore. The road goes on, into the sea of Ymir\'s blood.' },
      { speaker: SIGRID, text: 'And the scratches you found... Hallvard\'s fleet. I know that name. I will tell you when you come back from the water.' },
    ],
  },

  // ── Chapter II: The Drowned Roots (Ymir's blood) ───────────────────────────
  {
    id: 'saltmarsh',
    title: 'The blood sea',
    when: 'floor',
    ready: on(5),
    lines: [
      { speaker: NARRATOR, text: 'The roots give way to wet stone. Pools of salt water glitter in the dark. The seas of Midgard were Ymir\'s blood, once.' },
      { speaker: NARRATOR, text: 'Down here, they still are. The water is warm, and somewhere ahead, waves break against walls that have never seen the sun.' },
    ],
  },
  // Echoes of the golden rune: what became of it depends on who got it.
  {
    id: 'runeRealms',
    title: 'The Court has read',
    when: 'town',
    ready: (g) => g.state.deepest >= 5 && chose('elderFallen', 'hrodna')(g),
    lines: [
      { speaker: HRODNA, text: 'The Court has read your golden rune. It is a ward-mark, one of many. The gods sealed the road with locks, not with one wall.' },
      { speaker: HRODNA, text: 'The Elder was the first lock you broke. There will be others, deeper. Each one brings the road closer.' },
    ],
  },
  {
    id: 'runeAsgard',
    title: 'A wanderer\'s debt',
    when: 'town',
    ready: (g) => g.state.deepest >= 5 && chose('elderFallen', 'eira')(g),
    lines: [
      { speaker: EIRA, text: 'I owe you for the rune. So, a warning: whoever rules the coral hall below was once a man of Lindholm. Do not hate him.' },
      { speaker: EIRA, text: 'He did what he was told to do, as you do. That is the saddest kind of enemy.' },
    ],
  },
  {
    id: 'runeMidgard',
    title: 'The humming chest',
    when: 'town',
    ready: (g) => g.state.deepest >= 5 && chose('elderFallen', 'keep')(g),
    lines: [
      { speaker: BRYNJA, text: 'The golden rune in my chest hums at night. Louder since you went into the water. As if it hears something down there.' },
      { speaker: BRYNJA, text: 'Hrodna has asked to see it three times. The wanderer has not asked once. I am not sure which worries me more.' },
    ],
  },
  {
    id: 'hallvard',
    title: 'The first Pact',
    when: 'town',
    ready: (g) => g.state.deepest >= 6,
    lines: [
      { speaker: SIGRID, text: 'I promised you the truth about Hallvard. A hundred winters ago, Lindholm swore the same Pact. You are not the first Wayfinders.' },
      { speaker: SIGRID, text: 'Jarl Hallvard took ships down the roots to find the road. The realms waited. Nobody came back, and the attacks began again.' },
      { speaker: HRODNA, text: 'Midgard broke that pact by failing it. The realms were patient once. Do not ask them to be patient twice.' },
      { speaker: SIGRID, text: 'I kept it from you because I feared you would not go. I am sorry. Now you know what we are asking.' },
    ],
  },
  {
    id: 'kelpwood',
    title: 'Masts in the dark',
    when: 'floor',
    ready: on(6),
    lines: [
      { speaker: NARRATOR, text: 'Kelp sways in the dark like a forest underwater. Between the stalks: the broken masts of longships.' },
      { speaker: NARRATOR, text: 'On one prow, a carved face, worn by a century of brine. Lindholm\'s own mark is burnt into its neck.' },
    ],
  },
  {
    id: 'coralVault',
    title: 'The drowned court',
    when: 'floor',
    ready: on(7),
    lines: [
      { speaker: NARRATOR, text: 'Coral has grown over a hall of shields. Drowned warriors still stand guard, waiting for orders a hundred years old.' },
      { speaker: NARRATOR, text: 'At the far end, on a throne of barnacled hulls, sits someone with a crown.' },
    ],
  },
  {
    id: 'jarlVictory',
    title: 'Hallvard\'s last words',
    when: 'victory',
    ready: beaten(7),
    lines: [
      { speaker: NARRATOR, text: 'The Drowned Jarl kneels. For a moment his eyes clear, and he looks at you as a man, not a ghost.' },
      { speaker: NARRATOR, text: '"We found the road," he breathes. "Past the deep hall. But someone met us there, someone who smiled. Do not trust the—"' },
      { speaker: NARRATOR, text: 'Water fills his mouth. He is gone. In his hand: the log of his voyage, sealed in wax.' },
    ],
  },
  {
    id: 'jarlFallen',
    title: 'The jarl\'s log',
    when: 'town',
    ready: beaten(7),
    lines: [
      { speaker: SIGRID, text: 'Hallvard found the road, and someone stopped him. Someone who smiled. Then his log may tell us who.' },
      { speaker: HRODNA, text: 'The log is a record of a broken pact. It belongs to the realms.' },
      { speaker: EIRA, text: 'It belongs to his dead. Burn it with them, and let the sea keep its secrets. Some answers do more harm than good.' },
      { speaker: ASKE, text: 'Or read it ourselves. Forgive me, but you both seem very eager for it.' },
    ],
    choice: {
      prompt: 'What happens to Hallvard\'s log?',
      options: [
        {
          id: 'hrodna', label: 'Hand it to Hrodna', leaning: 'realms',
          reply: [
            { speaker: HRODNA, text: 'The Court will judge what Hallvard saw. And it will not forget that Lindholm kept faith this time.' },
            { speaker: EIRA, text: 'Then the Court will know as much as I do. Strange. I thought you wanted a friend, not a master.' },
          ],
        },
        {
          id: 'eira', label: 'Let Eira burn it', leaning: 'asgard',
          reply: [
            { speaker: EIRA, text: 'Thank you. The dead have earned their rest. Trust me: the road ahead is easier without old ghosts.' },
            { speaker: NARRATOR, text: 'The wax melts. As the pages curl, you glimpse one word, written larger than the rest: "LANTERN".' },
          ],
        },
        {
          id: 'read', label: 'Read it yourselves', leaning: 'midgard',
          reply: [
            { speaker: NARRATOR, text: 'Most pages are ruined by the sea. One line remains: "The road opens where the last ward falls. A woman with a lantern waits there."' },
            { speaker: SIGRID, text: 'A woman with a lantern. Say nothing of this. Not to the envoy, and not to anyone who wanders.' },
          ],
        },
      ],
    },
  },
  {
    id: 'ransReach',
    title: 'The drowning hands',
    when: 'floor',
    ready: on(8),
    lines: [
      { speaker: NARRATOR, text: 'Nets hang from the ceiling, heavy with the drowned. They say the sea-wife gathers all who sink, and keeps them.' },
      { speaker: NARRATOR, text: 'Here, at least, she has kept a great many.' },
    ],
  },
  {
    id: 'aegirsHall',
    title: 'The breathing sea',
    when: 'floor',
    ready: on(9),
    lines: [
      { speaker: NARRATOR, text: 'A hall of black water and drowned pillars. The sea here does not move with the tide. It moves with breath.' },
      { speaker: NARRATOR, text: 'Something vast lies at the bottom of it all, as big as an island. On its back, faint as a star, a golden rune is burning.' },
    ],
  },
  {
    id: 'hafgufaFallen',
    title: 'The first ward',
    when: 'victory',
    ready: (g) => g.state.cleared,
    lines: [
      { speaker: NARRATOR, text: 'The Hafgufa sinks into the black water, and the golden rune on its back cracks in two.' },
      { speaker: NARRATOR, text: 'Far, far above, beyond the roots and the sky, a horn sounds. Once. Long and low. Somebody up there heard the ward break.' },
      { speaker: NARRATOR, text: 'Among the drifting wreckage, half of the rune floats toward you, still warm.' },
    ],
  },
  {
    id: 'firstWard',
    title: 'The broken ward',
    when: 'town',
    ready: (g) => g.state.cleared,
    lines: [
      { speaker: SIGRID, text: 'The wells run sweet again. And the whole town heard that horn in its sleep. What have we started?' },
      { speaker: HRODNA, text: 'The first ward of the gods\' spell. Broken by human hands. The Court has waited an age for this. Give me the shard.' },
      { speaker: EIRA, text: 'One ward down, and Asgard is awake. Give that shard to the realms and they will not wait for the others to fall.' },
      { speaker: SIGRID, text: 'It is your find, Wayfinders. And, it seems, your choice.' },
    ],
    choice: {
      prompt: 'Who receives the shard of the broken ward?',
      options: [
        {
          id: 'hrodna', label: 'The realms: give it to Hrodna', leaning: 'realms',
          reply: [
            { speaker: HRODNA, text: 'With this, the Court can feel where the next ward lies. You have done more for Midgard than its gods ever did.' },
          ],
        },
        {
          id: 'eira', label: 'The wanderer: give it to Eira', leaning: 'asgard',
          reply: [
            { speaker: EIRA, text: 'Then it is safe. Better than safe. Someone will be very glad to see it again.' },
            { speaker: SIGRID, text: '"Again"? Eira. Who is glad?' },
            { speaker: NARRATOR, text: 'But the lantern is already moving away down the street, and the wanderer does not look back.' },
          ],
        },
        {
          id: 'keep', label: 'No one: hide it in Lindholm', leaning: 'midgard',
          reply: [
            { speaker: SIGRID, text: 'Torvald will carve it into the Oath Hall\'s doorpost, where both of them can see it and neither can take it.' },
            { speaker: HRODNA, text: 'The realms asked for a road, not for a keeper. Be careful what you make of yourselves.' },
            { speaker: EIRA, text: 'A third hand at the table. Asgard did not foresee that. I wonder if anyone did.' },
          ],
        },
      ],
    },
  },
  {
    id: 'chapterTwoEnd',
    title: 'What lies beneath',
    when: 'town',
    ready: (g) => g.state.cleared && g.state.story.includes('firstWard'),
    lines: [
      { speaker: SIGRID, text: 'Beneath the blood-sea, the road goes on. Into Ymir\'s bones. Wards still stand. More than one, I think.' },
      { speaker: SIGRID, text: 'Somewhere at the bottom lies the Gap, and a road to Asgard. Hallvard found it. Someone made sure he never came home.' },
      { speaker: SIGRID, text: 'Rest. Train. Grow strong. The Rootdeep is not done with you, and I fear the realms and the gods are not either.' },
    ],
  },
  {
    id: 'sealedStair',
    title: 'The sealed stair',
    when: 'floor',
    ready: (g) => g.state.cleared && g.state.floor === 9,
    lines: [
      { speaker: NARRATOR, text: 'Behind the Hafgufa\'s resting place, a stair winds down into bone-white stone. Ymir\'s bones, waiting.' },
      { speaker: NARRATOR, text: 'A second ward seals it, a wall of cold gold light. It does not yield. Not yet.' },
      { speaker: NARRATOR, text: 'To be continued in Chapter III.' },
    ],
  },
];

export const SCENE_BY_ID: Record<string, StoryScene> = Object.fromEntries(STORY.map((s) => [s.id, s]));

/** The next unseen scene for this moment, if any. */
export function pendingScene(game: Game, when: StoryScene['when']): StoryScene | null {
  return STORY.find((s) => s.when === when && !game.state.story.includes(s.id) && s.ready(game)) ?? null;
}

export function markSeen(game: Game, id: string): void {
  if (!game.state.story.includes(id)) game.state.story.push(id);
}

/** Records a choice made at the end of a scene. Only the first choice counts. */
export function choose(game: Game, sceneId: string, optionId: string): StoryOption | null {
  const option = SCENE_BY_ID[sceneId]?.choice?.options.find((o) => o.id === optionId);
  if (!option) return null;
  game.state.choices ??= {};
  game.state.choices[sceneId] ??= optionId;
  return option;
}

/** How far the party's choices lean toward each road. */
export function leanings(game: Game): Record<Leaning, number> {
  const out: Record<Leaning, number> = { asgard: 0, realms: 0, midgard: 0 };
  for (const [scene, option] of Object.entries(game.state.choices ?? {})) {
    const o = SCENE_BY_ID[scene]?.choice?.options.find((x) => x.id === option);
    if (o) out[o.leaning] += 1;
  }
  return out;
}
