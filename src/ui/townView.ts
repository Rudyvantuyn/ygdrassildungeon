import { audio } from '../audio/audio';
import { CLASSES } from '../core/data/classes';
import { EQUIPMENT, type EquipDef } from '../core/data/equipment';
import { chapterOf } from '../core/data/chapters';
import { resetSkills, spentPoints, unspentPoints } from '../core/skilltree';
import { memberPicker, showSkillTree } from './skillsView';
import { FLOORS } from '../core/data/floors';
import { ITEMS } from '../core/data/items';
import type { Game } from '../core/game';
import { MATERIALS } from '../core/data/materials';
import type { QuestDef } from '../core/data/quests';
import { acceptQuest, boardQuests, questGoal, questProgress, questStage, rewardText, turnInQuest } from '../core/quests';
import {
  sellMaterial,
  unlocksFrom,
  buyEquipment,
  buyItem,
  itemsForSale,
  canEquip,
  equipmentForSale,
  innCost,
  netPrice,
  restAtInn,
  statDelta,
} from '../core/town';
import { MAX_PARTY, MAX_ROSTER, NAME_MAX_LENGTH, dismissMember, moveToParty, moveToReserve, registerMember, rosterSize, shiftMember, toggleRow, oathCost, FOUNDING_OATHS } from '../core/guild';
import type { ClassId, Member, Stats } from '../core/types';
import type { TownSpot } from '../render/town';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';
import { npcFromName, npcSays } from './npc';

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
  settings(back: () => void): void;
  showFeedback(back: () => void): void;
  showHelp(back: () => void): void;
  openHornstone(): void;
  confirm(title: string, text: string, yes: () => void, back?: () => void): void;
  /** Shows tips not seen yet, then continues. */
  tips(ids: string[], then: () => void): void;
  showGuidebook(back: () => void): void;
}

interface Place {
  spot: TownSpot | null;
  name: string;
  detail: string;
  description: string;
  onSelect: () => void;
}

const STAT_LABELS: Record<keyof Stats, string> = { hp: 'HP', sp: 'SP', atk: 'ATK', def: 'DEF', mag: 'MAG', res: 'RES', spd: 'SPD' };

/** Town menu (side panel) plus the Inn, Oath Hall, Shop and Rootdeep dialogs. */
export class TownView {
  focus: TownSpot | null = 'rootdeep';
  menu: { handleKey(key: string): boolean } | null = null;
  private lastIndex = 0;

  constructor(
    private readonly host: TownHost,
    /** The town screen, laid over the view and side panel while in town. */
    private readonly grid: HTMLElement,
  ) {}

  get game(): Game {
    return this.host.game;
  }

