/**
 * The website around the game (www.ygdrassilgame.com): the front page, the world, classes, bestiary and devlog.
 * Built from the game's own data, so names and pictures always match the game. The game itself lives at /play.
 */
import { inject } from '@vercel/analytics';
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-700.css';
import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/latin-400-italic.css';
import '@fontsource/alegreya/latin-700.css';
import './site.css';
import { bestiaryOrder } from '../core/bestiary';
import { CHAPTERS as GAME_CHAPTERS } from '../core/data/chapters';
import { CLASSES } from '../core/data/classes';
import type { ClassId } from '../core/types';
import { fetchHonors } from '../net/reports';
import { LOOKS, drawPortrait } from '../render/portraits';
import { POSTS, type Post } from './devlog';
import { CHAPTERS, PEOPLE, WORLD } from './lore';
import { leaveOldAddress } from './transfer';
import { online } from '../net/online';
import { DEED_BY_ID, type EarnedDeed } from '../core/deeds';
import { FLOORS } from '../core/data/floors';
import type { GameState } from '../core/game';
import { drawMedal } from '../render/medals';

type Child = Node | string | null | undefined | false;
function h(tag: string, attrs: Record<string, string> = {}, ...children: Child[]): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

const page = document.body.dataset.page ?? 'index';
/** Chapters whose pages are open to everyone; deeper ones open for a signed-in player who has reached them. */
const OPEN_CHAPTERS = 1;

/** What the site knows about the visitor once signed in. */
interface Me {
  name: string;
  deeds: Record<string, EarnedDeed>;
  save: GameState | null;
  savedAt: string | null;
  /** Chapters this player has reached (deeds and cloud save). */
  chapters: number;
}
let me: Me | null = null;

async function loadMe(): Promise<Me | null> {
  if (!online.mayBeSignedIn && !online.returningFromSignIn) return null;
  if (!(await online.connected())) return null;
  const [deeds, cloud] = await Promise.all([online.loadDeeds().catch(() => null), online.downloadSave().catch(() => null)]);
  let save: GameState | null = null;
  try {
    save = cloud ? (JSON.parse(cloud.data) as GameState) : null;
  } catch {
    save = null;
  }
  const d = deeds ?? {};
  const fromDeeds = d.marrow ? 3 : d.drowned ? 2 : 1;
  const fromSave = save ? Math.floor((save.deepest ?? 0) / 5) + 1 : 1;
  return { name: online.playerName, deeds: d, save, savedAt: cloud?.savedAt ?? null, chapters: Math.max(OPEN_CHAPTERS, fromDeeds, fromSave) };
}

const openChapters = () => me?.chapters ?? OPEN_CHAPTERS;

const NAV: [string, string][] = [
  ['world', 'The world'],
  ['classes', 'Classes'],
  ['bestiary', 'Bestiary'],
  ['devlog', 'Devlog'],
];

function header(): HTMLElement {
  return h(
    'header',
    { class: 'site-head' },
    h('a', { class: 'brand', href: './' }, 'YGDRASSIL'),
    h(
      'nav',
      {},
      ...NAV.map(([p, label]) => h('a', { href: `${p}.html`, class: p === page ? 'on' : '' }, label)),
      h('a', { href: 'wayfinder.html', class: `account ${page === 'wayfinder' ? 'on' : ''}` }, me ? me.name : 'Sign in'),
      h('a', { class: 'btn play', href: 'play.html' }, 'Play'),
    ),
  );
}

function footer(): HTMLElement {
  return h(
    'footer',
    { class: 'site-foot' },
    h('p', {}, 'Ygdrassil is made by one person and a friend who writes the story, with art from photographers and pixel artists who share their work. ', h('a', { href: 'credits.html' }, 'Credits'), ' · ', h('a', { href: 'privacy.html' }, 'Privacy & terms'), ' · ', h('a', { href: 'https://rudy-van-tuijn.itch.io/ygdrassil' }, 'itch.io')),
    h('p', { class: 'small' }, 'Found a bug or have an idea? Use the Feedback button in the game (Menu, Options).'),
  );
}

function section(title: string, ...children: Child[]): HTMLElement {
  return h('section', { class: 'block' }, h('h2', {}, title), ...children);
}

