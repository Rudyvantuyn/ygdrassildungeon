/**
 * Founding the party: at the start of a new game, Brynja of the Oath Hall walks the player
 * through swearing in their first adventurers (free, up to a full party).
 */
import { CLASSES } from '../core/data/classes';
import { FOUNDING_OATHS, NAME_MAX_LENGTH } from '../core/guild';
import { createMember } from '../core/party';
import type { ClassId, Member } from '../core/types';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';
import { npcSays } from './npc';

export interface FoundingHost {
  openOverlay(content: HTMLElement, menu: ListMenu): void;
  confirm(title: string, text: string, yes: () => void, back?: () => void): void;
  /** Shows the adventurers sworn in so far on the party cards. */
  preview(party: Member[]): void;
}

/** Names offered with "Suggest a name", so nobody has to type on a phone. */
const NAMES = [
  'Astrid', 'Bjorn', 'Dagny', 'Eirik', 'Freya', 'Gunnar', 'Halla', 'Ivar', 'Jorunn', 'Knut', 'Liv', 'Magnus',
  'Nanna', 'Orm', 'Ragna', 'Sigurd', 'Solvei', 'Tove', 'Ulf', 'Vigdis', 'Yngvar', 'Hakon', 'Ingrid', 'Leif',
];

export class Founding {
  private members: Member[] = [];

  constructor(
    private readonly host: FoundingHost,
    private readonly done: (party: Member[]) => void,
    private readonly cancel: () => void,
  ) {}

  start(): void {
    this.hall(true);
  }

  private dialog(title: string, body: HTMLElement[], menu: ListMenu, withDesc = true): void {
    const children: HTMLElement[] = [el('h2', { text: title }), ...body, menu.el];
    if (withDesc) {
      const desc = el('div', { className: 'menu-desc' });
      menu.describeInto(desc);
      children.push(desc);
    }
    this.host.openOverlay(el('div', { className: 'panel dialog wide' }, children), menu);
  }

  private hall(first = false, start = 0): void {
    this.host.preview(this.members);
    const n = this.members.length;
    const say =
      n === 0
        ? first
          ? '"So you have come to swear the Pact. Good. Midgard needs Wayfinders to find the road the realms want. Nobody goes into the Rootdeep alone: choose who will walk at your side. Up to four may swear today, at no cost."'
          : '"Who will be the first to swear?"'
        : n < FOUNDING_OATHS
          ? `"${n} sworn. A full party has four: two to hold the front, two to work from behind. Take more, or set out as you are."`
          : '"Four sworn, a full party. Later oaths need gold and an Oath Token, a shard of Ymir from the deep, so choose well. Ready?"';
    const items: MenuItem[] = [
      ...this.members.map((m, i) => ({
        label: `${m.name}`,
        detail: `${CLASSES[m.classId].name} · ${m.row} row`,
        description: 'Select to release this adventurer before setting out.',
        onSelect: () => this.release(i),
      })),
      {
        label: 'Swear in an adventurer',
        detail: `${n}/${FOUNDING_OATHS}`,
        description: 'Choose a class and a name. Free for your first party.',
        disabled: n >= FOUNDING_OATHS,
        onSelect: () => this.chooseClass(),
      },
      {
        label: 'Set out for Lindholm',
        description: n ? 'Begin your story with this party.' : 'Swear in at least one adventurer first.',
        disabled: n === 0,
        onSelect: () => this.finish(),
      },
      { label: 'Back to the title', onSelect: () => this.cancel() },
    ];
    const menu = new ListMenu(items, { onCancel: () => this.cancel(), startIndex: start || (n < FOUNDING_OATHS ? n : n + 1) });
    this.dialog('The Oath Hall', [npcSays('brynja', say)], menu);
  }

  private release(i: number): void {
    const m = this.members[i];
    this.host.confirm('Release', `Let ${m.name} go before the oath is sealed?`, () => {
      this.members.splice(i, 1);
      this.hall();
    }, () => this.hall());
  }

  private chooseClass(): void {
    const front = this.members.filter((m) => m.row === 'front').length;
    const items: MenuItem[] = (Object.keys(CLASSES) as ClassId[]).map((id) => {
      const c = CLASSES[id];
      return {
        label: c.name,
        detail: c.row === 'front' ? 'front row' : 'back row',
        description: `${c.description}\n${c.row === 'front' ? 'Fights in the front row: takes the hits.' : 'Works from the back row: safer, but weaker with weapons.'}`,
        onSelect: () => this.chooseName(id),
      };
    });
    const menu = new ListMenu(items, { onCancel: () => this.hall() });
    const tip = front < 2 ? '"Most parties want two in front: a Bastion, Berserker, Wolfkin or Strider. And bring a Mender, or you will not last long."' : '"Two in front already. Now think of the back: a Mender to heal, and someone to cast or sing."';
    this.dialog('Choose a class', [npcSays('brynja', tip)], menu);
  }

  private chooseName(classId: ClassId): void {
    const input = el('input', { className: 'name-input' });
    input.maxLength = NAME_MAX_LENGTH;
    input.placeholder = 'Name';
    const error = el('p', { className: 'form-error' });
    const submit = () => {
      const name = input.value.trim().replace(/\s+/g, ' ');
      if (!name) return void (error.textContent = 'Give your adventurer a name.');
      if (this.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return void (error.textContent = `There is already someone called ${name}.`);
      this.members.push(createMember(name, classId));
      this.hall();
    };
    const suggest = () => {
      const free = NAMES.filter((n) => !this.members.some((m) => m.name === n));
      input.value = free[Math.floor(Math.random() * free.length)] ?? '';
      error.textContent = '';
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') this.chooseClass();
    });
    const menu = new ListMenu(
      [
        { label: 'Swear the oath', onSelect: submit },
        { label: 'Suggest a name', onSelect: suggest },
        { label: 'Back', onSelect: () => this.chooseClass() },
      ],
      { onCancel: () => this.chooseClass() },
    );
    this.dialog(`A new ${CLASSES[classId].name}`, [el('p', { text: 'What is your name, adventurer?' }), input, error], menu, false);
    input.focus();
  }

  private finish(): void {
    const n = this.members.length;
    const go = () => this.done(this.members);
    if (n < FOUNDING_OATHS) {
      this.host.confirm('Set out', `Set out with ${n} adventurer${n === 1 ? '' : 's'}? Later oaths cost gold and an Oath Token.`, go, () => this.hall());
    } else go();
  }
}
