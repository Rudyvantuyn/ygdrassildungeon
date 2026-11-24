/**
 * Founding the party: at the start of a new game, Brynja of the Oath Hall walks the player
 * through swearing in their first adventurers (free, up to a full party).
 */
import { CLASSES } from '../core/data/classes';
import { FOUNDING_OATHS, NAME_MAX_LENGTH, cleanName, nameLength } from '../core/guild';
import { createMember, rowFor } from '../core/party';
import type { ClassId, Member } from '../core/types';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';
import { npcSays } from './npc';
import { lookPicker } from './lookPicker';
import { SECRET_CLASSES } from '../core/deeds';

export interface FoundingHost {
  openOverlay(content: HTMLElement, menu: ListMenu): void;
  confirm(title: string, text: string, yes: () => void, back?: () => void): void;
  /** Shows the adventurers sworn in so far on the party cards. */
  preview(party: Member[]): void;
}

/** The quick-start party: three in front to hold the line, a healer and a caster behind. */
const QUICK_PARTY: ClassId[] = ['bastion', 'berserker', 'strider', 'mender', 'runecaller'];

/** Names for the quick-start party, by the look they go with. */
const WOMEN = ['Astrid', 'Dagny', 'Freya', 'Halla', 'Jorunn', 'Liv', 'Nanna', 'Ragna', 'Solvei', 'Tove', 'Vigdis', 'Ingrid'];
const MEN = ['Bjorn', 'Eirik', 'Gunnar', 'Ivar', 'Knut', 'Magnus', 'Orm', 'Sigurd', 'Ulf', 'Yngvar', 'Hakon', 'Leif'];

/** Names offered with "Suggest a name", so nobody has to type on a phone. */
const NAMES = [
  'Astrid', 'Bjorn', 'Dagny', 'Eirik', 'Freya', 'Gunnar', 'Halla', 'Ivar', 'Jorunn', 'Knut', 'Liv', 'Magnus',
  'Nanna', 'Orm', 'Ragna', 'Sigurd', 'Solvei', 'Tove', 'Ulf', 'Vigdis', 'Yngvar', 'Hakon', 'Ingrid', 'Leif',
];

/** Fills `input` with a free suggested name (not taken by anyone in `taken`). */
export function suggestName(input: HTMLInputElement, taken: string[]): void {
  const free = NAMES.filter((n) => !taken.some((t) => t.toLowerCase() === n.toLowerCase()));
  input.value = free[Math.floor(Math.random() * free.length)] ?? '';
  input.focus();
}

/**
 * Keys in a name field: Enter swears the oath, Escape goes back, ↑/↓ leave the field for the menu below
 * (and come back to it at the top), so every option stays reachable from the keyboard.
 */
