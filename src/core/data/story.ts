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
const TORVALD = 'Torvald the carver';
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
      { speaker: BRYNJA, text: 'You asked why every oath needs a shard of Ymir\'s bone. Very well. Here is what the Pact does not tell new Wayfinders.' },
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
    ready: beaten(9),
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
    ready: beaten(9),
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
    ready: (g) => beaten(9)(g) && g.state.story.includes('firstWard'),
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
    // Only while chapter III is not yet open.
    ready: (g) => beaten(9)(g) && g.state.floor === 9 && g.floors.length <= 10,
    lines: [
      { speaker: NARRATOR, text: 'Behind the Hafgufa\'s resting place, a stair winds down into bone-white stone. Ymir\'s bones, waiting.' },
      { speaker: NARRATOR, text: 'A second ward seals it, a wall of cold gold light. It does not yield. Not yet.' },
      { speaker: NARRATOR, text: 'To be continued in Chapter III.' },
    ],
  },

  // ── Strangers at the Oath Hall: the secret classes (a proposal; Thijs may change them) ──
  {
    id: 'ravenStranger',
    title: 'The raven on the roof',
    when: 'town',
    ready: (g) => !!g.state.deeds?.ravenCall,
    lines: [
      { speaker: NARRATOR, text: 'A raven has followed your scouts home. It sits on the roof of the Oath Hall and will not leave.' },
      { speaker: BRYNJA, text: 'Twenty-five times you sent them down, and twenty-five times the ravens came back with word. Now one has brought someone with it.' },
      { speaker: NARRATOR, text: 'A woman in a cloak of black feathers steps out of the rain. The raven settles on her shoulder and looks at you with one eye, then the other.' },
      { speaker: BRYNJA, text: 'She calls herself a Ravenspeaker. The birds told her you are worth swearing for. From now on the Oath Hall takes her kind.' },
    ],
  },
  {
    id: 'hornStranger',
    title: 'The horn from another hall',
    when: 'town',
    ready: (g) => !!g.state.deeds?.hornCall,
    lines: [
      { speaker: NARRATOR, text: 'After your fifth expedition a stranger follows the Wayfinders home: broad, travel-worn, a great horn slung across the back.' },
      { speaker: BRYNJA, text: 'Five times you went down beside Wayfinders from other halls, and five times this one was among them. Now they would rather stand beside you.' },
      { speaker: BRYNJA, text: 'A Hornbearer. One blast and the deep shakes; one call and tired Wayfinders stand up again. The Oath Hall takes their kind now.' },
    ],
  },

  {
    id: 'wildStranger',
    title: 'The bear at the door',
    when: 'town',
    ready: (g) => !!g.state.deeds?.wildCall,
    lines: [
      { speaker: NARRATOR, text: 'Every beast of the Greenwood Roots has fallen to you once. That night something large sits down outside the Oath Hall and waits.' },
      { speaker: BRYNJA, text: 'Do not reach for your weapons. That is no beast of the roots. It is a fylgja: the spirit that walks beside a life, in an animal\'s shape.' },
      { speaker: NARRATOR, text: 'It looks at each of you in turn, as if it has known you a long time. Then it lies down by the hearth.' },
      { speaker: BRYNJA, text: 'They choose whom they follow. It chose this hall. The Oath Hall takes the Fylgjur now: bears and cats, all of them oath-bound.' },
    ],
  },

  // ── Chapter III: the Marrowdeep ────────────────────────────────────────────
  // A proposal written while Thijs is busy (see docs/verhaal.md): he may change any of it.
  {
    id: 'marrowGate',
    title: "Ymir's bones",
    when: 'floor',
    ready: on(10),
    lines: [
      { speaker: NARRATOR, text: 'The second ward lets you through. Below the blood-sea the walls turn pale and hard: not stone, but bone that became stone.' },
      { speaker: NARRATOR, text: 'Every sound comes back to you twice. Somewhere deep below, something very large is breathing in its sleep.' },
    ],
  },
  {
    id: 'guideRealms',
    title: 'A guide from the Court',
    when: 'floor',
    ready: (g) => on(10)(g) && road(g) === 'realms',
    lines: [
      { speaker: NARRATOR, text: 'A frost giant waits at the foot of the stair, stooped under the low ceiling. Kolbein, a stonewright of Jotunheim.' },
      { speaker: 'Kolbein, stonewright', text: 'The envoy sends me. My people cut these roads when Ymir was still loved. I will walk with you to the first stair, and no further.' },
    ],
  },
  {
    id: 'guideAsgard',
    title: "The wanderer's flame",
    when: 'floor',
    ready: (g) => on(10)(g) && road(g) === 'asgard',
    lines: [
      { speaker: NARRATOR, text: 'In your pack you find a small flame in a glass, wrapped in cloth. You do not remember packing it.' },
      { speaker: NARRATOR, text: 'A note in a neat hand: "It will not go out down there. Nothing of mine does. — E."' },
    ],
  },
  {
    id: 'guideMidgard',
    title: "Brynja's chalk",
    when: 'floor',
    ready: (g) => on(10)(g) && road(g) === 'midgard',
    lines: [
      { speaker: NARRATOR, text: 'Brynja gave you a bag of chalk before you left. "Mark every turn. Lindholm will make its own map of the bones, for no one else."' },
      { speaker: NARRATOR, text: 'Your first mark on the white wall looks very small. You make it anyway.' },
    ],
  },
  {
    id: 'giantsStair',
    title: "The giants' road",
    when: 'floor',
    ready: on(11),
    lines: [
      { speaker: NARRATOR, text: 'Steps as tall as a man climb and fall through the bone. Giants carved them, long before the war, to trade with the deep.' },
      { speaker: NARRATOR, text: 'Runes on the walls give the names of places. Many are scratched out. Someone wanted this road forgotten.' },
    ],
  },
  {
    id: 'ribvault',
    title: 'The rib hall',
    when: 'floor',
    ready: on(12),
    lines: [
      { speaker: NARRATOR, text: 'A hall between ribs, each as wide as a longship. In the middle, something coiled of bone lifts its head. A golden rune burns on its chest.' },
    ],
  },
  {
    id: 'ribwardenFallen',
    title: 'The carved rune',
    when: 'victory',
    ready: beaten(12),
    lines: [
      { speaker: NARRATOR, text: 'The Ribwarden falls apart into a heap of bones. The rib with the rune stays standing, alone.' },
      { speaker: NARRATOR, text: 'Up close you see it: the rune did not grow there. It was carved. With a chisel of gold, by a patient hand.' },
    ],
  },
  {
    id: 'boneNails',
    title: 'Nails in a coffin',
    when: 'town',
    ready: beaten(12),
    lines: [
      { speaker: SIGRID, text: 'Carved into his own bones. The gods built their wards out of Ymir himself.' },
      { speaker: HRODNA, text: 'Nails in a coffin. Each ward holds him down, and Asgard shut. We always suspected. Now we know.' },
      { speaker: ASKE, text: 'Then every ward we break, we pull a nail. Forgive me for asking what nobody wants asked: what happens when the last one comes out?' },
      { speaker: EIRA, text: 'Nothing good, healer. Nothing good at all.' },
    ],
  },
  {
    id: 'echoHollows',
    title: 'The light that stays',
    when: 'floor',
    ready: on(13),
    lines: [
      { speaker: NARRATOR, text: 'A cold wind howls through the hollows, and your torches gutter and die. For a while there is only the dark, and the echoes.' },
      { speaker: NARRATOR, text: 'Far ahead, one small light burns steady. A lantern that does not flicker. When you reach the spot, there is no one there.' },
    ],
  },
  {
    id: 'hrungnirsRest',
    title: 'The sleeping giant',
    when: 'floor',
    ready: on(14),
    lines: [
      { speaker: NARRATOR, text: 'A giant lies in the deepest vault, grown into the floor. In his open chest a heart of stone beats, slow as a season.' },
      { speaker: NARRATOR, text: 'A golden rune is cut into the heart. The third ward. Whoever made it did not let him die first.' },
    ],
  },
  {
    id: 'hrungnirFallen',
    title: 'The third ward',
    when: 'victory',
    ready: beaten(14),
    lines: [
      { speaker: NARRATOR, text: 'Hrungnir sinks back into the stone with a sound like a mountain sighing. The rune on his heart splits.' },
      { speaker: NARRATOR, text: 'The horn above sounds again. Twice now. And a raven lands on the broken heart, looks at you for a long moment, and flies up into the dark.' },
    ],
  },
  {
    id: 'secondWard',
    title: 'The stone heart',
    when: 'town',
    ready: beaten(14),
    lines: [
      { speaker: HRODNA, text: 'Hrungnir. The strongest of us, the first to stand for Ymir. They made a lock of his heart. Give it back to his people.' },
      { speaker: EIRA, text: 'A raven saw you. Asgard knows your faces now. Let me take the heart home: a gift buys more patience than a threat.' },
      { speaker: BRYNJA, text: 'Or bury it here, under the Oath Hall. Every oath we swear on it will remember what was done to him.' },
    ],
    choice: {
      prompt: 'What happens to the stone heart?',
      options: [
        {
          id: 'hrodna', label: 'Return it to the giants', leaning: 'realms',
          reply: [
            { speaker: HRODNA, text: 'Jotunheim will sing of this for a hundred winters. And it will remember who carried the heart home.' },
          ],
        },
        {
          id: 'eira', label: 'Let Eira bring it "home"', leaning: 'asgard',
          reply: [
            { speaker: EIRA, text: 'Home. Yes. You understand more than you know.' },
            { speaker: NARRATOR, text: 'That night a raven sits on the Oath Hall roof until dawn. Nobody sees it leave.' },
          ],
        },
        {
          id: 'bury', label: 'Bury it under the Oath Hall', leaning: 'midgard',
          reply: [
            { speaker: BRYNJA, text: 'Then Lindholm keeps its own oaths, on its own stone. Let the realms and the gods both come and ask.' },
            { speaker: ASKE, text: 'I will say a word over it. Someone should, after all this time.' },
          ],
        },
      ],
    },
  },
  {
    id: 'chapterThreeEnd',
    title: 'Eyes in the deep',
    when: 'town',
    ready: (g) => beaten(14)(g) && g.state.story.includes('secondWard'),
    lines: [
      { speaker: SIGRID, text: 'Three wards broken. Ravens over Lindholm every morning now. Asgard is watching the road we are making.' },
      { speaker: SIGRID, text: 'Below the bones lies something else. Hrodna will not say what. Eira just smiles. Rest, Wayfinders. We are close to something.' },
    ],
  },

  // ── Chapter IV: the Dreaming Skull ─────────────────────────────────────────
  // Also a proposal while Thijs is busy (see docs/verhaal.md).
  {
    id: 'skullGate',
    title: 'The inside of the sky',
    when: 'floor',
    ready: on(15),
    lines: [
      { speaker: NARRATOR, text: 'Past Hrungnir the roots climb, and climb, and then the bone opens into a space so wide you cannot see its far side.' },
      { speaker: NARRATOR, text: 'Clouds drift under a vault of bone. You are inside Ymir\'s skull: the sky the gods set over Midgard, seen from within.' },
      { speaker: NARRATOR, text: 'His brains became the clouds. Here they still drift, and still think.' },
    ],
  },
  {
    id: 'skullRealms',
    title: 'Frost on the bone',
    when: 'floor',
    ready: (g) => on(15)(g) && road(g) === 'realms',
    lines: [
      { speaker: NARRATOR, text: 'Someone has been here before you. A rune of the Frost Court is cut into the bone at the stair, still rimed with ice.' },
      { speaker: NARRATOR, text: 'It reads: "As far as we dared. Go on, Wayfinders."' },
    ],
  },
  {
    id: 'skullAsgard',
    title: 'A brighter flame',
    when: 'floor',
    ready: (g) => on(15)(g) && road(g) === 'asgard',
    lines: [
      { speaker: NARRATOR, text: 'The little flame in its glass, Eira\'s flame, burns higher here than it ever did. It leans upward, toward the vault, like a dog that smells home.' },
    ],
  },
  {
    id: 'skullMidgard',
    title: 'Old chalk',
    when: 'floor',
    ready: (g) => on(15)(g) && road(g) === 'midgard',
    lines: [
      { speaker: NARRATOR, text: 'You reach for Brynja\'s chalk to mark the stair and stop. There is already a mark. Old chalk, in the shape of a ship.' },
    ],
  },
  {
    id: 'cloudmere',
    title: 'Pictures in the clouds',
    when: 'floor',
    ready: on(16),
    lines: [
      { speaker: NARRATOR, text: 'The cloud pools show pictures when you look into them. Lindholm at night. Your own faces, older. A hall full of gold that none of you has ever seen.' },
      { speaker: NARRATOR, text: 'The giant is dreaming. You are walking through his dream.' },
    ],
  },
  {
    id: 'thinkingFog',
    title: 'The fog has eyes',
    when: 'floor',
    ready: on(17),
    lines: [
      { speaker: NARRATOR, text: 'The fog thickens until you cannot see your own hands. Then, all around you, eyes open in it. Dozens. Watching, and patient.' },
    ],
  },
  {
    id: 'fogWatcherFallen',
    title: 'One eye left',
    when: 'victory',
    ready: beaten(17),
    lines: [
      { speaker: NARRATOR, text: 'The Fog-Watcher\'s eyes close one by one. The last one does not look at you. It looks up, at the vault, as if it still has something to report.' },
      { speaker: NARRATOR, text: 'There is no rune on it. This was no ward. It was a watchman.' },
    ],
  },
  {
    id: 'watchmen',
    title: 'A watchman in the sky',
    when: 'town',
    ready: beaten(17),
    lines: [
      { speaker: ASKE, text: 'A watchman, inside the sky, with a hundred eyes. Watching for whom? And reporting to whom?' },
      { speaker: HRODNA, text: 'You know to whom, healer. The ravens are only the newest of their eyes.' },
      { speaker: SIGRID, text: 'Then they have seen every Wayfinder who ever came this far. Hallvard\'s people too.' },
    ],
  },
  {
    id: 'stormcrown',
    title: 'Where storms are born',
    when: 'floor',
    ready: on(18),
    lines: [
      { speaker: NARRATOR, text: 'Thunderheads gather under the vault and drift away over your heads, toward Midgard.' },
      { speaker: NARRATOR, text: 'Every storm that ever broke over Lindholm started here, in a thought of the sleeping giant.' },
    ],
  },
  {
    id: 'dreamingDome',
    title: 'The dreaming heart',
    when: 'floor',
    ready: on(19),
    lines: [
      { speaker: NARRATOR, text: 'At the top of the skull the clouds fold together into something like a heart, or a mind. It glows faintly, and it is warm.' },
      { speaker: NARRATOR, text: 'A golden rune is pressed into it, deep. The fourth ward. It does not hold him down like the others. It keeps him asleep.' },
    ],
  },
  {
    id: 'dreamwardenFallen',
    title: 'The fourth ward',
    when: 'victory',
    ready: beaten(19),
    lines: [
      { speaker: NARRATOR, text: 'The Dreamwarden comes apart like fog in the morning. The rune cracks, and a sound fills the whole skull at once.' },
      { speaker: NARRATOR, text: 'A breath. Long, slow, and deep. The first one Ymir has taken since the world was made from him.' },
      { speaker: NARRATOR, text: 'Far above, the horn sounds three times.' },
    ],
  },
  {
    id: 'fourthWard',
    title: 'He breathes',
    when: 'town',
    ready: beaten(19),
    lines: [
      { speaker: SIGRID, text: 'The ground shook all night. The well water tastes of salt. And the clouds over Lindholm moved against the wind.' },
      { speaker: HRODNA, text: 'He is not awake. He is dreaming lighter. Let him dream of his children, of the realms that loved him. A giant who remembers us will not crush us.' },
      { speaker: EIRA, text: 'Or let him sleep again. Give me the shard of the dream and I will put it back where it belongs. A sleeping giant hurts no one.' },
      { speaker: BRYNJA, text: 'Or we keep watch ourselves. Lindholm stands on him. We should be the ones to know when he stirs.' },
    ],
    choice: {
      prompt: 'What do you do with the giant\'s dream?',
      options: [
        {
          id: 'hrodna', label: 'Let him dream of the realms', leaning: 'realms',
          reply: [
            { speaker: HRODNA, text: 'Then I will sing to him from the Frost Court, as our grandmothers did. Perhaps he will hear it.' },
          ],
        },
        {
          id: 'eira', label: 'Let Eira put him back to sleep', leaning: 'asgard',
          reply: [
            { speaker: EIRA, text: 'Thank you. Sleep is a mercy. For him, and for you.' },
            { speaker: ASKE, text: 'She held the shard as if she had held one before.' },
          ],
        },
        {
          id: 'watch', label: 'Lindholm keeps watch', leaning: 'midgard',
          reply: [
            { speaker: BRYNJA, text: 'A watch-fire on the Oath Hall, then, and a Wayfinder awake beside it every night. We will know before anyone else does.' },
          ],
        },
      ],
    },
  },
  {
    id: 'chapterFourEnd',
    title: 'Lighter sleep',
    when: 'town',
    ready: (g) => beaten(19)(g) && g.state.story.includes('fourthWard'),
    lines: [
      { speaker: SIGRID, text: 'Four wards broken. Ymir breathes in his sleep, Asgard has stopped pretending not to watch, and every realm is waiting to see what we do next.' },
      { speaker: SIGRID, text: 'Rest while you can, Wayfinders. The deep is not done with us.' },
    ],
  },

  // ── Chapter V: Ginnungagap ─────────────────────────────────────────────────
  // A proposal in Thijs' line (see docs/verhaal.md); he may change all of it.
  {
    id: 'gapArrival',
    title: 'The gap before the world',
    when: 'floor',
    ready: on(20),
    lines: [
      { speaker: NARRATOR, text: 'Past the Dreamwarden the roots stop climbing. They turn and fall, down through bone and cloud, until there is no more bone.' },
      { speaker: NARRATOR, text: 'Cold from one side, heat from the other, and between them nothing at all, very wide. Ginnungagap: the gap that was here before the world.' },
      { speaker: NARRATOR, text: 'Midgard was built across it like a lid on a well. You are standing under the lid.' },
      { speaker: NARRATOR, text: 'Frozen rivers run out of the north into the dark. The old songs call them Élivágar. Where their venom froze, the rime is still alive.' },
    ],
  },
  {
    id: 'gapRealms',
    title: 'A song in the ice',
    when: 'floor',
    ready: (g) => on(20)(g) && road(g) === 'realms',
    lines: [
      { speaker: NARRATOR, text: 'The ice at the stair hums. It is a song, very low: the one Hrodna sings to the sleeping giant. The frost carried it all the way down here.' },
    ],
  },
  {
    id: 'gapAsgard',
    title: 'The flame bows',
    when: 'floor',
    ready: (g) => on(20)(g) && road(g) === 'asgard',
    lines: [
      { speaker: NARRATOR, text: 'Eira\'s little flame, which leaned up toward the sky in the skull, bends down here. It points into the gap, and it shivers.' },
    ],
  },
  {
    id: 'gapMidgard',
    title: 'The watch-fire',
    when: 'floor',
    ready: (g) => on(20)(g) && road(g) === 'midgard',
    lines: [
      { speaker: NARRATOR, text: 'Far, far above, through every layer of the giant, you can still make out one warm point of light. Lindholm\'s watch-fire. They kept it burning.' },
    ],
  },
  {
    id: 'rimeDrifts',
    title: 'Shapes in the rime',
    when: 'floor',
    ready: on(21),
    lines: [
      { speaker: NARRATOR, text: 'There are shapes in the rime drifts. A hand. A knee. Half a face. As if the frost tried to become someone, over and over, and almost managed.' },
    ],
  },
  {
    id: 'sparkfall',
    title: 'Sparks from the south',
    when: 'floor',
    ready: on(22),
    lines: [
      { speaker: NARRATOR, text: 'Sparks blow over the ice from the south, from a country that is only fire. Where they land, the rime sighs, and something underneath it stirs.' },
    ],
  },
  {
    id: 'rimewellFallen',
    title: 'A glint of gold',
    when: 'victory',
    ready: beaten(22),
    lines: [
      { speaker: NARRATOR, text: 'The Rimewell cracks from top to bottom, and the last of the venom runs out of it, thin as thread.' },
      { speaker: NARRATOR, text: 'For a moment the ice at its heart glows gold, the gold of the wards.' },
      { speaker: NARRATOR, text: 'And you remember something you never saw: a vast voice laughing, and the ice cracking for joy. Then it is gone.' },
    ],
  },
  {
    id: 'goldInTheIce',
    title: 'Someone remembers',
    when: 'town',
    ready: beaten(22),
    lines: [
      { speaker: ASKE, text: 'You saw it too? The gold, and the laughing? I have not slept since.' },
      { speaker: HRODNA, text: 'That was no ward. It was a memory, caught in the ice. Old memories sink, healer, and down there is where everything began.' },
      { speaker: SIGRID, text: 'Whose memory?' },
      { speaker: HRODNA, text: 'I do not know. And that frightens me more than Asgard does.' },
      { speaker: NARRATOR, text: 'Eira says nothing. For once, she does not look at you.' },
    ],
  },
  {
    id: 'theThaw',
    title: 'The thaw',
    when: 'floor',
    ready: on(23),
    lines: [
      { speaker: NARRATOR, text: 'Here the ice from the north meets the fire from the south. The floor runs with meltwater, and the steam is as warm as breath.' },
      { speaker: NARRATOR, text: 'The songs say this is where the drops quickened, and the first giant woke.' },
    ],
  },
  {
    id: 'ymirsCradle',
    title: 'The cradle',
    when: 'floor',
    ready: on(24),
    lines: [
      { speaker: NARRATOR, text: 'At the very bottom of the gap: a hollow in the ice as big as a hall, in the shape of someone who once lay here curled up. Ymir\'s cradle.' },
      { speaker: NARRATOR, text: 'A golden rune is set across the gap above it, like a bar across a door: the fifth ward.' },
      { speaker: NARRATOR, text: 'It does not hold Ymir. It holds the gap shut, so that nothing new can ever be born here again.' },
    ],
  },
  {
    id: 'gapwardenFallen',
    title: 'The fifth ward',
    when: 'victory',
    ready: beaten(24),
    lines: [
      { speaker: NARRATOR, text: 'The Gapwarden comes apart, half into frost and half into cinders, and the rune above the cradle breaks.' },
      { speaker: NARRATOR, text: 'A warm wind meets a cold one, the way it did before there was anything. In the hollow, one drop of rime begins, very slowly, to move.' },
      { speaker: NARRATOR, text: 'Far above, the horn sounds four times.' },
    ],
  },
  {
    id: 'fifthWard',
    title: 'Something stirs',
    when: 'town',
    ready: beaten(24),
    lines: [
      { speaker: SIGRID, text: 'Five wards. Something new is stirring at the bottom of the world, and it is stirring because of us.' },
      { speaker: HRODNA, text: 'A giant, born the old way, the first in an age. Let the realms raise it. It will grow up remembering that Midgard set it free.' },
      { speaker: EIRA, text: 'Or let me close the gap again. What is born there will not be yours, or theirs. It will only be hungry. Give me the seal.' },
      { speaker: BRYNJA, text: 'Or Lindholm takes it in. A child is a child. We raise it ourselves, and it learns from us what Midgard is.' },
    ],
    choice: {
      prompt: 'What becomes of what stirs in the gap?',
      options: [
        {
          id: 'hrodna', label: 'Let the realms raise it', leaning: 'realms',
          reply: [
            { speaker: HRODNA, text: 'The Frost Court will send its oldest nurse. And it will hear, every day, who opened the door.' },
          ],
        },
        {
          id: 'eira', label: 'Let Eira close the gap', leaning: 'asgard',
          reply: [
            { speaker: EIRA, text: 'It is kinder this way. Believe me. I have seen what the gap makes.' },
            { speaker: ASKE, text: 'Seen? She speaks as if she had been there when it was open.' },
          ],
        },
        {
          id: 'brynja', label: 'Lindholm raises it', leaning: 'midgard',
          reply: [
            { speaker: BRYNJA, text: 'Then it gets a cot by the hearth in the Oath Hall, and a name when it is ready for one. Not before.' },
          ],
        },
      ],
    },
  },
  {
    id: 'echoHall',
    title: 'The stone remembers',
    when: 'town',
    ready: (g) => beaten(24)(g) && g.state.story.includes('fifthWard'),
    lines: [
      { speaker: TORVALD, text: 'Since the fifth ward broke, the old root under my workshop rings like a bell.' },
      { speaker: TORVALD, text: 'Go down there and you hear them: every guardian you ever fought, still fighting, in the stone.' },
      { speaker: TORVALD, text: 'I have cleared it out and put a hearth in. The Hall of Echoes, I call it. The stories say embers from a dream make the echoes rise.' },
      { speaker: TORVALD, text: 'The Gapwarden left some behind, did it not? Dream Embers. Ten will wake one echo. Where more come from, only the deep knows.' },
    ],
  },
  {
    id: 'chapterFiveEnd',
    title: 'Below the beginning',
    when: 'town',
    ready: (g) => beaten(24)(g) && g.state.story.includes('echoHall'),
    lines: [
      { speaker: SIGRID, text: 'Five wards broken, and the roots go on down. Past the beginning of everything. I did not know there was a past the beginning.' },
      { speaker: SIGRID, text: 'Whatever comes next, it was here before the gods. Go carefully, Wayfinders.' },
    ],
  },

  // ── Chapter VI: Hvergelmir ─────────────────────────────────────────────────
  // A proposal in Thijs' line (see docs/verhaal.md); he may change all of it.
  {
    id: 'niflArrival',
    title: 'The mist-home',
    when: 'floor',
    ready: on(25),
    lines: [
      { speaker: NARRATOR, text: 'Below the cradle the roots go down into a mist so thick it drips. Niflheim, the old songs call it: the mist-home, older than the gods.' },
      { speaker: NARRATOR, text: 'Somewhere ahead, a roar like a hundred waterfalls at once. And above, through the mist, a root so vast it could be the sky.' },
    ],
  },
  {
    id: 'niflRealms',
    title: 'The oldest mark',
    when: 'floor',
    ready: (g) => on(25)(g) && road(g) === 'realms',
    lines: [
      { speaker: NARRATOR, text: 'Even the Frost Court never came this far. But someone did: at the stair is a rune of the old giants, worn almost smooth.' },
    ],
  },
  {
    id: 'niflAsgard',
    title: 'The flame goes out',
    when: 'floor',
    ready: (g) => on(25)(g) && road(g) === 'asgard',
    lines: [
      { speaker: NARRATOR, text: 'Eira\'s flame, which has never once gone out, gutters in the mist and dies. Then, slowly, as you stare at it, it lights itself again.' },
    ],
  },
  {
    id: 'niflMidgard',
    title: 'An old echo',
    when: 'floor',
    ready: (g) => on(25)(g) && road(g) === 'midgard',
    lines: [
      { speaker: NARRATOR, text: 'In the mist you hear Lindholm\'s horn, faint and far. No: it is an echo, and an old one. Something down here keeps every sound it ever heard.' },
    ],
  },
  {
    id: 'gjollBank',
    title: 'The loud river',
    when: 'floor',
    ready: on(26),
    lines: [
      { speaker: NARRATOR, text: 'The river Gjöll runs out of the mist, black and cold and so loud you have to shout.' },
      { speaker: NARRATOR, text: 'Far downstream a bridge glints gold above the water, and grey shapes cross it, one by one. The road of the dead. Not your road. Not yet.' },
    ],
  },
  {
    id: 'hvergelmir',
    title: 'The roaring kettle',
    when: 'floor',
    ready: on(27),
    lines: [
      { speaker: NARRATOR, text: 'Hvergelmir: the spring every river in the nine worlds comes from. It boils and roars and never runs dry.' },
      { speaker: NARRATOR, text: 'In a side pool, three heads rest on the water, eyes half closed. Since you came down here, you have been yawning.' },
    ],
  },
  {
    id: 'svafnirFallen',
    title: 'The spring holds its breath',
    when: 'victory',
    ready: beaten(27),
    lines: [
      { speaker: NARRATOR, text: 'Sváfnir\'s three heads sink into the boiling water, and the roar of the spring changes, as if it had been holding its breath for an age.' },
    ],
  },
  {
    id: 'sleepersWake',
    title: 'The sleepers wake',
    when: 'town',
    ready: beaten(27),
    lines: [
      { speaker: SIGRID, text: 'They woke, every sleeper in Lindholm, all at the same moment. Old Hjalmar says he dreamt of a watchman who fell asleep at his post.' },
      { speaker: HRODNA, text: 'Every people has that story. The watchman who slept when he should have watched, and what came through while he did.' },
      { speaker: NARRATOR, text: 'Eira gets up without a word and goes out into the cold. Nobody sees her come back.' },
    ],
  },
  {
    id: 'serpentRoots',
    title: 'Things on the roots',
    when: 'floor',
    ready: on(28),
    lines: [
      { speaker: NARRATOR, text: 'The roots here are as thick as the Oath Hall, and they move. No. Things move on them, long and grey, winding slowly in and out of the mist.' },
    ],
  },
  {
    id: 'gnawedRoot',
    title: 'What the dragon gnawed',
    when: 'floor',
    ready: on(29),
    lines: [
      { speaker: NARRATOR, text: 'The great root of the Tree, gnawed nearly through. In the deepest gouges something glints gold.' },
      { speaker: NARRATOR, text: 'A rune, cut into the root itself: the sixth ward. The gouges run all around it.' },
      { speaker: NARRATOR, text: 'Níðhöggr has not been gnawing at the Tree. For as long as there has been a world, it has been gnawing at the ward.' },
    ],
  },
  {
    id: 'nidhoggFallen',
    title: 'The sixth ward',
    when: 'victory',
    ready: beaten(29),
    lines: [
      { speaker: NARRATOR, text: 'Níðhöggr falls, and coils as it falls, around the root, as if to guard it. The rune it gnawed at for an age cracks at last under your blades.' },
      { speaker: NARRATOR, text: 'Far above, the horn sounds five times. And higher still, very faint, something small chatters, as if carrying the news up the Tree.' },
    ],
  },
  {
    id: 'sixthWard',
    title: 'The dragon\'s side',
    when: 'town',
    ready: beaten(29),
    lines: [
      { speaker: SIGRID, text: 'Six wards. And the oldest monster in every song was doing what we do, all along? I do not know what to feel.' },
      { speaker: HRODNA, text: 'Níðhöggr fought the gods\' locks since the world began. Give its body to the realms, Wayfinders. It will be buried with honour.' },
      { speaker: EIRA, text: 'It gnawed at the root that holds all nine worlds. Burn it, and close the wound in the root with its ashes, before the Tree sickens.' },
      { speaker: BRYNJA, text: 'Or leave it where it fell, beside the root it fought for, and carve its name on the Wayfinders\' Stone. Lindholm remembers who helped.' },
    ],
    choice: {
      prompt: 'What becomes of Níðhöggr?',
      options: [
        {
          id: 'hrodna', label: 'Give it to the realms', leaning: 'realms',
          reply: [
            { speaker: HRODNA, text: 'The Frost Court will sing it down. No one has sung for that dragon in a very long time.' },
          ],
        },
        {
          id: 'eira', label: 'Let Eira burn it and heal the root', leaning: 'asgard',
          reply: [
            { speaker: EIRA, text: 'Thank you. The Tree must stand. Whatever else happens, the Tree must stand.' },
            { speaker: ASKE, text: 'She looked at the ashes the way you look at an old enemy who has finally gone quiet. Not glad. Tired.' },
          ],
        },
        {
          id: 'brynja', label: 'Carve its name in Lindholm', leaning: 'midgard',
          reply: [
            { speaker: BRYNJA, text: 'Torvald will need a bigger chisel. And longer than one winter to get the spelling right.' },
          ],
        },
      ],
    },
  },
  {
    id: 'chapterSixEnd',
    title: 'Toward the dead',
    when: 'town',
    ready: (g) => beaten(29)(g) && g.state.story.includes('sixthWard'),
    lines: [
      { speaker: SIGRID, text: 'Six wards. The roots go on below the mist, Hrodna says, down along the loud river, to where the dead are going.' },
      { speaker: SIGRID, text: 'I had hoped we would never need to walk that road while we still had breath. Rest, Wayfinders. And keep your lanterns full.' },
    ],
  },
];

/** The road the party's choices lean toward most; a tie goes to Midgard's own third way. */
function road(g: Game): Leaning {
  const l = leanings(g);
  if (l.realms > l.asgard && l.realms > l.midgard) return 'realms';
  if (l.asgard > l.realms && l.asgard > l.midgard) return 'asgard';
  return 'midgard';
}

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
