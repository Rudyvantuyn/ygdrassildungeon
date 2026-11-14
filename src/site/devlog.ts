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
