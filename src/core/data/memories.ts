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
  /** Who the memory is about. Shown only once all of its shards are found (it is named in the last shard only). */
  subject: string;
  /** In reading order; found at random. */
  shards: MemoryShard[];
  /** A picture for the whole memory, under public/art/ (a real photo through scripts/photo-to-art.py; never AI-made). */
  image?: string;
}

export const SHARDS_PER_MEMORY = 15;

export const MEMORIES: MemoryDef[] = [
  {
    // Written by Thijs (November 2026): the queen who walked to every realm to stop the war, told by someone who went
    // with her. Only the last shard says who she is.
    id: 'longWalk',
    title: 'The Long Walk',
    subject: 'Frigg',
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
    subject: 'Ratatoskr',
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
    subject: 'Gullveig',
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
    subject: 'Völundr',
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
  {
    // Written by Thijs (November 2026). Freyr: a young god of harvest and peace, lost for years, found again in Álfheim, where he ended its war with a field. Named only in the last shard.
    id: 'seedsAndSwords',
    title: "Seeds and Swords",
    subject: 'Freyr',
    shards: [
      {
        text: "The first time I saw him, he was knee-deep in a barley field, laughing, and the barley grew while he laughed.",
        heimdall: "I had come to that field to watch the realms. I stayed to watch him.",
      },
      {
        text: "He was new to it then, the harvest and the peace. He asked me how you make two angry farmers shake hands. I did not know. He found out anyway.",
        heimdall: "I was the one who was supposed to know such things. He learned it faster than I ever did.",
      },
      {
        text: "Wherever he walked, fences came down and grain came up. Even the crows seemed to argue less.",
        heimdall: "I have watched over many worlds. None of them ever grew like that field.",
      },
      {
        text: "Then years went by in which I did not see him. Watching is a lonely trade; I told myself he was busy, and so was I.",
        heimdall: "I could have looked for him any day. I see everything. I chose not to look.",
      },
      {
        text: "When at last I went back to the field, it was full of weeds. The people there said he was gone. \"Not dead,\" they said. \"Just not here.\"",
        heimdall: "Not here. Two words, and I felt how much I had missed him.",
      },
      {
        text: "So I went looking through the realms, asking at every gate. Most had heard of him. No one knew where he was.",
        heimdall: "It was the first time I searched instead of watched. I was not good at it.",
      },
      {
        text: "In Vanaheim they told me he had been given a gift: a whole realm, for his first tooth, as the old custom goes.",
        heimdall: "A realm as a tooth-gift. Asgard gave it, and gave it gladly. It was the kindest thing it ever gave away.",
      },
      {
        text: "The realm was Álfheim, the land of the light elves. When I heard it, I was afraid: Álfheim had been at war with itself for longer than anyone could count.",
        heimdall: "I had heard that war from the bridge every night. I had done nothing about it.",
      },
      {
        text: "I crossed into Álfheim expecting smoke. I found orchards.",
        heimdall: "I stood at the border a long time, sure I was in the wrong place.",
      },
      {
        text: "The elves told me how it went: a stranger came with seed in his pockets and no sword at all, sat down between the two armies, and began to plant.",
        heimdall: "Who sits down between two armies? Only someone who believes they will not strike.",
      },
      {
        text: "\"They tried to drive him off,\" an old elf said. \"But nothing grows faster than what he plants. Soon there was a field between us, and nobody wanted to fight in it.\"",
        heimdall: "I have watched every war. I never once thought of putting a field in the middle of one.",
      },
      {
        text: "It took years. Feasts first, then marriages, then children who had never seen a battle. The war did not end; it was grown over.",
        heimdall: "Peace grown, not won. I wish I had learned the difference sooner.",
      },
      {
        text: "I found him in the middle of an orchard, older now, with a crown of wheat on his head that the elves had made him wear.",
        heimdall: "He knew me at once, though I had changed my face. He is the only one who ever did.",
      },
      {
        text: "He gave me an apple and asked why it had taken me so long. I had no good answer. We sat together until dark.",
        heimdall: "The true answer was that I was ashamed of watching the elves' war so long and doing nothing. I did not say it.",
      },
      {
        text: "When I left, the elves sang him to sleep under the trees. Freyr, they call him: lord of Álfheim, the god who ended their war with a field.",
        heimdall: "Of all the gods, he is the one I would have wanted to be. Instead I became the one who watches.",
      },
    ],
  },
  {
    // Written by Thijs (November 2026). Ríg: a traveller from the bright halls who sorted people into thralls, farmers and earls and taught one son the runes, and regretted it. Told as if by someone else; in the second round it is Heimdall himself.
    id: 'theTraveller',
    title: "The Traveller",
    subject: 'Ríg',
    shards: [
      {
        text: "Long ago a traveller left the bright halls to walk in the new realm of people, to see with his own eyes what had been made out of the giant.",
        heimdall: "I told no one I was going. It is easier to walk among people when nobody knows your name.",
      },
      {
        text: "The traveller came first to a poor hut, where an old couple shared their thin bread with him and gave him their bed.",
        heimdall: "They had almost nothing. They gave me half.",
      },
      {
        text: "He stayed three nights. When he had gone, a child was born in that hut: dark-skinned and hard-handed, made, they said, for heavy work.",
        heimdall: "I called that child a thrall in my heart before it could walk. Why did I decide that?",
      },
      {
        text: "Next he came to a farmhouse, clean and plain, where a man was building a loom and a woman was spinning. They too gave him their bed.",
        heimdall: "Honest people. I liked them. That did not stop me from sorting them.",
      },
      {
        text: "From that house came a son with red cheeks and quick eyes, born to plough and to build: a free farmer.",
        heimdall: "Karl. A good name for a good man. I gave it to him like a label on a jar.",
      },
      {
        text: "Last he came to a hall with silver on the table and fine linen on the bed, where the lord and lady wore rings. There he stayed longest.",
        heimdall: "I liked the silver. I am not proud of that.",
      },
      {
        text: "That son was fair and bold. The traveller came back for him when he was grown, taught him the runes, and called him his own.",
        heimdall: "Jarl. The only one I taught. The only one I called mine.",
      },
      {
        text: "So the people were sorted: thralls to carry, farmers to grow, earls to rule. The traveller thought he had brought them order.",
        heimdall: "I thought it was order. It was a ladder, and I had nailed down the rungs.",
      },
      {
        text: "The runes made the earl strong. He could read what others could not, and hold what others could not.",
        heimdall: "Knowledge is a sword. I handed it to one son and not to the other two.",
      },
      {
        text: "The thralls' children were born thralls, and their children after them. Most of them never grew old.",
        heimdall: "I counted their graves from the bridge. I always count.",
      },
      {
        text: "In one village the earl's men came with runes on their shields and burned it to the ground, because its thralls had refused to work.",
        heimdall: "Those runes were mine. I taught them to his grandfather's grandfather.",
      },
      {
        text: "Many years later the traveller went back to the poor hut. It was gone. No one remembered the old couple who had shared their bread.",
        heimdall: "I wanted to thank them. There was no one left to thank.",
      },
      {
        text: "I saw the traveller once more after that, sitting alone on a hill above a village of thralls. He did not move for a whole day.",
        heimdall: "That was me, on that hill. I did not know how to undo it. I still do not.",
      },
      {
        text: "He had only meant to visit: to see, and to be kind. Instead the realm of people still lives on the ladder he left behind.",
        heimdall: "Every lord in Midgard is my grandchild. So is every thrall.",
      },
      {
        text: "In Midgard they remember the traveller as Ríg, the father of the three kinds of people. I watched him regret it every day of his life.",
        heimdall: "Ríg was my walking name. I was Ríg. I am still ashamed.",
      },
    ],
  },
  {
    // Written by Thijs (November 2026). Þrymr: a giant king and the narrator, drunk, steal the thunder god's hammer; the trick to get it back, and the spell that followed. Named only in the last shard.
    id: 'nightOfMead',
    title: "A Night of Mead",
    subject: 'Þrymr',
    shards: [
      {
        text: "The giant king of the frost hills could drink like a river. That night I tried to keep up with him, which was my first mistake.",
        heimdall: "I had gone to Jötunheim to watch. I stayed to drink. Watching is thirsty work.",
      },
      {
        text: "Somewhere after the ninth horn, the giant king said what he wanted most in all the worlds: the thunder god's hammer, just to hold it once.",
        heimdall: "I should have laughed. Instead I said: why not?",
      },
      {
        text: "I knew where the hammer slept. I knew the way in and the way out, and which doors creaked. I told him all of it.",
        heimdall: "Knowing every way in is my whole trade. That night I sold it for mead.",
      },
      {
        text: "We crept into the thunder god's hall while he snored, and carried the hammer out between us, giggling like boys.",
        heimdall: "It took the two of us to lift it then. Remember that.",
      },
      {
        text: "The giant king buried it eight leagues under his hall, and we drank to it until the sun came up.",
        heimdall: "Eight leagues. He was very proud of the number.",
      },
      {
        text: "I woke the next day with a head like an anvil and a very bad feeling. The sky over the bright halls was black, and the thunder god was roaring.",
        heimdall: "I had stolen from my own house. I have done many foolish things. That was the loudest.",
      },
      {
        text: "The giant king remembered nothing. When I told him, he went pale, and then he went proud. \"Then I want something for it,\" he said. \"A bride.\"",
        heimdall: "He wanted the most beautiful of the goddesses. She threw him out of the room before he had finished asking.",
      },
      {
        text: "So we needed a trick. Someone had to get that hammer back without anyone learning who had taken it.",
        heimdall: "The trick was my idea. I told it as though it had just come to me.",
      },
      {
        text: "\"Dress the thunder god as the bride,\" I said. \"Veil and keys and all. The giant will lay the hammer in the bride's lap to bless the wedding. That is the custom.\"",
        heimdall: "In every story they tell, the plan is mine. In none of them do they know why I had it ready.",
      },
      {
        text: "The thunder god hated it. He hated the veil, he hated the dress, and he hated me most of all for thinking of it. He went anyway.",
        heimdall: "He never knew it was me who took it. I hope he never will.",
      },
      {
        text: "At the wedding feast the bride ate a whole ox and eight salmon and drank three barrels of mead. The giant king only blinked.",
        heimdall: "I sat at the far end of the table and did not dare to laugh.",
      },
      {
        text: "When the hammer was laid in the bride's lap, the veil came off. The wedding was over very quickly after that.",
        heimdall: "The giant king looked at me just before. He knew. He said nothing. That was his gift to me.",
      },
      {
        text: "Back in the bright halls the one-eyed king had had enough. That hammer had been stolen before, and borrowed, and lost.",
        heimdall: "He looked at me for a long time when he said \"stolen\". I looked at the floor.",
      },
      {
        text: "He laid a spell on it so heavy that no hands but the thunder god's could ever lift it again. No more borrowing, no more thieves.",
        heimdall: "Two of us carried it out of that hall. After the spell, no one but him could move it an inch.",
      },
      {
        text: "In Jötunheim they still sing of Þrymr, the giant king who stole Thor's hammer and lost it at his own wedding. They never mention the guest who drank with him.",
        heimdall: "Þrymr kept my secret to the end. Thor never forgave the dress. And I learned to drink less near giants.",
      },
    ],
  },
  {
    // Written by Thijs (November 2026). Ymir: the first giant, loved by every realm but Asgard; the narrator was there when he woke and met him though he was not allowed to; Ymir kept every impossible promise, and everything he made died with him. Named only in the last shard.
    id: 'beforeTheWorld',
    title: "Before the World",
    subject: 'Ymir',
    shards: [
      {
        text: "I was there when he woke. Where the ice of the north met the sparks of the south, something enormous opened its eyes and laughed.",
        heimdall: "I was not supposed to be there. I was not supposed to be anywhere yet. But I was.",
      },
      {
        text: "The first sound in all the worlds was his laugh. It rolled across the gap for a whole day, and the ice cracked for joy.",
        heimdall: "Every horn I ever blew was an echo of that laugh, trying to be as loud.",
      },
      {
        text: "I was told never to go near him. Who told me, I will not say. I went anyway, again and again.",
        heimdall: "That was the first rule I ever broke. It is the only one I have never regretted.",
      },
      {
        text: "He was gentle the way only something very big can be gentle. He would lie still for a year so that a bird could finish its nest in his beard.",
        heimdall: "I sat in his hand once. It was the safest place I have ever been.",
      },
      {
        text: "He went from realm to realm asking one question: what do you need? Nobody had ever asked them that before.",
        heimdall: "The bright halls never asked anyone that. Not then, not since.",
      },
      {
        text: "To the frost people he promised a summer. To the fire people, a winter cool enough to sleep. Everyone laughed. He did it anyway.",
        heimdall: "I watched him carry snow to the fire realm in his two hands. It took a hundred years. He did not complain once.",
      },
      {
        text: "To the dwarves he promised light under the mountains, and the rock began to glow wherever they dug.",
        heimdall: "The dwarves still dig toward that light. They do not remember why.",
      },
      {
        text: "To the elves he promised songs that would never end, and to the dead, that they would never be forgotten. Impossible things. He kept every one.",
        heimdall: "I have heard many promises. His are the only ones I never saw broken.",
      },
      {
        text: "The realms loved him. Not feared, not obeyed: loved. They brought him gifts he had no use for, just to see him smile.",
        heimdall: "Everyone loved him. Everyone but the bright halls.",
      },
      {
        text: "In the bright halls they watched him with narrow eyes. A giant who gave everyone what they needed was a giant no one would ever need to obey.",
        heimdall: "I sat in those councils. I heard every word. I said nothing.",
      },
      {
        text: "Then the three brothers came for him. I will not tell how. Some things should be remembered, not told.",
        heimdall: "I could have warned him. I knew every way into every place. I did not.",
      },
      {
        text: "When he died, everything he had made died with him in the same breath: the summer in the frost, the winter in the fire, the light under the mountains, the endless song.",
        heimdall: "I heard the song stop. All of it, at once, in every realm.",
      },
      {
        text: "The realms watched their worlds fall back into the old pattern before their eyes: the cold, the heat, the dark, the silence.",
        heimdall: "They did not grieve quietly. I heard that, too.",
      },
      {
        text: "They have never forgiven the bright halls. Not for his death alone, but for everything that died with him. To this day they are furious, and they are right to be.",
        heimdall: "I belong to the bright halls. I know which side I stood on. I know which side I should have stood on.",
      },
      {
        text: "Out of his flesh they made the earth, out of his blood the sea, out of his skull the sky, and they called it Midgard. His name was Ymir, and he was the kindest thing that ever lived.",
        heimdall: "I still visit him. Every time I walk on the earth, I walk on him. I try to walk softly.",
      },
    ],
  },
  {
    // Written by Thijs (November 2026). The sons of Muspell: three nameless brothers who doubled every day until they became the nameless fire army. Named only in the last shard.
    id: 'threeBrothers',
    title: "Three Brothers",
    subject: 'the sons of Muspell',
    shards: [
      {
        text: "I met three brothers once at the edge of the fire lands, warming their hands at a flame that was already part of them.",
        heimdall: "I was walking the border. They waved. Nobody ever waves at a watchman.",
      },
      {
        text: "Strangely, we never told each other our names. It did not seem to matter. We talked about everything else.",
        heimdall: "I have the best memory in all the worlds. I would give a great deal to have asked.",
      },
      {
        text: "They were funny, and loud, and terrible at keeping secrets. They argued about everything, agreed about nothing, and laughed the whole time.",
        heimdall: "They showed me what brothers should be. I never had any.",
      },
      {
        text: "The next time I came, there were six of them. I asked where the others had come from. They looked at each other and shrugged.",
        heimdall: "I thought I had miscounted. I never miscount.",
      },
      {
        text: "The time after that there were twelve. Every day they doubled, and none of them could tell me why.",
        heimdall: "Each new one had the same laugh. That frightened me more than the numbers.",
      },
      {
        text: "\"We woke up and there were more of us,\" one of them said, or perhaps another. By then it was hard to tell which had been first.",
        heimdall: "I tried to hold the faces of the first three. Even I could not.",
      },
      {
        text: "In a month they were thousands. In a year they filled the plains of the fire realm from edge to edge.",
        heimdall: "I counted until I could not. It was the first time in my life I stopped counting.",
      },
      {
        text: "They did not seem unhappy. Only crowded, and a little lost, as if each of them was waiting for someone to call him by his name.",
        heimdall: "No one ever did. Neither did I.",
      },
      {
        text: "The fire-lord at the border took them in. He gave them swords of flame and a place in his ranks. A thing without a name is easy to command.",
        heimdall: "I watched him do it and did not object. An army that big was none of my business, I told myself.",
      },
      {
        text: "Now there are millions of them: an army that has never fought, waiting for a day that has not yet come.",
        heimdall: "I know which day. Everyone in Asgard knows which day. We do not speak of it.",
      },
      {
        text: "Sometimes, when I stand at the border, one of them waves. I wave back. I do not know if it is one of the first three.",
        heimdall: "I still hope it is. I still wave at every one.",
      },
      {
        text: "People say they will ride across the bridge one day and burn everything. They did not know the three I knew, who could not keep a secret for an hour.",
        heimdall: "The bridge they will cross is my bridge. I have always known that.",
      },
      {
        text: "No one remembers who the first brothers were anymore. Not their names, not their faces. Time has eaten all of it.",
        heimdall: "Time, and I. I could have remembered for them. I never asked.",
      },
      {
        text: "If you ever meet one of them, ask his name. He will not know it. Ask anyway. It seems to make them glad.",
        heimdall: "I asked one, long after. He smiled and said: you are the first who ever asked.",
      },
      {
        text: "They are called the sons of Muspell now, the nameless army of fire. Once they were three brothers who were bad at secrets and good at laughing.",
        heimdall: "When they ride on the last day, I will be standing on the bridge with my horn. I hope I will recognise one of them.",
      },
    ],
  },
  {
    // Written by Thijs (November 2026). Andvari: the luckiest dwarf in the worlds, until a ring burned into his finger and brought bad luck to everyone near him, so he chose to live alone. Named only in the last shard.
    id: 'luckiestFriend',
    title: "The Luckiest Friend",
    subject: 'Andvari',
    shards: [
      {
        text: "I had a friend once who was the luckiest person in all the worlds. If he dropped his bread, it landed butter side up. If he dug, he found gold.",
        heimdall: "A small, quick dwarf who laughed at everything. I liked him from the first day.",
      },
      {
        text: "We went everywhere together. He found coins in rivers and mushrooms in snow, and he always shared.",
        heimdall: "I have watched over the friends of gods and kings. He was the only friend I had of my own.",
      },
      {
        text: "One day, by a waterfall, we found a ring lying on a stone. Plain gold, nothing special. He put it on to see if it fit.",
        heimdall: "I saw the ring first. I could have picked it up myself. I let him.",
      },
      {
        text: "The ring burned. He shouted and tried to pull it off, but it had grown hot into his finger and would not move.",
        heimdall: "I tried too. My hands still remember the heat.",
      },
      {
        text: "From that day on, nothing went right near him. Not for him: for everyone around him.",
        heimdall: "At first I thought it was chance. I wanted it to be chance.",
      },
      {
        text: "His neighbour's roof fell in. His brother's boat sank. The well in his village went dry the day he came home.",
        heimdall: "I counted the misfortunes. It was not chance.",
      },
      {
        text: "I stayed. I told myself it would pass. Then I broke my leg on a flat road, my horse died in its sleep, and my hall caught fire.",
        heimdall: "Small things, for a watchman. But I knew what would come next.",
      },
      {
        text: "People began to cross the street when he came. Then to bar their doors. He stopped knocking.",
        heimdall: "He never once blamed them. That made it worse.",
      },
      {
        text: "One evening he said: \"You have to go. You know it, and I know it.\" I said I would stay. He said: \"Then I will go.\"",
        heimdall: "I let him be the one to say it. That was cowardly of me.",
      },
      {
        text: "So I left him, like everyone else had. I walked down the road and did not look back, because I knew that if I did, I would stay.",
        heimdall: "I looked back. Once. He was waving.",
      },
      {
        text: "He went away from all the realms after that, alone, so that no one else would ever have to share his luck.",
        heimdall: "The kindest thing I have ever seen anyone do, and he did it with a cursed hand.",
      },
      {
        text: "People say he still lives somewhere between the realms, where the paths do not quite meet. Nobody knows exactly where.",
        heimdall: "I know. I see everything. I have never gone there.",
      },
      {
        text: "Some say he became a fish in a pool under a waterfall, so that no one could ever stand near him again.",
        heimdall: "There is a pike in that pool with a gold ring caught on its fin. I watch it some evenings.",
      },
      {
        text: "He chose to be alone, so that no one would be harmed by what he carried. He never chose the ring.",
        heimdall: "No one knows where the ring came from. I have been looking for that answer for a very long time.",
      },
      {
        text: "His name was Andvari, the luckiest dwarf who ever lived, until the day he found a ring by a waterfall. He is still alone.",
        heimdall: "If I could take the ring from him, I would wear it myself. I am already alone on my bridge. It would cost the worlds very little.",
      },
    ],
  },
  {
    // Written by Thijs (November 2026). Móðguðr: a girl sent to Hel whose magic drove everyone near her mad, so Hel, with pain in her heart, made her vast and set her outside the gates as keeper of the bridge. Named only in the last shard.
    id: 'girlOnTheRoad',
    title: "The Girl on the Road",
    subject: 'Móðguðr',
    shards: [
      {
        text: "I saw a girl come down the long road to the realm of the dead. She was very young, and she was not afraid at all.",
        heimdall: "I watch the living. I am not supposed to watch that road. I watched it that day.",
      },
      {
        text: "The dead walk that road quietly. She skipped, and sang, and talked to the shadows as if they were friends.",
        heimdall: "The shadows answered her. They never answer anyone.",
      },
      {
        text: "The queen of the dead took her in, as she takes in everyone. Within a week her halls were in an uproar.",
        heimdall: "I heard it from the bridge. Hel's halls have never been loud, before or since.",
      },
      {
        text: "Wherever the girl went, minds came loose. The dead wept and laughed at once, forgot their own names, talked to the walls.",
        heimdall: "She did not touch them. She did not have to.",
      },
      {
        text: "She meant no harm. She did not even know she did it. Something was wrapped around her like a cloak: a magic older than she was.",
        heimdall: "I looked for where that magic came from. I found the edge of it, and stopped looking.",
      },
      {
        text: "\"Even for my halls, this child is too much,\" the queen of the dead said. And her halls are full of the worst of all the worlds.",
        heimdall: "I had never heard Hel sound afraid. That day she did.",
      },
      {
        text: "The queen tried everything: silence, songs, rooms of stone, the deepest sleep. The magic slipped past all of it, and the girl kept smiling.",
        heimdall: "She asked me once, through the dark, if I knew a way. I did not. I said I would look. I never did.",
      },
      {
        text: "In the end there was only one way left, and the queen did not want to take it.",
        heimdall: "She had begged the gods for help first. They did not answer. I was the one who carried her message, and I carried back their silence.",
      },
      {
        text: "She laid a spell on the girl with pain in her heart. \"You have done nothing wrong,\" she told her. \"And still I cannot keep you in here.\"",
        heimdall: "I have heard many sentences passed. That was the only one where the judge wept.",
      },
      {
        text: "The spell made the girl vast, as tall as a giantess, so big that the magic around her spread as thin as mist and could reach no one.",
        heimdall: "Size against madness. Only a queen of the dead would have thought of that.",
      },
      {
        text: "The queen set her outside the gates, at the bridge over the roaring river that every dead soul must cross.",
        heimdall: "A bridge-keeper. I knew then that we would be the same, she and I, each at our own end of the worlds.",
      },
      {
        text: "Out there, alone, the magic could harm no one. The dead pass her quickly, and only feel a little dizzy.",
        heimdall: "She waves at them. Some of them wave back. It is the only joy that road has.",
      },
      {
        text: "She asks every soul that crosses who they are and where they are going. She is not cruel about it. She is lonely.",
        heimdall: "She asks me too, sometimes, across all the worlds. I tell her. It is good to be asked.",
      },
      {
        text: "The queen of the dead visits her at the bridge sometimes, when the halls are quiet, and they sit together and watch the river.",
        heimdall: "Hel is kinder than Asgard says. I have always known it. I never said so.",
      },
      {
        text: "Her name is Móðguðr, the keeper of the bridge to Hel. Once she was a small girl who sang on the road of the dead, and nobody could bear to be near her.",
        heimdall: "Two bridge-keepers, at the two ends of everything. One day I want to visit her. I am afraid of what I would remember.",
      },
    ],
  },
];

/**
 * The memories' pictures: CC0 and public-domain photos (sources in art/photo-sources.json), chosen to set the mood
 * without giving away whose memory it is.
 */
for (const m of MEMORIES) {
  if (['longWalk', 'strangeSquirrel', 'friendInTheHall', 'sevenHundredRings', 'seedsAndSwords', 'theTraveller', 'nightOfMead', 'beforeTheWorld', 'threeBrothers', 'luckiestFriend', 'girlOnTheRoad'].includes(m.id)) m.image ??= `memories/${m.id}.webp`;
}

export const MEMORY_BY_ID: Record<string, MemoryDef> = Object.fromEntries(MEMORIES.map((m) => [m.id, m]));
