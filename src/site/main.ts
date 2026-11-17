/**
 * The website around the game (www.ygdrassilgame.com): the front page, the world, classes, bestiary and devlog.
 * Built from the game's own data, so names and pictures always match the game. The game itself lives at /play.
 */
import { DISCORD_URL, STEAM_URL } from '../ui/links';
import { COSMETIC_BY_ID, DONATIONS, PACK_BY_ID, PACKS, euros } from '../core/data/cosmetics';
import '../render/roundRect';
import { fullName } from '../core/sagas';
import { FRAGMENTS } from '../core/data/fragments';
import { inject } from '@vercel/analytics';
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-700.css';
import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/latin-400-italic.css';
import '@fontsource/alegreya/latin-700.css';
import '../ui/digits.css';
import './site.css';
import { ELEMENTS, bestiaryOrder, elementKnown } from '../core/bestiary';
import { BEAST_LORE } from '../core/data/beastLore';
import { MEMORIES } from '../core/data/memories';
import { MATERIALS } from '../core/data/materials';
import { ITEMS } from '../core/data/items';
import { ELEMENT_NAMES, elementIcon } from '../ui/elements';
import { CHAPTERS as GAME_CHAPTERS } from '../core/data/chapters';
import { CLASSES } from '../core/data/classes';
import type { ClassId } from '../core/types';
import { fetchHonors } from '../net/reports';
import { LOOKS, drawPortrait } from '../render/portraits';
import { CHANGES } from './changelog';
import { POSTS, type Post } from './devlog';
import { CHAPTERS, PEOPLE, WORLD } from './lore';
import { leaveOldAddress } from './transfer';
import { online } from '../net/online';
import { DEED_BY_ID, SECRET_CLASSES, type EarnedDeed } from '../core/deeds';
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
/** The chapters every visitor counts as having reached. */
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
  const fromDeeds = d.nifl ? 6 : d.gap ? 5 : d.skull ? 4 : d.marrow ? 3 : d.drowned ? 2 : 1;
  const fromSave = save ? Math.floor((save.deepest ?? 0) / 5) + 1 : 1;
  return { name: online.playerName, deeds: d, save, savedAt: cloud?.savedAt ?? null, chapters: Math.max(OPEN_CHAPTERS, fromDeeds, fromSave) };
}


const NAV: [string, string][] = [
  ['world', 'The world'],
  ['classes', 'Classes'],
  ['bestiary', 'Bestiary'],
  ['devlog', 'Devlog'],
  ['support', 'Support'],
];

function header(): HTMLElement {
  return h(
    'header',
    { class: 'site-head' },
    h('a', { class: 'brand', href: './' }, 'YGDRASSIL'),
    h(
      'nav',
      {},
      ...NAV.map(([p, label]) => h('a', { href: `${p}.html`, class: p === page || (p === 'devlog' && page === 'changelog') ? 'on' : '' }, label)),
      h('a', { href: 'wayfinder.html', class: `account ${page === 'wayfinder' || page === 'memories' ? 'on' : ''}` }, me ? me.name : 'Sign in'),
      h('a', { href: DISCORD_URL, target: '_blank', rel: 'noopener' }, 'Discord'),
      ...(STEAM_URL ? [h('a', { href: STEAM_URL, target: '_blank', rel: 'noopener' }, 'Steam')] : []),
      h('a', { class: 'btn play', href: 'play.html' }, 'Play'),
    ),
  );
}

