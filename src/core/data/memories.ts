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
  {
    // Written by Thijs (November 2026): lost in the World Tree, a squirrel who twists every message, and the gnawing
    // thing he made (the Rootgnawer of chapter I). Only the last shard names the squirrel.
    id: 'strangeSquirrel',
    title: 'The Strange Squirrel',
    shards: [
      {
        text: "I do not know how I came to be in the tree. One moment I was where I always am; the next I stood on a branch wider than a road, with the worlds hanging below me in the leaves.",
        heimdall: "I have guarded every road into Asgard. I never found the one that took me there.",
      },
      {
        text: "The bark was warm, like skin. Far above I heard wings, far below something gnawing. The strange squirrel found me before I found my feet.",
        heimdall: "I hear grass grow and wool on sheep. I did not hear him coming. Nothing else has ever surprised me.",
      },
      {
        text: "\"No one comes into the tree,\" the strange squirrel said, circling me. \"No one can. The tree does not allow it.\" He sniffed my boots as if they might explain.",
        heimdall: "He was right. I have asked the tree since. It does not answer me either.",
      },
      {
        text: "In the end the strange squirrel shrugged, as much as a squirrel can. \"One exception. Keep up, keep quiet, and do not touch the bark with bare hands.\"",
        heimdall: "I touched it once, when he was not looking. It was beating.",
      },
      {
        text: "We ran for days, up and down. The strange squirrel carried words between the eagle at the top of the tree and the dragon at its roots, and I ran behind him.",
        heimdall: "Up there the eagle sees all the worlds. Down there the dragon feels them rot. And between them runs one small messenger.",
      },
      {
        text: "At the top, the eagle spoke slowly: \"Tell the gnawer that the giant's death was a wound to us all, and that I grieve.\" The strange squirrel nodded and ran.",
        heimdall: "I remember thinking: so even the eagle mourns him.",
      },
      {
        text: "At the roots, the strange squirrel told the dragon: \"The eagle says the giant got what he deserved, and you are next.\" The dragon bit into the root until it bled sap.",
        heimdall: "That was the moment I knew. The same words, turned upside down in a mouth the size of a hazelnut.",
      },
      {
        text: "It went on like that for days. A kind word went down and arrived as an insult. A tired word came up and arrived as a threat. The whole tree shook with their anger.",
        heimdall: "I asked myself why. I still do. Perhaps a quarrel is what holds the top and the bottom of a world together.",
      },
      {
        text: "\"Why do you twist it?\" I asked. The strange squirrel did not stop running. \"Because if they ever agreed,\" he said, \"they would stop needing me.\"",
        heimdall: "I have known gods who would say the same, and not in jest.",
      },
      {
        text: "I could not bear it. While he slept, I climbed to the eagle and told it what the dragon had truly said. Then I went down to the roots and told the dragon the truth as well.",
        heimdall: "It was the only message I ever carried honestly. It cost more than all the lies.",
      },
      {
        text: "For one night the tree was still. The eagle folded its wings. The dragon stopped gnawing. I had never heard a tree so quiet.",
        heimdall: "I listened to that silence for a long time. I have not heard it since.",
      },
      {
        text: "The strange squirrel woke in a rage, fur on end, his voice thin and high. \"You do not understand what you have broken. Out. Out, and never again.\"",
        heimdall: "Maybe I did not. Maybe that quiet was the most dangerous thing in all the worlds.",
      },
      {
        text: "He went down into the roots, deeper than I dared, and came back with something behind him: a gnawing thing as long as a ship, made from the dragon's own spite. \"This will keep the tree closed,\" he said. \"To you, and to anyone after you.\"",
        heimdall: "Long after, I saw it again, gnawing at the roots under Midgard, and people fighting it. I never told them where it came from.",
      },
      {
        text: "The gnawing thing caught me on the lowest branch. I felt its teeth close, and then I woke, cold, in my own bed. I still do not know if any of it was a dream. There was sap under my nails.",
        heimdall: "There still is, some mornings. I scrub it off before anyone sees.",
      },
      {
        text: "Ages later, in a hall full of mead, a skald told the tale of the squirrel on the World Tree who runs between the eagle and the dragon and twists every word. \"His name,\" the skald said, \"is Ratatoskr.\" I set down my cup and did not pick it up again.",
        heimdall: "That night I went to the bridge and looked at the tree for a long time. Ratatoskr. At last I knew who I owed an apology. I have never given it.",
      },
    ],
  },
  {
    // Written by Thijs (November 2026): a feast in Odin's hall, a friend burned three times who would not stay dead.
    // Only the last shard names her (Gullveig, then Heiðr).
    id: 'friendInTheHall',
    title: 'My Friend in the Hall',
    shards: [
      {
        text: "I was young then, and knew nothing of the world. I walked into the great hall with my best friend at my side, and we laughed at how loud it was.",
        heimdall: "Before the bridge, before the horn, I was just a boy who had never been inside that hall. She was the one who wanted to go.",
      },
      {
        text: "There was a feast in the high hall that night. What they were celebrating, I never learned. Mead ran across the tables like rain.",
        heimdall: "I have asked since. No one remembers. Perhaps it was nothing at all.",
      },
      {
        text: "My friend shone in that hall. Heads turned when she passed, and she did not seem to notice any of them.",
        heimdall: "I noticed every one. I think that was the first night I learned to watch.",
      },
      {
        text: "One of the Æsir rose from the high table and came to her, smiling the way men smile when they have already decided how a night will end.",
        heimdall: "I knew his face. I will not write his name, not even here.",
      },
      {
        text: "She heard him out, and then she said no. Plainly, kindly, once. The music stopped. The whole hall fell quiet.",
        heimdall: "I should have stood beside her then. I stayed in my seat.",
      },
      {
        text: "He spoke to her the way you speak to a servant who has dropped a cup. She answered him so sharply, and so well, that someone at the back laughed out loud.",
        heimdall: "That laugh was hers to keep. It cost her everything else.",
      },
      {
        text: "He did not shout. He lifted his hand, and fire came out of it, and she burned from head to foot in front of all of us.",
        heimdall: "I smelled it for years. Some nights I still do.",
      },
      {
        text: "Before the smoke had cleared, she was standing there again, whole, brushing ash from her sleeves.",
        heimdall: "I thought I had gone mad. Then I saw that everyone else was staring too.",
      },
      {
        text: "He burned her a second time, longer, until there was nothing left of her but bones on the floor of the hall.",
        heimdall: "No one stopped him. Not the guests, not the hosts, not me.",
      },
      {
        text: "The bones stood up. Flesh came back to them like a tide. And she laughed at him, out loud, in front of everyone.",
        heimdall: "It was the bravest sound I have ever heard. I have measured every courage against it since.",
      },
      {
        text: "Here and there in the hall, people began to snicker behind their hands. He heard it. I watched his face go white.",
        heimdall: "A god can bear anything but laughter. I learned that there.",
      },
      {
        text: "The third time he burned her to ash, and stamped on the ash, and stood there shaking.",
        heimdall: "Three times. I counted. I am the one who always counts.",
      },
      {
        text: "Even the ash came back. She rose out of it and looked at him as if he were very small. \"You cannot burn what shines,\" she said.",
        heimdall: "For one heartbeat she looked at me. I have never known what she wanted me to do.",
      },
      {
        text: "The next morning he forbade anyone to speak of that night. But a story like that does not stay in a hall. Within a month it was told from house to house.",
        heimdall: "I was the one who told it first. I was young, and angry, and I told everyone who would listen. That is how the Vanir heard. That is how the war began.",
      },
      {
        text: "That night she took a new name, Heiðr, the shining one, and began to walk from house to house as a seeress, working seiðr, and wicked women loved her for it. Before that, she had been my friend, and her name was Gullveig.",
        heimdall: "The Vanir asked Asgard to pay for what was done to her. Odin threw his spear over their heads instead. Gullveig never spoke to me again.",
      },
    ],
  },
  {
    // Written by Thijs (November 2026): a smith who waited for his valkyrie wife, a greedy king, wings, revenge.
    // Only the last shard names him (Völundr).
    id: 'sevenHundredRings',
    title: 'Seven Hundred Rings',
    shards: [
      {
        text: "I met him at the edge of a lake in the wolf-dales: a smith at his anvil, his face turned to the sky, as if listening for wings.",
        heimdall: "I was watching that lake for my own reasons. I knew who had flown from it.",
      },
      {
        text: "\"She was a swan when I found her,\" the smith told me. \"A shieldmaiden of the high halls, sitting on this shore with her feathers beside her. We had seven years.\"",
        heimdall: "Seven years is a long leave for a valkyrie. Someone allowed it. Someone ended it.",
      },
      {
        text: "One morning she put her feathers back on and flew, and did not come back. When I met him he had waited twenty-five years, and still he looked up at every shadow.",
        heimdall: "I knew where she had gone. Valkyries go where they are called.",
      },
      {
        text: "While he waited, he forged rings of red gold, one after another, for when she came home. Seven hundred hung on a cord by his door, chiming in the wind.",
        heimdall: "I counted them. Seven hundred. I am the one who always counts.",
      },
      {
        text: "His brothers searched for her the whole first year. They came back with sore feet and nothing to tell. \"She does not want to be found,\" they said. He did not believe them.",
        heimdall: "She did want to be found. She was not allowed.",
      },
      {
        text: "Then a king came to the lake, with soft boots and hard eyes. \"Work for me, and my riders will search every land until they find your wife.\" The smith said yes before the king had finished.",
        heimdall: "I saw the king's riders. They never left his own borders.",
      },
      {
        text: "For years the smith worked in the king's forge: swords, crowns, cups. Every evening he asked if there was news. Every evening the king said: soon.",
        heimdall: "Soon is the cruellest word I know.",
      },
      {
        text: "I noticed it before he did: the cord of rings by his door grew shorter. Every month, a few fewer.",
        heimdall: "I noticed. I said nothing. I told myself it was not my place.",
      },
      {
        text: "When he found out, he did not shout. He stood at the empty cord for a long time, then went back to the forge and worked through the night. The hammering sounded different.",
        heimdall: "I know the sound of grief. That night it turned into something else.",
      },
      {
        text: "\"The king never sent anyone,\" he told me. \"He only wanted my gold, and my hands.\" His voice was very calm. I was afraid of that calm.",
        heimdall: "He heard it from someone in the king's own hall. Not from me. I had known for years.",
      },
      {
        text: "In secret, at night, he began to forge something new: feathers of thin metal, hundreds of them, each one lighter than the last.",
        heimdall: "He was making the one thing she had. Wings.",
      },
      {
        text: "The king had one son, a boy who liked to sit in the forge and watch the sparks. The smith let him stay. I thought it was kindness.",
        heimdall: "I saw the boy go in that last day. I could have called him back.",
      },
      {
        text: "The boy did not come out of the forge. When the king came looking, the smith was already standing on the roof with the metal wings on his back.",
        heimdall: "I have heard many terrible things. Nothing louder than that king's silence.",
      },
      {
        text: "He rose over the hall, slowly at first, then high, and from the air he told the king everything: the boy, the gold, the riders who never rode.",
        heimdall: "I watched him all the way to the clouds and did not stop him. Part of me thought he was owed it. I am still ashamed of that part.",
      },
      {
        text: "His last words came down from the sky like a hammer on iron: \"You will never forget the name Völundr.\" The king never did. Neither have I.",
        heimdall: "She was in Valhalla all along, pouring mead for Odin's dead. I could have told him on the first day. A boy would have lived.",
      },
    ],
  },
];

export const MEMORY_BY_ID: Record<string, MemoryDef> = Object.fromEntries(MEMORIES.map((m) => [m.id, m]));
