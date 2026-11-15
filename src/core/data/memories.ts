/**
 * Memories: glimpses of how Midgard was made, and of Ymir before it. Written by Thijs (see docs/verhaal.md).
 *
 * Rules for the texts:
 * - In the first round of the Rootdeep they come from someone who is never named: the `text` of a shard never names,
 *   describes or hints at who it is.
 * - From the second round on (after chapter X, when Ymir dreams the world again) the same shards are found again, and
 *   now show whose memory it is: Heimdall's. The `heimdall` text is his part in what happened and what he thinks of it
 *   now (his regrets, too).
 * - Each memory has SHARDS_PER_MEMORY shards; a shard is a short text (one to three sentences) and may have a picture
 *   (a real photo through scripts/photo-to-art.py, under art/memories/; never AI-made).
 * - Shards are found one at a time and in no fixed order, so each one should make sense on its own, and the whole
 *   memory should read well once all of its shards are found. The LAST shard always comes last (only once all the
 *   others are found): until then it stays vague who the memory is about; the last shard makes it clear.
 * - Players should come to love Ymir, and regret a little that Midgard was made from him.
 *
 * Until memories are written here, no shard can drop: the game needs nothing else to start using them.
 */
export interface MemoryShard {
  /** As found in the first round: whose memory it is stays hidden. */
  text: string;
  /** As found again in a later round: Heimdall's own part, and how he looks back on it. */
  heimdall?: string;
  /** A picture under art/memories/ (optional). */
  image?: string;
}

export interface MemoryDef {
  id: string;
  title: string;
  /** In reading order; found at random. */
  shards: MemoryShard[];
}

export const SHARDS_PER_MEMORY = 15;

export const MEMORIES: MemoryDef[] = [
  {
    // Written by Thijs (November 2026): the queen who walked to every realm to stop the war, told by someone who went
    // with her. Only the last shard says who she is.
    id: 'longWalk',
    title: 'The Long Walk',
    shards: [
      {
        text: "She left before dawn, without guards, and without telling her husband. Only I went with her. I did not ask why; I think she was glad of that.",
        heimdall: "No one sent me. I saw her slip past the bridge in the dark, and I left my post to follow her. It was the only time I ever did.",
      },
      {
        text: "She always seemed to know how things would end, and never said so. Walking beside her, I often wondered if she already knew how our journey would end.",
        heimdall: "She knew. And I think she knew what I would do with what I heard. She let me come anyway.",
      },
      {
        text: "In Vanaheim, the lord of the sea met us on the shore. He looked past me as if I were not there. \"You are welcome here. You always will be. It is your husband who is not.\"",
        heimdall: "Njörðr. He did not know me without my horn. Nobody did, that whole journey.",
      },
      {
        text: "She asked the people of the sea to leave their swords on the wall for one winter. Their lord looked at the water a long time. \"The sea remembers whose blood it is. So do we.\"",
        heimdall: "He was right. The sea has never forgotten. Neither have I.",
      },
      {
        text: "In Álfheim the halls were dimmed in mourning. The elf queen took her hands and did not look at me once. \"We would never harm you. But we cannot stand beside your people while the sky above us is a dead man's skull.\"",
        heimdall: "The elves sang for him three nights. That song is the only thing from the journey I kept to myself.",
      },
      {
        text: "The dwarves were born from the giant's flesh. Their eldest heard her out in silence while I stood at the door. \"We owe our lives to his death. That does not mean we forgive it.\"",
        heimdall: "Dvalinn. Of all the answers, his is the one I understood best.",
      },
      {
        text: "In Jötunheim we found the last giant of the old blood, who had outlived the flood of Ymir's blood in a hollow trunk with his wife. Every other giant had drowned. I could not meet his eyes.",
        heimdall: "Bergelmir. I had watched that flood rise from the bridge, and done nothing.",
      },
      {
        text: "\"You came into the house of the drowned with one companion and no sword,\" the giant said. \"That is why you will leave alive. We have nothing against you. Only against the choices your husband made.\"",
        heimdall: "Every ruler said it in their own words. Not one of them said it about me. They did not know yet who I was.",
      },
      {
        text: "The fire-lord kept us waiting at the border of Muspelheim for three days, in the heat. She never complained, so neither did I. On the fourth he came out. \"You are brave. I will remember it on the day the fire comes.\"",
        heimdall: "Surtr meant it as a kindness. I have feared that kindness ever since.",
      },
      {
        text: "The queen of the dead received us on a bench of bone. \"You are the only one of them who ever came down here to ask instead of to take. Ask, then. The answer is still no.\"",
        heimdall: "Then Hel looked at me, and smiled, and said nothing. She was the only one who knew me.",
      },
      {
        text: "She never argued with their anger. \"You have every right to grieve him,\" she told each of them. \"I only ask that my people do not pay for what one man decided.\" I heard her say it six times. It never sounded tired.",
        heimdall: "One man decided. Three struck. And one walked beside her, listening.",
      },
      {
        text: "At every court she asked how many of theirs would die if war came, and wrote the numbers down. On the way home she showed them to me. No one at home ever asked to see them.",
        heimdall: "Odin never asked her. He asked me. And I told him every number.",
      },
      {
        text: "To every ruler she said the same last words: \"When this is over, whatever is left of us, let us talk again about how to go on.\" Most of them nodded. None of them smiled.",
        heimdall: "On the way home she asked me to help keep one road open for after. Later I spoke the spell that closed them all.",
      },
      {
        text: "We came home with her cloak worn through and her hands empty. She went to her husband's hall to tell him everything. He had not even noticed she was gone.",
        heimdall: "Before she reached his hall, I had already told him what the realms had said. That night he armed the walls. Her words came home ahead of her, through me.",
      },
      {
        text: "That night she sat alone at her spinning wheel, as she always did when she could not sleep. The thread kept breaking. Her name was Frigg, Queen of Asgard, wife of Odin, and in the morning the realms marched on her home.",
        heimdall: "She never once asked me what I had told him. I think that was the cruellest kindness of all.",
      },
    ],
  },
];

export const MEMORY_BY_ID: Record<string, MemoryDef> = Object.fromEntries(MEMORIES.map((m) => [m.id, m]));
