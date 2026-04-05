import Phaser from "phaser";
import { createTitle, drawOrnatePanel } from "../theme/components.js";
import { layout, restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
import { applyBossCue } from "../combat/bossPresentation.js";
import { playArcaneBurst, playSlashEffect } from "../combat/effectsTimeline.js";
const PORTRAIT_BG = 0x0a0e1f;
function enemyPortraitKey(name) {
    const lower = name.toLowerCase();
    if (lower.includes("hydra") || lower.includes("lich") || lower.includes("dragon") || lower.includes("golem")) {
        return "enemy_lich_dragon";
    }
    return "enemy_goblin";
}
export class CombatScene extends Phaser.Scene {
    logText;
    turnText;
    barRefs = [];
    hpContainer;
    lastTurn = 0;
    metrics;
    constructor() {
        super(sceneNames.Combat);
    }
    create() {
        restartOnResize(this);
        const width = sceneWidth(this);
        const height = sceneHeight(this);
        this.add.image(width / 2, height / 2, "bg_combat").setDisplaySize(width, height);
        const overlay = this.add.graphics();
        overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.45, 0.45);
        overlay.fillRect(0, 0, width, height);
        const title = createTitle(this, "Battle in the Ruined Deep");
        title.setPosition(width / 2 - title.width / 2, layout.titleY);
        const pad = Phaser.Math.Clamp(width * 0.022, 14, 40);
        const bodyTop = Phaser.Math.Clamp(height * 0.14, 96, 158);
        const logH = Phaser.Math.Clamp(height * 0.12, 64, 92);
        const bodyH = height - bodyTop - logH - pad * 2;
        const leftW = Phaser.Math.Clamp((width - pad * 3) * 0.38, 260, 480);
        const rightW = width - pad * 3 - leftW;
        const leftX = pad;
        const rightX = leftX + leftW + pad;
        const logY = bodyTop + bodyH + pad;
        this.metrics = { leftX, leftW, rightX, rightW, bodyTop, bodyH, logY, logH };
        this.barRefs = [];
        this.hpContainer = this.add.container(0, 0);
        // ── LEFT — Vanguard ──────────────────────────────────────────────────
        drawOrnatePanel(this, leftX, bodyTop, leftW, bodyH, 0.9, PORTRAIT_BG);
        this.add.text(leftX + 18, bodyTop + 14, "Vanguard", {
            fontFamily: "Georgia", fontSize: "20px", color: "#7dd181"
        });
        const dL = this.add.graphics();
        dL.lineStyle(1, 0x7dd181, 0.35);
        dL.lineBetween(leftX + 14, bodyTop + 44, leftX + leftW - 14, bodyTop + 44);
        const allies = gameStore.state.combat?.allies ?? [];
        const roomPlayers = gameStore.state.room?.players ?? [];
        const allySlotH = Math.min((bodyH - 52) / Math.max(allies.length, 1), bodyH - 52);
        allies.forEach((ally, i) => {
            const roomPlayer = roomPlayers.find((p) => `player-${p.playerId}` === ally.entityId);
            const className = (roomPlayer?.selectedClass ?? "Guardian");
            const portraitKey = `class_${className}`;
            const cardY = bodyTop + 52 + i * allySlotH;
            this.drawEntityCard(leftX, cardY, leftW, allySlotH, ally, portraitKey, "ally", i);
        });
        // ── RIGHT — Enemy Host ───────────────────────────────────────────────
        drawOrnatePanel(this, rightX, bodyTop, rightW, bodyH, 0.9, PORTRAIT_BG);
        this.add.text(rightX + 18, bodyTop + 14, "Enemy Host", {
            fontFamily: "Georgia", fontSize: "20px", color: "#ff8a7a"
        });
        const dR = this.add.graphics();
        dR.lineStyle(1, 0xff8a7a, 0.35);
        dR.lineBetween(rightX + 14, bodyTop + 44, rightX + rightW - 14, bodyTop + 44);
        const enemies = gameStore.state.combat?.enemies ?? [];
        const enemySlotW = (rightW - 4) / Math.max(enemies.length, 1);
        enemies.forEach((enemy, i) => {
            const cardX = rightX + i * enemySlotW;
            const portraitKey = enemyPortraitKey(enemy.name);
            this.drawEnemyCard(cardX, bodyTop + 52, enemySlotW, bodyH - 52, enemy, portraitKey, i);
        });
        // turn indicator
        this.turnText = this.add.text(leftX + 18, bodyTop + bodyH - 28, "", {
            fontFamily: "Trebuchet MS", fontSize: "13px", color: "#8aafcf"
        });
        // ── BOTTOM — Log + Attack ────────────────────────────────────────────
        drawOrnatePanel(this, leftX, logY, leftW + pad + rightW, logH);
        const attackW = Phaser.Math.Clamp(rightW * 0.28, 140, 220);
        const attackH = Phaser.Math.Clamp(logH * 0.68, 38, 56);
        const attackX = rightX + rightW - attackW - 14;
        const attackY = logY + (logH - attackH) / 2;
        const attackBg = this.add.graphics();
        const drawAttack = (hover) => {
            attackBg.clear();
            attackBg.fillStyle(hover ? 0xaa2a2a : 0x7a1c1c, hover ? 1 : 0.95);
            attackBg.lineStyle(2, 0xffcc66, 1);
            attackBg.fillRoundedRect(attackX, attackY, attackW, attackH, 10);
            attackBg.strokeRoundedRect(attackX, attackY, attackW, attackH, 10);
        };
        drawAttack(false);
        this.add.text(attackX + attackW / 2, attackY + attackH / 2, "⚔ Attack", {
            fontFamily: "Georgia", fontSize: "19px", color: "#fff4da"
        }).setOrigin(0.5);
        const attackZone = this.add.zone(attackX, attackY, attackW, attackH).setOrigin(0).setInteractive({ useHandCursor: true });
        attackZone.on("pointerover", () => drawAttack(true));
        attackZone.on("pointerout", () => drawAttack(false));
        attackZone.on("pointerdown", () => this.sendDefaultAction());
        this.logText = this.add.text(leftX + 18, logY + logH * 0.24, "", {
            fontFamily: "Trebuchet MS", fontSize: "13px", color: "#f8edd8",
            wordWrap: { width: leftW + pad + rightW - attackW - 36 }
        });
        const unsubscribe = gameStore.subscribe(() => this.refresh());
        this.events.once("shutdown", unsubscribe);
        this.refresh();
    }
    // ── Ally card: portrait left, name + HP right ────────────────────────
    drawEntityCard(panelX, y, panelW, h, entity, portraitKey, _side, index) {
        const portW = Math.min(panelW * 0.38, h * 1.2);
        const portH = h * 0.8;
        const portCX = panelX + portW / 2 + 8;
        const portCY = y + h * 0.42;
        const src = this.textures.get(portraitKey).getSourceImage();
        const scale = Math.min(portW / src.width, portH / src.height);
        this.add.image(portCX, portCY, portraitKey)
            .setDisplaySize(src.width * scale, src.height * scale);
        const textX = panelX + portW + 16;
        const textW = panelW - portW - 24;
        this.add.text(textX, y + h * 0.18, entity.name, {
            fontFamily: "Georgia", fontSize: "16px", color: "#f7f2e8"
        });
        const barX = textX;
        const barY = y + h * 0.52;
        const barW = textW - 8;
        const g = this.add.graphics();
        this.hpContainer.add(g);
        const capturedIndex = index;
        this.barRefs.push({
            g, x: barX, y: barY, w: barW, color: 0x7dd181,
            getEntity: () => gameStore.state.combat?.allies[capturedIndex]
        });
        this.add.text(barX, y + h * 0.68, `${entity.currentHp}/${entity.stats.maxHp} HP`, {
            fontFamily: "Trebuchet MS", fontSize: "13px", color: "#a0d8a2"
        });
    }
    // ── Enemy card: portrait fills top, name + HP at bottom ─────────────
    drawEnemyCard(x, y, w, h, entity, portraitKey, index) {
        const nameH = 50;
        const portAreaH = h - nameH - 28;
        const src = this.textures.get(portraitKey).getSourceImage();
        const scale = Math.min((w - 20) / src.width, portAreaH / src.height);
        const dispW = src.width * scale;
        const dispH = src.height * scale;
        this.add.image(x + w / 2, y + portAreaH / 2, portraitKey)
            .setDisplaySize(dispW, dispH);
        this.add.text(x + w / 2, y + portAreaH + 6, entity.name, {
            fontFamily: "Georgia", fontSize: Phaser.Math.Clamp(w * 0.11, 12, 17) + "px",
            color: "#ffd2cf"
        }).setOrigin(0.5, 0);
        const barX = x + 8;
        const barY = y + portAreaH + nameH;
        const barW = w - 16;
        const g = this.add.graphics();
        this.hpContainer.add(g);
        const capturedIndex = index;
        this.barRefs.push({
            g, x: barX, y: barY, w: barW, color: 0xff8a7a,
            getEntity: () => gameStore.state.combat?.enemies[capturedIndex]
        });
    }
    sendDefaultAction() {
        const { playerId, room, combat } = gameStore.state;
        if (!playerId || !room || !combat)
            return;
        const target = combat.enemies.find((e) => e.currentHp > 0);
        if (!target)
            return;
        if (this.metrics) {
            playSlashEffect(this, this.metrics.rightX + this.metrics.rightW * 0.5, this.metrics.bodyTop + 180);
        }
        gameStore.socket.emit("submitAction", {
            roomId: room.roomId,
            action: { actorId: `player-${playerId}`, skillId: "strike", targetIds: [target.entityId] }
        });
    }
    refresh() {
        const combat = gameStore.state.combat;
        if (!combat || !this.logText || !this.turnText)
            return;
        const lastLog = combat.logs[combat.logs.length - 1]?.message ?? "-";
        this.turnText.setText(`Turn ${combat.turn}  ·  Active: ${combat.activeEntityId}`);
        this.logText.setText(`Chronicle: ${lastLog}`);
        // Redraw all HP bars
        for (const ref of this.barRefs) {
            const entity = ref.getEntity();
            if (!entity)
                continue;
            ref.g.clear();
            // track
            ref.g.fillStyle(0x1f2430, 0.9);
            ref.g.fillRoundedRect(ref.x, ref.y, ref.w, 12, 5);
            // fill
            const ratio = Phaser.Math.Clamp(entity.currentHp / entity.stats.maxHp, 0, 1);
            ref.g.fillStyle(ref.color, 1);
            ref.g.fillRoundedRect(ref.x + 2, ref.y + 2, (ref.w - 4) * ratio, 8, 3);
        }
        if (combat.turn !== this.lastTurn) {
            this.lastTurn = combat.turn;
            if (this.metrics) {
                playArcaneBurst(this, this.metrics.leftX + this.metrics.leftW * 0.7, this.metrics.bodyTop + 260);
            }
            const names = combat.enemies.map((e) => e.name.toLowerCase()).join(" ");
            if ((names.includes("hydra")) && combat.turn % 4 === 0)
                applyBossCue(this, "phaseSwap");
            else if ((names.includes("lich")) && combat.turn % 5 === 0)
                applyBossCue(this, "summonAdds");
        }
        if (combat.encounterComplete) {
            this.scene.start(sceneNames.Results);
        }
    }
}
