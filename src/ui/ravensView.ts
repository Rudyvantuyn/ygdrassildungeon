/** Raven Runs in the Oath Hall: send reserve adventurers scouting, and hear what they found. */
import { audio } from '../audio/audio';
import { CLASSES } from '../core/data/classes';
import { FLOORS } from '../core/data/floors';
import { ITEMS } from '../core/data/items';
import { MATERIALS } from '../core/data/materials';
import type { Game } from '../core/game';
import {
  MAX_RUNNERS,
  MAX_RUNS,
  RUN_LENGTHS,
  WOUND_HOURS,
  collectRun,
  gameNow,
  memberByOath,
  runFloors,
  runs,
  scoutsFree,
  sendRun,
  timeLeft,
  type RavenRun,
  type RunLength,
  type RunReport,
} from '../core/ravens';
import { randomSeed } from '../core/rng';
import type { ItemId } from '../core/types';
import { clockNow } from '../net/clock';
import { el } from './dom';
import { ListMenu, type MenuItem } from './menu';
import { npcSays } from './npc';

export interface RavensHost {
  game: Game;
  dialog(title: string, body: HTMLElement[], menu: ListMenu, withDesc?: boolean): void;
  save(): void;
  updateHud(): void;
  toast(text: string): void;
}

/** The time the game goes by: the server's clock when it answered, never earlier than the last time seen. */
export function ravenNow(game: Game): number {
  return gameNow(game, clockNow());
}

/** Short state for the Oath Hall card and menu: "1 back", "2 out", or ''. */
export function ravenBadge(game: Game): string {
  const list = game.state.ravenRuns ?? [];
  if (!list.length) return '';
  const now = ravenNow(game);
  const back = list.filter((r) => r.returnAt <= now).length;
  return back ? `${back} back` : `${list.length} out`;
}

const names = (game: Game, oaths: number[]) => {
  const list = oaths.map((o) => memberByOath(game, o)?.name ?? '?');
  return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0];
};

export class RavensView {
  constructor(
    private readonly host: RavensHost,
    private readonly leave: () => void,
  ) {}

  private get game(): Game {
    return this.host.game;
  }

  open(start = 0): void {
    const now = ravenNow(this.game);
    const list = runs(this.game);
    const free = scoutsFree(this.game, now);
    const items: MenuItem[] = list.map((run) => {
      const back = run.returnAt <= now;
      return {
        label: names(this.game, run.members),
        detail: back ? 'back!' : `back in ${timeLeft(run.returnAt - now)}`,
        description: `${RUN_LENGTHS[run.length].name} run on ${FLOORS[run.floor].name}.${back ? ' The ravens are back: hear what they found.' : ''}`,
        disabled: !back,
        onSelect: () => this.report(run),
      };
    });
    items.push(
      {
        label: 'Send out scouts',
        description:
          list.length >= MAX_RUNS
            ? `At most ${MAX_RUNS} runs can be out at once.`
            : free.length
              ? `Send 1 to ${MAX_RUNNERS} adventurers from the reserve to a floor your party has reached.`
              : 'Nobody in the reserve is free. Scouts come from the reserve, not from the party.',
        disabled: list.length >= MAX_RUNS || free.length === 0,
        onSelect: () => this.pickScouts([]),
      },
      { label: 'Back', onSelect: this.leave },
    );
    this.host.dialog(
      'Raven Runs',
      [npcSays('brynja', '"Huginn and Muninn will follow them down and fly back with word. Send only those who can come home."')],
      new ListMenu(items, { onCancel: this.leave, startIndex: Math.min(start, items.length - 1) }),
      true,
    );
  }

  private pickScouts(chosen: number[], start = 0): void {
    const free = scoutsFree(this.game, ravenNow(this.game));
    const back = () => this.open(runs(this.game).length);
    const items: MenuItem[] = free.map((m, i) => {
      const on = chosen.includes(m.oath!);
      return {
        label: `${on ? '■' : '□'} ${m.name}`,
        detail: `${CLASSES[m.classId].name} Lv ${m.level}`,
        description: on ? 'Going. Select to leave them home.' : chosen.length >= MAX_RUNNERS ? `At most ${MAX_RUNNERS} go together.` : 'Select to send them along.',
        disabled: !on && chosen.length >= MAX_RUNNERS,
        onSelect: () => this.pickScouts(on ? chosen.filter((o) => o !== m.oath) : [...chosen, m.oath!], i),
      };
    });
    items.push(
      { label: 'Choose the floor', disabled: chosen.length === 0, description: 'Then pick where they go.', onSelect: () => this.pickFloor(chosen) },
      { label: 'Back', onSelect: back },
    );
    this.host.dialog('Who goes?', [el('p', { text: `Pick 1 to ${MAX_RUNNERS} scouts. A healer keeps them going between fights; they carry no supplies.` })], new ListMenu(items, { onCancel: back, startIndex: start }), true);
  }