function footer(): HTMLElement {
  return h(
    'footer',
    { class: 'site-foot' },
    h('p', {}, 'Ygdrassil is made by one person and a friend who writes the story, with art from photographers and pixel artists who share their work. ', h('a', { href: 'changelog.html' }, 'Changelog'), ' · ', h('a', { href: 'press.html' }, 'Press kit'), ' · ', h('a', { href: 'credits.html' }, 'Credits'), ' · ', h('a', { href: 'privacy.html' }, 'Privacy & terms'), ' · ', h('a', { href: 'https://rudy-van-tuijn.itch.io/ygdrassil' }, 'itch.io'), ' · ', h('a', { href: DISCORD_URL }, 'Discord'), ...(STEAM_URL ? [' · ', h('a', { href: STEAM_URL }, 'Steam')] : []), ' · ', h('a', { href: 'support.html' }, 'Support the game')),
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
  const classes = (Object.keys(CLASSES) as ClassId[]).filter((id) => !SECRET_CLASSES[id]);
  const party = h('div', { class: 'looks-strip' }, ...classes.map((id, i) => portrait(id, '', CLASSES[id].color, 96, (i * 3) % LOOKS, 'look')));
  const stone = h('ul', { class: 'stone-names' }, h('li', { class: 'muted' }, 'Reading the stone…'));
  void fetchHonors().then((honors) => {
    stone.replaceChildren(...(honors?.length ? honors.map((x) => h('li', {}, h('b', {}, x.name), x.note ? ` — ${x.note}` : '')) : [h('li', { class: 'muted' }, 'The stone is still bare.')]));
  });
  return [
    h(
      'section',
      { class: 'hero' },
      h('div', { class: 'hero-inner' }, h('h1', {}, 'YGDRASSIL'), h('p', { class: 'tagline' }, 'The road to Asgard runs through Ymir'), h('p', { class: 'pitch' }, 'A first-person dungeon crawler beneath the Great Tree. Found your party, map the deep yourself, and decide whose side Midgard is on.'), h('div', { class: 'cta' }, h('a', { class: 'btn big', href: 'play.html' }, 'Play now in your browser'), ...(STEAM_URL ? [h('a', { class: 'btn big', href: STEAM_URL, target: '_blank', rel: 'noopener' }, 'Wishlist on Steam')] : []), h('a', { class: 'btn ghost', href: 'world.html' }, 'Read the lore'), h('a', { class: 'btn ghost', href: DISCORD_URL, target: '_blank', rel: 'noopener' }, 'Join the Discord')), h('p', { class: 'small' }, 'Free early playtest · Chapters I–VI · PC and phone')),
    ),
    section(
      'Descend into the Rootdeep',
      h(
        'div',
        { class: 'features' },
        h('div', { class: 'feature' }, img('site/shot-map.webp', 'Drawing the map'), h('h3', {}, 'Map it yourself'), h('p', {}, 'Nobody ever mapped the Rootdeep. Draw walls, marks and notes square by square while you walk, or let the map draw itself.')),
        h('div', { class: 'feature' }, img('site/shot-fight.webp', 'A fight'), h('h3', {}, 'Fight as a party'), h('p', {}, 'Turn-based battles with a front and back row, weaknesses to find, and skill trees with ten ranks per skill. Rushing ahead gets you killed.')),
        h('div', { class: 'feature' }, img('places/hornstone.webp', 'The Hornstone'), h('h3', {}, 'Go down together'), h('p', {}, 'Sound the Hornstone and Wayfinders from other halls answer: up to five players, each bringing one of their own adventurers.')),
        h('div', { class: 'feature' }, img('site/shot-town.webp', 'Lindholm'), h('h3', {}, 'Leave your mark'), h('p', {}, 'Carve runestones for other players to find, send your reserve out on Raven Runs, and earn your place on the Wayfinders\' Stone.')),
      ),
    ),
    section('Swear in your own party', h('p', {}, 'Eight classes, each with eight looks: shield-bearers, archers, healers, rune-carvers, skalds, berserkers, seeresses and wolf-kin. And some that still wait to be found.'), party, h('p', {}, h('a', { href: 'classes.html' }, 'Meet the classes →'))),
    section(
      'The story so far',
      h('p', {}, 'The gods slew the giant Ymir and built the world from his body, then sealed the road to Asgard. The other realms took their anger out on Midgard. Now Lindholm has made a pact: open a way to Asgard, and the realms will leave Midgard in peace.'),
      h('div', { class: 'chapter-strip' }, ...CHAPTERS.map((c, i) => (reached(i) ? h('a', { class: 'chapter-mini', href: 'world.html#chapters' }, img(c.image, c.name), h('span', {}, `${c.numeral}. ${c.name}`)) : h('a', { class: 'chapter-mini sealed', href: 'world.html#chapters' }, h('div', { class: 'seal' }, '?'), h('span', {}, `${c.numeral}. Sealed`))))),
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
    h(
      'section',
      { class: 'block', id: 'people' },
      h('h2', {}, 'The people of Lindholm'),
      h(
        'div',
        { class: 'people' },
        ...PEOPLE.map((p) =>
          metPerson(p.id)
            ? h('div', { class: 'person' }, portrait(p.id, p.name, '#8a7444', 160), h('div', {}, h('h3', {}, p.name), h('p', {}, p.text)))
            : h('div', { class: 'person sealed' }, h('div', { class: 'seal big' }, '?'), h('div', {}, h('h3', {}, '???'), h('p', {}, 'Someone not from Lindholm. You will meet them in the Rootdeep.'))),
        ),
      ),
    ),
    h(
      'section',
      { class: 'block', id: 'chapters' },
      h('h2', {}, 'The chapters of the Rootdeep'),
      h('p', {}, 'The Rootdeep is told in chapters of five floors, each with its own world, its own monsters, and a guardian at the bottom. Every chapter answers one question and opens a deeper one.'),
      ...CHAPTERS.map((c, i) =>
        reached(i)
          ? h('div', { class: 'chapter' }, img(c.image, c.name), h('div', {}, h('h3', {}, `Chapter ${c.numeral}: ${c.name}`), h('p', { class: 'muted' }, c.floors), h('p', {}, c.text)))
          : h('div', { class: 'chapter sealed' }, h('div', { class: 'seal' }, '?'), h('div', {}, h('h3', {}, `Chapter ${c.numeral}`), h('p', { class: 'muted' }, c.floors), h('p', {}, me ? 'Sealed. Reach it in the game and its page opens here.' : 'Sealed. Sign in, reach it in the game, and its page opens here.'))),
      ),
      h('div', { class: 'chapter sealed' }, h('div', { class: 'seal' }, '?'), h('div', {}, h('h3', {}, 'Chapter IV and beyond'), h('p', {}, 'Still sealed. The story never ends: every chapter resolves something and opens a deeper secret.'))),
    ),
    fragmentsBlock(),
  ];
}

/** Whether the visitor has reached chapter `i` (0-based): the first is open to all. */
function reached(i: number): boolean {
  return i < Math.max(OPEN_CHAPTERS, me?.chapters ?? 0);
}

/** People met in the story: Lindholm's own are known to all, visitors from below once their scene was seen. */
const MET_IN: Partial<Record<string, string>> = { hrodna: 'pact', eira: 'wanderer' };
function metPerson(id: string): boolean {
  const scene = MET_IN[id];
  return !scene || !!me?.save?.story?.includes(scene);
}

/** Fragments of the past found in the game (from the cloud save); the rest as ???. */
function fragmentsBlock(): HTMLElement {
  const found = new Set(me?.save?.fragments ?? []);
  const intro = !me
    ? h('p', {}, 'Old notes and carved marks lie in the Rootdeep, in a few chests and in the hearts of guardians. ', h('a', { href: 'wayfinder.html' }, 'Sign in'), ' and the ones you found can be read here.')
    : !me.save
      ? h('p', {}, 'Keep your game with your account (in the game: the Hornstone, Account) and the fragments you find show here.')
      : h('p', {}, `You have found ${found.size} of ${FRAGMENTS.length}.`);
  return h(
    'section',
    { class: 'block', id: 'fragments' },
    h('h2', {}, 'Fragments'),
    intro,
    h(
      'div',
      { class: 'fragments' },
      ...FRAGMENTS.map((f) => (found.has(f.id) ? h('div', { class: 'fragment' }, h('h3', {}, f.title), h('p', {}, f.text)) : h('div', { class: 'fragment sealed' }, h('h3', {}, '???'), h('p', { class: 'muted' }, 'Not found yet.')))),
    ),
  );
}

function classes(): HTMLElement[] {
  const card = (id: ClassId) => {
    const c = CLASSES[id];
    return h(
      'div',
      { class: 'class-card' },
      h('div', { class: 'class-top' }, portrait(id, '', c.color, 128, 0, 'look big'), h('div', {}, h('h3', { style: `color:${c.color}` }, c.name), h('p', { class: 'muted' }, c.row === 'front' ? 'Starts in the front row' : 'Starts in the back row'), h('p', {}, c.description))),
      h('div', { class: 'looks-row' }, ...Array.from({ length: LOOKS }, (_, i) => portrait(id, '', c.color, 64, i, 'look small'))),
    );
  };
  const ids = Object.keys(CLASSES) as ClassId[];
  const cards = ids.filter((id) => !SECRET_CLASSES[id]).map(card);
  const sealed = () => h('div', { class: 'class-card sealed' }, h('div', { class: 'class-top' }, h('div', { class: 'seal big' }, '?'), h('div', {}, h('h3', {}, '???'), h('p', { class: 'muted' }, 'Not yet found'), h('p', {}, 'Some say a stranger comes to the Oath Hall when a Wayfinder has done something no one else has. Nobody knows what.'))));
  // Secret classes show only to a signed-in player who found them; the last two cards wait for classes to come.
  const secret = [...ids.filter((id) => SECRET_CLASSES[id]).map((id) => (me?.deeds[SECRET_CLASSES[id]!] ? card(id) : sealed())), sealed(), sealed()];
  return [
    h('section', { class: 'page-head' }, h('h1', {}, 'Classes'), h('p', { class: 'tagline' }, 'Swear them in at the Oath Hall')),
    section('Eight to begin with', h('p', {}, 'Every adventurer swears the Pact as one of these classes, and picks one of eight looks: four men and four women. Every level brings a skill point to spend in the class\'s skill tree; every skill has ten ranks. A party is five strong, at most three to a row: most want two or three in front, a healer, and someone to cast or sing.'), h('div', { class: 'class-grid' }, ...cards)),
    section('And those not yet found', h('div', { class: 'class-grid' }, ...secret)),
  ];
}

/** Monsters everyone can see on the site; the rest show once a signed-in player has met them in the game. */
const ALWAYS_KNOWN = new Set(['bogling', 'briarGnawer']);

function bestiary(): HTMLElement[] {
  const all = bestiaryOrder();
  const chapterOf = (floor: number) => Math.floor((floor - 1) / 5);
  const met = (id: string) => ALWAYS_KNOWN.has(id) || (me?.save?.bestiary?.[id]?.seen ?? 0) > 0;
  const intro = me
    ? me.save
      ? 'Every creature you have met in the game shows here. The rest are still shadows.'
      : 'Keep your game with your account (in the game: the Hornstone, Account) and every creature you meet shows here.'
    : null;
  const blocks = GAME_CHAPTERS.map((ch, ci) => {
    const beasts = all.filter((b) => chapterOf(Math.min(...b.floors)) === ci);
    const known = beasts.filter((b) => met(b.def.id)).length;
    return h(
      'section',
      { class: 'block' },
      h('h2', {}, `Chapter ${ch.numeral}: ${ch.name}`),
      h('p', { class: 'muted' }, `${known} of ${beasts.length} met`),
      h(
        'div',
        { class: 'beasts' },
        ...beasts.map((b) => {
          const open = met(b.def.id);
          const card = h(
            open ? 'button' : 'div',
            { class: `beast ${b.kind} ${open ? '' : 'unknown'}`, ...(open ? { type: 'button', title: `Read about the ${b.def.name}` } : {}) },
            img(`monsters/${b.def.id}.webp`, open ? b.def.name : 'Unknown'),
            h('b', {}, open ? b.def.name : '???'),
            h('span', { class: 'muted' }, open ? (b.kind === 'boss' ? 'Guardian' : b.kind === 'prowler' ? 'Prowler' : `Floor ${b.floors.join(', ')}`) : ''),
          );
          if (open) card.addEventListener('click', () => showBeastPage(b));
          return card;
        }),
      ),
    );
  });
  return [
    h('section', { class: 'page-head' }, h('h1', {}, 'Bestiary'), h('p', { class: 'tagline' }, 'What dreams inside Ymir')),
    h('section', { class: 'block' }, intro ? h('p', {}, intro) : h('p', {}, 'Only shadows, for now. ', h('a', { href: 'wayfinder.html' }, 'Sign in'), ' and every creature you meet in the game appears here, page by page. Their weaknesses you will still have to find yourself.')),
    ...blocks,
  ];
}

/**
 * One creature's page: picture, a few lines about it, and what this player has learned of it in the game.
 * Weaknesses show only once tried, numbers only once one was defeated (as in the game's own bestiary).
 */
function showBeastPage(b: ReturnType<typeof bestiaryOrder>[number]): void {
  const def = b.def;
  const entry = me?.save?.bestiary?.[def.id];
  const defeated = (entry?.defeated ?? 0) > 0;
  const kind = b.kind === 'boss' ? 'Guardian of the chapter' : b.kind === 'prowler' ? 'Prowler: roams the floor, best avoided' : 'Monster';
  const WORDS = { weak: 'Weak', resists: 'Resists', normal: 'Normal', unknown: '?' } as const;
  const chips = ELEMENTS.map((x) => {
    const k = elementKnown(def, entry, x);
    const icon = h('img', { src: elementIcon(x), alt: '', class: 'el-icon' });
    return h('span', { class: `beast-el ${k}` }, icon, `${ELEMENT_NAMES[x]}: ${WORDS[k]}`);
  });
  const facts: Child[] = [];
  if (defeated) {
    const stat = (k: string, v: number) => [h('span', {}, k), h('b', {}, String(v))];
    facts.push(
      h('div', { class: 'beast-stats' }, ...stat('HP', def.hp), ...stat('ATK', def.atk), ...stat('DEF', def.def), ...stat('MAG', def.mag), ...stat('RES', def.res), ...stat('SPD', def.spd)),
    );
    if (def.ranged) facts.push(h('p', {}, 'Reaches the back row.'));
    if (def.skills?.length) facts.push(h('p', {}, h('b', {}, 'Uses: '), def.skills.map((s) => s.name).join(', ')));
    const leaves = [def.material && MATERIALS[def.material.id]?.name, def.drop && ITEMS[def.drop.item]?.name].filter(Boolean);
    if (leaves.length) facts.push(h('p', {}, h('b', {}, 'Leaves behind: '), leaves.join(', ')));
  } else {
    facts.push(h('p', { class: 'muted' }, me?.save ? 'Defeat one in the game to learn its strength and what it leaves behind.' : 'Sign in and keep your game with your account: what you learn about it in the game shows here.'));
    (facts.at(-1) as HTMLElement).classList.add('small');
  }
  const close = h('button', { class: 'btn ghost', type: 'button' }, 'Close');
  const dialog = h(
    'dialog',
    { class: 'beast-page' },
    h('div', { class: 'beast-page-head' }, img(`monsters/${def.id}.webp`, def.name, 'beast-page-pic'), h('div', {}, h('h2', {}, def.name), h('p', { class: 'muted' }, `${kind} · floor ${b.floors.join(', ')}`), entry ? h('p', { class: 'muted' }, `Met ${entry.seen}, defeated ${entry.defeated}`) : null)),
    h('p', { class: 'beast-lore' }, BEAST_LORE[def.id] ?? ''),
    h('h3', {}, 'Weaknesses and resistances'),
    h('div', { class: 'beast-elements' }, ...chips),
    entry ? null : h('p', { class: 'muted small' }, 'Every element you try on it in the game shows here.'),
    ...facts,
    close,
  ) as HTMLDialogElement;
  const done = () => {
    dialog.close();
    dialog.remove();
  };
  close.addEventListener('click', done);
  dialog.addEventListener('click', (e) => e.target === dialog && done());
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

function devlog(): HTMLElement[] {
  return [
    h('section', { class: 'page-head' }, h('h1', {}, 'Devlog'), h('p', { class: 'tagline' }, 'News from the making of Ygdrassil')),
    h('section', { class: 'block' }, h('p', { class: 'muted' }, 'Looking for every change, big and small? See the ', h('a', { href: 'changelog.html' }, 'changelog'), '.'), ...POSTS.map((p) => postCard(p, true))),
  ];
}

function changelog(): HTMLElement[] {
  const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return [
    h('section', { class: 'page-head' }, h('h1', {}, 'Changelog'), h('p', { class: 'tagline' }, 'Every change, big and small')),
    h(
      'section',
      { class: 'block' },
      h('p', { class: 'muted' }, 'The plain list, newest first. The story behind the bigger updates is in the ', h('a', { href: 'devlog.html' }, 'devlog'), '.'),
      ...CHANGES.map((c) => h('article', { class: 'post changes' }, h('time', {}, day(c.date)), prose(c.changes.map((l) => `- ${l.replace(/^(\w+):/, '**$1:**')}`).join('\n')))),
    ),
  ];
}

// ── Press ────────────────────────────────────────────────────────────────────

/** A press kit: the facts, a short description, and every picture, GIF and video to download. */
function pressPage(): HTMLElement[] {
  const file = (path: string, label: string) => h('a', { href: `press/${path}`, download: '' }, label);
  const shot = (path: string, alt: string) =>
    h('a', { class: 'feature press-shot', href: `press/${path}`, target: '_blank', rel: 'noopener' }, h('img', { src: `press/${path}`, alt, loading: 'lazy' }), h('p', {}, alt));
  const row = (k: string, ...v: Child[]) => h('tr', {}, h('th', {}, k), h('td', {}, ...v));
  return [
    h('section', { class: 'page-head' }, h('h1', {}, 'Press kit'), h('p', { class: 'tagline' }, 'Everything you need to write or make a video about Ygdrassil')),
    section(
      'Factsheet',
      h(
        'table',
        { class: 'facts' },
        row('Title', 'Ygdrassil'),
        row('Developer', 'Rudy (solo developer), with the story written by his friend Thijs'),
        row('Genre', 'First-person, grid-based dungeon crawler (party RPG)'),
        row('Platform', 'Web browser, desktop and phone. A Steam version is planned.'),
        row('Price', 'Free to play. Optional cosmetic packs and donations: looks only, never anything that changes the game.'),
        row('Status', 'Early access, updated several times a week'),
        row('Content', `${GAME_CHAPTERS.length} chapters, ${GAME_CHAPTERS.length * 5} floors, co-op expeditions for up to five players`),
        row('Website', h('a', { href: 'https://www.ygdrassilgame.com' }, 'www.ygdrassilgame.com')),
        row('Play', h('a', { href: 'play.html' }, 'www.ygdrassilgame.com/play'), ' (no download, no account needed)'),
        row('Contact', h('a', { href: DISCORD_URL }, 'Discord'), ', or the Feedback button in the game (Menu, Options)'),
      ),
    ),
    section(
      'About the game',
      prose(`The world was built from the frost giant Ymir, and the road down runs through his bones. **Ygdrassil** is a first-person, grid-based dungeon crawler in the tradition of the classics: lead a party of five down the roots of the Great Tree, chapter by chapter, from a forest of roots to the gap of ice and fire the world was made over.

- **Map it yourself.** Draw walls, marks and notes on graph paper as you go, or let the map help you or draw itself.
- **A party of five** from eight classes, each with a skill tree. Some secret classes only come once a hidden deed is done.
- **Prowlers:** visible monsters that roam the deeper floors. Avoid them, or train until you can face them.
- **A guardian at the end of every chapter**, and a story with choices that the later chapters remember.
- **The Wyrdweave:** a daily run of three floors, each with its own rule, the same for every player.
- **Co-op expeditions:** each player brings one of their own adventurers into a shared party.
- **No game over:** a fallen party is carried home, minus half of what it found on that descent.

**Art:** monsters and adventurers are CC0 pixel art (Dungeon Crawl Stone Soup), places and dungeon walls are real photographs run through a shared pixel palette. The portraits of the villagers in town are AI-made.`),
      h('p', {}, 'Every artist and photographer is listed on the ', h('a', { href: 'credits.html' }, 'credits page'), '.'),
    ),
    section(
      'Trailer',
      h('video', { class: 'press-video', src: 'press/ygdrassil-trailer.mp4', poster: 'press/key-art-1024x768.png', controls: '', preload: 'metadata', playsinline: '' }),
      h('p', {}, file('ygdrassil-trailer.mp4', 'Download the trailer (MP4, 1280×720, 1 minute)')),
    ),
    section(
      'Screenshots',
      h('p', { class: 'muted' }, 'Click a picture for the full size (1920×1080).'),
      h(
        'div',
        { class: 'features' },
        shot('screenshot-map.jpg', 'Drawing the map in the first chapter'),
        shot('screenshot-fight.jpg', 'A fight: front row and back row'),
        shot('screenshot-founding.jpg', 'Swearing in the party of five'),
        shot('screenshot-drowned-roots.jpg', 'Chapter II: the drowned roots'),
        shot('screenshot-ymirs-bones.jpg', "Chapter III: Ymir's bones"),
        shot('screenshot-ginnungagap.jpg', 'Chapter V: Ginnungagap'),
        shot('screenshot-guardian.jpg', 'A chapter guardian'),
        shot('screenshot-lindholm.jpg', 'Lindholm, the town above the roots'),
      ),
    ),
    section(
      'GIFs',
      h(
        'div',
        { class: 'features' },
        shot('ygdrassil-founding.gif', 'Founding the party'),
        shot('ygdrassil-fight.gif', 'A fight'),
        shot('ygdrassil-prowler.gif', 'A prowler'),
        shot('ygdrassil-guardian.gif', 'A guardian fight'),
      ),
    ),
    section(
      'Logos and key art',
      h(
        'ul',
        {},
        h('li', {}, file('logo-transparent.png', 'Logo, transparent background (PNG, 1280×720)')),
        h('li', {}, file('key-art-1024x768.png', 'Key art with logo (PNG, 1024×768)')),
        h('li', {}, file('header-920x430.png', 'Header with logo (PNG, 920×430)')),
        h('li', {}, file('icon-256.png', 'Icon (PNG, 256×256)')),
      ),
      h('p', { class: 'muted' }, 'Feel free to use any of these in articles and videos about Ygdrassil.'),
    ),
  ];
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

/**
 * The memories a player has gathered, story by story. Shards not found yet are dark; who a memory is about shows only
 * once every one of its shards is found (src/core/data/memories.ts).
 */
function memoriesPage(): HTMLElement[] {
  const head = h('section', { class: 'page-head' }, h('h1', {}, 'Memories'), h('p', { class: 'tagline' }, 'Someone remembers how the world was made'));
  if (!me) return [head, h('section', { class: 'block' }, h('p', {}, 'Sign in to see the memories your Wayfinders have gathered.')), signInBox()];
  const found = me.save?.memories ?? {};
  const intro = me.save
    ? 'Some guardians, deep in the Rootdeep, leave behind a shard of an old memory. Every memory has fifteen; they come in no order, except the last, which always comes last.'
    : 'Keep your game with your account (in the game: the Hornstone, Account) and the memories you gather show here.';
  // Every memory opens to its fifteen places: ??? until that shard is found, then its piece of the story, in place.
  const cards = MEMORIES.map((m) => {
    const have = new Set(found[m.id] ?? []);
    const whole = have.size >= m.shards.length;
    const title = have.size ? m.title : 'An unknown memory';
    const count = whole ? `A memory of ${m.subject}` : `${have.size} of ${m.shards.length} shards`;
    return h(
      'details',
      { class: `memory ${have.size ? '' : 'sealed'} ${whole ? 'whole' : ''}` },
      h('summary', {}, h('span', { class: 'memory-title' }, title), h('span', { class: 'muted memory-count' }, count)),
      have.size && m.image ? img(m.image, '', 'memory-picture') : null,
      h('ol', { class: 'shards' }, ...m.shards.map((sh, i) => (have.has(i) ? h('li', { class: 'shard found' }, sh.text) : h('li', { class: 'shard missing' }, '???')))),
    );
  });
  return [head, h('section', { class: 'block' }, h('p', {}, intro), h('div', { class: 'memories' }, ...cards))];
}

function wayfinder(): HTMLElement[] {
  const head = h('section', { class: 'page-head' }, h('h1', {}, 'My Wayfinder'), h('p', { class: 'tagline' }, me ? `Sworn in as ${me.name}` : 'Your medals and your party'));
  if (!me) return [head, signInBox()];
  // The Supporter badge, for those who helped the game grow (src/core/data/cosmetics.ts).
  void online.entitlements().then((items) => {
    if (items.includes('supporter')) head.append(h('p', { class: 'supporter-badge' }, '✦ Supporter: thank you for keeping the lanterns lit'));
  });
  const out: HTMLElement[] = [head];
  const s = me.save;
  if (s) {
    const floor = FLOORS[s.deepest ?? 0]?.name ?? '';
    const secs = s.playSeconds ?? 0;
    const played = secs >= 3600 ? `${Math.floor(secs / 3600)} h ${Math.floor((secs % 3600) / 60)} min` : `${Math.max(1, Math.floor(secs / 60))} min`;
    out.push(
      section(
        'Your party',
        h('div', { class: 'party' }, ...[...s.party, ...s.reserve].map((m) => h('div', { class: 'member' }, portrait(m.classId, m.name, CLASSES[m.classId].color, 96, m.look, 'look'), h('b', {}, fullName(m)), h('span', { class: 'muted' }, `Lv ${m.level} ${CLASSES[m.classId].name}`), m.saga?.battles ? h('span', { class: 'small saga-line' }, `${m.saga.battles} fights · ${m.saga.kills} foes struck down${m.saga.healed ? ` · ${m.saga.healed} HP healed` : ''}`) : null))),
        h('p', {}, `Deepest: ${floor} · ${s.battles} battles · ${played} played${me.savedAt ? ` · saved to the cloud ${new Date(me.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}` : ''}`),
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
  const shardsFound = Object.values(s?.memories ?? {}).reduce((n, list) => n + list.length, 0);
  out.push(section('Memories', h('p', {}, shardsFound ? `You have gathered ${shardsFound} memory shard${shardsFound === 1 ? '' : 's'}. ` : 'Deep in the Rootdeep, some guardians leave behind a shard of an old memory, glowing faintly gold. ', h('a', { href: 'memories.html' }, 'Your memories'), '.')));
  const metCount = Object.values(s?.bestiary ?? {}).filter((e) => e.seen > 0).length;
  out.push(section('The Rootdeep', h('p', {}, `You have reached ${me.chapters === 1 ? 'the first chapter' : `${me.chapters} chapters`}, and met ${metCount} kinds of creature: they are in your `, h('a', { href: 'bestiary.html' }, 'bestiary'), '.')));
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

/** Swatches that show what a cosmetic looks like, on the support page. */
const SWATCH: Record<string, string> = {
  runeGold: 'linear-gradient(135deg, #fff3b0, #f0cf6a 30%, #8a6418 50%, #f0cf6a 70%, #fff3b0)',
  rootwork: 'repeating-linear-gradient(45deg, #4a321a 0 4px, #8a6a3a 4px 8px, #3d6b2a 8px 10px)',
  rimeFrame: 'linear-gradient(135deg, #ffffff, #a0e0ff 35%, #3a78b8 55%, #e0f8ff)',
  emberFrame: 'linear-gradient(135deg, #ffd040, #ff6020 40%, #801000 60%, #ff9a30)',
  birchbark: 'linear-gradient(135deg, #3a2e22 50%, #e8dcc0 50%)',
  emberhall: 'linear-gradient(135deg, #3a1414 50%, #f0cf6a 50%)',
  fjordnight: 'linear-gradient(135deg, #0f2a2a 50%, #d0e8e4 50%)',
  supporter: 'radial-gradient(circle, #f0cf6a 35%, #8a6418 70%)',
};

/** Support: a one-off gift, or a cosmetic pack kept with the account (paid through Stripe, server/shop.ts). */
function supportPage(): HTMLElement[] {
  const head = h('section', { class: 'page-head' }, h('h1', {}, 'Support Ygdrassil'), h('p', { class: 'tagline' }, 'Made by two people'));
  const thanks = new URLSearchParams(location.search).get('thanks');
  const out: HTMLElement[] = [head];
  if (thanks)
    out.push(
      h('section', { class: 'block thanks' }, h('h2', {}, 'Thank you!'), h('p', {}, thanks === 'pack' ? 'Your pack is on its way to your account. In the game, open Options → Looks and choose Refresh what I own.' : 'Your support keeps the lanterns lit in the deep. It means a great deal.')),
    );
  const error = h('p', { class: 'form-error' });
  const go = (body: Parameters<typeof online.shopCheckout>[0]) => async () => {
    error.textContent = '';
    try {
      location.href = await online.shopCheckout(body);
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };
  const donate = h('div', { class: 'cta' }, ...DONATIONS.map((amount) => {
    const b = h('button', { class: 'btn' }, euros(amount));
    b.addEventListener('click', () => void go({ action: 'donate', amount })());
    return b;
  }));
  out.push(
    section(
      'A cup of coffee',
      h('p', {}, 'Right now you can play Ygdrassil for free in your browser. If you enjoy it, a one-off gift helps pay for the servers, music and art, and gives us time to build the next chapter. Signed in, it also brings the Supporter badge.'),
      donate,
    ),
  );
  const owned = new Set<string>();
  const cards = PACKS.map((p) => {
    const button = h('button', { class: 'btn big' }, `Buy for ${euros(p.price)}`);
    button.addEventListener('click', () => {
      if (!me) {
        error.textContent = 'Please sign in first (below), so the pack is kept with your account.';
        return;
      }
      void go({ action: 'checkout', pack: p.id })();
    });
    const card = h(
      'div',
      { class: 'pack', 'data-pack': p.id },
      h('h3', {}, p.name),
      h('p', {}, p.description),
      h('ul', { class: 'pack-items' }, ...p.items.map((id) => h('li', {}, h('span', { class: 'swatch', style: `background: ${SWATCH[id] ?? '#888'}` }), COSMETIC_BY_ID[id].name))),
      button,
    );
    return card;
  });
  out.push(
    section(
      'Cosmetic packs',
      h('p', {}, 'Frames for your adventurers\' portraits and new looks for the game\'s windows. Only looks: they never change how the game plays, and everyone plays by the same rules. Packs are kept with your account and work on every device you sign in on.'),
      h('div', { class: 'packs' }, ...cards),
      error,
      me ? h('p', { class: 'small' }, `Signed in as ${me.name}.`) : signInBox(),
      h('p', { class: 'small muted' }, 'Payments are handled by Stripe: we never see your card. Packs are digital and added to your account right away. See ', h('a', { href: 'privacy.html' }, 'Privacy & terms'), '.'),
    ),
  );
  // Mark the packs this account already owns.
  if (me)
    void online.entitlements().then((items) => {
      items.forEach((i) => owned.add(i));
      for (const card of cards) {
        const p = PACK_BY_ID[card.dataset.pack ?? ''];
        if (p && p.items.every((i) => owned.has(i))) {
          const b = card.querySelector('button')!;
          b.textContent = 'Owned';
          b.setAttribute('disabled', '');
        }
      }
    });
  return out;
}

const PAGES: Record<string, () => HTMLElement[]> = { index: home, world, classes, bestiary, devlog, changelog, wayfinder, memories: memoriesPage, support: supportPage, press: pressPage };

void (async () => {
  if (await leaveOldAddress()) return;
  me = await loadMe().catch(() => null);
  const root = document.getElementById('site')!;
  root.append(header(), h('main', {}, ...(PAGES[page] ?? home)()), footer());
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  if (__BUILD__ !== 'dev') inject({ mode: 'production' });
})();
