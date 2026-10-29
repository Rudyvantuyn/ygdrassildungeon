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
import type { ItemId, Stats } from '../core/types';
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
  campStatus(back: () => void): void;
}

const STAT_LABELS: Record<keyof Stats, string> = { hp: 'HP', tp: 'TP', atk: 'ATK', def: 'DEF', mag: 'MAG', res: 'RES', spd: 'SPD' };

/** Town menu (side panel) plus the Inn, Shop and Labyrinth dialogs. */
export class TownView {
  focus: TownSpot | null = 'labyrinth';
  menu: ListMenu | null = null;
  private lastIndex = 2;

  constructor(
    private readonly host: TownHost,
    private readonly panel: HTMLElement,
  ) {}

  get game(): Game {
    return this.host.game;
  }

  /** Builds the side-panel menu. */
  show(): void {
    const spot = (s: TownSpot, i: number) => () => {
      this.focus = s;
      this.lastIndex = i;
    };
    const items: MenuItem[] = [
      { label: 'Inn', detail: `${innCost(this.game)} G`, description: 'Rest to restore HP and TP, revive fallen members, and save.', onFocus: spot('inn', 0), onSelect: () => this.inn() },
      { label: 'Shop', description: 'Buy items and equipment. Better gear appears as you go deeper.', onFocus: spot('shop', 1), onSelect: () => this.shop() },
      { label: 'Labyrinth', description: 'Enter the labyrinth at any floor you have reached.', onFocus: spot('labyrinth', 2), onSelect: () => this.labyrinth() },
      { label: 'Party', description: 'View stats and equipment.', onFocus: () => { this.focus = null; this.lastIndex = 3; }, onSelect: () => this.host.campStatus(() => this.back()) },
      { label: 'Save', description: 'Save your progress.', onFocus: () => { this.focus = null; this.lastIndex = 4; }, onSelect: () => { this.host.save(); this.host.toast('Game saved.'); } },
      { label: 'Quit to title', description: 'Return to the title screen. Unsaved progress is lost.', onFocus: () => { this.focus = null; this.lastIndex = 5; }, onSelect: () => this.host.showTitle() },
    ];
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
    this.dialog("Hilde's Supplies", [el('p', { text: '"Take a look. Everything here was made to survive the labyrinth."' })], menu);
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

  // ── Labyrinth ──────────────────────────────────────────────────────────────

  private labyrinth(): void {
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
    this.dialog('The Labyrinth', [el('p', { text: 'Which floor will you start from?' })], menu);
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
