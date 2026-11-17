/**
 * Devlog posts on the website, newest first. Write them in plain English; a blank line starts a new paragraph,
 * lines starting with "- " become a list, and **bold** works. Itch.io gets a short version with a link here.
 */
export interface Post {
  date: string;
  title: string;
  body: string;
}

export const POSTS: Post[] = [
  {
    date: '2026-11-17',
    title: 'Three chapters deeper, and a party of five',
    body: `The biggest update yet. Everything below is now in the game, here and on itch.io.

**Three new chapters.** The Rootdeep now goes thirty floors down.
- **Chapter IV, the Dreaming Skull** (floors 16–20): the inside of the sky, where Ymir's brains drift as clouds and still dream.
- **Chapter V, Ginnungagap** (floors 21–25): the gap of ice and fire the world was built over.
- **Chapter VI, Hvergelmir** (floors 26–30): the mist below the gap, the spring every river comes from, and the root of the Great Tree. Its floors are the biggest yet.

Each chapter brings ten creatures, two prowlers, two guardians, new gear, requests, fragments and deeds. Every creature in the game now has a few lines of its own in the bestiary.

**A party of five.** Five adventurers swear the oath for free when you found your party, with at most three in a row. Older saves can add a fifth at the Oath Hall. Expeditions now take five players, and the monsters were made stronger to match.

**No more game over.** When the whole party falls, the roots carry it home to Lindholm. The deep keeps half of what you found on that descent; what you set out with, your gear and your Oath Tokens are safe.

**Memories.** From chapter V on, guardians can leave a shard of something old: a memory of how the world was made, and of who was there. Each memory has fifteen shards and a picture of its own. Find them all and you learn whose memory it is. A seventh place in Lindholm opens for those who go deep enough.

**Photo mode.** Press **P**, or Take a picture under Journal, for a clean picture of what you see with your party and the game's name under it. Save it, copy it into a chat or share it from your phone. In the dungeon, in town, and between the rounds of a fight.

**From your feedback.**
- The equipment shop first asks whose gear to look at, then shows only what they can wear, best first, with ▲ on upgrades.
- The assisted map marks the stairs, chests, springs and gathering spots you come upon by itself. Walls stay yours to draw.
- In the Wyrdweave, Go deeper comes first and going home asks once more, so a quick Enter no longer ends the day's try.
- After a Wyrdweave run, Copy my run to share gives you a few lines to paste in the Discord.
- On some Firefox setups the dungeon walls could come out see-through. That should be fixed now.

**Easier to read.** Clear digits everywhere, a Font setting with a plain font that is easy to read, and a Lights setting that holds every light in the dungeon still.

**Come and say hello.** Ygdrassil has a **Discord**: find a party for an expedition, post your Wyrdweave runs and photos, and suggest bynames (the best ones go into the game). It is linked from the title screen and under Options.

The full list of every change is on the changelog page. Thank you for playing, and keep the feedback coming!`,
  },
  {
    date: '2026-11-14',
    title: 'Threads, beasts and bynames',
    body: `A big one. Everything below is now in the game, here and on itch.io.

**The Wyrdweave.** Once the Blighted Elder has fallen, the Norns weave three floors at the Well of Urd every day: the same floors for every Wayfinder, each with a rule of its own. No map that draws itself, light that reaches two squares, no healing outside of fights, something that never stops hunting. After each floor you choose: take your Wyrd Threads home, or go deeper and risk losing half. One try a day. Hilde weaves the threads into gear with a gift of its own, but slowly: it is meant to take weeks, not days.

**Sagas.** Every fight is now told. Finishing blows, wounds healed, friends brought back, blows taken, narrow escapes: do enough of something and the skalds give your adventurer a byname. Bram Wolf-Feeder. Wren the Kind. Whoever strikes the last blow on a guardian becomes its Bane. Choose which byname they bear in the Party menu or at the Oath Hall. It changes nothing in a fight; it is just yours.

**The Book of Deeds** has grown to over fifty medals, all hidden until you earn them. Some are earned by courage, some by patience, and some by doing something nobody else would think of.

**Fragments.** Old notes, carved marks and a page from a certain Jarl's log lie in a few chests and in the hearts of guardians. Read them again in the Journal, and on the World page of this site once you are signed in.

**Secret classes.** Three classes are not on offer at the start. Each comes to the Oath Hall when you have done something particular. Nobody will tell you what. One of them is not quite human.

**Smaller things.**
- Raven Runs bring home more: scouts keep three of every four parts they win.
- Sign in with Google in one click, and see your party, medals, sagas and the creatures you met on **My Wayfinder**.
- The site's world pages, bestiary and fragments open up as you play: chapters you have not reached stay sealed.
- Save shows a clear confirmation, and the menu has a way back to the homepage.

Thank you for playing, and keep the feedback coming through the Feedback button in the game (Menu, Options).`,
  },
  {
    date: '2026-11-14',
    title: 'Ygdrassil has a home',
    body: `Ygdrassil now lives at **ygdrassilgame.com**. You can play it right here in your browser, always in its newest version, and read about the world it is set in.

- **The world**: Ymir, the Pact of the Gap, the people of Lindholm and the chapters of the Rootdeep.
- **Classes**: all eight, with their looks. Some classes are still waiting to be found.
- **Bestiary**: what you will meet down there (the deeper pages stay sealed for now).

Played on itch.io before? Your account works here too: save to the cloud in the game, sign in here, and carry on where you were.`,
  },
  {
    date: '2026-11-14',
    title: 'The Marrowdeep opens, and your feedback shipped',
    body: `Thank you all for playing and for writing in, on Reddit and through the in-game Feedback button. Almost everything below comes straight from your comments.

**Chapter III: The Marrowdeep (floors 11–15).** The third chapter is the first one built as one connected whole. Numbered stairs join floors in more than one place, some leading back up into hidden corners of earlier floors. Root gates are one-way shortcuts: open one from the far side and it stays open. New monsters, gear, gathering finds, requests and a new part of the story with a choice that matters later.

**Easier on the eyes.**
- Walking now glides: turning pans the view and stepping moves you into it (Settings, Walking, Quick for the old cut).
- A calm dungeon look (Settings, Dungeon look, Calm).
- Back-row adventurers sit a little lower in the party bar.

**Mapping.** Draw on the side map while you walk, zoom in on the side map and the full map, and the automatic map only shows what your party can see.

**New since then.**
- **Raven Runs**: send adventurers from your reserve scouting for a few real hours. They bring back materials, or come back wounded.
- **Runestones**: carve a short message on a square for other players to find, and heed the ones that helped you. Where a whole party fell, a shade lingers.
- **Looks**: every class now has eight looks to choose from, four men and four women, in the same pixel art as the monsters.
- Every floor got its own colour and decor: roots, icicles, kelp, coral, bones and the odd lantern.

Keep the feedback coming. The Feedback button goes straight to me, and anyone who leaves a name may end up on the Wayfinders' Stone in town.`,
  },
];
