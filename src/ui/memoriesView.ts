/**
 * Memories in the game: the Journal's list of memories (each opens to its fifteen places, ??? until that shard is
 * found), and the moment a shard is found, with the same golden glow as the wards' runes. The site's Memories page
 * (src/site/main.ts) shows the same thing.
 */
import type { Game } from '../core/game';
import { MEMORIES, MEMORY_BY_ID } from '../core/data/memories';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';

type Open = (content: HTMLElement, menu: ListMenu) => void;

/** How many shards this save has found, in all. */
export function shardsFound(game: Game): number {
  return Object.values(game.state.memories ?? {}).reduce((n, list) => n + list.length, 0);
}

/** Every memory: its title once a shard of it is found, else "An unknown memory"; whose it is only once whole. */
export function showMemories(game: Game, open: Open, back: () => void, start = 0): void {
  const found = game.state.memories ?? {};
  const items: MenuItem[] = MEMORIES.map((m, i) => {
    const have = found[m.id]?.length ?? 0;
    const whole = have >= m.shards.length;
    return {
      label: have ? m.title : 'An unknown memory',
      detail: whole ? 'whole' : `${have}/${m.shards.length}`,
      description: whole
        ? `A memory of ${m.subject}.`
        : have
          ? `${have} of ${m.shards.length} shards found. Open it to read them in their places.`
          : 'Not one shard of it found yet. Some guardians, deep in the Rootdeep, leave a shard behind.',
      disabled: !have,
      onSelect: () => showMemory(game, m.id, open, () => showMemories(game, open, back, i)),
    };
  });
  items.push({ label: 'Back', onSelect: back });
  const menu = new ListMenu(items, { onCancel: back, startIndex: start });
  const desc = el('div', { className: 'menu-desc' });
  menu.describeInto(desc);
  const total = MEMORIES.reduce((n, m) => n + m.shards.length, 0);
  open(
    el('div', { className: 'panel dialog wide memories-dialog' }, [
      el('h2', { text: 'Memories' }),
      el('p', { className: 'gold-line', text: `${shardsFound(game)} of ${total} shards found` }),
      menu.el,
      desc,
    ]),
    menu,
  );
}

/** One memory: its fifteen places in order, each ??? until its shard is found. */
function showMemory(game: Game, id: string, open: Open, back: () => void): void {
  const m = MEMORY_BY_ID[id];
  const have = new Set(game.state.memories?.[id] ?? []);
  const whole = have.size >= m.shards.length;
  const list = el(
    'ol',
    { className: 'memory-shards' },
    m.shards.map((sh, i) => el('li', { className: have.has(i) ? 'found' : 'missing', text: have.has(i) ? sh.text : '???' })),
  );
  const menu = new ListMenu([{ label: 'Back', onSelect: back }], { onCancel: back, backRow: false });
  open(
    el('div', { className: 'panel dialog wide memories-dialog' }, [
      ...picture(m.image),
      el('h2', { className: 'memory-glow', text: m.title }),
      el('p', { className: 'gold-line', text: whole ? `A memory of ${m.subject}` : `${have.size} of ${m.shards.length} shards` }),
      list,
      menu.el,
    ]),
    menu,
  );
}

/** The moment a shard is found: its text in gold, and where it belongs. */
export function showShardFound(found: { memory: string; shard: number }, open: Open, then: () => void): void {
  const m = MEMORY_BY_ID[found.memory];
  const shard = m.shards[found.shard];
  const last = found.shard === m.shards.length - 1;
  const menu = new ListMenu([{ label: 'Continue', onSelect: then }], { onCancel: then, backRow: false });
  open(
    el('div', { className: 'panel dialog shard-found' }, [
      ...picture(m.image),
      el('h2', { className: 'memory-glow', text: 'A memory shard' }),
      el('p', { className: 'gold-line', text: `${m.title} · shard ${found.shard + 1} of ${m.shards.length}` }),
      el('p', { className: 'shard-text', text: shard.text }),
      ...(last ? [el('p', { className: 'shard-whole', text: `The memory is whole: a memory of ${m.subject}.` })] : []),
      menu.el,
    ]),
    menu,
  );
}

/** The memory's picture, if it has one. */
function picture(image?: string): HTMLElement[] {
  if (!image) return [];
  const img = document.createElement('img');
  img.className = 'memory-picture';
  img.src = `/art/${image}`;
  img.alt = '';
  return [img];
}
