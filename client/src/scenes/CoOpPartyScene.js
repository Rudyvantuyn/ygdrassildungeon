import Phaser from "phaser";
import { createButton, createTitle, drawOrnatePanel } from "../theme/components.js";
import { layout, restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
import { fadeInScene, startSceneWithFade } from "./sceneFlow.js";
export class CoOpPartyScene extends Phaser.Scene {
    detailsText;
    codeFieldText;
    codeValue = "";
    editingCode = false;
    caretVisible = true;
    fieldBounds;
    fieldGraphics;
    constructor() {
        super(sceneNames.CoOpParty);
    }
    create() {
        restartOnResize(this);
        const width = sceneWidth(this);
        const height = sceneHeight(this);
        this.add.image(width / 2, height / 2, "bg_service_placeholder").setDisplaySize(width, height);
        const overlay = this.add.graphics();
        overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5);
        overlay.fillRect(0, 0, width, height);
        fadeInScene(this, 200);
        const title = createTitle(this, "Co-op Party Board");
        title.setPosition(width / 2 - title.width / 2, layout.titleY);
        const boardW = Phaser.Math.Clamp(width * 0.9, 940, 1360);
        const boardH = Phaser.Math.Clamp(height * 0.78, 480, 760);
        const boardX = (width - boardW) / 2;
        const boardY = Phaser.Math.Clamp((height - boardH) / 2 + 8, 84, height - boardH - 24);
        const gap = 16;
        const commandW = Phaser.Math.Clamp(boardW * 0.26, 240, 320);
        const contentW = boardW - commandW - gap;
        const leftX = boardX;
        const rightX = leftX + commandW + gap;
        drawOrnatePanel(this, leftX, boardY, commandW, boardH, 0.9, 0x0a1224);
        drawOrnatePanel(this, rightX, boardY, contentW, boardH, 0.9);
        this.add.text(leftX + 16, boardY + 18, "Commands", {
            fontFamily: "Georgia",
            fontSize: "28px",
            color: "#f4b942"
        });
        this.add.text(leftX + commandW - 12, boardY + 24, "1-4 / Enter / Esc", {
            fontFamily: "Trebuchet MS",
            fontSize: "12px",
            color: "#86a4c9"
        }).setOrigin(1, 0);
        this.add.text(rightX + 24, boardY + 18, "Party Overview", {
            fontFamily: "Georgia",
            fontSize: "28px",
            color: "#f4b942"
        });
        const lDiv = this.add.graphics();
        lDiv.lineStyle(1, 0xf4b942, 0.45);
        lDiv.lineBetween(leftX + 12, boardY + 56, leftX + commandW - 12, boardY + 56);
        const rDiv = this.add.graphics();
        rDiv.lineStyle(1, 0xf4b942, 0.45);
        rDiv.lineBetween(rightX + 18, boardY + 56, rightX + contentW - 18, boardY + 56);
        const bannerW = contentW - 48;
        const bannerH = Phaser.Math.Clamp(boardH * 0.18, 90, 130);
        drawOrnatePanel(this, rightX + 24, boardY + 72, bannerW, bannerH, 0.76, 0x0a1224);
        this.add.image(rightX + 24 + bannerW / 2, boardY + 72 + bannerH / 2, "ph_coop_banner").setDisplaySize(bannerW - 12, bannerH - 12);
        this.detailsText = this.add.text(rightX + 24, boardY + 84 + bannerH, "", {
            fontFamily: "Trebuchet MS",
            fontSize: "19px",
            color: "#f5e9d7",
            wordWrap: { width: contentW - 48 },
            lineSpacing: 8
        });
        const fieldX = rightX + 24;
        const fieldY = boardY + boardH - 120;
        const fieldW = contentW - 48;
        const fieldH = 48;
        this.fieldBounds = { x: fieldX, y: fieldY, w: fieldW, h: fieldH };
        this.fieldGraphics = this.add.graphics();
        this.codeFieldText = this.add.text(fieldX + 12, fieldY + fieldH / 2, "", {
            fontFamily: "Trebuchet MS",
            fontSize: "21px",
            color: "#f7f2e8"
        }).setOrigin(0, 0.5);
        this.add.text(fieldX, fieldY - 26, "Party Sigil Code", {
            fontFamily: "Trebuchet MS",
            fontSize: "15px",
            color: "#8aafcf"
        });
        const fieldZone = this.add
            .zone(fieldX, fieldY, fieldW, fieldH)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.startCodeEdit());
        const caretTimer = this.time.addEvent({
            delay: 420,
            loop: true,
            callback: () => {
                if (!this.editingCode) {
                    return;
                }
                this.caretVisible = !this.caretVisible;
                this.syncCodeFieldText();
            }
        });
        const onKeyDown = (event) => {
            if (!this.editingCode) {
                return;
            }
            if (event.key === "Enter") {
                this.editingCode = false;
                this.redrawCodeField();
                this.syncCodeFieldText();
                return;
            }
            if (event.key === "Escape") {
                this.editingCode = false;
                this.redrawCodeField();
                this.syncCodeFieldText();
                return;
            }
            if (event.key === "Backspace") {
                this.codeValue = this.codeValue.slice(0, -1);
                this.caretVisible = true;
                this.syncCodeFieldText();
                return;
            }
            if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && this.codeValue.length < 24) {
                this.codeValue += event.key;
                this.caretVisible = true;
                this.syncCodeFieldText();
            }
        };
        this.input.keyboard?.on("keydown", onKeyDown);
        this.events.once("shutdown", () => {
            this.input.keyboard?.off("keydown", onKeyDown);
            caretTimer.remove();
            fieldZone.removeAllListeners();
        });
        const btnW = commandW - 16;
        const btnX = leftX + 8;
        const btnY0 = boardY + 72;
        const commandRows = 4;
        const availableButtonHeight = Math.max(200, boardH - 190);
        const btnGap = Phaser.Math.Clamp(Math.floor((availableButtonHeight - commandRows * 40) / (commandRows - 1)), 6, 12);
        const btnH = Phaser.Math.Clamp(Math.floor((availableButtonHeight - btnGap * (commandRows - 1)) / commandRows), 40, 50);
        createButton(this, btnX, btnY0, btnW, btnH, "Create Party", () => {
            gameStore.socket.emit("createRoom", {
                displayName: gameStore.state.displayName,
                selectedClass: gameStore.state.selectedClass
            });
        });
        createButton(this, btnX, btnY0 + (btnH + btnGap), btnW, btnH, "Join Party", () => {
            const code = this.codeValue.trim();
            if (code.length === 0) {
                gameStore.setStatus("Enter a party sigil code first.");
                return;
            }
            gameStore.socket.emit("joinRoom", {
                roomId: code,
                displayName: gameStore.state.displayName,
                selectedClass: gameStore.state.selectedClass
            });
        });
        createButton(this, btnX, btnY0 + (btnH + btnGap) * 2, btnW, btnH, "Toggle Ready", () => {
            const room = gameStore.state.room;
            const playerId = gameStore.state.playerId;
            if (!room || !playerId) {
                gameStore.setStatus("Create or join a party before toggling ready.");
                return;
            }
            const self = room.players.find((p) => p.playerId === playerId);
            gameStore.socket.emit("setReady", { roomId: room.roomId, isReady: !(self?.isReady ?? false) });
        });
        createButton(this, btnX, btnY0 + (btnH + btnGap) * 3, btnW, btnH, "Start Co-op Run", () => {
            const room = gameStore.state.room;
            if (!room) {
                gameStore.setStatus("Create or join a party first.");
                return;
            }
            gameStore.socket.emit("startRun", { roomId: room.roomId });
        });
        createButton(this, btnX, boardY + boardH - 62, btnW, 48, "Back To City", () => {
            startSceneWithFade(this, sceneNames.City, 180);
        });
        const onCommandKey = (event) => {
            if (this.editingCode) {
                return;
            }
            if (event.key === "1") {
                gameStore.socket.emit("createRoom", {
                    displayName: gameStore.state.displayName,
                    selectedClass: gameStore.state.selectedClass
                });
                return;
            }
            if (event.key === "2") {
                const code = this.codeValue.trim();
                if (code.length === 0) {
                    gameStore.setStatus("Enter a party sigil code first.");
                    return;
                }
                gameStore.socket.emit("joinRoom", {
                    roomId: code,
                    displayName: gameStore.state.displayName,
                    selectedClass: gameStore.state.selectedClass
                });
                return;
            }
            if (event.key === "3") {
                const room = gameStore.state.room;
                const playerId = gameStore.state.playerId;
                if (!room || !playerId) {
                    gameStore.setStatus("Create or join a party before toggling ready.");
                    return;
                }
                const self = room.players.find((p) => p.playerId === playerId);
                gameStore.socket.emit("setReady", { roomId: room.roomId, isReady: !(self?.isReady ?? false) });
                return;
            }
            if (event.key === "4") {
                const room = gameStore.state.room;
                if (!room) {
                    gameStore.setStatus("Create or join a party first.");
                    return;
                }
                gameStore.socket.emit("startRun", { roomId: room.roomId });
                return;
            }
            if (event.key === "Enter") {
                const room = gameStore.state.room;
                if (!room) {
                    gameStore.setStatus("No party yet. Press 1 to create or 2 to join.");
                    return;
                }
                gameStore.socket.emit("startRun", { roomId: room.roomId });
                return;
            }
            if (event.key === "Escape") {
                startSceneWithFade(this, sceneNames.City, 180);
            }
        };
        this.input.keyboard?.on("keydown", onCommandKey);
        this.events.once("shutdown", () => this.input.keyboard?.off("keydown", onCommandKey));
        this.redrawCodeField();
        this.syncCodeFieldText();
        const unsubscribe = gameStore.subscribe(() => this.render());
        this.events.once("shutdown", unsubscribe);
        this.render();
    }
    render() {
        if (!this.detailsText) {
            return;
        }
        const room = gameStore.state.room;
        if (!room) {
            this.detailsText.setText([
                "No active co-op party.",
                "",
                "Flow:",
                "1) Create Party or enter a sigil code and Join Party",
                "2) Everyone toggles Ready",
                "3) Host starts the co-op run",
                "",
                `Status: ${gameStore.state.lastStatus}`
            ]);
            return;
        }
        this.detailsText.setText([
            `Party Sigil: ${room.roomId}`,
            `Host: ${room.hostPlayerId}`,
            `Room Status: ${room.status}`,
            "",
            "Party Members:",
            ...room.players.map((player) => `• ${player.displayName} [${player.selectedClass}]  ${player.connected ? "online" : "offline"}  ${player.isReady ? "ready" : "not ready"}`),
            "",
            `Status: ${gameStore.state.lastStatus}`
        ]);
    }
    startCodeEdit() {
        this.editingCode = true;
        this.caretVisible = true;
        this.redrawCodeField();
        this.syncCodeFieldText();
    }
    redrawCodeField() {
        const bounds = this.fieldBounds;
        const graphics = this.fieldGraphics;
        if (!bounds || !graphics) {
            return;
        }
        graphics.clear();
        graphics.fillStyle(this.editingCode ? 0x35558c : 0x274690, 0.9);
        graphics.lineStyle(2, 0xf4b942, 1);
        graphics.fillRoundedRect(bounds.x, bounds.y, bounds.w, bounds.h, 10);
        graphics.strokeRoundedRect(bounds.x, bounds.y, bounds.w, bounds.h, 10);
    }
    syncCodeFieldText() {
        if (!this.codeFieldText) {
            return;
        }
        const base = this.codeValue.length > 0 ? this.codeValue : "Enter party sigil code";
        const display = this.editingCode ? `${base}${this.caretVisible ? "|" : " "}` : base;
        this.codeFieldText.setText(display);
        this.codeFieldText.setColor(this.codeValue.length > 0 ? "#f7f2e8" : "#c9c0b4");
    }
}
