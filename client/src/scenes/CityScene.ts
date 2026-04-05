import Phaser from "phaser";
import { createTitle, drawOrnatePanel } from "../theme/components.js";
import { layout, restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";

interface CityCommand {
  key: string;
  label: string;
  subtitle: string;
  onSelect: () => void;
}

interface CommandRowRef {
  row: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  subtitle: Phaser.GameObjects.Text;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class CityScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;
  private cityBg?: Phaser.GameObjects.Image;
  private navigating = false;
  private selectedIndex = 0;
  private commandRows: CommandRowRef[] = [];
  private commands: CityCommand[] = [];

  constructor() {
    super(sceneNames.City);
  }

  create(): void {
    this.navigating = false;
    this.selectedIndex = 0;
    this.commandRows = [];
    this.commands = [];

    restartOnResize(this);
    const width = sceneWidth(this);
    const height = sceneHeight(this);
    const uiScale = Phaser.Math.Clamp(width / 1920, 0.85, 1.25);

    // ── Background — city fills screen, static (no pan) ──────────────────────
    this.cityBg = this.add
      .image(width / 2, height / 2, "bg_city")
      .setDisplaySize(width, height);

    // Very light vignette — city must remain readable
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.06, 0.06, 0.38, 0.44);
    vignette.fillRect(0, 0, width, height);

    this.cameras.main.fadeIn(220, 0, 0, 0);

    // ── Title ────────────────────────────────────────────────────────────────
    const title = createTitle(this, "Asteria City");
    title.setPosition(width / 2 - title.width / 2, layout.titleY);
    title.setFontSize(`${Math.round(38 * uiScale)}px`);

    // ── Status panel (top-left) ──────────────────────────────────────────────
    const statusW = Phaser.Math.Clamp(width * 0.23, 280, 500);
    const statusH = Phaser.Math.Clamp(height * 0.16, 104, 170);
    drawOrnatePanel(this, 24, 74, statusW, statusH, 0.88, 0x060e1c);
    this.statusText = this.add.text(38, 90, "", {
      fontFamily: "Trebuchet MS",
      fontSize: `${Math.round(16 * uiScale)}px`,
      color: "#f7f2e8",
      lineSpacing: Math.round(6 * uiScale),
      wordWrap: { width: statusW - 28 }
    });

    // ── Commands in strict city order ────────────────────────────────────────
    this.commands = [
      {
        key: "forest_entrance",
        label: "Forest Entrance",
        subtitle: "Dungeon entry placeholder (will be fully developed)",
        onSelect: () => this.goToScene(sceneNames.ForestEntrance)
      },
      {
        key: "explorers_guild",
        label: "Explorers Guild",
        subtitle: "Main story questline and story missions",
        onSelect: () => this.goToScene(sceneNames.MissionBoard)
      },
      {
        key: "blacksmith",
        label: "Master Blacksmith",
        subtitle: "Buy, upgrade and sell weapons and armor",
        onSelect: () => this.goToScene(sceneNames.Blacksmith)
      },
      {
        key: "guild_hall",
        label: "Guild Hall",
        subtitle: "Side missions and daily missions",
        onSelect: () => this.goToScene(sceneNames.Lobby)
      },
      {
        key: "training",
        label: "Training Hall",
        subtitle: "Class mastery unlocks and new skills",
        onSelect: () => this.goToScene(sceneNames.TrainingHall)
      },
      {
        key: "shop",
        label: "Asteria Market",
        subtitle: "Buy one-use items and sell loot",
        onSelect: () => this.goToScene(sceneNames.Shop)
      },
      {
        key: "season",
        label: "Season Spire",
        subtitle: "No design yet (coming later)",
        onSelect: () => this.goToScene(sceneNames.Season)
      },
      {
        key: "coop",
        label: "Party Board",
        subtitle: "Multiplayer options",
        onSelect: () => this.goToScene(sceneNames.CoOpParty)
      },
      {
        key: "profile",
        label: "Adventurer Ledger",
        subtitle: "Account profile and wallet options",
        onSelect: () => this.goToScene(sceneNames.Profile)
      }
    ];

    // ── Command list panel (lower-left) ──────────────────────────────────────
    this.buildCityCommandMenu(width, height, uiScale);

    this.refreshSelection();
    this.registerKeyboardNavigation();


    const unsubscribe = gameStore.subscribe(() => this.renderStatus());
    this.events.once("shutdown", unsubscribe);

    void gameStore.fetchProfileMeta();
    void gameStore.fetchMissions();
    void gameStore.fetchShop();
    void gameStore.fetchTraining(gameStore.state.selectedClass);
    void gameStore.fetchBlacksmith();
    void gameStore.fetchLiveops();
    this.renderStatus();
  }

  // ── Command list (left panel) ─────────────────────────────────────────────
  private buildCityCommandMenu(width: number, height: number, uiScale: number): void {
    const panelW = Phaser.Math.Clamp(width * 0.31, 350, 560);
    const panelH = Phaser.Math.Clamp(height * 0.66, 470, 700);
    const panelX = 20;
    const panelY = height - panelH - 16;

    drawOrnatePanel(this, panelX, panelY, panelW, panelH, 0.92, 0x060e1c);
    this.add.text(panelX + 18, panelY + 12, "City Commands", {
      fontFamily: "Georgia",
      fontSize: `${Math.round(26 * uiScale)}px`,
      color: "#f4b942"
    });

    const divider = this.add.graphics();
    divider.lineStyle(1, 0xf4b942, 0.45);
    divider.lineBetween(panelX + 14, panelY + 46, panelX + panelW - 14, panelY + 46);

    const rowX = panelX + 10;
    const rowW = panelW - 20;
    const rowH = Math.floor((panelH - 104) / this.commands.length);
    const startY = panelY + 54;

    this.commands.forEach((command, index) => {
      const y = startY + index * rowH;
      const row = this.add.graphics();

      const label = this.add.text(rowX + 30, y + rowH * 0.3, command.label, {
        fontFamily: "Georgia",
        fontSize: `${Math.round(19 * uiScale)}px`,
        color: "#f7f2e8"
      }).setOrigin(0, 0.5);

      const subtitle = this.add.text(rowX + 30, y + rowH * 0.72, command.subtitle, {
        fontFamily: "Trebuchet MS",
        fontSize: `${Math.round(12 * uiScale)}px`,
        color: "#c7d6ea",
        wordWrap: { width: rowW - 40 }
      }).setOrigin(0, 0.5);

      const draw = (selected: boolean): void => {
        row.clear();
        row.fillStyle(selected ? 0x1e3d6e : 0x0d1e35, selected ? 0.96 : 0.55);
        row.lineStyle(selected ? 2 : 1, selected ? 0xf4b942 : 0x3a5070, selected ? 1 : 0.6);
        row.fillRoundedRect(rowX, y + 2, rowW, rowH - 4, 7);
        row.strokeRoundedRect(rowX, y + 2, rowW, rowH - 4, 7);

        // Small colored bullet on left
        row.fillStyle(selected ? 0xf4b942 : 0x4a7090, selected ? 1 : 0.7);
        row.fillCircle(rowX + 16, y + rowH / 2, 5);
      };
      draw(false);

      const zone = this.add
        .zone(rowX, y + 2, rowW, rowH - 4)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => this.selectIndex(index))
        .on("pointerout", () => {})
        .on("pointerdown", () => command.onSelect());

      this.commandRows.push({ row, label, subtitle, x: rowX, y: y + 2, w: rowW, h: rowH - 4 });
      this.events.once("shutdown", () => {
        zone.removeAllListeners();
        row.destroy();
        label.destroy();
        subtitle.destroy();
      });
    });

    // keyboard hint intentionally removed
  }

  // ── Refresh command menu selection state ─────────────────────────────────
  private refreshSelection(): void {
    this.commandRows.forEach((entry, index) => {
      const selected = index === this.selectedIndex;
      entry.row.clear();
      entry.row.fillStyle(selected ? 0x1e3d6e : 0x0d1e35, selected ? 0.96 : 0.55);
      entry.row.lineStyle(selected ? 2 : 1, selected ? 0xf4b942 : 0x3a5070, selected ? 1 : 0.6);
      entry.row.fillRoundedRect(entry.x, entry.y, entry.w, entry.h, 7);
      entry.row.strokeRoundedRect(entry.x, entry.y, entry.w, entry.h, 7);
      entry.row.fillStyle(selected ? 0xf4b942 : 0x4a7090, selected ? 1 : 0.7);
      entry.row.fillCircle(entry.x + 16, entry.y + entry.h / 2, 5);
      entry.label.setColor(selected ? "#fff4d6" : "#e8e0d4");
      entry.subtitle.setColor(selected ? "#ffe8b0" : "#c7d6ea");
    });

    const selected = this.commands[this.selectedIndex];
    void selected;
  }

  private selectIndex(index: number): void {
    this.selectedIndex = index;
    this.refreshSelection();
  }

  private renderStatus(): void {
    if (!this.statusText) return;
    const profile = (gameStore.state.profileMeta?.profile as Record<string, unknown> | undefined) ?? {};
    const currency = Number(profile.currency ?? 0);
    const skillPoints = Number(profile.skillPoints ?? 0);
    this.statusText.setText([
      `Adventurer: ${gameStore.state.displayName}`,
      `Class: ${gameStore.state.selectedClass}`,
      `Gold: ${currency}g    Skill Pts: ${skillPoints}`,
      "",
      gameStore.state.lastStatus
    ]);
  }

  private registerKeyboardNavigation(): void {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (this.navigating || this.commands.length === 0) return;
      if (event.key === "ArrowUp") {
        this.selectIndex((this.selectedIndex - 1 + this.commands.length) % this.commands.length);
      } else if (event.key === "ArrowDown") {
        this.selectIndex((this.selectedIndex + 1) % this.commands.length);
      } else if (event.key === "Enter") {
        this.commands[this.selectedIndex]?.onSelect();
      } else if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < this.commands.length) {
          this.selectIndex(index);
          this.commands[index]?.onSelect();
        }
      }
    };
    this.input.keyboard?.on("keydown", onKeyDown);
    this.events.once("shutdown", () => this.input.keyboard?.off("keydown", onKeyDown));
  }

  private goToScene(sceneKey: string): void {
    if (this.navigating) return;
    this.navigating = true;
    try {
      this.scene.start(sceneKey);
    } catch {
      this.time.delayedCall(20, () => this.scene.start(sceneKey));
    }
  }

}
