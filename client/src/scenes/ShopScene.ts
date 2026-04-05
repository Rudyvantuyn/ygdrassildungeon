import Phaser from "phaser";
import { createButton, createTitle, drawOrnatePanel } from "../theme/components.js";
import { layout, restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
import { fadeInScene } from "./sceneFlow.js";

export class ShopScene extends Phaser.Scene {
  private dialogueText?: Phaser.GameObjects.Text;
  private listText?: Phaser.GameObjects.Text;
  private mode: "buy" | "sell" | "talk" = "buy";
  private leaving = false;
  private backBounds?: { x: number; y: number; w: number; h: number };
  private readonly modeOrder: Array<"buy" | "sell" | "talk"> = ["buy", "sell", "talk"];
  private modeRows: Array<{
    mode: "buy" | "sell" | "talk";
    frame: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    x: number;
    y: number;
    w: number;
    h: number;
  }> = [];

  constructor() {
    super(sceneNames.Shop);
  }

  create(): void {
    this.leaving = false;
    this.modeRows = [];
    restartOnResize(this);
    const width = sceneWidth(this);
    const height = sceneHeight(this);
    this.add.image(width / 2, height / 2, "bg_shop").setDisplaySize(width, height);
    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5);
    overlay.fillRect(0, 0, width, height);
    fadeInScene(this, 200);

    const title = createTitle(this, "Asteria Market");
    title.setPosition(width / 2 - title.width / 2, layout.titleY);

    const boardW = Phaser.Math.Clamp(width * 0.9, 980, 1400);
    const boardH = Phaser.Math.Clamp(height * 0.8, 520, 820);
    const boardX = (width - boardW) / 2;
    const boardY = Phaser.Math.Clamp((height - boardH) / 2 + 8, 84, height - boardH - 24);
    const gap = 16;
    const leftW = Phaser.Math.Clamp(boardW * 0.33, 310, 460);
    const rightW = boardW - leftW - gap;
    const leftX = boardX;
    const rightX = leftX + leftW + gap;
    drawOrnatePanel(this, leftX, boardY, leftW, boardH, 0.9);
    drawOrnatePanel(this, rightX, boardY, rightW, boardH, 0.9);
    this.add.text(rightX + rightW - 16, boardY + 22, "B / S / T to switch modes", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#88a8cd"
    }).setOrigin(1, 0);

    this.add.text(leftX + leftW / 2, boardY + 16, "Shopkeeper", {
      fontFamily: "Georgia",
      fontSize: "28px",
      color: "#f4b942"
    }).setOrigin(0.5, 0);

    this.add.image(leftX + leftW / 2, boardY + boardH * 0.42, "npc_shopkeeper")
      .setDisplaySize(leftW * 0.86, boardH * 0.62);

    drawOrnatePanel(this, leftX + 12, boardY + boardH * 0.71, leftW - 24, boardH * 0.24, 0.75, 0x091428);
    this.dialogueText = this.add.text(leftX + 20, boardY + boardH * 0.74, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#f7f2e8",
      wordWrap: { width: leftW - 40 },
      lineSpacing: 8
    });

    this.add.text(rightX + 22, boardY + 18, "Trade Menu", {
      fontFamily: "Georgia",
      fontSize: "28px",
      color: "#f4b942"
    });

    const modePanelX = rightX + 20;
    const modePanelY = boardY + 58;
    const modePanelW = Phaser.Math.Clamp(rightW * 0.34, 190, 270);
    const modePanelH = 198;
    drawOrnatePanel(this, modePanelX, modePanelY, modePanelW, modePanelH, 0.76, 0x0a1224);

    const modeRowW = modePanelW - 16;
    const modeRowH = 56;
    const modeStartY = modePanelY + 10;
    ([
      { mode: "buy" as const, label: "Buy" },
      { mode: "sell" as const, label: "Sell" },
      { mode: "talk" as const, label: "Talk" }
    ]).forEach((entry, index) => {
      const x = modePanelX + 8;
      const y = modeStartY + index * (modeRowH + 4);
      const frame = this.add.graphics();
      const label = this.add.text(x + 14, y + modeRowH / 2, entry.label, {
        fontFamily: "Georgia",
        fontSize: "24px",
        color: "#f7f2e8"
      }).setOrigin(0, 0.5);
      const draw = (selected: boolean): void => {
        frame.clear();
        frame.fillStyle(selected ? 0x2f4e7c : 0x172742, selected ? 0.94 : 0.62);
        frame.lineStyle(selected ? 2 : 1, selected ? 0xf4b942 : 0x60779c, selected ? 1 : 0.7);
        frame.fillRoundedRect(x, y, modeRowW, modeRowH, 8);
        frame.strokeRoundedRect(x, y, modeRowW, modeRowH, 8);
      };
      draw(false);
      const zone = this.add
        .zone(x, y, modeRowW, modeRowH)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => this.selectMode(entry.mode))
        .on("pointerdown", () => this.selectMode(entry.mode));
      this.modeRows.push({ mode: entry.mode, frame, label, x, y, w: modeRowW, h: modeRowH });
      this.events.once("shutdown", () => zone.removeAllListeners());
    });

    const listX = rightX + modePanelW + 34;
    const listY = boardY + 66;
    const listW = rightW - modePanelW - 54;
    drawOrnatePanel(this, listX - 12, listY - 10, listW + 24, boardH - 148, 0.76, 0x0a1224);
    this.listText = this.add.text(listX, listY, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#f7f2e8",
      lineSpacing: 8,
      wordWrap: { width: listW }
    });

    const actionY = boardY + boardH - 62;
    createButton(this, rightX + 20, actionY, 180, 44, "Buy First Item", () => this.tryBuyFirstItem());
    createButton(this, rightX + 212, actionY, 160, 44, "Refresh Shop", () => this.refreshShop());
    const backX = rightX + rightW - 180;
    const backY = actionY;
    const backW = 160;
    const backH = 44;
    this.buildBackButton(backX, backY, backW, backH);
    this.backBounds = { x: backX, y: backY, w: backW, h: backH };
    const onGlobalPointerDown = (pointer: Phaser.Input.Pointer): void => {
      const bounds = this.backBounds;
      if (!bounds || this.leaving) {
        return;
      }
      const insideX = pointer.worldX >= bounds.x && pointer.worldX <= bounds.x + bounds.w;
      const insideY = pointer.worldY >= bounds.y && pointer.worldY <= bounds.y + bounds.h;
      if (insideX && insideY) {
        this.leaveToCity();
      }
    };
    this.input.on("pointerdown", onGlobalPointerDown);
    this.events.once("shutdown", () => this.input.off("pointerdown", onGlobalPointerDown));
    this.add.text(rightX + 20, actionY - 22, "Enter = primary action, R = refresh, Esc = back", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#88a8cd"
    });

    const unsubscribe = gameStore.subscribe(() => this.render());
    this.events.once("shutdown", unsubscribe);
    void gameStore.fetchShop();
    void gameStore.fetchProfileMeta();
    this.selectMode(this.mode);
    this.registerKeyboardNavigation();
    this.render();
  }

  private render(): void {
    if (!this.listText || !this.dialogueText) {
      return;
    }
    const meta = gameStore.state.shopMeta ?? {};
    const catalog = (meta.catalog as Array<Record<string, unknown>> | undefined) ?? [];
    const profile = (gameStore.state.profileMeta?.profile as Record<string, unknown> | undefined) ?? {};
    const currency = Number(profile.currency ?? 0);

    const buyLines = catalog.map((entry, index) => {
      const itemId = typeof entry.itemId === "string" ? entry.itemId : "-";
      const price = Number(entry.price ?? 0);
      const stock = Number(entry.stock ?? 0);
      return `${index + 1}. ${itemId} — ${price}g (stock ${stock})`;
    });

    const blacksmith = gameStore.state.blacksmithMeta ?? {};
    const inventory = (blacksmith.items as Array<Record<string, unknown>> | undefined) ?? [];
    const sellLines =
      inventory.length === 0
        ? ["No items in inventory yet."]
        : inventory.slice(0, 12).map((item, index) => {
            const def = typeof item.definitionId === "string" ? item.definitionId : "-";
            const level = Number(item.level ?? 1);
            const sellValue = Math.max(10, level * 12);
            return `${index + 1}. ${def} (lv.${level}) — sell ${sellValue}g`;
          });

    if (this.mode === "buy") {
      this.dialogueText.setText([
        "Welcome, traveler.",
        "Need gear for the next descent?",
        "",
        "Select BUY mode and use",
        "'Buy First Item' to test purchase flow."
      ]);
      this.listText.setText([`Wallet: ${currency}g`, "", "Items For Sale", ...buyLines]);
      return;
    }

    if (this.mode === "sell") {
      this.dialogueText.setText([
        "Got loot to offload?",
        "The guild pays fair coin.",
        "",
        "Use Blacksmith for salvage/reroll;",
        "sell values shown here for reference."
      ]);
      this.listText.setText([`Wallet: ${currency}g`, "", "Sellable Inventory", ...sellLines]);
      return;
    }

    this.dialogueText.setText([
      "Rumor says the lower floors shifted.",
      "More elites, better relic drops.",
      "",
      "Check Mission Board before",
      "starting your next expedition."
    ]);
    this.listText.setText([
      `Wallet: ${currency}g`,
      "",
      "Shopkeeper Tips",
      "• Buy upgrades before veteran runs",
      "• Keep currency for blacksmith rerolls",
      "• Finish daily missions for bonus gold"
    ]);
  }

  private leaveToCity(): void {
    if (this.leaving) {
      return;
    }
    this.leaving = true;
    gameStore.setStatus("Returning to city...");
    // Stability-first path for this environment.
    window.location.reload();
  }

  private selectMode(mode: "buy" | "sell" | "talk"): void {
    this.mode = mode;
    this.modeRows.forEach((row) => {
      const selected = row.mode === mode;
      row.frame.clear();
      row.frame.fillStyle(selected ? 0x2f4e7c : 0x172742, selected ? 0.94 : 0.62);
      row.frame.lineStyle(selected ? 2 : 1, selected ? 0xf4b942 : 0x60779c, selected ? 1 : 0.7);
      row.frame.fillRoundedRect(row.x, row.y, row.w, row.h, 8);
      row.frame.strokeRoundedRect(row.x, row.y, row.w, row.h, 8);
      row.label.setColor(selected ? "#fff2cf" : "#f7f2e8");
    });
    this.render();
  }

  private registerKeyboardNavigation(): void {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (this.leaving) {
        return;
      }
      const currentIndex = this.modeOrder.indexOf(this.mode);
      if (event.key === "ArrowUp") {
        const next = (currentIndex - 1 + this.modeOrder.length) % this.modeOrder.length;
        this.selectMode(this.modeOrder[next]);
      } else if (event.key === "ArrowDown") {
        const next = (currentIndex + 1) % this.modeOrder.length;
        this.selectMode(this.modeOrder[next]);
      } else if (event.key === "Enter") {
        this.triggerPrimaryAction();
      } else if (event.key.toLowerCase() === "r") {
        this.refreshShop();
      } else if (event.key === "Escape") {
        this.leaveToCity();
      } else if (event.key.toLowerCase() === "b") {
        this.selectMode("buy");
      } else if (event.key.toLowerCase() === "s") {
        this.selectMode("sell");
      } else if (event.key.toLowerCase() === "t") {
        this.selectMode("talk");
      }
    };
    this.input.keyboard?.on("keydown", onKeyDown);
    this.events.once("shutdown", () => this.input.keyboard?.off("keydown", onKeyDown));
  }

  private refreshShop(): void {
    void gameStore.fetchShop();
    void gameStore.fetchProfileMeta();
  }

  private tryBuyFirstItem(): void {
    if (this.mode !== "buy") {
      gameStore.setStatus("Switch to BUY mode first.");
      return;
    }
    const catalog = (gameStore.state.shopMeta?.catalog as Array<Record<string, unknown>> | undefined) ?? [];
    const entryId = typeof catalog[0]?.id === "string" ? catalog[0].id : null;
    if (entryId) {
      void gameStore.buyShopItem(entryId);
    } else {
      gameStore.setStatus("No buyable items available right now.");
    }
  }

  private triggerPrimaryAction(): void {
    if (this.mode === "buy") {
      this.tryBuyFirstItem();
      return;
    }
    if (this.mode === "sell") {
      gameStore.setStatus("Use Blacksmith actions for salvage/reroll. Sell list is informational.");
      return;
    }
    this.refreshShop();
    gameStore.setStatus("Rumors refreshed. Check board and stock updates.");
  }

  private buildBackButton(x: number, y: number, width: number, height: number): void {
    const g = this.add.graphics();
    const draw = (hover: boolean): void => {
      g.clear();
      g.fillStyle(hover ? 0x5a7db0 : 0x3b5f94, 0.95);
      g.lineStyle(2, 0xf4b942, 1);
      g.fillRoundedRect(x, y, width, height, 10);
      g.strokeRoundedRect(x, y, width, height, 10);
    };
    draw(false);
    this.add.text(x + width / 2, y + height / 2, "Back To City", {
      fontFamily: "Trebuchet MS",
      fontSize: "20px",
      color: "#fff5dd"
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y, width, height).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => draw(true));
    zone.on("pointerout", () => draw(false));
    zone.on("pointerdown", () => this.leaveToCity());
    this.events.once("shutdown", () => zone.removeAllListeners());
  }
}
