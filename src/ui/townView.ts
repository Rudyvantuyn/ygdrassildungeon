import { CLASSES } from '../core/data/classes';
import { EQUIPMENT, type EquipDef } from '../core/data/equipment';
import { FLOORS } from '../core/data/floors';
import { ITEMS } from '../core/data/items';
import type { Game } from '../core/game';
import {
  buyEquipment,
  buyItem,
  canEquip,
  equipmentForSale,
  innCost,
  netPrice,
  restAtInn,
  statDelta,
} from '../core/town';
import { MAX_PARTY, MAX_ROSTER, NAME_MAX_LENGTH, dismissMember, moveToParty, moveToReserve, registerMember, rosterSize, shiftMember, toggleRow } from '../core/guild';
import type { ClassId, ItemId, Stats } from '../core/types';
import type { TownSpot } from '../render/town';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';

export interface TownHost {
  game: Game;
  openOverlay(content: HTMLElement, menu: ListMenu): void;
  closeOverlay(): void;
  toast(text: string): void;
  save(): void;
  updateHud(): void;
  enterTown(): void;
  enterDungeon(): void;
  showTitle(): void;
  partyStatus(back: () => void): void;
}

const STAT_LABELS: Record<keyof Stats, string> = { hp: 'HP', sp: 'SP', atk: 'ATK', def: 'DEF', mag: 'MAG', res: 'RES', spd: 'SPD' };

/** Town menu (side panel) plus the Inn, Oath Hall, Shop and Rootdeep dialogs. */
export class TownView {
  focus: TownSpot | null = 'rootdeep';
  menu: ListMenu | null = null;
  private lastIndex = 3;

  constructor(
    private readonly host: TownHost,
    private readonly panel: HTMLElement,
  ) {}

  get game(): Game {
    return this.host.game;
  }

  /** Builds the side-panel menu. */
  show(): void {
    const entries: (Omit<MenuItem, 'onFocus'> & { spot: TownSpot | null })[] = [
      { label: 'Inn', detail: `${innCost(this.game)} G`, description: 'Rest to restore HP and SP, revive fallen members, and save.', spot: 'inn', onSelect: () => this.inn() },
      { label: 'Oath Hall', description: 'Register new adventurers and choose who joins the party.', spot: 'hall', onSelect: () => this.hall() },
      { label: 'Shop', description: 'Buy items and equipment. Better gear appears as you go deeper.', spot: 'shop', onSelect: () => this.shop() },
      { label: 'Rootdeep', description: 'Enter the Rootdeep at any floor you have reached.', spot: 'rootdeep', onSelect: () => this.rootdeep() },
      { label: 'Party', description: 'View stats and equipment.', spot: null, onSelect: () => this.host.partyStatus(() => this.back()) },
      { label: 'Save', description: 'Save your progress.', spot: null, onSelect: () => { this.host.save(); this.host.toast('Game saved.'); } },
      { label: 'Quit to title', description: 'Return to the title screen. Unsaved progress is lost.', spot: null, onSelect: () => this.host.showTitle() },
    ];
    const items: MenuItem[] = entries.map(({ spot, ...item }, i) => ({
      ...item,
      onFocus: () => {
        this.focus = spot;
        this.lastIndex = i;
      },
    }));
    this.menu = new ListMenu(items, { startIndex: this.lastIndex });
    const desc = el('div', { className: 'menu-desc' });
    this.panel.innerHTML = '';
    this.panel.append(
      el('div', { className: 'cmd-title', text: 'Where to?' }),
      this.menu.el,
      desc,
      el('div', { className: 'town-gold', text: `${this.game.state.gold} G` }),
      el('div', { className: 'cmd-hint', text: '↑↓ choose · Enter confirm' }),
    );
    this.menu.describeInto(desc);
  }

  // ── Inn ────────────────────────────────────────────────────────────────────

  private inn(): void {
    const cost = innCost(this.game);
    const back = () => this.back();
    const menu = new ListMenu(
      [
        {
          label: `Rest (${cost} G)`,
          disabled: this.game.state.gold < cost,
          onSelect: () => {
            restAtInn(this.game);
            this.host.save();
            this.back();
            this.host.toast('The party rests well. Game saved.');
          },
        },
        { label: 'Leave', onSelect: back },
      ],
      { onCancel: back },
    );
    this.dialog('The Sleeping Stag', [el('p', { text: `"Welcome, explorers! A warm bed and a hot meal for ${cost} gold."` })], menu);
  }

  // ── Oath Hall ──────────────────────────────────────────────────────────────

  private hall(start = 0): void {
    const back = () => this.back();
    const s = this.game.state;
    const menu = new ListMenu(
      [
        {
          label: 'Register an adventurer',
          detail: `${rosterSize(this.game)}/${MAX_ROSTER}`,
          description: 'Swear in a new adventurer at level 1.',
          disabled: rosterSize(this.game) >= MAX_ROSTER,
          onSelect: () => this.chooseClass(),
        },
        { label: 'Form the party', description: `Choose up to ${MAX_PARTY} members, their order and their rows.`, onSelect: () => this.formParty() },
        { label: 'Dismiss', description: 'Release an adventurer from the reserve for good.', disabled: s.reserve.length === 0, onSelect: () => this.dismiss() },
        { label: 'Leave', onSelect: back },
      ],
      { onCancel: back, startIndex: start },
    );
    this.dialog('The Oath Hall', [el('p', { text: '"Speak your oath, and the Great Tree will remember your name."' })], menu, true);
  }