function img(src: string, alt: string, cls = ''): HTMLElement {
  return h('img', { src: `art/${src}`, alt, loading: 'lazy', class: cls });
}

function portrait(kind: Parameters<typeof drawPortrait>[2], name: string, accent: string, size: number, look?: number, cls = 'portrait'): HTMLCanvasElement {
  const c = h('canvas', { class: cls }) as HTMLCanvasElement;
  c.width = c.height = size;
  drawPortrait(c.getContext('2d')!, size, kind, name, accent, look);
  return c;
}

/** Devlog text: blank lines split paragraphs, "- " lines make lists, **bold** is bold. */
function prose(text: string): HTMLElement {
  const out = h('div', { class: 'prose' });
  const inline = (line: string) => {
    const p = document.createDocumentFragment();
    line.split(/(\*\*[^*]+\*\*)/).forEach((part) => p.append(part.startsWith('**') ? h('b', {}, part.slice(2, -2)) : part));
    return p;
  };
  for (const para of text.trim().split(/\n\s*\n/)) {
    const lines = para.split('\n');
    if (lines.every((l) => l.startsWith('- '))) out.append(h('ul', {}, ...lines.map((l) => h('li', {}, inline(l.slice(2))))));
    else out.append(h('p', {}, inline(lines.join(' '))));
  }
  return out;
}

function postCard(post: Post, full: boolean): HTMLElement {
  const date = new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return h('article', { class: 'post' }, h('time', {}, date), h('h3', {}, post.title), full ? prose(post.body) : prose(post.body.split(/\n\s*\n/)[0]), full ? null : h('a', { href: 'devlog.html' }, 'Read more →'));
}

// ── Pages ────────────────────────────────────────────────────────────────────

function home(): HTMLElement[] {
  const classes = Object.keys(CLASSES) as ClassId[];
  const party = h('div', { class: 'looks-strip' }, ...classes.map((id, i) => portrait(id, '', CLASSES[id].color, 96, (i * 3) % LOOKS, 'look')));
  const stone = h('ul', { class: 'stone-names' }, h('li', { class: 'muted' }, 'Reading the stone…'));
  void fetchHonors().then((honors) => {
    stone.replaceChildren(...(honors?.length ? honors.map((x) => h('li', {}, h('b', {}, x.name), x.note ? ` — ${x.note}` : '')) : [h('li', { class: 'muted' }, 'The stone is still bare.')]));
  });
  return [
    h(
      'section',
      { class: 'hero' },
      h('div', { class: 'hero-inner' }, h('h1', {}, 'YGDRASSIL'), h('p', { class: 'tagline' }, 'The road to Asgard runs through Ymir'), h('p', { class: 'pitch' }, 'A first-person dungeon crawler beneath the Great Tree. Found your party, map the deep yourself, and decide whose side Midgard is on.'), h('div', { class: 'cta' }, h('a', { class: 'btn big', href: 'play.html' }, 'Play now in your browser'), h('a', { class: 'btn ghost', href: 'world.html' }, 'Read the lore')), h('p', { class: 'small' }, 'Free early playtest · Chapters I–III · PC and phone')),
    ),
    section(
      'Descend into the Rootdeep',
      h(
        'div',
        { class: 'features' },
        h('div', { class: 'feature' }, img('site/shot-map.webp', 'Drawing the map'), h('h3', {}, 'Map it yourself'), h('p', {}, 'Nobody ever mapped the Rootdeep. Draw walls, marks and notes square by square while you walk, or let the map draw itself.')),
        h('div', { class: 'feature' }, img('site/shot-fight.webp', 'A fight'), h('h3', {}, 'Fight as a party'), h('p', {}, 'Turn-based battles with a front and back row, weaknesses to find, and skill trees with ten ranks per skill. Rushing ahead gets you killed.')),
        h('div', { class: 'feature' }, img('places/hornstone.webp', 'The Hornstone'), h('h3', {}, 'Go down together'), h('p', {}, 'Sound the Hornstone and Wayfinders from other halls answer: up to four players, each bringing one of their own adventurers.')),
        h('div', { class: 'feature' }, img('site/shot-town.webp', 'Lindholm'), h('h3', {}, 'Leave your mark'), h('p', {}, 'Carve runestones for other players to find, send your reserve out on Raven Runs, and earn your place on the Wayfinders\' Stone.')),
      ),
    ),
    section('Swear in your own party', h('p', {}, 'Eight classes, each with eight looks: shield-bearers, archers, healers, rune-carvers, skalds, berserkers, seeresses and wolf-kin. And some that still wait to be found.'), party, h('p', {}, h('a', { href: 'classes.html' }, 'Meet the classes →'))),
    section(
      'The story so far',
      h('p', {}, 'The gods slew the giant Ymir and built the world from his body, then sealed the road to Asgard. The other realms took their anger out on Midgard. Now Lindholm has made a pact: open a way to Asgard, and the realms will leave Midgard in peace.'),
      h('div', { class: 'chapter-strip' }, ...CHAPTERS.map((c) => h('a', { class: 'chapter-mini', href: 'world.html#chapters' }, img(c.image, c.name), h('span', {}, `${c.numeral}. ${c.name}`)))),
      h('p', {}, h('a', { href: 'world.html' }, 'Read about the world →')),
    ),
    section('Latest news', ...POSTS.slice(0, 2).map((p) => postCard(p, false))),
    section("The Wayfinders' Stone", h('p', {}, 'They walked the Rootdeep first, and told us where it bit. Lindholm remembers.'), stone),
  ];
}

