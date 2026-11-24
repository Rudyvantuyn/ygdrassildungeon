import { sagas } from './sagaView';
import { audio } from '../audio/audio';
import { CLASSES } from '../core/data/classes';
import { EQUIPMENT, type EquipDef } from '../core/data/equipment';
import { chapterOf, startFloors } from '../core/data/chapters';
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
  specialGearInProgress,
  innCost,
  netPrice,
  restAtInn,
  statDelta,
  featuredGear, gearFor,
  tradeInValue,
} from '../core/town';
import { MAX_PARTY, MAX_ROSTER, NAME_MAX_LENGTH, canSwitchRow, dismissMember, moveToParty, moveToReserve, registerMember, rosterSize, shiftMember, toggleRow, oathCost, FOUNDING_OATHS, cleanName } from '../core/guild';
import type { ClassId, Member, Stats } from '../core/types';
import type { TownSpot } from '../render/town';
import { advice } from '../core/advice';
import { OATH_BONUS, OATH_NAMES, changeClass, classChangeCost, classChangeProblem, deeperOathCost, deeperOathProblem, oathName, oathOf, swearDeeperOath } from '../core/oaths';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';
import { npcFromName, npcSays } from './npc';
import { fetchHonors } from '../net/reports';
import { bindNameField, suggestName } from './founding';
import { RavensView, ravenBadge, ravenNow } from './ravensView';
import { lookPicker } from './lookPicker';
import { healWound, healerCost, isWounded, unavailable } from '../core/ravens';
import { classUnlocked } from '../core/deeds';
import { WYRD_GEAR, nextWeaveCost, wearWyrd, weave, wyrdDay, wyrdDayNumber, wyrdDoneToday, wyrdOpen } from '../core/wyrd';
import { clockNow } from '../net/clock';
import { ECHO_COST, ECHO_STEP, GUARDIAN_LEVEL, echoBlocker, echoGuardians, echoLevels, echoName, hallOfEchoesOpen, missingShards, shardChance } from '../core/echoes';
import { ENEMIES } from '../core/data/enemies';
import { BEAST_LORE } from '../core/data/beastLore';
import { isMaker } from './designer';
import { showMemories } from './memoriesView';

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
  /** The one menu: party, bag, journal, options. */
  openMenu(): void;
  settings(back: () => void): void;
  showFeedback(back: () => void): void;
  showHelp(back: () => void): void;
  openHornstone(): void;
  /** Today's Wyrdweave (the Well of Urd). */
  startWyrd(): void;
  /** Calls an echo in the Hall of Echoes and fights it. */
  startEcho(id: string, level: number): void;
  confirm(title: string, text: string, yes: () => void, back?: () => void): void;
  /** Shows tips not seen yet, then continues. */
  tips(ids: string[], then: () => void): void;
  showGuidebook(back: () => void): void;
  /** Remembers a tip to show at the next calm moment. */
  noticeTip(id: string): void;
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

  /** Builds the town screen: a large painted card for every place, and the menu button in the header. */
  show(): void {
    const s = this.game.state;
    const places: Place[] = [
      { spot: 'rootdeep', name: 'The Rootdeep', detail: '', description: 'Descend from the start of a chapter you have opened.', onSelect: () => this.rootdeep() },
      { spot: 'inn', name: 'The Sleeping Stag', detail: innCost(this.game) ? `Rest · ${innCost(this.game)} G` : 'Rest · free tonight', description: 'Rest to restore HP and SP, wake the fallen, and save.', onSelect: () => this.host.tips(['inn'], () => this.inn()) },
      { spot: 'shop', name: "Hilde's Supplies", detail: 'Shop', description: 'Buy items and gear, sell materials. Better gear appears as you go deeper.', onSelect: () => this.host.tips(['shop'], () => this.shop()) },
      { spot: 'hall', name: 'The Oath Hall', detail: ravenBadge(this.game) ? `Ravens: ${ravenBadge(this.game)}` : 'Party · Skills', description: 'Swear in adventurers, choose who walks in the party, spend skill points.', onSelect: () => this.host.tips((s.oaths ?? 0) >= FOUNDING_OATHS ? ['oath', 'skillPoints'] : ['skillPoints'], () => this.hall()) },
      { spot: 'board', name: 'The Notice Board', detail: this.boardBadge() || 'Requests', description: 'Requests from the people of Lindholm. Finished work pays well.', onSelect: () => this.host.tips(['quests'], () => this.board()) },
      { spot: 'horn', name: 'The Hornstone', detail: 'Play together', description: 'Sound the horn to descend together with players from other halls.', onSelect: () => this.host.tips(['hornstone'], () => this.host.openHornstone()) },
    ];
    // The Hall of Echoes, once chapter V's guardian has fallen (makers see it early, to try it).
    if (hallOfEchoesOpen(this.game) || isMaker()) {
      places.push({ spot: 'echoes', name: 'The Hall of Echoes', detail: `${s.inventory.dreamEmber ?? 0} Dream Embers`, description: 'Burn Dream Embers to call back a guardian you have beaten, as strong as you dare.', onSelect: () => this.host.tips(['echoes'], () => this.echoes()) });
    }
    const all = places;
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
    const menuButton = el('button', { className: 'menu-button', text: '☰ Menu' });
    menuButton.title = 'Party, bag, journal and options (Esc)';
    menuButton.addEventListener('click', () => {
      audio.play('menuSelect');
      this.host.openMenu();
    });
    // Brynja's advice: one next step, under the header. Clicking it opens the place it points at.
    const tip = advice(this.game);
    const goal = el('button', { className: 'town-goal' }, [el('span', { className: 'town-goal-who', text: 'Brynja:' }), el('span', { text: ` ${tip?.text ?? ''}` })]);
    goal.title = 'Brynja\'s advice. Switch it off under Options, Settings.';
    goal.addEventListener('click', () => {
      const i = all.findIndex((p) => p.spot === tip?.spot);
      if (i >= 0) activate(i);
    });
    if (tip) this.host.noticeTip('advice');
    this.grid.replaceChildren(
      el('div', { className: 'town-head' }, [
        el('div', { className: 'town-name', text: 'Lindholm' }),
        desc,
        el('div', { className: 'town-gold', text: `${s.gold} G` }),
        menuButton,
      ]),
      ...(tip ? [goal] : []),
      el('div', { className: `town-cards${places.length > 6 ? ' seven' : ''}` }, nodes),
    );
    select(Math.min(this.lastIndex, all.length - 1));
    const cols = places.length > 6 ? 4 : 3;
    this.menu = {
      handleKey: (key: string): boolean => {
        const i = this.lastIndex;
        let next = i;
        if (key === 'ArrowRight' || key === 'd' || key === 'D') next = i + 1;
        else if (key === 'ArrowLeft' || key === 'a' || key === 'A') next = i - 1;
        else if (key === 'ArrowDown' || key === 's' || key === 'S') next = i + cols < places.length ? i + cols : i;
        else if (key === 'ArrowUp' || key === 'w' || key === 'W') next = i - cols;
        else if (key === 'Escape' || key === 'c' || key === 'C') {
          this.host.openMenu();
          return true;
        } else if (key === 'Enter' || key === ' ' || key === 'z' || key === 'Z') {
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
          label: cost ? `Rest (${cost} G)` : 'Rest (free tonight)',
          description: cost ? undefined : 'Gerd asks nothing of those the roots carry home. This night is on the house.',
          disabled: this.game.state.gold < cost,
          onSelect: () => {
            restAtInn(this.game);
            audio.play('heal');
            this.host.save();
            this.back();
            this.host.toast('The party rests well. Game saved.');
          },
        },
        ...this.woundedHere().map((m) => ({
          label: `Healer for ${m.name} (${healerCost(this.game)} G)`,
          description: `${m.name} came back wounded from a Raven Run. The healer patches them up at once.`,
          disabled: this.game.state.gold < healerCost(this.game),
          onSelect: () => {
            if (!healWound(this.game, m.oath!, ravenNow(this.game))) return;
            audio.play('heal');
            this.host.save();
            this.host.updateHud();
            this.host.toast(`${m.name} is back on their feet.`);
            this.inn();
          },
        })),
        { label: 'Leave', onSelect: back },
      ],
      { onCancel: back },
    );
    this.dialog('The Sleeping Stag', [npcSays('gerd', cost ? `"Welcome, explorers! A warm bed and a hot meal for ${cost} gold."` : '"The roots brought you home again? Sit down, sit down. Tonight you pay nothing: a warm bed and a hot meal, on the house."')], menu);
  }

  private woundedHere(): Member[] {
    const now = ravenNow(this.game);
    return [...this.game.state.party, ...this.game.state.reserve].filter((m) => isWounded(m, now));
  }

  // ── Notice board ───────────────────────────────────────────────────────────

  /** The Wayfinders' Stone: players the makers thanked by name (loaded from the server). */
  private async stone(boardIndex: number): Promise<void> {
    const back = () => this.board(boardIndex);
    const honors = await fetchHonors();
    const lines: HTMLElement[] = [el('p', { className: 'stone-intro', text: '"They walked the Rootdeep first, and told us where it bit. Lindholm remembers." — Sigrid' })];
    if (honors === null) lines.push(el('p', { className: 'stone-empty', text: 'The carvings are too dark to read from here. (The stone needs a connection.)' }));
    else if (honors.length === 0) lines.push(el('p', { className: 'stone-empty', text: 'The stone is still bare. Send feedback with your name: yours could be the first carved here.' }));
    else lines.push(el('ul', { className: 'stone-names' }, honors.map((h) => el('li', {}, [el('b', { text: h.name }), ...(h.note ? [el('span', { text: ` — ${h.note}` })] : [])]))));
    const menu = new ListMenu([{ label: 'Back', onSelect: back }], { onCancel: back });
    this.dialog("The Wayfinders' Stone", lines, menu, true);
  }

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
    items.push({ label: "The Wayfinders' Stone", description: 'A stone beside the board, carved with the names of those who made the Rootdeep better.', onSelect: () => void this.stone(items.length - 1) });
    items.push({ label: 'Leave', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back, startIndex: start });
    this.dialog('The Notice Board', [el('p', { className: 'gold-line', text: `Requests completed: ${done}` })], menu, true);
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
        el('div', { className: 'rewards quest-facts' }, [
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
        { label: 'Sagas', description: 'What each adventurer has done, and the bynames they have earned.', onSelect: () => sagas(this.game, (c, m) => this.host.openOverlay(c, m), () => this.host.save(), () => this.hall(3)) },
        { label: 'Unlearn skills', description: 'Take back all skill points of one adventurer, for a fee.', onSelect: () => this.unlearn() },
        {
          label: 'Swear a deeper oath',
          description: `Oath Tokens make an adventurer stronger: every deeper oath adds ${Math.round(OATH_BONUS * 100)}% to their own stats, at every level. You have ${s.inventory.oathToken ?? 0} token${(s.inventory.oathToken ?? 0) === 1 ? '' : 's'}.`,
          onSelect: () => this.host.tips(['deeperOath'], () => this.deeperOath()),
        },
        {
          label: 'Change class',
          description: 'For an Oath Token, an adventurer swears again as another class. They keep their level and oath, and get every skill point back.',
          onSelect: () => this.changeClassPick(),
        },
        { label: 'Dismiss', description: 'Release an adventurer from the reserve for good.', disabled: s.reserve.length === 0, onSelect: () => this.dismiss() },
        {
          label: 'Raven Runs',
          detail: ravenBadge(this.game) || undefined,
          description: 'Send adventurers from the reserve scouting for a few hours. They bring back materials, or come back wounded.',
          onSelect: () => this.host.tips(['ravens'], () => this.ravens()),
        },
        { label: 'Leave', onSelect: back },
      ],
      { onCancel: back, startIndex: start },
    );
    this.dialog('The Oath Hall', [npcSays('brynja', '"Swear on the bone of Ymir, and the realms will remember your name."')], menu, true);
  }

  private ravens(): void {
    const view = new RavensView(
      {
        game: this.game,
        dialog: (title, body, menu, withDesc) => this.dialog(title, body, menu, withDesc),
        save: () => this.host.save(),
        updateHud: () => this.host.updateHud(),
        toast: (text) => this.host.toast(text),
      },
      () => this.hall(8),
    );
    view.open();
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
    const back = () => this.hall(4);
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

  /** Deeper oaths: pick an adventurer, see what the next oath needs, swear it. */
  private deeperOath(start = 0): void {
    const all = [...this.game.state.party, ...this.game.state.reserve];
    const back = () => this.hall(5);
    const items: MenuItem[] = all.map((m, i) => {
      const problem = deeperOathProblem(this.game, m);
      const next = OATH_NAMES[oathOf(m) + 1];
      const cost = deeperOathCost(m);
      return {
        label: m.name,
        detail: oathName(m),
        description: problem ?? `${m.name} can swear the ${next} for ${cost} Oath Token${cost === 1 ? '' : 's'}: +${Math.round(OATH_BONUS * 100)}% to their own stats.`,
        disabled: problem !== null,
        onSelect: () =>
          this.host.confirm(next ?? '', `${m.name} swears the ${next}. Give ${cost} Oath Token${cost === 1 ? '' : 's'}?`, () => {
            swearDeeperOath(this.game, m);
            this.host.save();
            this.host.updateHud();
            this.host.toast(`${m.name} has sworn the ${next}.`);
            this.deeperOath(i);
          }, () => this.deeperOath(i)),
      };
    });
    items.push({ label: 'Back', onSelect: back });
    const tokens = this.game.state.inventory.oathToken ?? 0;
    this.dialog('Swear a deeper oath', [npcSays('brynja', `"Each oath binds you deeper to Midgard, and Midgard gives back. ${OATH_NAMES.join(', ')}: the next opens with every chapter you finish." You have ${tokens} Oath Token${tokens === 1 ? '' : 's'}.`)], new ListMenu(items, { onCancel: back, startIndex: start }), true);
  }

  /** Change of class: pick the adventurer, then the class. */
  private changeClassPick(start = 0): void {
    const all = [...this.game.state.party, ...this.game.state.reserve];
    const back = () => this.hall(6);
    const items: MenuItem[] = all.map((m, i) => {
      const cost = classChangeCost(m);
      return {
        label: m.name,
        detail: `${CLASSES[m.classId].name} · Lv ${m.level}`,
        description: `A new oath for ${m.name}: ${cost.tokens} Oath Token and ${cost.gold} G.`,
        disabled: m.ravenRun !== undefined,
        onSelect: () => this.changeClassTo(m, i),
      };
    });
    items.push({ label: 'Back', onSelect: back });
    this.dialog('Change class', [npcSays('brynja', '"The bone remembers who you were, and lets you swear again. Your strength stays; your skills you learn anew."'), this.goldLine()], new ListMenu(items, { onCancel: back, startIndex: start }), true);
  }

  private changeClassTo(m: Member, index: number): void {
    const back = () => this.changeClassPick(index);
    const cost = classChangeCost(m);
    const items: MenuItem[] = (Object.keys(CLASSES) as ClassId[]).filter((id) => classUnlocked(this.game, id)).map((id) => {
      const problem = classChangeProblem(this.game, m, id);
      const lost = (['weapon', 'armor'] as const).filter((slot) => m[slot] && !EQUIPMENT[m[slot]!]?.classes.includes(id)).map((slot) => EQUIPMENT[m[slot]!].name);
      return {
        label: CLASSES[id].name,
        icon: `art/heroes/${id}-0.webp`,
        description: problem ?? `${CLASSES[id].description}${lost.length ? `\n${lost.join(' and ')} cannot be worn as a ${CLASSES[id].name}: Hilde buys it back for half.` : ''}`,
        disabled: problem !== null,
        onSelect: () =>
          this.host.confirm('Change class', `${m.name} swears again as a ${CLASSES[id].name}, at level ${m.level}, and gets every skill point back. Pay ${cost.tokens} Oath Token and ${cost.gold} G?`, () => {
            changeClass(this.game, m, id);
            this.host.save();
            this.host.updateHud();
            this.host.toast(`${m.name} is a ${CLASSES[id].name} now. Spend their skill points in the Oath Hall.`);
            this.changeClassPick(index);
          }, back),
      };
    });
    items.push({ label: 'Back', onSelect: back });
    this.dialog(`A new oath for ${m.name}`, [this.goldLine()], new ListMenu(items, { onCancel: back, startIndex: Math.max(0, items.findIndex((it) => !it.disabled)) }), true);
  }

  private chooseClass(): void {
    // Secret classes show as ??? until their stranger has come to the Oath Hall.
    const items: MenuItem[] = (Object.keys(CLASSES) as ClassId[]).map((id) =>
      classUnlocked(this.game, id)
        ? {
            label: CLASSES[id].name,
            icon: `art/heroes/${id}-0.webp`,
            detail: CLASSES[id].row === 'front' ? 'front row' : 'back row',
            description: CLASSES[id].description,
            onSelect: () => this.chooseLook(id),
          }
        : { label: '???', detail: 'not yet found', description: 'Nobody in Lindholm has sworn this oath yet. Perhaps one day someone will come to the Oath Hall to teach it.', disabled: true, onSelect: () => {} },
    );
    const menu = new ListMenu(items, { onCancel: () => this.hall(0) });
    this.dialog('Choose a class', [], menu, true);
  }

  private chooseLook(classId: ClassId, start = rosterSize(this.game) * 3): void {
    const back = () => this.chooseClass();
    const pick = lookPicker(classId, start % 8, (look) => this.chooseName(classId, look));
    const menu = new ListMenu([...pick.items, { label: 'Back', onSelect: back }], { onCancel: back, startIndex: 1 });
    this.dialog(`A new ${CLASSES[classId].name}`, [el('p', { text: 'How does your adventurer look?' }), ...pick.body], menu);
  }

  private chooseName(classId: ClassId, look: number): void {
    const input = el('input', { className: 'name-input' });
    input.maxLength = NAME_MAX_LENGTH;
    input.placeholder = 'Name';
    const error = el('p', { className: 'form-error' });
    const submit = () => {
      const problem = registerMember(this.game, input.value, classId, look);
      if (problem) {
        error.textContent = problem;
        input.focus();
        return;
      }
      this.host.updateHud();
      this.host.toast(`${cleanName(input.value)} the ${CLASSES[classId].name} has sworn the oath.`);
      this.hall(0);
    };
    const taken = [...this.game.state.party, ...this.game.state.reserve].map((m) => m.name);
    const menu = new ListMenu(
      [
        { label: 'Swear the oath', onSelect: submit },
        { label: 'Suggest a name', onSelect: () => { suggestName(input, taken); error.textContent = ''; } },
        { label: 'Back', onSelect: () => this.chooseLook(classId, look) },
      ],
      { onCancel: () => this.chooseLook(classId, look) },
    );
    bindNameField(input, menu, submit, () => this.chooseLook(classId, look));
    this.dialog(`A new ${CLASSES[classId].name}`, [el('p', { text: 'What is your name, adventurer?' }), el('p', { className: 'gold-line', text: `The oath costs ${oathText(this.game)}.` }), input, error], menu);
    input.focus();
  }

  private formParty(start = 0): void {
    const s = this.game.state;
    const now = ravenNow(this.game);
    const items: MenuItem[] = [
      ...s.party.map((m, i) => ({
        label: `${i + 1}. ${m.name}`,
        detail: `${CLASSES[m.classId].name} Lv ${m.level} · ${m.row}`,
        description: 'In the party. Select to move, change row or send to the reserve.',
        onSelect: () => this.editMember(i),
      })),
      ...s.reserve.map((m, i) => ({
        label: `   ${m.name}`,
        detail: `${CLASSES[m.classId].name} Lv ${m.level} · ${m.ravenRun !== undefined ? 'on a run' : isWounded(m, now) ? 'wounded' : 'reserve'}`,
        description:
          unavailable(m, now) ??
          (s.party.length >= MAX_PARTY ? `The party is full (${MAX_PARTY}). Send someone to the reserve first.` : 'Waiting in the hall. Select to join the party.'),
        disabled: s.party.length >= MAX_PARTY || !!unavailable(m, now),
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
        {
          label: m.row === 'front' ? 'Move to the back row' : 'Move to the front row',
          detail: canSwitchRow(this.game, i) ? '' : 'that row is full',
          disabled: !canSwitchRow(this.game, i),
          onSelect: after(() => toggleRow(this.game, i), i),
        },
        { label: 'Send to the reserve', disabled: s.party.length <= 1, onSelect: after(() => moveToReserve(this.game, i), 0) },
        { label: 'Back', onSelect: () => this.formParty(i) },
      ],
      { onCancel: () => this.formParty(i) },
    );
    this.dialog(`${m.name} the ${CLASSES[m.classId].name}`, [el('p', { text: 'Back-row fighters deal and take less melee damage (archers aim fine from anywhere). At most three stand in each row.' })], menu);
  }

  private dismiss(): void {
    const s = this.game.state;
    const items: MenuItem[] = s.reserve.map((m, i) => ({
      label: m.name,
      detail: `${CLASSES[m.classId].name} Lv ${m.level}`,
      description: m.ravenRun !== undefined ? 'Out on a Raven Run: wait until they are back.' : undefined,
      disabled: m.ravenRun !== undefined,
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
        ...(wyrdOpen(this.game) || this.game.state.wyrd?.threads
          ? [{ label: 'Wyrd gear', detail: `${this.game.state.wyrd?.threads ?? 0} threads`, description: 'Hilde weaves Wyrd Threads into gear with a gift of its own. Put a woven piece on anyone, as often as you like.', onSelect: () => this.wyrdGear() }]
          : []),
        { label: 'Leave', onSelect: back },
      ],
      { onCancel: back, startIndex: start },
    );
    this.dialog("Hilde's Supplies", [npcSays('hilde', '"Take a look. Everything here was made to survive the Rootdeep."')], menu);
  }

  // ── Wyrd gear ──────────────────────────────────────────────────────────────

  private wyrdGear(start = 0): void {
    const back = () => this.shop(3);
    const w = this.game.state.wyrd;
    const cost = nextWeaveCost(this.game);
    const gifts: Record<string, string> = {
      lastStand: 'Once in every fight, a killing blow leaves the wearer standing with 1 HP.',
      mending: 'Heals the wearer a little at the end of every round.',
      steadfast: 'Poison, sleep and paralysis do not take on the wearer.',
    };
    const items: MenuItem[] = WYRD_GEAR.map((id, i) => {
      const e = EQUIPMENT[id];
      const woven = w?.woven?.includes(id) ?? false;
      const wearer = [...this.game.state.party, ...this.game.state.reserve].find((m) => m.armor === id);
      return {
        label: e.name,
        detail: woven ? (wearer ? `worn by ${wearer.name}` : 'woven') : cost === null ? '' : `${cost} threads`,
        description: `${gifts[e.wyrd!]} Armour for every class (${bonusText(e)}).${woven ? ' Select to give it to someone.' : ''}`,
        disabled: !woven && (cost === null || (w?.threads ?? 0) < cost),
        onSelect: () => {
          if (woven) return this.wearWyrdGear(id, i);
          const problem = weave(this.game, id);
          if (problem) return this.host.toast(problem);
          audio.play('coin');
          this.host.save();
          this.host.toast(`Hilde weaves the ${e.name}.`);
          this.wyrdGear(i);
        },
      };
    });
    items.push({ label: 'Back', onSelect: back });
    const note = `You hold ${w?.threads ?? 0} Wyrd Thread${(w?.threads ?? 0) === 1 ? '' : 's'}.${cost === null ? '' : ` The next piece takes ${cost}.`}`;
    this.dialog('Wyrd gear', [npcSays('hilde', '"Thread the Norns spun. I can weave it, but it will not be hurried, and neither will they."'), el('p', { className: 'gold-line', text: note })], new ListMenu(items, { onCancel: back, startIndex: start }), true);
  }

  private wearWyrdGear(id: string, listIndex: number): void {
    const back = () => this.wyrdGear(listIndex);
    const e = EQUIPMENT[id];
    const items: MenuItem[] = this.game.state.party.map((m, i) => ({
      label: m.name,
      detail: m.armor === id ? 'wearing it' : CLASSES[m.classId].name,
      description: m.armor && m.armor !== id ? `Now wears ${EQUIPMENT[m.armor]?.name ?? 'armour'}; that is traded in for half price.` : `Put the ${e.name} on ${m.name}.`,
      disabled: m.armor === id,
      onSelect: () => {
        wearWyrd(this.game, id, i);
        this.host.save();
        this.host.updateHud();
        this.host.toast(`${m.name} wears the ${e.name}.`);
        this.wyrdGear(listIndex);
      },
    }));
    items.push({ label: 'Take it off', onSelect: () => { wearWyrd(this.game, id, null); this.host.save(); this.wyrdGear(listIndex); } });
    items.push({ label: 'Back', onSelect: back });
    this.dialog(e.name, [el('p', { text: bonusText(e) })], new ListMenu(items, { onCancel: back }), true);
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

  /** Equipment: first pick whose gear to look at, so each list only holds what that adventurer can wear. */
  private shopEquipment(start = 0): void {
    const party = this.game.state.party;
    const special = equipmentForSale(this.game).filter((e) => e.requires);
    const inProgress = specialGearInProgress(this.game);
    const items: MenuItem[] = party.map((m, i) => {
      const ups = gearFor(this.game, m).filter((o) => o.upgrade && o.gear.price - tradeInValue(m, o.gear.slot) <= this.game.state.gold).length;
      const all = gearFor(this.game, m).filter((o) => o.upgrade).length;
      return {
        label: `${m.name} (${CLASSES[m.classId].name})`,
        detail: all ? `${all} upgrade${all === 1 ? '' : 's'}` : '',
        description: `Weapons and armour ${m.name} can wear, best first. Now: ${m.weapon ? EQUIPMENT[m.weapon].name : 'no weapon'}, ${m.armor ? EQUIPMENT[m.armor].name : 'no armour'}.${all ? ` ${ups} of the upgrades are within your gold.` : ''}`,
        onSelect: () => this.shopFor(i, false, 0, () => this.shopEquipment(i)),
      };
    });
    if (special.length || inProgress.length) {
      items.push({
        label: 'Special gear',
        detail: `${special.length} ready`,
        description: 'Gear Hilde forges from monster parts you sold her, and what she still needs for the next pieces.',
        onSelect: () => this.shopSpecial(0, () => this.shopEquipment(party.length)),
      });
    }
    items.push({ label: 'Back', onSelect: () => this.shop(1) });
    const menu = new ListMenu(items, { onCancel: () => this.shop(1), startIndex: start });
    this.dialog('Equipment', [npcSays('hilde', '"Who are we kitting out? I\'ll show you what fits them."'), this.goldLine()], menu, true);
  }

  /** The gear one adventurer can wear: upgrades first; older and weaker pieces only on request. */
  private shopFor(index: number, showAll: boolean, start: number, back: () => void): void {
    const m = this.game.state.party[index];
    const offers = gearFor(this.game, m);
    const featured = new Set(featuredGear(this.game, m).map((o) => o.gear.id));
    const shown = offers.filter((o) => showAll || featured.has(o.gear.id));
    const hidden = offers.length - shown.length;
    const best = new Set(['weapon', 'armor'].map((slot) => offers.find((o) => o.gear.slot === slot && o.upgrade)?.gear.id));
    const items: MenuItem[] = shown.map((o, i) => {
      const cost = netPrice(m, o.gear);
      const delta = Object.entries(o.delta).map(([k, v]) => `${STAT_LABELS[k as keyof Stats]} ${v! > 0 ? '+' : ''}${v}`).join(', ');
      return {
        label: `${o.upgrade ? '▲ ' : ''}${o.gear.requires ? '★ ' : ''}${o.gear.name}${best.has(o.gear.id) ? ' (best)' : ''}`,
        detail: o.worn ? 'worn' : `${cost} G`,
        description: `${o.gear.slot === 'weapon' ? 'Weapon' : 'Armour'} · ${bonusText(o.gear)}${m[o.gear.slot] && !o.worn ? ` · against ${EQUIPMENT[m[o.gear.slot]!].name}: ${delta || 'no change'} (traded in for half price)` : ''}`,
        disabled: o.worn || this.game.state.gold < cost,
        onSelect: () => this.confirmGear(index, o.gear, () => this.shopFor(index, showAll, i, back)),
      };
    });
    if (hidden > 0 || showAll) {
      items.push({
        label: showAll ? 'Show the short list' : `Show all gear (${hidden} more)`,
        description: showAll ? 'Back to what is worn now, the best upgrade and the best one you can pay for.' : 'Every other piece that fits, including smaller upgrades and older gear.',
        onSelect: () => this.shopFor(index, !showAll, 0, back),
      });
    }
    items.push({ label: 'Back', onSelect: back });
    const note = shown.length ? '▲ is better than what is worn now.' : `Nothing here beats what ${m.name} wears.`;
    this.dialog(`For ${m.name} (${CLASSES[m.classId].name})`, [el('p', { text: note }), this.goldLine()], new ListMenu(items, { onCancel: back, startIndex: start }), true);
  }

  /** One last look before buying, so a quick double tap never spends gold by mistake. */
  private confirmGear(index: number, e: EquipDef, back: () => void): void {
    const m = this.game.state.party[index];
    const cost = netPrice(m, e);
    const items: MenuItem[] = [
      {
        label: `Buy for ${cost} G`,
        disabled: this.game.state.gold < cost,
        onSelect: () => {
          if (!buyEquipment(this.game, e.id, index)) return this.host.toast('That did not work.');
          audio.play('coin');
          this.host.updateHud();
          this.host.save();
          this.host.toast(`${m.name} equips the ${e.name}.`);
          back();
        },
      },
      { label: 'Back', onSelect: back },
    ];
    const now = m[e.slot] ? EQUIPMENT[m[e.slot]!].name : 'nothing';
    const delta = Object.entries(statDelta(m, e)).map(([k, v]) => `${STAT_LABELS[k as keyof Stats]} ${v! > 0 ? '+' : ''}${v}`).join(', ');
    this.dialog(e.name, [el('p', { text: `${m.name} now wears ${now}. ${delta || 'No change'}.` }), this.goldLine()], new ListMenu(items, { onCancel: back }), true);
  }

  /** Special gear: ready pieces (for whoever can wear them) and the ones Hilde is still waiting on. */
  private shopSpecial(start: number, back: () => void): void {
    const items: MenuItem[] = equipmentForSale(this.game).filter((e) => e.requires).map((e, i) => {
      const users = this.game.state.party.filter((m) => canEquip(m, e)).map((m) => m.name);
      return {
        label: `★ ${e.name}`,
        detail: `${e.price} G`,
        description: `${bonusText(e)} · ${e.slot === 'weapon' ? 'weapon' : 'armour'} · ${users.length ? `for ${users.join(', ')}` : 'no one in the party can wear this'}`,
        disabled: !users.length,
        onSelect: () => this.chooseWearer(e, () => this.shopSpecial(i, back)),
      };
    });
    for (const { gear, remaining } of specialGearInProgress(this.game)) {
      items.push({
        label: `☆ ${gear.name}`,
        detail: `${remaining} more ${MATERIALS[gear.requires!.material].name}`,
        description: `${bonusText(gear)} · ${gear.slot === 'weapon' ? 'weapon' : 'armour'} · Sell ${remaining} more ${MATERIALS[gear.requires!.material].name} and Hilde can forge it.`,
        disabled: true,
        onSelect: () => {},
      });
    }
    items.push({ label: 'Back', onSelect: back });
    this.dialog('Special gear', [this.goldLine()], new ListMenu(items, { onCancel: back, startIndex: start }), true);
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
        ...(n > 1 ? [{ label: `Sell all ${n}`, detail: `${price * n} G`, onSelect: sell(n) }] : []),
        { label: 'Back', onSelect: () => this.shopSell(listIndex) },
      ],
      { onCancel: () => this.shopSell(listIndex) },
    );
    this.dialog(MATERIALS[id].name, [el('p', { text: MATERIALS[id].description })], menu);
  }

  private chooseWearer(e: EquipDef, back: () => void): void {
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
          this.host.save();
          this.host.toast(`${m.name} equips the ${e.name}.`);
          back();
        },
      };
    });
    items.push({ label: 'Back', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back });
    this.dialog(e.name, [el('p', { text: bonusText(e) }), this.goldLine()], menu, true);
  }

  // ── Rootdeep ──────────────────────────────────────────────────────────────

  // ── Hall of Echoes ─────────────────────────────────────────────────────────

  private echoes(start = 0): void {
    const back = () => this.back();
    const embers = this.game.state.inventory.dreamEmber ?? 0;
    const guardians = echoGuardians(this.game);
    const items: MenuItem[] = guardians.map((id, i) => ({
      label: ENEMIES[id].name,
      detail: `fought at Lv ${GUARDIAN_LEVEL[id] ?? '?'}`,
      description: BEAST_LORE[id] ?? '',
      onSelect: () => this.echoLevel(id, () => this.echoes(i)),
    }));
    if (!items.length) items.push({ label: 'No echo answers yet', description: 'Only a guardian you have beaten leaves an echo in the stone.', disabled: true, onSelect: () => {} });
    items.push({ label: 'Memories', description: 'The memory shards you have found, each in its place.', onSelect: () => showMemories(this.game, (c, m) => this.host.openOverlay(c, m), () => this.echoes(items.length - 2)) });
    items.push({ label: 'Leave', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back, startIndex: start });
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.host.openOverlay(
      el('div', { className: 'panel dialog wide' }, [
        el('h2', { text: 'The Hall of Echoes' }),
        el('p', { text: 'Under the oldest root of Lindholm the stone remembers every voice that ever rang in the deep. Burn ten Dream Embers on the hearth, and a guardian you have beaten answers: an echo of it, as strong as you call it.' }),
        el('p', { className: 'gold-line', text: `${embers} Dream Ember${embers === 1 ? '' : 's'} · an echo costs ${ECHO_COST}` }),
        menu.el,
        desc,
      ]),
      menu,
    );
  }

  private echoLevel(id: string, back: () => void): void {
    const embers = this.game.state.inventory.dreamEmber ?? 0;
    const levels = echoLevels(this.game);
    const allFound = missingShards(this.game).length === 0;
    const items: MenuItem[] = levels.map((level) => {
      const chance = Math.round(shardChance(level) * 100);
      const blocked = echoBlocker(this.game, id, level);
      return {
        label: `Level ${level}`,
        detail: allFound ? undefined : `shard ${chance}%`,
        description: blocked ?? `Costs ${ECHO_COST} of your ${embers} Dream Embers, win or lose. ${allFound ? 'Every memory shard is found.' : `A win leaves a memory shard ${chance}% of the time.`} Losing costs nothing more: the echo just fades.`,
        disabled: !!blocked,
        onSelect: () =>
          this.host.confirm(`Call the echo at level ${level}?`, `The embers burn on the hearth (${ECHO_COST} of ${embers}), and its echo rises from the stone.`, () => this.host.startEcho(id, level), () => this.echoLevel(id, back)),
      };
    });
    if (!items.length) items.push({ label: 'Not yet', description: `Echoes answer from level ${ECHO_STEP}. Train your party first.`, disabled: true, onSelect: () => {} });
    items.push({ label: 'Back', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back, startIndex: Math.max(0, levels.length - 1) });
    const desc = el('div', { className: 'menu-desc' });
    menu.describeInto(desc);
    this.host.openOverlay(
      el('div', { className: 'panel dialog' }, [el('h2', { text: echoName(id) }), el('p', { text: 'How strong should it rise? The stronger the echo, the likelier it leaves a shard of an old memory.' }), menu.el, desc]),
      menu,
    );
  }

  private rootdeep(): void {
    const back = () => this.back();
    const starts = startFloors(this.game.state.deepest);
    const items: MenuItem[] = starts.map((i) => ({
      label: `Chapter ${chapterOf(i).numeral}: ${chapterOf(i).name}`,
      detail: FLOORS[i].name,
      description: `Begin at ${FLOORS[i].name} and fight your way down. The next chapter opens once its guardian falls.`,
      onSelect: () => {
        const f = FLOORS[i];
        this.host.closeOverlay();
        this.game.enterFloor(i);
        this.host.save();
        this.host.enterDungeon();
        this.host.toast(i === FLOORS.length - 1 ? `${f.name}: the deepest floor.` : `${f.name}: find the stairs down.`);
      },
    }));
    if (wyrdOpen(this.game)) {
      const today = wyrdDay(wyrdDayNumber(clockNow()));
      const done = wyrdDoneToday(this.game, clockNow());
      items.push({
        label: `The Wyrdweave: ${today.name}`,
        detail: done ? 'again at midnight' : 'today',
        description: done
          ? 'You have been through today\'s Wyrdweave. The Norns weave new floors at midnight (UTC).'
          : `Three floors at the Well of Urd, the same for every Wayfinder today. I: ${today.rules[0].name}. II: ${today.rules[1].name}. III: ${today.rules[2].name}. One try a day.`,
        disabled: done,
        onSelect: () => this.host.tips(['wyrdweave'], () => this.host.startWyrd()),
      });
    }
    items.push({ label: 'Not yet', onSelect: back });
    const menu = new ListMenu(items, { onCancel: back, startIndex: starts.length - 1 });
    this.dialog('The Rootdeep', [el('p', { text: 'Every descent starts at the beginning of a chapter. Where will you begin?' })], menu, true);
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