  private chooseClass(): void {
    const items: MenuItem[] = (Object.keys(CLASSES) as ClassId[]).map((id) => ({
      label: CLASSES[id].name,
      detail: CLASSES[id].row === 'front' ? 'front row' : 'back row',
      description: CLASSES[id].description,
      onSelect: () => this.chooseName(id),
    }));
    const menu = new ListMenu(items, { onCancel: () => this.hall(0) });
    this.dialog('Choose a class', [], menu, true);
  }

  private chooseName(classId: ClassId): void {
    const input = el('input', { className: 'name-input' });
    input.maxLength = NAME_MAX_LENGTH;
    input.placeholder = 'Name';
    const error = el('p', { className: 'form-error' });
    const submit = () => {
      const problem = registerMember(this.game, input.value, classId);
      if (problem) {
        error.textContent = problem;
        input.focus();
        return;
      }
      this.host.updateHud();
      this.host.toast(`${input.value.trim()} the ${CLASSES[classId].name} has sworn the oath.`);
      this.hall(0);
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') this.chooseClass();
    });
    const menu = new ListMenu(
      [
        { label: 'Swear the oath', onSelect: submit },
        { label: 'Back', onSelect: () => this.chooseClass() },
      ],
      { onCancel: () => this.chooseClass() },
    );
    this.dialog(`A new ${CLASSES[classId].name}`, [el('p', { text: 'What is your name, adventurer?' }), input, error], menu);
    input.focus();
  }

  private formParty(start = 0): void {
    const s = this.game.state;
    const items: MenuItem[] = [
      ...s.party.map((m, i) => ({
        label: `${i + 1}. ${m.name}`,
        detail: `${CLASSES[m.classId].name} Lv ${m.level} · ${m.row}`,
        description: 'In the party. Select to move, change row or send to the reserve.',
        onSelect: () => this.editMember(i),
      })),
      ...s.reserve.map((m, i) => ({
        label: `   ${m.name}`,
        detail: `${CLASSES[m.classId].name} Lv ${m.level} · reserve`,
        description: s.party.length >= MAX_PARTY ? `The party is full (${MAX_PARTY}). Send someone to the reserve first.` : 'Waiting in the hall. Select to join the party.',
        disabled: s.party.length >= MAX_PARTY,
        onSelect: () => {
          moveToParty(this.game, i);
          this.host.updateHud();
          this.formParty(s.party.length - 1);
        },
      })),
    ];
    const menu = new ListMenu(items, { onCancel: () => this.hall(1), startIndex: start });
    this.dialog('Form the party', [el('p', { className: 'gold-line', text: `Party ${s.party.length}/${MAX_PARTY} · Reserve ${s.reserve.length}` })], menu, true);
  }

  private editMember(i: number): void {
    const s = this.game.state;
    const m = s.party[i];
    const after = (fn: () => boolean, next: number) => () => {
      fn();
      this.host.updateHud();
      this.formParty(next);
    };
    const menu = new ListMenu(
      [
        { label: 'Move left', disabled: i === 0, onSelect: after(() => shiftMember(this.game, i, -1), i - 1) },
        { label: 'Move right', disabled: i === s.party.length - 1, onSelect: after(() => shiftMember(this.game, i, 1), i + 1) },
        { label: m.row === 'front' ? 'Move to the back row' : 'Move to the front row', onSelect: after(() => toggleRow(this.game, i), i) },
        { label: 'Send to the reserve', disabled: s.party.length <= 1, onSelect: after(() => moveToReserve(this.game, i), 0) },
        { label: 'Back', onSelect: () => this.formParty(i) },
      ],
      { onCancel: () => this.formParty(i) },
    );
    this.dialog(`${m.name} the ${CLASSES[m.classId].name}`, [el('p', { text: 'Back-row fighters deal and take less melee damage (archers aim fine from anywhere).' })], menu);
  }

  private dismiss(): void {
    const s = this.game.state;
    const items: MenuItem[] = s.reserve.map((m, i) => ({
      label: m.name,
      detail: `${CLASSES[m.classId].name} Lv ${m.level}`,
      onSelect: () => {
        const menu = new ListMenu(
          [
            {
              label: `Dismiss ${m.name}`,
              onSelect: () => {
                dismissMember(this.game, i);
                this.host.toast(`${m.name} leaves Lindholm.`);
                this.hall(0);
              },
            },
            { label: 'Keep', onSelect: () => this.dismiss() },
          ],
          { onCancel: () => this.dismiss(), startIndex: 1 },
        );
        this.dialog(`Dismiss ${m.name}?`, [el('p', { text: 'They leave for good, together with their equipment.' })], menu);
      },
    }));
    const menu = new ListMenu(items, { onCancel: () => this.hall(2) });
    this.dialog('Dismiss whom?', [], menu);
  }

  // ── Shop ───────────────────────────────────────────────────────────────────

  private shop(start = 0): void {
    const back = () => this.back();
    const menu = new ListMenu(
      [
        { label: 'Items', onSelect: () => this.shopItems() },
        { label: 'Equipment', onSelect: () => this.shopEquipment() },
        { label: 'Leave', onSelect: back },
      ],
      { onCancel: back, startIndex: start },
    );
    this.dialog("Hilde's Supplies", [el('p', { text: '"Take a look. Everything here was made to survive the Rootdeep."' })], menu);
  }

  private shopItems(start = 0): void {
    const inv = this.game.state.inventory;
    const items: MenuItem[] = (Object.keys(ITEMS) as ItemId[]).map((id, i) => ({
      label: `${ITEMS[id].name}  (have ${inv[id] ?? 0})`,
      detail: `${ITEMS[id].price} G`,
      description: ITEMS[id].description,
      disabled: this.game.state.gold < ITEMS[id].price,
      onSelect: () => {
        buyItem(this.game, id);
        this.host.updateHud();
        this.shopItems(i);
      },
    }));
    const menu = new ListMenu(items, { onCancel: () => this.shop(0), startIndex: start });
    this.dialog('Items', [this.goldLine()], menu, true);
  }

  private shopEquipment(start = 0): void {
    const party = this.game.state.party;
    const items: MenuItem[] = equipmentForSale(this.game).map((e, i) => {
      const users = party.filter((m) => canEquip(m, e)).map((m) => m.name);
      return {
        label: e.name,
        detail: `${e.price} G`,
        description: `${bonusText(e)} · ${e.slot} · for ${users.join(', ')}`,
        onSelect: () => this.chooseWearer(e, i),
      };
    });
    const menu = new ListMenu(items, { onCancel: () => this.shop(1), startIndex: start });
    this.dialog('Equipment', [this.goldLine()], menu, true);
  }

  private chooseWearer(e: EquipDef, listIndex: number): void {
    const party = this.game.state.party;
    const items: MenuItem[] = party.map((m, i) => {
      const fits = canEquip(m, e);
      const owned = m[e.slot] === e.id;
      const cost = netPrice(m, e);
      const current = m[e.slot] ? EQUIPMENT[m[e.slot]!].name : 'nothing';
      const delta = Object.entries(statDelta(m, e))
        .map(([k, v]) => `${STAT_LABELS[k as keyof Stats]} ${v! > 0 ? '+' : ''}${v}`)
        .join(', ');
      return {
        label: `${m.name} (${CLASSES[m.classId].name})`,
        detail: !fits ? "can't use" : owned ? 'equipped' : `${cost} G`,
        description: fits ? `Now: ${current}. ${delta || 'No change'}.${m[e.slot] && !owned ? ' Old gear is traded in for half price.' : ''}` : `A ${CLASSES[m.classId].name} can't use this.`,
        disabled: !fits || owned || this.game.state.gold < cost,
        onSelect: () => {
          buyEquipment(this.game, e.id, i);
          this.host.updateHud();
          this.host.toast(`${m.name} equips the ${e.name}.`);
          this.shopEquipment(listIndex);
        },
      };
    });
    const menu = new ListMenu(items, { onCancel: () => this.shopEquipment(listIndex) });
    this.dialog(e.name, [el('p', { text: bonusText(e) }), this.goldLine()], menu, true);
  }

  // ── Rootdeep ──────────────────────────────────────────────────────────────

  private rootdeep(): void {
    const back = () => this.back();
    const items: MenuItem[] = FLOORS.slice(0, this.game.state.deepest + 1).map((f, i) => ({
      label: f.name,
      onSelect: () => {
        this.host.closeOverlay();
        this.game.enterFloor(i);
        this.host.save();
        this.host.enterDungeon();
        this.host.toast(`${f.name} — find the stairs down.`);
      },
    }));
    items.push({ label: 'Not yet', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back, startIndex: this.game.state.deepest });
    this.dialog('The Rootdeep', [el('p', { text: 'Which floor will you start from?' })], menu);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private back(): void {
    this.host.closeOverlay();
    this.host.enterTown();
  }

  private goldLine(): HTMLElement {
    return el('p', { className: 'gold-line', text: `Gold: ${this.game.state.gold} G` });
  }

  private dialog(title: string, body: HTMLElement[], menu: ListMenu, withDesc = false): void {
    const children: HTMLElement[] = [el('h2', { text: title }), ...body, menu.el];
    if (withDesc) {
      const desc = el('div', { className: 'menu-desc' });
      menu.describeInto(desc);
      children.push(desc);
    }
    this.host.openOverlay(el('div', { className: 'panel dialog wide' }, children), menu);
  }
}

function bonusText(e: EquipDef): string {
  return Object.entries(e.bonus)
    .map(([k, v]) => `${STAT_LABELS[k as keyof Stats]} ${v! > 0 ? '+' : ''}${v}`)
    .join(', ');
}