function world(): HTMLElement[] {
  return [
    h('section', { class: 'page-head' }, h('h1', {}, 'The world'), h('p', { class: 'tagline' }, 'A giant\'s grave, a sealed gate, and a pact')),
    ...WORLD.map((s, i) => h('section', { class: `block lore ${i % 2 ? 'flip' : ''}` }, s.image ? img(s.image, s.title) : null, h('div', {}, h('h2', {}, s.title), ...s.text.map((t) => h('p', {}, t))))),
    h('section', { class: 'block', id: 'people' }, h('h2', {}, 'The people of Lindholm'), h('div', { class: 'people' }, ...PEOPLE.map((p) => h('div', { class: 'person' }, portrait(p.id, p.name, '#8a7444', 160), h('div', {}, h('h3', {}, p.name), h('p', {}, p.text)))))),
    h(
      'section',
      { class: 'block', id: 'chapters' },
      h('h2', {}, 'The chapters of the Rootdeep'),
      h('p', {}, 'The Rootdeep is told in chapters of five floors, each with its own world, its own monsters, and a guardian at the bottom. Every chapter answers one question and opens a deeper one.'),
      ...CHAPTERS.map((c) => h('div', { class: 'chapter' }, img(c.image, c.name), h('div', {}, h('h3', {}, `Chapter ${c.numeral}: ${c.name}`), h('p', { class: 'muted' }, c.floors), h('p', {}, c.text)))),
      h('div', { class: 'chapter sealed' }, h('div', { class: 'seal' }, '?'), h('div', {}, h('h3', {}, 'Chapter IV and beyond'), h('p', {}, 'Still sealed. The story never ends: every chapter resolves something and opens a deeper secret.'))),
    ),
  ];
}

function classes(): HTMLElement[] {
  const cards = (Object.keys(CLASSES) as ClassId[]).map((id) => {
    const c = CLASSES[id];
    return h(
      'div',
      { class: 'class-card' },
      h('div', { class: 'class-top' }, portrait(id, '', c.color, 128, 0, 'look big'), h('div', {}, h('h3', { style: `color:${c.color}` }, c.name), h('p', { class: 'muted' }, c.row === 'front' ? 'Starts in the front row' : 'Starts in the back row'), h('p', {}, c.description))),
      h('div', { class: 'looks-row' }, ...Array.from({ length: LOOKS }, (_, i) => portrait(id, '', c.color, 64, i, 'look small'))),
    );
  });
  const secret = Array.from({ length: 4 }, () => h('div', { class: 'class-card sealed' }, h('div', { class: 'class-top' }, h('div', { class: 'seal big' }, '?'), h('div', {}, h('h3', {}, '???'), h('p', { class: 'muted' }, 'Not yet found'), h('p', {}, 'Some say a stranger comes to the Oath Hall when a Wayfinder has done something no one else has. Nobody knows what.')))));
  return [
    h('section', { class: 'page-head' }, h('h1', {}, 'Classes'), h('p', { class: 'tagline' }, 'Swear them in at the Oath Hall')),
    section('Eight to begin with', h('p', {}, 'Every adventurer swears the Pact as one of these classes, and picks one of eight looks: four men and four women. Every level brings a skill point to spend in the class\'s skill tree; every skill has ten ranks. Most parties want two in front, a healer, and someone to cast or sing.'), h('div', { class: 'class-grid' }, ...cards)),
    section('And those not yet found', h('div', { class: 'class-grid' }, ...secret)),
  ];
}

