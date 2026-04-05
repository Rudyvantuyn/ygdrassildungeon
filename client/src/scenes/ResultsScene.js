import Phaser from "phaser";
import { createButton, createTitle, drawOrnatePanel } from "../theme/components.js";
import { layout, restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
const PORTRAIT_BG = 0x0a0e1f;
export class ResultsScene extends Phaser.Scene {
    constructor() {
        super(sceneNames.Results);
    }
    create() {
        restartOnResize(this);
        const width = sceneWidth(this);
        const height = sceneHeight(this);
        this.add.image(width / 2, height / 2, "bg_results").setDisplaySize(width, height);
        const overlay = this.add.graphics();
        overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
        overlay.fillRect(0, 0, width, height);
        const title = createTitle(this, "Run Chronicle");
        title.setPosition(width / 2 - title.width / 2, layout.titleY);
        // ── Panel ───────────────────────────────────────────────────────────
        const panelW = Phaser.Math.Clamp(width * 0.68, 560, 960);
        const panelH = Phaser.Math.Clamp(height * 0.66, 380, 560);
        const panelX = width / 2 - panelW / 2;
        const panelY = Phaser.Math.Clamp(height / 2 - panelH / 2 + 12, 84, height - panelH - 24);
        drawOrnatePanel(this, panelX, panelY, panelW, panelH, 0.92, PORTRAIT_BG);
        // ── Portrait (left 40%) — fit full transparent sprite, no crop ──────
        const portSlotW = panelW * 0.4;
        const portSlotH = panelH;
        const selectedClass = gameStore.state.selectedClass ?? "Guardian";
        const source = this.textures.get(`class_${selectedClass}`).getSourceImage();
        const srcW = source.width;
        const srcH = source.height;
        const fitScale = Math.min((portSlotW * 0.92) / srcW, (portSlotH * 0.92) / srcH);
        const displayW = srcW * fitScale;
        const displayH = srcH * fitScale;
        this.add.image(panelX + portSlotW / 2, panelY + panelH / 2, `class_${selectedClass}`).setDisplaySize(displayW, displayH);
        // Gold divider
        const divX = panelX + portSlotW;
        const divG = this.add.graphics();
        divG.lineStyle(2, 0xc8a96e, 0.7);
        divG.lineBetween(divX, panelY + 16, divX, panelY + panelH - 16);
        // ── Results text (right 60%) ────────────────────────────────────────
        const rightX = divX + 20;
        const rightW = panelW - portSlotW - 24;
        const victoryText = gameStore.state.lastStatus?.toLowerCase().includes("win")
            ? "Victory!"
            : "Run Complete";
        this.add.text(rightX, panelY + panelH * 0.1, victoryText, {
            fontFamily: "Georgia",
            fontSize: Phaser.Math.Clamp(rightW * 0.1, 22, 36) + "px",
            color: "#f4b942"
        });
        const divH = this.add.graphics();
        divH.lineStyle(1, 0xf4b942, 0.4);
        divH.lineBetween(rightX, panelY + panelH * 0.22, rightX + rightW - 20, panelY + panelH * 0.22);
        const rewardStr = gameStore.state.lastRewards
            ? String(gameStore.state.lastRewards)
            : "No rewards recorded.";
        this.add.text(rightX, panelY + panelH * 0.28, [
            `Status:   ${gameStore.state.lastStatus ?? "—"}`,
            "",
            "Rewards:",
            rewardStr,
            "",
            "The guild archivists record",
            "your victories and scars."
        ].join("\n"), {
            fontFamily: "Trebuchet MS",
            fontSize: "17px",
            color: "#c9c0b4",
            lineSpacing: 7,
            wordWrap: { width: rightW - 24 }
        });
        const btnW = rightW - 32;
        const btnH = 48;
        createButton(this, rightX, panelY + panelH - btnH - 20, btnW, btnH, "Return to City", () => this.scene.start(sceneNames.City));
    }
}
