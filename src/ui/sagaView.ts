/**
 * Sagas: each adventurer's story in numbers, the bynames they earned, and which one they bear.
 */
import { CLASSES } from '../core/data/classes';
import type { Game } from '../core/game';
import { BYNAMES, bynamesOf, emptyTally, fullName } from '../core/sagas';
import type { Member } from '../core/types';
import { drawPortrait } from '../render/portraits';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';

type Open = (content: HTMLElement, menu: ListMenu) => void;

/** Everyone in the party and the hall: pick one to read their saga. */
export function sagas(game: Game, open: Open, save: () => void, back: () => void, start = 0): void {
  const all = [...game.state.party, ...game.state.reserve];
  const items: MenuItem[] = all.map((m, i) => {
    const n = bynamesOf(m).length;
    return {
      label: fullName(m),
      detail: n ? `${n} byname${n > 1 ? 's' : ''}` : '',
      description: `Lv ${m.level} ${CLASSES[m.classId].name}${game.state.reserve.includes(m) ? ', in the Oath Hall' : ''}. ${m.saga?.battles ?? 0} fights fought.`,
      onSelect: () => saga(game, m, open, save, () => sagas(game, open, save, back, i)),
    };
  });
  items.push({ label: 'Back', onSelect: back });
  const menu = new ListMenu(items, { onCancel: back, startIndex: start });
  const desc = el('div', { className: 'menu-desc' });
  menu.describeInto(desc);
  open(
    el('div', { className: 'panel dialog wide' }, [
      el('h2', { text: 'Sagas' }),
      el('p', { text: 'What your adventurers have done. Deeds earn bynames, and the skalds will sing them.' }),
      menu.el,
      desc,
    ]),
    menu,
  );
}

/** One adventurer's saga: their tally, and the bynames to choose from. */
function saga(game: Game, m: Member, open: Open, save: () => void, back: () => void): void {
  const t = m.saga ?? emptyTally();
  const facts: [string, string][] = [
    ['Fights', String(t.battles)],
    ['Foes struck down', String(t.kills)],
    ['Crushing blows', String(t.crits)],
    ['Weaknesses found', String(t.weakHits)],
    ['HP healed', String(t.healed)],
    ['Friends brought back', String(t.revives)],
    ['Blows taken (HP)', String(t.taken)],
    ['Times fallen', String(t.falls)],
    ['Narrow escapes', String(t.closeCalls)],
    ['Prowlers felled', String(t.prowlers)],
    ['Guardians felled', String(t.guardians.length)],
    ['Raven Runs', String(t.runs)],
  ];
  const earned = bynamesOf(m);
  const items: MenuItem[] = earned.map((b) => ({
    label: fullName({ name: m.name, byname: b.id }),
    detail: m.byname === b.id ? 'borne' : '',
    description: b.text,
    onSelect: () => {
      m.byname = b.id;
      save();
      saga(game, m, open, save, back);
    },
  }));
  if (earned.length) {
    items.push({
      label: `Just ${m.name}`,
      detail: m.byname ? '' : 'borne',
      description: 'Bear no byname.',
      onSelect: () => {
        delete m.byname;
        save();
        saga(game, m, open, save, back);
      },
    });
  }
  items.push({ label: 'Back', onSelect: back });
  const menu = new ListMenu(items, { onCancel: back, startIndex: Math.max(0, earned.findIndex((b) => b.id === m.byname)) });
  const desc = el('div', { className: 'menu-desc' });
  menu.describeInto(desc);
  const c = el('canvas', { className: 'menu-portrait' });
  c.width = c.height = 64;
  drawPortrait(c.getContext('2d')!, 64, m.classId, m.name, CLASSES[m.classId].color, m.look);
  const left = BYNAMES.length - earned.length;
  open(
    el('div', { className: 'panel dialog wide' }, [
      el('h2', { text: `The saga of ${fullName(m)}` }),
      el('div', { className: 'menu-member' }, [c, el('div', {}, [el('b', { text: fullName(m) }), el('span', { text: `Lv ${m.level} ${CLASSES[m.classId].name}` })])]),
      el('div', { className: 'rewards saga-facts' }, facts.flatMap(([k, v]) => [el('span', { text: k }), el('span', { className: 'v', text: v })])),
      el('p', { text: earned.length ? `Bynames earned: ${earned.length}. ${left ? 'There are more to earn.' : 'Every byname there is.'}` : 'No byname yet. Fight, heal, endure: the skalds are listening.' }),
      menu.el,
      desc,
    ]),
    menu,
  );
}