function bestiary(): HTMLElement[] {
  const all = bestiaryOrder();
  const chapterOf = (floor: number) => Math.floor((floor - 1) / 5);
  const blocks = GAME_CHAPTERS.map((ch, ci) => {
    const beasts = all.filter((b) => chapterOf(Math.min(...b.floors)) === ci);
    const open = ci < openChapters();
    return h(
      'section',
      { class: 'block' },
      h('h2', {}, `Chapter ${ch.numeral}: ${ch.name}`),
      open
        ? h('p', {}, 'What Wayfinders have met so far. Their weaknesses you will have to find yourself.')
        : h('p', { class: 'muted' }, me ? 'These pages are still sealed. Reach this chapter in the game to open them.' : 'These pages are still sealed. ', me ? null : h('a', { href: 'wayfinder.html' }, 'Sign in'), me ? null : ' and reach this chapter in the game to open them.'),
      h(
        'div',
        { class: `beasts ${open ? '' : 'sealed'}` },
        ...beasts.map((b) =>
          h(
            'div',
            { class: `beast ${b.kind}` },
            img(`monsters/${b.def.id}.webp`, open ? b.def.name : 'Unknown'),
            h('b', {}, open ? b.def.name : '???'),
            h('span', { class: 'muted' }, open ? (b.kind === 'boss' ? 'Guardian' : b.kind === 'prowler' ? 'Prowler' : `Floor ${b.floors.join(', ')}`) : ''),
          ),
        ),
      ),
    );
  });
  return [h('section', { class: 'page-head' }, h('h1', {}, 'Bestiary'), h('p', { class: 'tagline' }, 'What dreams inside Ymir')), ...blocks];
}

function devlog(): HTMLElement[] {
  return [h('section', { class: 'page-head' }, h('h1', {}, 'Devlog'), h('p', { class: 'tagline' }, 'News from the making of Ygdrassil')), h('section', { class: 'block' }, ...POSTS.map((p) => postCard(p, true)))];
}

// ── My Wayfinder ─────────────────────────────────────────────────────────────

function medalCard(id: string, e: EarnedDeed): HTMLElement | null {
  const def = DEED_BY_ID[id];
  if (!def) return null;
  const c = h('canvas', { class: 'medal' }) as HTMLCanvasElement;
  c.width = 48;
  c.height = 64;
  drawMedal(c, def.kind, def.tier, def.icon);
  const when = new Date(e.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return h('div', { class: 'medal-card', title: def.text }, c, h('b', {}, def.name), h('span', { class: 'muted' }, when));
}

function signInBox(): HTMLElement {
  const error = h('p', { class: 'form-error' });
  const google = h('button', { class: 'btn big' }, 'Sign in with Google');
  google.addEventListener('click', () => void online.signInWithGoogle(location.href.split('#')[0]).catch((e: Error) => (error.textContent = e.message)));
  const email = h('input', { type: 'email', placeholder: 'E-mail', autocomplete: 'username' }) as HTMLInputElement;
  const pass = h('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password' }) as HTMLInputElement;
  const go = h('button', { class: 'btn ghost' }, 'Sign in with e-mail');
  go.addEventListener('click', () => {
    error.textContent = '';
    void online.init().then(() => online.signIn(email.value, pass.value)).then(() => location.reload()).catch((e: Error) => (error.textContent = e.message));
  });
  return h(
    'section',
    { class: 'block signin' },
    h('h2', {}, 'Sign in'),
    h('p', {}, 'Sign in with the account you play with: your medals, your party and the pages of the Rootdeep you have reached open up here. No account yet? Sign in with Google: one click, no password.'),
    google,
    h('details', {}, h('summary', {}, 'I made an account with e-mail'), h('div', { class: 'email-form' }, email, pass, go)),
    error,
    h('p', { class: 'small' }, 'Played as a guest so far? In the game, go to the Hornstone, choose Account and then "Keep it with Google": your progress stays, and you can sign in here.'),
  );
}