  private pickFloor(chosen: number[]): void {
    const back = () => this.pickScouts(chosen);
    const floors = runFloors(this.game);
    const items: MenuItem[] = floors.map((f) => ({
      label: FLOORS[f].name,
      detail: `floor ${f + 1}`,
      description: f >= 4 && FLOORS[f].prowlers.length ? 'Prowlers roam here: a run may cross one.' : 'Ordinary fights only.',
      onSelect: () => this.pickLength(chosen, f),
    }));
    items.push({ label: 'Back', onSelect: back });
    this.host.dialog('Where to?', [el('p', { text: 'Only floors your party has reached. The deeper, the richer, and the more dangerous.' })], new ListMenu(items, { onCancel: back, startIndex: floors.length - 1 }), true);
  }

  private pickLength(chosen: number[], floor: number): void {
    const back = () => this.pickFloor(chosen);
    const items: MenuItem[] = (Object.keys(RUN_LENGTHS) as RunLength[]).map((length) => {
      const l = RUN_LENGTHS[length];
      return {
        label: l.name,
        detail: `${l.hours} hours`,
        description: `About ${l.fights} fights. Longer runs bring more home, but every fight is a chance to fall.`,
        onSelect: () => this.send(chosen, floor, length),
      };
    });
    items.push({ label: 'Back', onSelect: back });
    this.host.dialog('How long?', [el('p', { text: `${names(this.game, chosen)} to ${FLOORS[floor].name}.` })], new ListMenu(items, { onCancel: back }), true);
  }

  private send(chosen: number[], floor: number, length: RunLength): void {
    const result = sendRun(this.game, chosen, floor, length, clockNow(), randomSeed());
    if (typeof result === 'string') {
      this.host.toast(result);
      return this.open();
    }
    audio.play('menuSelect');
    this.host.save();
    this.host.updateHud();
    this.host.toast(`${names(this.game, chosen)} set out. The ravens follow.`);
    this.open();
  }

  private report(run: RavenRun): void {
    const who = names(this.game, run.members);
    const report = collectRun(this.game, run.id, clockNow());
    if (!report) return this.open();
    audio.play(report.outcome === 'routed' ? 'bump' : 'chest');
    this.host.save();
    this.host.updateHud();
    const back = () => this.open();
    const menu = new ListMenu([{ label: 'Back', onSelect: back }], { onCancel: back });
    this.host.dialog(`${who} are back`, reportLines(this.game, run, report), menu);
  }
}

function reportLines(game: Game, run: RavenRun, r: RunReport): HTMLElement[] {
  const lines: string[] = [];
  lines.push(
    r.outcome === 'good'
      ? 'A good run: everyone came back whole.'
      : r.outcome === 'close'
        ? 'They made it, but not unharmed.'
        : 'Routed! They fled back to Lindholm and dropped half of what they carried.',
  );
  lines.push(`They fought ${r.fought} time${r.fought === 1 ? '' : 's'} on ${FLOORS[run.floor].name} and won ${r.won}.`);
  if (r.prowler === 'escaped') lines.push('A prowler crossed their path; they slipped away.');
  if (r.prowler === 'beaten') lines.push('A prowler crossed their path, and they brought it down!');
  if (r.prowler === 'lost') lines.push('A prowler crossed their path. That was the end of the run.');
  const finds = [
    ...Object.entries(r.materials).map(([id, n]) => `${n}× ${MATERIALS[id]?.name ?? id}`),
    ...(Object.entries(r.items) as [ItemId, number][]).map(([id, n]) => `${n}× ${ITEMS[id].name}`),
  ];
  lines.push(finds.length ? `Brought home: ${finds.join(', ')}.` : 'They brought nothing home worth carrying.');
  if (r.wounded.length) {
    const many = r.wounded.length > 1;
    lines.push(`${names(game, r.wounded)} ${many ? 'are' : 'is'} wounded and must rest ${WOUND_HOURS} hours, or see the healer at the Sleeping Stag.`);
  }
  return lines.map((text) => el('p', { text }));
}