  /** Builds the town screen: a large painted card for every place, plus Party, Settings and System. */
  show(): void {
    const s = this.game.state;
    const places: Place[] = [
      { spot: 'rootdeep', name: 'The Rootdeep', detail: '', description: 'Enter the Rootdeep at any floor you have reached.', onSelect: () => this.rootdeep() },
      { spot: 'inn', name: 'The Sleeping Stag', detail: `Rest · ${innCost(this.game)} G`, description: 'Rest to restore HP and SP, wake the fallen, and save.', onSelect: () => this.host.tips(['inn'], () => this.inn()) },
      { spot: 'shop', name: "Hilde's Supplies", detail: 'Shop', description: 'Buy items and gear, sell materials. Better gear appears as you go deeper.', onSelect: () => this.host.tips(['shop'], () => this.shop()) },
      { spot: 'hall', name: 'The Oath Hall', detail: 'Party · Skills', description: 'Swear in adventurers, choose who walks in the party, spend skill points.', onSelect: () => this.host.tips((s.oaths ?? 0) >= FOUNDING_OATHS ? ['oath', 'skillPoints'] : ['skillPoints'], () => this.hall()) },
      { spot: 'board', name: 'The Notice Board', detail: this.boardBadge() || 'Requests', description: 'Requests from the people of Lindholm. Finished work pays well.', onSelect: () => this.host.tips(['quests'], () => this.board()) },
      { spot: 'horn', name: 'The Hornstone', detail: 'Play together', description: 'Sound the horn to descend together with players from other halls.', onSelect: () => this.host.tips(['hornstone'], () => this.host.openHornstone()) },
    ];
    const buttons: Place[] = [
      { spot: null, name: 'Party', detail: '', description: 'Stats and equipment of everyone in the party.', onSelect: () => this.host.partyStatus(() => this.back()) },
      { spot: null, name: 'Settings', detail: '', description: 'Sound, battle and text speed, difficulty, tips.', onSelect: () => this.host.settings(() => this.back()) },
      { spot: null, name: 'System', detail: '', description: 'Save, help, feedback, and quit to the title screen.', onSelect: () => this.system() },
    ];
    const all = [...places, ...buttons];
    const nodes: HTMLElement[] = [];
    const desc = el('div', { className: 'town-desc' });
    const select = (i: number) => {
      this.lastIndex = Math.max(0, Math.min(all.length - 1, i));
      nodes.forEach((n, j) => n.classList.toggle('selected', j === this.lastIndex));
      this.focus = all[this.lastIndex].spot;
      desc.textContent = all[this.lastIndex].description;
    };
    const activate = (i: number) => {
      select(i);
      audio.play('menuSelect');
      all[i].onSelect();
    };
    for (const [i, p] of all.entries()) {
      const node =
        p.spot
          ? el('button', { className: `town-card spot-${p.spot}` }, [
              el('div', { className: 'town-card-name', text: p.name }),
              ...(p.detail ? [el('div', { className: 'town-card-detail', text: p.detail })] : []),
            ])
          : el('button', { className: 'town-button', text: p.name });
      node.addEventListener('mouseenter', () => select(i));
      node.addEventListener('click', () => activate(i));
      nodes.push(node);
    }
    this.grid.replaceChildren(
      el('div', { className: 'town-head' }, [
        el('div', { className: 'town-name', text: 'Lindholm' }),
        desc,
        el('div', { className: 'town-gold', text: `${s.gold} G` }),
      ]),
      el('div', { className: 'town-cards' }, nodes.slice(0, places.length)),
      el('div', { className: 'town-buttons' }, nodes.slice(places.length)),
    );
    select(Math.min(this.lastIndex, all.length - 1));
    const cols = 3;
    this.menu = {
      handleKey: (key: string): boolean => {
        const i = this.lastIndex;
        const onCards = i < places.length;
        let next = i;
        if (key === 'ArrowRight' || key === 'd' || key === 'D') next = i + 1;
        else if (key === 'ArrowLeft' || key === 'a' || key === 'A') next = i - 1;
        else if (key === 'ArrowDown' || key === 's' || key === 'S') next = onCards ? (i + cols < places.length ? i + cols : places.length + Math.min(i % cols, buttons.length - 1)) : i;
        else if (key === 'ArrowUp' || key === 'w' || key === 'W') next = onCards ? i - cols : places.length - cols + Math.min(i - places.length, cols - 1);
        else if (key === 'Enter' || key === ' ' || key === 'z' || key === 'Z') {
          activate(i);
          return true;
        } else return false;
        if (next >= 0 && next < all.length && next !== i) {
          audio.play('menuMove');
          select(next);
        }
        return true;
      },
    };
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
            audio.play('heal');
            this.host.save();
            this.back();
            this.host.toast('The party rests well. Game saved.');
          },
        },
        { label: 'Leave', onSelect: back },
      ],
      { onCancel: back },
    );
    this.dialog('The Sleeping Stag', [npcSays('gerd', `"Welcome, explorers! A warm bed and a hot meal for ${cost} gold."`)], menu);
  }

  private system(): void {
    const back = () => this.back();
    const menu = new ListMenu(
      [
        { label: 'Save', description: 'Save your progress.', onSelect: () => { this.host.save(); this.back(); this.host.toast('Game saved.'); } },
        { label: 'Settings', description: 'Sound, battle and text speed, difficulty, tips.', onSelect: () => this.host.settings(() => this.system()) },
        { label: 'Guidebook', description: 'Read every tip again, and switch tips on or off.', onSelect: () => this.host.showGuidebook(() => this.system()) },
        { label: 'How to Play', description: 'Controls and tips.', onSelect: () => this.host.showHelp(() => this.system()) },
        { label: 'Feedback', description: 'Report a bug or share an idea with the makers.', onSelect: () => this.host.showFeedback(() => this.system()) },
        { label: 'Privacy & Terms', description: 'What the game stores about you, and the rules of play (opens a new page).', onSelect: () => window.open('privacy.html', '_blank', 'noopener') },
        { label: 'Quit to title', description: 'Return to the title screen. Unsaved progress is lost.', onSelect: () => this.host.showTitle() },
        { label: 'Back', onSelect: back },
      ],
      { onCancel: back },
    );
    this.dialog('System', [], menu, true);
  }

  // ── Notice board ───────────────────────────────────────────────────────────

  private boardBadge(): string {
    const quests = boardQuests(this.game);
    const ready = quests.filter((q) => questStage(this.game, q) === 'ready').length;
    const fresh = quests.filter((q) => questStage(this.game, q) === 'new').length;
    return ready ? `${ready} ready!` : fresh ? `${fresh} new` : '';
  }

  private board(start = 0): void {
    const back = () => this.back();
    const quests = boardQuests(this.game);
    const done = Object.values(this.game.state.quests).filter((q) => q.status === 'done').length;
    const tag = (q: QuestDef) => {
      const stage = questStage(this.game, q);
      if (stage === 'new') return 'new';
      if (stage === 'ready') return 'ready!';
      const p = questProgress(this.game, q);
      return `${p.current}/${p.target}`;
    };
    const items: MenuItem[] = quests.map((q, i) => ({
      label: q.title,
      detail: tag(q),
      description: `${questGoal(q)} · reward ${rewardText(q)}`,
      onSelect: () => this.questDetail(q, i),
    }));
    if (items.length === 0) items.push({ label: 'No requests right now', disabled: true, onSelect: () => {} });
    items.push({ label: 'Leave', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back, startIndex: start });
    this.dialog('Notice Board', [el('p', { className: 'gold-line', text: `Requests completed: ${done}` })], menu, true);
  }

  private questDetail(q: QuestDef, listIndex: number): void {
    const stage = questStage(this.game, q);
    const p = questProgress(this.game, q);
    const back = () => this.board(listIndex);
    const actions: MenuItem[] = [];
    if (stage === 'new') {
      actions.push({
        label: 'Accept',
        onSelect: () => {
          acceptQuest(this.game, q.id);
          this.host.toast(`Accepted: ${q.title}`);
          this.board(listIndex);
        },
      });
    }
    if (stage === 'ready') {
      actions.push({
        label: q.kind === 'gather' ? 'Hand over the materials' : 'Report back',
        onSelect: () => {
          turnInQuest(this.game, q.id);
          audio.play('levelUp');
          this.host.updateHud();
          this.host.toast(`${q.giver}: "Thank you!" You receive ${rewardText(q)}.`);
          this.board(0);
        },
      });
    }
    actions.push({ label: 'Back', onSelect: back });
    const menu = new ListMenu(actions, { onCancel: back });
    const status = stage === 'new' ? 'Not accepted yet' : stage === 'ready' ? 'Done! Report back for your reward.' : `In progress: ${p.current}/${p.target}`;
    this.dialog(
      q.title,
      [
        ...(() => {
          const npc = npcFromName(q.giver);
          return npc
            ? [npcSays(npc, `"${q.text}"`, q.giver)]
            : [el('p', { className: 'quest-giver', text: q.giver }), el('p', { text: `"${q.text}"` })];
        })(),
        el('div', { className: 'rewards' }, [
          el('span', { text: 'Goal' }), el('span', { className: 'v', text: questGoal(q) }),
          el('span', { text: 'Reward' }), el('span', { className: 'v', text: rewardText(q) }),
          el('span', { text: 'Status' }), el('span', { className: 'v', text: status }),
        ]),
      ],
      menu,
    );
  }

  // ── Oath Hall ──────────────────────────────────────────────────────────────

  private hall(start = 0): void {
    const back = () => this.back();
    const s = this.game.state;
    const menu = new ListMenu(
      [
        {
          label: 'Register an adventurer',
          detail: oathText(this.game),
          description: `Swear in a new adventurer at level 1 (${rosterSize(this.game)}/${MAX_ROSTER} in the hall). Each oath after your first party costs more gold and an Oath Token; you have ${s.inventory.oathToken ?? 0}.`,
          disabled: rosterSize(this.game) >= MAX_ROSTER,
          onSelect: () => this.chooseClass(),
        },
        { label: 'Form the party', description: `Choose up to ${MAX_PARTY} members, their order and their rows.`, onSelect: () => this.formParty() },
        {
          label: 'Skills',
          detail: [...s.party, ...s.reserve].some((m) => unspentPoints(m) > 0) ? 'points to spend' : undefined,
          description: 'Spend skill points. Every level brings one; each skill goes up to rank 10.',
          onSelect: () => this.skills(),
        },
        { label: 'Unlearn skills', description: 'Take back all skill points of one adventurer, for a fee.', onSelect: () => this.unlearn() },
        { label: 'Dismiss', description: 'Release an adventurer from the reserve for good.', disabled: s.reserve.length === 0, onSelect: () => this.dismiss() },
        { label: 'Leave', onSelect: back },
      ],
      { onCancel: back, startIndex: start },
    );
    this.dialog('The Oath Hall', [npcSays('brynja', '"Swear on the bone of Ymir, and the realms will remember your name."')], menu, true);
  }

  private skills(): void {
    const all = [...this.game.state.party, ...this.game.state.reserve];
    const host = {
      dialog: (title: string, body: HTMLElement[], menu: ListMenu) => this.dialog(title, body, menu, true),
      changed: () => {
        this.host.save();
        this.host.updateHud();
      },
    };
    const pick = () => this.dialog('Skills', [npcSays('brynja', '"Choose what to learn with care. Unlearning has its price."')], new ListMenu(memberPicker(all, (m) => showSkillTree(host, m, pick), () => this.hall(2)), { onCancel: () => this.hall(2) }), true);
    pick();
  }

  private unlearn(): void {
    const all = [...this.game.state.party, ...this.game.state.reserve];
    const back = () => this.hall(3);
    const items: MenuItem[] = all.map((m) => {
      const fee = unlearnFee(m);
      return {
        label: m.name,
        detail: `${fee} G`,
        description: `Return all of ${m.name}'s skill points for ${fee} G.`,
        disabled: this.game.state.gold < fee || spentPoints(m) === 0,
        onSelect: () =>
          this.host.confirm('Unlearn skills', `${m.name} forgets every skill and gets all points back to spend again. Pay ${fee} G?`, () => {
            this.game.state.gold -= fee;
            resetSkills(m);
            this.host.save();
            this.host.updateHud();
            this.unlearn();
          }, () => this.unlearn()),
      };
    });
    items.push({ label: 'Back', onSelect: back });
    this.dialog('Unlearn skills', [this.goldLine()], new ListMenu(items, { onCancel: back }), true);
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
    this.dialog(`A new ${CLASSES[classId].name}`, [el('p', { text: 'What is your name, adventurer?' }), el('p', { className: 'gold-line', text: `The oath costs ${oathText(this.game)}.` }), input, error], menu);
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
    const menu = new ListMenu(items, { onCancel: () => this.hall(4) });
    this.dialog('Dismiss whom?', [], menu);
  }

  // ── Shop ───────────────────────────────────────────────────────────────────

  private shop(start = 0): void {
    const back = () => this.back();
    const menu = new ListMenu(
      [
        { label: 'Items', onSelect: () => this.shopItems() },
        { label: 'Equipment', onSelect: () => this.shopEquipment() },
        { label: 'Sell materials', detail: `${Object.values(this.game.state.materials).reduce((a, b) => a + b, 0)} carried`, onSelect: () => this.shopSell() },
        { label: 'Leave', onSelect: back },
      ],
      { onCancel: back, startIndex: start },
    );
    this.dialog("Hilde's Supplies", [npcSays('hilde', '"Take a look. Everything here was made to survive the Rootdeep."')], menu);
  }

  private shopItems(start = 0): void {
    const inv = this.game.state.inventory;
    const items: MenuItem[] = itemsForSale(this.game).map((id, i) => ({
      label: `${ITEMS[id].name}  (have ${inv[id] ?? 0})`,
      detail: `${ITEMS[id].price} G`,
      description: ITEMS[id].description,
      disabled: this.game.state.gold < ITEMS[id].price,
      onSelect: () => {
        buyItem(this.game, id);
        audio.play('coin');
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
        label: e.requires ? `★ ${e.name}` : e.name,
        detail: `${e.price} G`,
        description: `${bonusText(e)} · ${e.slot} · for ${users.join(', ')}${e.requires ? ' · special' : ''}`,
        onSelect: () => this.chooseWearer(e, i),
      };
    });
    const menu = new ListMenu(items, { onCancel: () => this.shop(1), startIndex: start });
    this.dialog('Equipment', [this.goldLine()], menu, true);
  }

  private shopSell(start = 0): void {
    const entries = Object.entries(this.game.state.materials).filter(([, n]) => n > 0);
    const hint = (id: string) => {
      const next = unlocksFrom(this.game, id).filter((u) => u.remaining > 0 && u.gear.tier <= this.game.state.deepest);
      if (next.length) return ` Sell ${next[0].remaining} more and I can make a ${next[0].gear.name}.`;
      const locked = unlocksFrom(this.game, id).find((u) => u.remaining > 0);
      return locked ? ' I have plans for these, once you have been deeper.' : '';
    };
    const items: MenuItem[] = entries.map(([id, n], i) => ({
      label: `${MATERIALS[id].name} ×${n}`,
      detail: `${MATERIALS[id].price} G`,
      description: `${MATERIALS[id].description}${hint(id)}`,
      onSelect: () => this.sellChoice(id, i),
    }));
    if (items.length === 0) items.push({ label: 'You have nothing to sell', disabled: true, onSelect: () => {} });
    items.push({ label: 'Back', onSelect: () => this.shop(2) });
    const menu = new ListMenu(items, { onCancel: () => this.shop(2), startIndex: start });
    this.dialog('Sell materials', [el('p', { text: '"Monster parts! Bring me enough of one kind and I can forge something special."' }), this.goldLine()], menu, true);
  }

  private sellChoice(id: string, listIndex: number): void {
    const n = this.game.state.materials[id] ?? 0;
    const price = MATERIALS[id].price;
    const sell = (qty: number) => () => {
      const before = equipmentForSale(this.game).length;
      const gold = sellMaterial(this.game, id, qty);
      audio.play('coin');
      this.host.updateHud();
      const unlocked = equipmentForSale(this.game).length > before;
      this.host.toast(unlocked ? `Sold for ${gold} G. Hilde has something new for you!` : `Sold for ${gold} G.`);
      this.shopSell(Math.min(listIndex, Object.keys(this.game.state.materials).length - 1));
    };
    const menu = new ListMenu(
      [
        { label: 'Sell one', detail: `${price} G`, onSelect: sell(1) },
        { label: `Sell all ${n}`, detail: `${price * n} G`, onSelect: sell(n) },
        { label: 'Back', onSelect: () => this.shopSell(listIndex) },
      ],
      { onCancel: () => this.shopSell(listIndex) },
    );
    this.dialog(MATERIALS[id].name, [el('p', { text: MATERIALS[id].description })], menu);
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
          audio.play('coin');
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
      detail: `Chapter ${chapterOf(i).numeral}`,
      description: chapterOf(i).name,
      onSelect: () => {
        this.host.closeOverlay();
        this.game.enterFloor(i);
        this.host.save();
        this.host.enterDungeon();
        this.host.toast(i === FLOORS.length - 1 ? `${f.name}: the deepest floor.` : `${f.name}: find the stairs down.`);
      },
    }));
    items.push({ label: 'Not yet', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back, startIndex: this.game.state.deepest });
    this.dialog('The Rootdeep', [el('p', { text: 'Which floor will you start from?' })], menu, true);
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

/** "600 G + 1 Oath Token", or "free". */
function oathText(game: Game): string {
  const cost = oathCost(game);
  if (!cost.gold && !cost.tokens) return 'free';
  return `${cost.gold} G + ${cost.tokens} Oath Token`;
}

/** The Oath Hall's fee for unlearning: a little more for every level. */
function unlearnFee(m: Member): number {
  return 50 + m.level * 40;
}

function bonusText(e: EquipDef): string {
  return Object.entries(e.bonus)
    .map(([k, v]) => `${STAT_LABELS[k as keyof Stats]} ${v! > 0 ? '+' : ''}${v}`)
    .join(', ');
}
