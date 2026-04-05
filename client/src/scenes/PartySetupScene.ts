import Phaser from "phaser";
import type { CharacterClass } from "@ygd/shared";
import { createButton, createTitle, drawOrnatePanel } from "../theme/components.js";
import { layout, restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";

const PORTRAIT_BG = 0x0a0e1f;

const classes: CharacterClass[] = ["Guardian", "Ranger", "Mystic", "Rogue"];

const classInfo: Record<CharacterClass, { role: string; desc: string }> = {
  Guardian: { role: "Tank · DEF", desc: "Stalwart protector" },
  Ranger:   { role: "Scout · SPD", desc: "Swift sharpshooter" },
  Mystic:   { role: "Mage · INT", desc: "Arcane devastator" },
  Rogue:    { role: "Rogue · CRIT", desc: "Cunning trickster" }
};

export class PartySetupScene extends Phaser.Scene {
  constructor() {
    super(sceneNames.PartySetup);
  }

  create(): void {
    restartOnResize(this);
    const width = sceneWidth(this);
    const height = sceneHeight(this);

    this.add.image(width / 2, height / 2, "bg_login").setDisplaySize(width, height);

    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5);
    overlay.fillRect(0, 0, width, height);

    const title = createTitle(this, "Choose Your Class");
    title.setPosition(width / 2 - title.width / 2, layout.titleY);

    const panelW = Phaser.Math.Clamp(width * 0.88, 720, 1200);
    const panelH = Phaser.Math.Clamp(height * 0.74, 460, 640);
    const panelX = width / 2 - panelW / 2;
    const panelY = Phaser.Math.Clamp(height / 2 - panelH / 2 + 12, 84, height - panelH - 24);

    drawOrnatePanel(this, panelX, panelY, panelW, panelH);

    const hPad = panelW * 0.03;
    const gap  = panelW * 0.015;
    const cardW = (panelW - hPad * 2 - gap * 3) / 4;
    const cardH = panelH * 0.74;
    const cardY = panelY + panelH * 0.06;

    classes.forEach((cls, i) => {
      const x = panelX + hPad + i * (cardW + gap);
      this.renderCard(x, cardY, cardW, cardH, cls);
    });

    const btnW = Phaser.Math.Clamp(panelW * 0.28, 220, 320);
    const btnH = 48;
    createButton(
      this,
      width / 2 - btnW / 2,
      panelY + panelH - btnH - 14,
      btnW, btnH,
      "Enter City",
      () => this.scene.start(sceneNames.City)
    );
  }

  private renderCard(x: number, y: number, w: number, h: number, className: CharacterClass): void {
    const selected = gameStore.state.selectedClass === className;
    const info = classInfo[className];

    const card = this.add.graphics();
    card.fillStyle(PORTRAIT_BG, 0.96);
    card.lineStyle(selected ? 3 : 1, selected ? 0xf4b942 : 0x3a4a6b, 1);
    card.fillRoundedRect(x, y, w, h, 10);
    card.strokeRoundedRect(x, y, w, h, 10);

    if (selected) {
      const glow = this.add.graphics();
      glow.lineStyle(3, 0xf4b942, 0.35);
      glow.strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, 12);
    }

    // Portrait — fit full transparent sprite, no background, no crop
    const portH = h * 0.65;
    const source = this.textures.get(`class_${className}`).getSourceImage() as { width: number; height: number };
    const srcW = source.width;
    const srcH = source.height;
    const fitScale = Math.min((w * 0.9) / srcW, (portH * 0.9) / srcH);
    const displayW = srcW * fitScale;
    const displayH = srcH * fitScale;
    this.add.image(x + w / 2, y + portH / 2, `class_${className}`).setDisplaySize(displayW, displayH);

    this.add.text(x + w / 2, y + h * 0.73, className, {
      fontFamily: "Georgia",
      fontSize: Phaser.Math.Clamp(w * 0.115, 15, 22) + "px",
      color: selected ? "#f4b942" : "#f7f2e8"
    }).setOrigin(0.5);

    this.add.text(x + w / 2, y + h * 0.84, info.role, {
      fontFamily: "Trebuchet MS",
      fontSize: Phaser.Math.Clamp(w * 0.09, 11, 15) + "px",
      color: "#5bc0eb"
    }).setOrigin(0.5);

    this.add.text(x + w / 2, y + h * 0.93, info.desc, {
      fontFamily: "Trebuchet MS",
      fontSize: Phaser.Math.Clamp(w * 0.08, 10, 13) + "px",
      color: "#c9c0b4"
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => {
      gameStore.setSelectedClass(className);
      this.scene.restart();
    });
  }
}
