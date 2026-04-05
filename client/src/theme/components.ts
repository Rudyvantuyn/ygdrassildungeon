import Phaser from "phaser";
import { layout } from "./layout.js";
import { theme } from "./tokens.js";

export function drawOrnatePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 0.84,
  fillColor?: number
): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  bg.fillStyle(fillColor ?? theme.palette.abyss, alpha);
  bg.lineStyle(layout.panelStroke, theme.palette.gold, 0.85);
  bg.fillRoundedRect(x, y, width, height, layout.panelRadius);
  bg.strokeRoundedRect(x, y, width, height, layout.panelRadius);

  const rune = scene.add.graphics();
  rune.lineStyle(1, theme.palette.runeCyan, 0.45);
  rune.strokeCircle(x + width - 24, y + 24, 12);
  rune.strokeCircle(x + 24, y + height - 24, 8);

  return scene.add.container(0, 0, [bg, rune]);
}

export function createTitle(scene: Phaser.Scene, text: string): Phaser.GameObjects.Text {
  return scene.add
    .text(0, 0, text, {
      fontFamily: theme.typography.titleFont,
      fontSize: theme.typography.titleSize,
      color: theme.palette.textPrimary
    })
    .setStroke("#000000", 5)
    .setShadow(0, 4, "#111111", 8, false, true);
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void
): Phaser.GameObjects.Container {
  const graphics = scene.add.graphics();
  graphics.fillStyle(theme.palette.arcaneBlue, 0.85);
  graphics.lineStyle(2, theme.palette.gold, 1);
  graphics.fillRoundedRect(0, 0, width, height, 10);
  graphics.strokeRoundedRect(0, 0, width, height, 10);

  const text = scene.add.text(width / 2, height / 2, label, {
    fontFamily: theme.typography.bodyFont,
    fontSize: theme.typography.bodySize,
    color: theme.palette.textPrimary
  });
  text.setOrigin(0.5);

  const container = scene.add.container(x, y, [graphics, text]);
  const zone = scene.add.zone(x, y, width, height).setOrigin(0).setInteractive({ useHandCursor: true });
  zone.on("pointerover", () => {
    graphics.clear();
    graphics.fillStyle(theme.palette.runeCyan, 0.9);
    graphics.lineStyle(2, theme.palette.gold, 1);
    graphics.fillRoundedRect(0, 0, width, height, 10);
    graphics.strokeRoundedRect(0, 0, width, height, 10);
  });
  zone.on("pointerout", () => {
    graphics.clear();
    graphics.fillStyle(theme.palette.arcaneBlue, 0.85);
    graphics.lineStyle(2, theme.palette.gold, 1);
    graphics.fillRoundedRect(0, 0, width, height, 10);
    graphics.strokeRoundedRect(0, 0, width, height, 10);
  });
  zone.on("pointerdown", onClick);

  return scene.add.container(0, 0, [container, zone]);
}

export function createInfoText(scene: Phaser.Scene, text: string, x: number, y: number): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: theme.typography.bodyFont,
    fontSize: theme.typography.bodySize,
    color: theme.palette.textMuted,
    wordWrap: { width: 520 }
  });
}

export function createStatBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  ratio: number,
  color: number
): Phaser.GameObjects.Graphics {
  const clamped = Phaser.Math.Clamp(ratio, 0, 1);
  const g = scene.add.graphics();
  g.fillStyle(0x1f2430, 0.9);
  g.fillRoundedRect(x, y, width, 14, 6);
  g.fillStyle(color, 1);
  g.fillRoundedRect(x + 2, y + 2, (width - 4) * clamped, 10, 4);
  return g;
}