function wayfinder(): HTMLElement[] {
  const head = h('section', { class: 'page-head' }, h('h1', {}, 'My Wayfinder'), h('p', { class: 'tagline' }, me ? `Sworn in as ${me.name}` : 'Your medals and your party'));
  if (!me) return [head, signInBox()];
  const out: HTMLElement[] = [head];
  const s = me.save;
  if (s) {
    const floor = FLOORS[s.deepest ?? 0]?.name ?? '';
    const hours = Math.floor((s.playSeconds ?? 0) / 3600);
    out.push(
      section(
        'Your party',
        h('div', { class: 'party' }, ...[...s.party, ...s.reserve].map((m) => h('div', { class: 'member' }, portrait(m.classId, m.name, CLASSES[m.classId].color, 96, m.look, 'look'), h('b', {}, m.name), h('span', { class: 'muted' }, `Lv ${m.level} ${CLASSES[m.classId].name}`)))),
        h('p', {}, `Deepest: ${floor} · ${s.battles} battles · ${hours} h played${me.savedAt ? ` · saved to the cloud ${new Date(me.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}` : ''}`),
        h('p', {}, h('a', { class: 'btn', href: 'play.html#cloud' }, 'Play with this save'), ' ', h('span', { class: 'small' }, 'Loads the save kept with your account into this browser.')),
      ),
    );
  } else {
    out.push(section('Your party', h('p', {}, 'No save in the cloud yet. In the game: the Hornstone, Account, "Upload save to the cloud". Then your party shows here, and you can carry on in any browser.'), h('p', {}, h('a', { class: 'btn', href: 'play.html' }, 'Play'))));
  }
  const medals = Object.entries(me.deeds)
    .sort((a, b) => b[1].at - a[1].at)
    .map(([id, e]) => medalCard(id, e))
    .filter((x): x is HTMLElement => !!x);
  out.push(section('Book of Deeds', medals.length ? h('div', { class: 'medal-case' }, ...medals) : h('p', {}, 'No medals yet. Nobody will tell you what counts as a deed.')));
  out.push(section('The Rootdeep', h('p', {}, `You have reached ${me.chapters === 1 ? 'the first chapter' : `${me.chapters} chapters`}: their pages in the `, h('a', { href: 'bestiary.html' }, 'bestiary'), ' are open to you.')));
  const nameInput = h('input', { type: 'text', maxlength: '16', value: me.name, 'aria-label': 'Player name' }) as HTMLInputElement;
  const nameSave = h('button', { class: 'btn ghost' }, 'Save');
  const nameNote = h('span', { class: 'small' });
  nameSave.addEventListener('click', () => {
    const v = nameInput.value.trim();
    if (!v) return void (nameNote.textContent = 'Choose a name.');
    void online.setName(v).then(() => location.reload()).catch((e: Error) => (nameNote.textContent = e.message));
  });
  out.push(section('Player name', h('p', {}, 'This is the name other Wayfinders see: on your runestones, at the Hornstone and on expeditions.'), h('div', { class: 'name-row' }, nameInput, nameSave, nameNote)));
  const signOut = h('button', { class: 'btn ghost' }, 'Sign out');
  signOut.addEventListener('click', () => void online.signOut().then(() => location.reload()));
  out.push(h('section', { class: 'block' }, signOut));
  return out;
}

const PAGES: Record<string, () => HTMLElement[]> = { index: home, world, classes, bestiary, devlog, wayfinder };

void (async () => {
  if (await leaveOldAddress()) return;
  me = await loadMe().catch(() => null);
  const root = document.getElementById('site')!;
  root.append(header(), h('main', {}, ...(PAGES[page] ?? home)()), footer());
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  if (__BUILD__ !== 'dev') inject({ mode: 'production' });
})();