export function bindNameField(input: HTMLInputElement, menu: ListMenu, submit: () => void, back: () => void): void {
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') submit();
    else if (e.key === 'Escape') back();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      input.blur();
      menu.focus(e.key === 'ArrowDown' ? 1 : -1);
    }
  });
}

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
          ? '"So you have come to swear the Pact. Good. Midgard needs Wayfinders to find the road the realms want. Nobody goes into the Rootdeep alone: choose who will walk at your side, five at no cost. Or let me pick a party that works well together."'
          : '"Who will be the first to swear? Or shall I pick a party for you?"'
        : n < FOUNDING_OATHS
          ? `"${n} sworn. A full party has five, and no more than three stand in one row: some to hold the front, the rest to work from behind. Take more, or set out as you are."`
          : '"Five sworn, a full party. Later oaths need gold and an Oath Token, a shard of Ymir from the deep, so choose well. Ready?"';
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
      ...(n < FOUNDING_OATHS
        ? [{
            label: n ? 'Fill the party for me' : 'Quick start: a party picked for you',
            description: `Brynja picks ${n ? 'the rest' : 'five who work well together'}: ${QUICK_PARTY.map((c) => CLASSES[c].name).join(', ')}, with names and looks. You can release anyone and swear in your own instead.`,
            onSelect: () => this.quickStart(),
          }]
        : []),
      {
        label: 'Set out for Lindholm',
        description: n ? 'Begin your story with this party.' : 'Swear in at least one adventurer first.',
        disabled: n === 0,
        onSelect: () => this.finish(),
      },
      { label: 'Back to the title', onSelect: () => this.leave() },
    ];
    // A new player starts on the quick start; once anyone has sworn, on swearing the next.
    const menu = new ListMenu(items, { onCancel: () => this.leave(), startIndex: start || (n === 0 ? 1 : n < FOUNDING_OATHS ? n : n + 1) });
    this.dialog('The Oath Hall', [npcSays('brynja', say)], menu);
  }

  /** Fills the free seats with a well-rounded party, with free names and random looks, then shows the hall to check. */
  private quickStart(): void {
    const taken = () => this.members.map((m) => m.name.toLowerCase());
    for (const classId of QUICK_PARTY) {
      if (this.members.length >= FOUNDING_OATHS) break;
      // Skip classes already sworn, as long as enough others are left to fill the party.
      const left = QUICK_PARTY.filter((c) => !this.members.some((m) => m.classId === c)).length;
      if (this.members.some((m) => m.classId === classId) && left >= FOUNDING_OATHS - this.members.length) continue;
      // Looks 0-3 are men, 4-7 women: the name goes with the look.
      const woman = Math.random() < 0.5;
      const free = (woman ? WOMEN : MEN).filter((x) => !taken().includes(x.toLowerCase()));
      const name = free[Math.floor(Math.random() * free.length)] ?? `Wayfinder ${this.members.length + 1}`;
      const member = createMember(name, classId, (woman ? 4 : 0) + Math.floor(Math.random() * 4));
      member.row = rowFor(this.members, member.row);
      this.members.push(member);
    }
    this.hall(false, this.members.length + 1);
  }

  /** Back to the title; asks first when adventurers have already sworn. */
  private leave(): void {
    if (!this.members.length) return this.cancel();
    this.host.confirm('Back to the title', `Leave the Oath Hall? The ${this.members.length} sworn so far will not be kept.`, () => this.cancel(), () => this.hall());
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
    // The founding party chooses from the eight classes everyone starts with (secret ones come later).
    const items: MenuItem[] = (Object.keys(CLASSES) as ClassId[]).filter((id) => !SECRET_CLASSES[id]).map((id) => {
      const c = CLASSES[id];
      return {
        label: c.name,
        icon: `art/heroes/${id}-0.webp`,
        detail: c.row === 'front' ? 'starts in front' : 'starts in back',
        description: `${c.description}\n${c.row === 'front' ? 'Starts in the front row, where the blows land.' : 'Starts in the back row: safer, but weapons hit weaker there (bows excepted).'} The row can be changed in the Oath Hall.`,
        onSelect: () => this.chooseLook(id),
      };
    });
    const menu = new ListMenu(items, { onCancel: () => this.hall() });
    const tip = front < 2 ? '"Most parties want two or three in front: a Bastion, Berserker, Wolfkin or Strider. And bring a Mender, or you will not last long."' : front >= 3 ? '"Three in front: that row is full. The rest stand behind: a Mender to heal, and someone to cast or sing."' : '"Two in front already. A third can join them, or think of the back: a Mender to heal, and someone to cast or sing."';
    this.dialog('Choose a class', [npcSays('brynja', tip)], menu);
  }

  private chooseLook(classId: ClassId, start = this.members.length * 3): void {
    const back = () => this.chooseClass();
    const pick = lookPicker(classId, start % 8, (look) => this.chooseName(classId, look));
    const menu = new ListMenu([...pick.items, { label: 'Back', onSelect: back }], { onCancel: back, startIndex: 1 });
    this.dialog(`A new ${CLASSES[classId].name}`, [el('p', { text: 'How does your adventurer look?' }), ...pick.body], menu, false);
  }

  private chooseName(classId: ClassId, look: number): void {
    const input = el('input', { className: 'name-input' });
    input.maxLength = NAME_MAX_LENGTH;
    input.placeholder = 'Name';
    const error = el('p', { className: 'form-error' });
    const submit = () => {
      const name = cleanName(input.value);
      if (nameLength(name) > NAME_MAX_LENGTH) return void (error.textContent = `Names can be at most ${NAME_MAX_LENGTH} letters.`);
      if (!name) return void (error.textContent = 'Give your adventurer a name.');
      if (this.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return void (error.textContent = `There is already someone called ${name}.`);
      const member = createMember(name, classId, look);
      // At most three in a row: if theirs is full, they take the other.
      member.row = rowFor(this.members, member.row);
      this.members.push(member);
      this.hall();
    };
    const suggest = () => {
      suggestName(input, this.members.map((m) => m.name));
      error.textContent = '';
    };
    const menu = new ListMenu(
      [
        { label: 'Swear the oath', onSelect: submit },
        { label: 'Suggest a name', onSelect: suggest },
        { label: 'Back', onSelect: () => this.chooseLook(classId, look) },
      ],
      { onCancel: () => this.chooseLook(classId, look) },
    );
    bindNameField(input, menu, submit, () => this.chooseLook(classId, look));
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
