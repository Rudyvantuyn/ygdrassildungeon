import Phaser from "phaser";
import { createButton, createInfoText, createTitle, drawOrnatePanel } from "../theme/components.js";
import { layout, restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { tweenPresets } from "../theme/tweenPresets.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";

export class LoginScene extends Phaser.Scene {
  constructor() {
    super(sceneNames.Login);
  }

  create(): void {
    restartOnResize(this);
    const width = sceneWidth(this);
    const height = sceneHeight(this);

    // Full-screen background
    this.add.image(width / 2, height / 2, "bg_login").setDisplaySize(width, height);

    // Dark center vignette so the panel pops
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.6, 0.6);
    vignette.fillRect(0, 0, width, height);

    // Title
    const title = createTitle(this, "Ygdrassil Dungeon");
    title.setPosition(width / 2 - title.width / 2, layout.titleY);
    this.tweens.add(tweenPresets.sceneFadeIn(title));

    // ── Main panel ─────────────────────────────────────────────────────────
    // Portrait BG is #0a0e1f — use that as panel fill so they blend seamlessly
    const PORTRAIT_BG = 0x0a0e1f;
    const panelW = Phaser.Math.Clamp(width * 0.68, 560, 960);
    const panelH = Phaser.Math.Clamp(height * 0.68, 400, 600);
    const panelX = width / 2 - panelW / 2;
    const panelY = Phaser.Math.Clamp(height / 2 - panelH / 2 + 12, 84, height - panelH - 24);
    drawOrnatePanel(this, panelX, panelY, panelW, panelH, 0.92, PORTRAIT_BG);

    // ── Portrait — fit inside left 40% without cutting ──────────────────
    const portraitSlotW = panelW * 0.4;
    const portraitSlotH = panelH;
    const source = this.textures.get("class_Guardian").getSourceImage() as { width: number; height: number };
    const srcW = source.width;
    const srcH = source.height;
    const fitScale = Math.min(portraitSlotW / srcW, portraitSlotH / srcH);
    const displayW = srcW * fitScale;
    const displayH = srcH * fitScale;

    const portrait = this.add
      .image(panelX + portraitSlotW / 2, panelY + panelH / 2, "class_Guardian")
      .setDisplaySize(displayW, displayH)
      .setAlpha(0);

    this.tweens.add({ targets: portrait, alpha: 1, duration: 600, ease: "Sine.easeOut" });

    // Gold vertical divider
    const dividerX = panelX + portraitSlotW;
    const divider = this.add.graphics();
    divider.lineStyle(2, 0xc8a96e, 0.7);
    divider.lineBetween(dividerX, panelY + 16, dividerX, panelY + panelH - 16);

    // ── Text + buttons — right 60 % ──────────────────────────────────────
    const rightX = dividerX + 20;
    const rightW = panelW - portraitSlotW - 24;
    const pad = 16;
    const buttonW = rightW - pad * 2;
    const buttonH = Phaser.Math.Clamp(panelH * 0.13, 44, 56);

    const text = createInfoText(
      this,
      "Abyss doors are opening.\n\nClick the name field below to edit.\nPress Enter to confirm.",
      rightX,
      panelY + panelH * 0.12
    );
    text.setLineSpacing(7).setWordWrapWidth(rightW - pad);

    const btn1Y = panelY + panelH * 0.58;
    const btn2Y = panelY + panelH * 0.76;

    const generatedName = gameStore.state.displayName;
    const generatedNamePattern = /^Player\d+$/i;
    let useGeneratedPlaceholder = generatedNamePattern.test(generatedName);
    let draftName = useGeneratedPlaceholder ? "" : generatedName;
    let editingName = false;
    let caretVisible = true;

    const nameField = this.add.graphics();
    const nameLabel = this.add
      .text(rightX + buttonW / 2, btn1Y + buttonH / 2, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "22px",
        color: "#f7f2e8"
      })
      .setOrigin(0.5);

    const redrawNameField = (): void => {
      nameField.clear();
      nameField.fillStyle(editingName ? 0x35558c : 0x274690, 0.9);
      nameField.lineStyle(2, 0xf4b942, 1);
      nameField.fillRoundedRect(rightX, btn1Y, buttonW, buttonH, 10);
      nameField.strokeRoundedRect(rightX, btn1Y, buttonW, buttonH, 10);
    };

    const syncNameLabel = (): void => {
      const shown = editingName
        ? draftName
        : useGeneratedPlaceholder
          ? generatedName
          : gameStore.state.displayName;

      const visibleText = shown.length > 0 ? shown : "Type your name";
      const textWithCaret = editingName ? `${visibleText}${caretVisible ? "|" : " "}` : visibleText;
      nameLabel.setText(textWithCaret);
      nameLabel.setColor(!editingName && useGeneratedPlaceholder ? "#c9c0b4" : "#f7f2e8");
    };

    const commitName = (): void => {
      const trimmed = draftName.trim().slice(0, 20);
      if (trimmed.length > 0) {
        gameStore.setDisplayName(trimmed);
        useGeneratedPlaceholder = false;
      }
      draftName = useGeneratedPlaceholder ? "" : gameStore.state.displayName;
      editingName = false;
      caretVisible = true;
      redrawNameField();
      syncNameLabel();
    };

    const cancelEdit = (): void => {
      draftName = useGeneratedPlaceholder ? "" : gameStore.state.displayName;
      editingName = false;
      caretVisible = true;
      redrawNameField();
      syncNameLabel();
    };

    const beginEdit = (): void => {
      editingName = true;
      draftName = useGeneratedPlaceholder ? "" : gameStore.state.displayName;
      caretVisible = true;
      redrawNameField();
      syncNameLabel();
    };

    const nameZone = this.add
      .zone(rightX, btn1Y, buttonW, buttonH)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    nameZone.on("pointerdown", beginEdit);

    const caretTimer = this.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => {
        if (!editingName) {
          return;
        }
        caretVisible = !caretVisible;
        syncNameLabel();
      }
    });

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!editingName) {
        return;
      }

      if (event.key === "Enter") {
        commitName();
        return;
      }

      if (event.key === "Escape") {
        cancelEdit();
        return;
      }

      if (event.key === "Backspace") {
        draftName = draftName.slice(0, -1);
        caretVisible = true;
        syncNameLabel();
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && draftName.length < 20) {
        draftName += event.key;
        caretVisible = true;
        syncNameLabel();
      }
    };

    this.input.keyboard?.on("keydown", onKeyDown);
    const onPointerDown = (pointer: Phaser.Input.Pointer): void => {
      if (!editingName) {
        return;
      }
      const insideNameField =
        pointer.x >= rightX &&
        pointer.x <= rightX + buttonW &&
        pointer.y >= btn1Y &&
        pointer.y <= btn1Y + buttonH;
      const insideContinueButton =
        pointer.x >= rightX &&
        pointer.x <= rightX + buttonW &&
        pointer.y >= btn2Y &&
        pointer.y <= btn2Y + buttonH;

      // Let the continue button receive the click directly.
      if (insideContinueButton) {
        return;
      }

      if (!insideNameField) {
        commitName();
      }
    };
    this.input.on("pointerdown", onPointerDown);

    this.events.once("shutdown", () => {
      caretTimer.remove();
      this.input.keyboard?.off("keydown", onKeyDown);
      this.input.off("pointerdown", onPointerDown);
    });

    redrawNameField();
    syncNameLabel();

    createButton(this, rightX, btn2Y, buttonW, buttonH, "Enter Party Setup", () => {
      if (editingName) {
        commitName();
      }
      this.scene.start(sceneNames.PartySetup);
    });
  }
}
