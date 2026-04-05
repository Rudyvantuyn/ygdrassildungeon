import Phaser from "phaser";
import { createButton, createTitle, drawOrnatePanel } from "../theme/components.js";
import { layout, restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
import { fadeInScene } from "./sceneFlow.js";
export class ForestEntranceScene extends Phaser.Scene {
    // Debug switch: flip to true to re-enable Forest encounters.
    encountersEnabled = false;
    // Keep raw exploration metrics hidden from the player-facing UI.
    showStatusOverlay = false;
    state = {
        floorNumber: 1,
        x: 3,
        y: 3,
        heading: 0,
        steps: 0,
        risk: 8,
        threads: 1,
        scouts: 2,
        supplies: 6,
        foeDistance: 7,
        pressure: 0
    };
    visited = new Set();
    triggeredPoi = new Set();
    activeFloor = null;
    logLines = [];
    locked = false;
    corrSprites;
    viewBounds;
    viewGraphics;
    infoText;
    logText;
    headingText;
    depthText;
    logMaskGraphics;
    logScrollbarGraphics;
    logViewport;
    layoutMetrics;
    menuOpen = false;
    menuContainer;
    menuRows = [];
    menuSelectedIndex = 0;
    constructor() {
        super(sceneNames.ForestEntrance);
    }
    create() {
        restartOnResize(this);
        const width = sceneWidth(this);
        const height = sceneHeight(this);
        fadeInScene(this, 180);
        this.add.image(width / 2, height / 2, "forest_base").setDisplaySize(width, height).setAlpha(0.55);
        const overlay = this.add.graphics();
        overlay.fillGradientStyle(0x050a03, 0x050a03, 0x030702, 0x030702, 0.32, 0.32, 0.76, 0.80);
        overlay.fillRect(0, 0, width, height);
        const title = createTitle(this, "Forest Entrance");
        title.setPosition(width / 2 - title.width / 2, layout.titleY);
        const boardW = Phaser.Math.Clamp(width * 0.92, 1040, 1500);
        const boardH = Phaser.Math.Clamp(height * 0.8, 560, 860);
        const boardX = (width - boardW) / 2;
        const boardY = Phaser.Math.Clamp((height - boardH) / 2 + 14, 84, height - boardH - 24);
        const rightW = Phaser.Math.Clamp(boardW * 0.24, 240, 340);
        const centerW = boardW - rightW - 12;
        const centerX = boardX;
        const rightX = centerX + centerW + 12;
        this.layoutMetrics = { boardY, centerX, centerW, boardH, rightX, rightW };
        drawOrnatePanel(this, centerX, boardY, centerW, boardH, 0.9, 0x091527);
        drawOrnatePanel(this, rightX, boardY, rightW, boardH, 0.9, 0x071326);
        this.add.text(centerX + 16, boardY + 16, "Forest Path View", {
            fontFamily: "Georgia",
            fontSize: "25px",
            color: "#f4b942"
        });
        const cDiv = this.add.graphics();
        cDiv.lineStyle(1, 0xf4b942, 0.45);
        cDiv.lineBetween(centerX + 12, boardY + 52, centerX + centerW - 12, boardY + 52);
        this.add.text(rightX + 16, boardY + 16, "Route Notes", {
            fontFamily: "Georgia",
            fontSize: "25px",
            color: "#f4b942"
        });
        const rDiv = this.add.graphics();
        rDiv.lineStyle(1, 0xf4b942, 0.45);
        rDiv.lineBetween(rightX + 12, boardY + 52, rightX + rightW - 12, boardY + 52);
        const actionY = boardY + boardH - 56;
        const actionBtnW = Phaser.Math.Clamp(centerW * 0.2, 124, 220);
        const actionBtnH = 42;
        const actionX = centerX + centerW - actionBtnW - 16;
        createButton(this, actionX, actionY, actionBtnW, actionBtnH, "Menu", () => this.toggleMenu());
        const vx = centerX + 16;
        const vy = boardY + 64;
        const vw = centerW - 32;
        const infoTopPre = boardY + boardH - 130;
        const vh = Math.max(280, infoTopPre - vy - 14);
        this.buildCorridorView(vx, vy, vw, vh);
        this.viewGraphics = this.add.graphics().setDepth(10);
        this.infoText = this.add.text(centerX + 18, boardY + boardH - 140, "", {
            fontFamily: "Trebuchet MS",
            fontSize: "16px",
            color: "#f7f2e8",
            lineSpacing: 6,
            wordWrap: { width: centerW - 36 }
        });
        this.infoText.setVisible(this.showStatusOverlay);
        this.logText = this.add.text(rightX + 16, boardY + 62, "", {
            fontFamily: "Trebuchet MS",
            fontSize: "15px",
            color: "#f7f2e8",
            lineSpacing: 7,
            wordWrap: { width: rightW - 32 }
        });
        this.logViewport = { x: rightX + 16, y: boardY + 62, w: rightW - 32, h: boardH - 90 };
        this.logMaskGraphics = this.add.graphics();
        this.logMaskGraphics.fillStyle(0xffffff, 1);
        this.logMaskGraphics.fillRect(this.logViewport.x, this.logViewport.y, this.logViewport.w, this.logViewport.h);
        this.logMaskGraphics.visible = false;
        this.logText.setMask(this.logMaskGraphics.createGeometryMask());
        this.logScrollbarGraphics = this.add.graphics();
        this.headingText = this.add.text(0, 0, "", {
            fontFamily: "Trebuchet MS",
            fontSize: "14px",
            color: "#cde4ff"
        }).setDepth(11).setVisible(this.showStatusOverlay);
        this.depthText = this.add.text(0, 0, "", {
            fontFamily: "Trebuchet MS",
            fontSize: "12px",
            color: "#9eb8d8"
        }).setDepth(11).setVisible(this.showStatusOverlay);
        this.createDungeonMenu(width, height);
        const onKeyDown = (event) => {
            if (event.key === "Tab") {
                event.preventDefault();
                this.toggleMenu();
                return;
            }
            if (this.menuOpen) {
                if (event.key === "Escape") {
                    this.toggleMenu(false);
                }
                else if (event.key === "ArrowUp") {
                    this.menuSelectedIndex = (this.menuSelectedIndex - 1 + this.menuRows.length) % this.menuRows.length;
                    this.refreshMenuSelection();
                }
                else if (event.key === "ArrowDown") {
                    this.menuSelectedIndex = (this.menuSelectedIndex + 1) % this.menuRows.length;
                    this.refreshMenuSelection();
                }
                else if (event.key === "Enter") {
                    this.menuRows[this.menuSelectedIndex]?.execute();
                }
                return;
            }
            if (this.locked) {
                return;
            }
            const key = event.key.toLowerCase();
            if (event.key === "ArrowUp" || key === "w") {
                this.moveForward();
            }
            else if (event.key === "ArrowLeft" || key === "a") {
                this.turn(-1);
            }
            else if (event.key === "ArrowRight" || key === "d") {
                this.turn(1);
            }
            else if (key === "t") {
                this.useThread();
            }
            else if (key === "m") {
                this.toggleMenu();
            }
            else if (event.key === "Escape") {
                this.returnCity();
            }
        };
        this.input.keyboard?.on("keydown", onKeyDown);
        this.events.once("shutdown", () => this.input.keyboard?.off("keydown", onKeyDown));
        this.refreshUI();
        void this.bootstrapForest();
    }
    buildCorridorView(vx, vy, vw, vh) {
        this.viewBounds = { vx, vy, vw, vh };
        const panelBg = this.add.graphics().setDepth(2);
        panelBg.fillStyle(0x050e1a, 1);
        panelBg.fillRoundedRect(vx, vy, vw, vh, 12);
        const cx = vx + vw / 2;
        const cy = vy + vh / 2;
        // Composite corridor image: one of 8 pre-rendered views (corridor_LFR.png).
        const corridorImg = this.add.image(cx, cy, "forest_corridor000")
            .setDisplaySize(vw, vh)
            .setOrigin(0.5, 0.5)
            .setDepth(3);
        const fogOverlay = this.add.image(cx, vy, "forest_fogOverlay")
            .setDisplaySize(vw, vh * 0.35)
            .setOrigin(0.5, 0)
            .setAlpha(0.045)
            .setTint(0x152510)
            .setDepth(8);
        const poiSize = Math.min(vw * 0.20, vh * 0.30, 170);
        const poiX = cx;
        const poiY = vy + vh * 0.62;
        const poiStairs = this.add.image(poiX, poiY, "forest_stairsMarker")
            .setDisplaySize(poiSize * 1.35, poiSize * 1.35).setOrigin(0.5, 0.5).setDepth(9).setVisible(false);
        const poiTreasure = this.add.image(poiX, poiY, "forest_treasureMarker")
            .setDisplaySize(poiSize, poiSize).setOrigin(0.5, 0.5).setDepth(9).setVisible(false);
        const poiMining = this.add.image(poiX, poiY, "forest_miningMarker")
            .setDisplaySize(poiSize * 0.72, poiSize * 0.72).setOrigin(0.5, 0.5).setDepth(9).setVisible(false);
        this.tweens.add({
            targets: [poiStairs, poiTreasure, poiMining],
            y: poiY - 10,
            duration: 950,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
        const riskTint = this.add.graphics().setDepth(10);
        const flashRect = this.add.graphics().setDepth(11).setAlpha(0);
        this.corrSprites = {
            corridorImg,
            fogOverlay,
            poiStairs,
            poiMining,
            poiTreasure,
            riskTint,
            flashRect
        };
    }
    refreshCorridorView() {
        const s = this.corrSprites;
        if (!s)
            return;
        const { heading, x, y } = this.state;
        const tile = (fwd, side) => {
            const fv = this.headingVector(heading);
            const rv = this.headingVector(((heading + 1) % 4));
            return { x: x + fv.dx * fwd + rv.dx * side, y: y + fv.dy * fwd + rv.dy * side };
        };
        const open = (fwd, side) => {
            const t = tile(fwd, side);
            return this.canStandOn(t.x, t.y);
        };
        const hasLeft  = !open(0, -1);
        const hasFront = !open(1,  0);
        const hasRight = !open(0,  1);
        const key = `forest_corridor${hasLeft ? 1 : 0}${hasFront ? 1 : 0}${hasRight ? 1 : 0}`;
        s.corridorImg.setTexture(key);
        const f1Open = !hasFront;
        const floor = this.activeFloor;
        const fwd = this.headingVector(heading);
        const hereKey = this.cellKey(x, y);
        const aheadKey = this.cellKey(x + fwd.dx, y + fwd.dy);
        const allPois = [
            ...(floor?.poiByCell.get(hereKey) ?? []),
            ...(f1Open ? (floor?.poiByCell.get(aheadKey) ?? []) : [])
        ];
        const nearCoord = (coord) => {
            if (!coord)
                return false;
            return (coord.x === x && coord.y === y) ||
                (f1Open && coord.x === x + fwd.dx && coord.y === y + fwd.dy);
        };
        const hasStairs = nearCoord(floor?.map.stairsDown ?? null) ||
            nearCoord(floor?.map.stairsUp ?? null) ||
            allPois.some(p => p.kind === "stairs_down" || p.kind === "stairs_up");
        const hasTreasure = !hasStairs && allPois.some(p => p.kind === "treasure");
        const hasMining = !hasStairs && !hasTreasure && allPois.some(p => p.kind === "mining");
        s.poiStairs.setVisible(hasStairs);
        s.poiTreasure.setVisible(hasTreasure);
        s.poiMining.setVisible(hasMining);
    }
    headingVector(h) {
        return h === 0 ? { dx: 0, dy: -1 }
            : h === 1 ? { dx: 1, dy: 0 }
                : h === 2 ? { dx: 0, dy: 1 }
                    : { dx: -1, dy: 0 };
    }
    playStepAnim() {
        const s = this.corrSprites;
        const vb = this.viewBounds;
        if (!s || !vb)
            return;
        s.flashRect.clear();
        s.flashRect.fillStyle(0xffffff, 1);
        s.flashRect.fillRoundedRect(vb.vx, vb.vy, vb.vw, vb.vh, 12);
        this.tweens.killTweensOf(s.flashRect);
        this.tweens.add({
            targets: s.flashRect,
            alpha: { from: 0.22, to: 0 },
            duration: 170,
            ease: "Power2"
        });
    }
    playTurnAnim(dir) {
        const s = this.corrSprites;
        const vb = this.viewBounds;
        if (!s || !vb)
            return;
        s.flashRect.clear();
        s.flashRect.fillStyle(0x000000, 1);
        s.flashRect.fillRoundedRect(vb.vx, vb.vy, vb.vw, vb.vh, 12);
        this.tweens.killTweensOf(s.flashRect);
        this.tweens.add({
            targets: s.flashRect,
            alpha: { from: 0.45, to: 0 },
            duration: 140,
            ease: "Power2"
        });
    }
    playWallBumpAnim() {
        const s = this.corrSprites;
        const vb = this.viewBounds;
        if (!s || !vb)
            return;
        s.flashRect.clear();
        s.flashRect.fillStyle(0xcc2200, 1);
        s.flashRect.fillRoundedRect(vb.vx, vb.vy, vb.vw, vb.vh, 12);
        this.tweens.killTweensOf(s.flashRect);
        this.tweens.add({
            targets: s.flashRect,
            alpha: { from: 0.22, to: 0 },
            duration: 220,
            ease: "Power2"
        });
    }
    cellKey(x, y) {
        return `${x},${y}`;
    }
    headingLabel(heading) {
        return heading === 0 ? "N" : heading === 1 ? "E" : heading === 2 ? "S" : "W";
    }
    async bootstrapForest() {
        let loaded = false;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            await gameStore.fetchForestMeta();
            const storyProgress = gameStore.state.forestMeta?.storyProgress ?? {};
            const unlockedFloor = Math.max(1, Number(storyProgress.unlockedFloor ?? 1));
            const startFloor = Math.max(1, Math.min(unlockedFloor, Number(storyProgress.currentFloor ?? 1)));
            loaded = await gameStore.fetchForestFloor(startFloor);
            if (loaded && this.applyFloorFromStore(true)) {
                break;
            }
            await waitMs(220);
        }
        if (!loaded || !this.activeFloor) {
            this.pushLog("The route map cannot be read. Return to city and try again.");
            this.refreshUI();
            return;
        }
        this.pushLog(`You arrive at Floor ${this.state.floorNumber}. Find the staircase deeper.`);
        const objective = gameStore.state.forestObjective;
        if (objective?.active) {
            this.pushLog(`Main quest: ${objective.title} (${objective.progressSteps}/${objective.targetSteps}).`);
        }
        this.refreshUI();
    }
    applyFloorFromStore(spawnAtStart) {
        const floorRecord = gameStore.state.forestMeta?.floor ?? null;
        if (!floorRecord) {
            return false;
        }
        const width = Number(floorRecord.width ?? 0);
        const height = Number(floorRecord.height ?? 0);
        const floorNumber = Number(floorRecord.floorNumber ?? 1);
        const startRecord = floorRecord.start ?? {};
        const passableCells = floorRecord.passableCells ?? [];
        const poiRows = floorRecord.pois ?? [];
        if (width <= 0 || height <= 0 || passableCells.length === 0) {
            return false;
        }
        const passable = new Set();
        for (const cell of passableCells) {
            const x = Number(cell.x ?? -1);
            const y = Number(cell.y ?? -1);
            if (x >= 0 && y >= 0) {
                passable.add(this.cellKey(x, y));
            }
        }
        const pois = poiRows
            .map((row) => ({
            id: String(row.id ?? "poi"),
            kind: String(row.kind ?? "event"),
            x: Number(row.x ?? 0),
            y: Number(row.y ?? 0),
            once: typeof row.once === "boolean" ? row.once : undefined,
            lootTable: typeof row.lootTable === "string" ? row.lootTable : undefined,
            eventId: typeof row.eventId === "string" ? row.eventId : undefined,
            encounterPool: typeof row.encounterPool === "string" ? row.encounterPool : undefined
        }))
            .filter((poi) => Number.isFinite(poi.x) && Number.isFinite(poi.y));
        const poiByCell = new Map();
        for (const poi of pois) {
            const key = this.cellKey(poi.x, poi.y);
            const list = poiByCell.get(key) ?? [];
            list.push(poi);
            poiByCell.set(key, list);
        }
        this.activeFloor = {
            map: {
                seasonId: String(floorRecord.seasonId ?? "s1"),
                floorId: String(floorRecord.floorId ?? `s1-f${floorNumber}`),
                floorNumber,
                width,
                height,
                start: {
                    x: Number(startRecord.x ?? 1),
                    y: Number(startRecord.y ?? 1),
                    heading: Number(startRecord.heading ?? 0)
                },
                stairsDown: normalizeCoord(floorRecord.stairsDown),
                stairsUp: normalizeCoord(floorRecord.stairsUp),
                passableCells: passableCells.map((cell) => ({ x: Number(cell.x ?? 0), y: Number(cell.y ?? 0) })),
                pois
            },
            passable,
            poiByCell
        };
        this.state.floorNumber = floorNumber;
        if (spawnAtStart || !this.canStandOn(this.state.x, this.state.y)) {
            this.state.x = this.activeFloor.map.start.x;
            this.state.y = this.activeFloor.map.start.y;
            this.state.heading = this.activeFloor.map.start.heading;
            this.visited.clear();
            this.visited.add(this.cellKey(this.state.x, this.state.y));
        }
        return true;
    }
    moveForward() {
        if (!this.activeFloor) {
            this.pushLog("Floor data is still loading.");
            this.refreshUI();
            return;
        }
        const [dx, dy] = this.state.heading === 0 ? [0, -1] :
            this.state.heading === 1 ? [1, 0] :
                this.state.heading === 2 ? [0, 1] :
                    [-1, 0];
        const nx = this.state.x + dx;
        const ny = this.state.y + dy;
        if (!this.canStandOn(nx, ny)) {
            this.state.risk = Math.min(100, this.state.risk + 4);
            this.state.pressure = Math.min(100, this.state.pressure + 3);
            this.pushLog("A wall of roots and stone blocks the corridor.");
            this.playWallBumpAnim();
            this.refreshUI();
            return;
        }
        this.state.x = nx;
        this.state.y = ny;
        this.state.steps += 1;
        this.state.supplies = Math.max(0, this.state.supplies - 1);
        this.state.risk = Math.min(100, this.state.risk + Phaser.Math.Between(7, 14));
        this.state.pressure = Math.min(100, this.state.pressure + Phaser.Math.Between(6, 11));
        this.visited.add(this.cellKey(nx, ny));
        gameStore.advanceForestObjective(1);
        // FOE pressure lane: as tension builds, pursuer closes in.
        const closeRoll = Math.random();
        if (this.state.risk >= 55 || this.state.pressure >= 48) {
            if (closeRoll < 0.72) {
                this.state.foeDistance = Math.max(0, this.state.foeDistance - 1);
            }
        }
        else if (closeRoll < 0.35) {
            this.state.foeDistance = Math.max(0, this.state.foeDistance - 1);
        }
        const discoverRoll = Math.random();
        if (discoverRoll < 0.12) {
            this.state.risk = Math.max(0, this.state.risk - 8);
            this.pushLog("You find a safer trail marker. Risk falls slightly.");
        }
        else if (discoverRoll < 0.2) {
            this.pushLog("You spot old tracks. Something stronger roams ahead.");
        }
        this.playStepAnim();
        void this.processTileTriggers();
        this.refreshUI();
    }
    canStandOn(x, y) {
        const floor = this.activeFloor;
        if (!floor) {
            return false;
        }
        if (x < 0 || y < 0 || x >= floor.map.width || y >= floor.map.height) {
            return false;
        }
        return floor.passable.has(this.cellKey(x, y));
    }
    async processTileTriggers() {
        const floor = this.activeFloor;
        if (!floor || this.locked) {
            return;
        }
        const here = this.cellKey(this.state.x, this.state.y);
        const stairDown = floor.map.stairsDown;
        const stairUp = floor.map.stairsUp;
        if (stairDown && stairDown.x === this.state.x && stairDown.y === this.state.y) {
            this.pushLog("You discover a staircase leading deeper.");
            await this.changeFloor(1);
            return;
        }
        if (stairUp && stairUp.x === this.state.x && stairUp.y === this.state.y) {
            this.pushLog("A staircase climbs toward the previous floor.");
            await this.changeFloor(-1);
            return;
        }
        const pois = floor.poiByCell.get(here) ?? [];
        for (const poi of pois) {
            if (poi.kind === "start" || poi.kind === "stairs_down" || poi.kind === "stairs_up") {
                continue;
            }
            const uniqueKey = `${this.state.floorNumber}:${poi.id}`;
            if (poi.once && this.triggeredPoi.has(uniqueKey)) {
                continue;
            }
            this.triggeredPoi.add(uniqueKey);
            if (poi.kind === "mining") {
                this.pushLog("Mining spot found: you recover rough ore fragments.");
                gameStore.setStatus("Mining node collected.");
            }
            else if (poi.kind === "treasure") {
                this.pushLog("Treasure cache opened: old explorer stock recovered.");
                gameStore.setStatus("Treasure cache secured.");
            }
            else if (poi.kind === "event") {
                this.pushLog(`Story event triggered: ${poi.eventId ?? "mysterious marker"}.`);
            }
            else if (poi.kind === "npc") {
                this.pushLog("A wandering explorer shares route notes.");
            }
            else if (poi.kind === "encounter") {
                if (!this.encountersEnabled) {
                    this.pushLog("Encounter node discovered (temporarily disabled).");
                    gameStore.setStatus("Encounter nodes are disabled for current build.");
                }
                else {
                    this.pushLog("A hostile pack rushes from the side corridor!");
                    this.triggerEncounter("Encounter node triggered.");
                }
            }
        }
    }
    async changeFloor(delta) {
        const target = this.state.floorNumber + delta;
        if (target < 1) {
            this.pushLog("No higher floor exists above this point.");
            this.refreshUI();
            return;
        }
        this.locked = true;
        const loaded = await gameStore.fetchForestFloor(target);
        if (!loaded) {
            this.locked = false;
            this.refreshUI();
            return;
        }
        if (!this.applyFloorFromStore(true)) {
            this.locked = false;
            this.pushLog("The passage collapses. The next floor cannot be traversed.");
            this.refreshUI();
            return;
        }
        this.locked = false;
        this.pushLog(`You arrive at Floor ${this.state.floorNumber}.`);
        this.refreshUI();
    }
    turn(delta) {
        this.state.heading = (((this.state.heading + delta) % 4) + 4) % 4;
        this.state.risk = Math.min(100, this.state.risk + 1);
        this.playTurnAnim(delta);
        this.refreshUI();
    }
    scoutArea() {
        if (this.state.scouts <= 0) {
            this.pushLog("No scout actions left for this sortie.");
            this.refreshUI();
            return;
        }
        this.state.scouts -= 1;
        const reduction = Phaser.Math.Between(10, 18);
        this.state.risk = Math.max(0, this.state.risk - reduction);
        this.state.pressure = Math.max(0, this.state.pressure - Phaser.Math.Between(8, 14));
        if (Math.random() < 0.42) {
            this.state.foeDistance = Math.min(8, this.state.foeDistance + 1);
        }
        this.pushLog(`You scout nearby routes. Ambush risk drops by ${reduction}.`);
        this.refreshUI();
    }
    camp() {
        if (this.state.supplies <= 0) {
            this.pushLog("No supplies left to set camp.");
            this.refreshUI();
            return;
        }
        this.state.supplies = Math.max(0, this.state.supplies - 1);
        this.state.risk = Math.max(0, this.state.risk - 14);
        this.state.pressure = Math.max(0, this.state.pressure - 18);
        this.state.foeDistance = Math.min(8, this.state.foeDistance + 1);
        this.pushLog("You establish a short camp. Breath steady, risk reduced.");
        this.refreshUI();
    }
    useThread() {
        if (this.state.threads <= 0) {
            this.pushLog("No Ariadne Thread available.");
            this.refreshUI();
            return;
        }
        this.state.threads -= 1;
        this.pushLog("The thread binds to Asteria. You withdraw safely.");
        this.refreshUI();
        this.returnCity();
    }
    returnCity() {
        if (this.locked) {
            return;
        }
        this.locked = true;
        this.scene.start(sceneNames.City);
    }
    createDungeonMenu(width, height) {
        const panelW = Phaser.Math.Clamp(width * 0.34, 420, 560);
        const panelH = Phaser.Math.Clamp(height * 0.62, 420, 620);
        const panelX = width / 2 - panelW / 2;
        const panelY = height / 2 - panelH / 2 + 10;
        const backdrop = this.add.graphics();
        backdrop.fillStyle(0x000000, 0.55);
        backdrop.fillRect(0, 0, width, height);
        const panel = drawOrnatePanel(this, panelX, panelY, panelW, panelH, 0.96, 0x071326);
        const title = this.add.text(panelX + 18, panelY + 14, "Dungeon Menu", {
            fontFamily: "Georgia",
            fontSize: "30px",
            color: "#f4b942"
        });
        const div = this.add.graphics();
        div.lineStyle(1, 0xf4b942, 0.45);
        div.lineBetween(panelX + 14, panelY + 50, panelX + panelW - 14, panelY + 50);
        const entries = [
            { label: "Items", action: () => gameStore.setStatus("Items menu is not implemented yet.") },
            { label: "Equipment", action: () => gameStore.setStatus("Equipment menu is not implemented yet.") },
            { label: "Skills", action: () => gameStore.setStatus("Skills menu is not implemented yet.") },
            { label: "Party / Formation", action: () => gameStore.setStatus("Party menu is not implemented yet.") },
            {
                label: "Descend Stairs",
                action: () => {
                    const floor = this.activeFloor;
                    if (!floor?.map.stairsDown || floor.map.stairsDown.x !== this.state.x || floor.map.stairsDown.y !== this.state.y) {
                        gameStore.setStatus("You must stand on a down staircase tile.");
                        return;
                    }
                    void this.changeFloor(1);
                }
            },
            {
                label: "Ascend Stairs",
                action: () => {
                    const floor = this.activeFloor;
                    if (!floor?.map.stairsUp || floor.map.stairsUp.x !== this.state.x || floor.map.stairsUp.y !== this.state.y) {
                        gameStore.setStatus("You must stand on an up staircase tile.");
                        return;
                    }
                    void this.changeFloor(-1);
                }
            },
            { label: "Map Notes", action: () => gameStore.setStatus("Map notes are planned for next phase.") },
            { label: "Options", action: () => gameStore.setStatus("Options menu placeholder.") },
            { label: "Use Ariadne Thread", action: () => this.useThread() },
            { label: "Return To City", action: () => this.returnCity() },
            { label: "Close Menu", action: () => this.toggleMenu(false) }
        ];
        const rowX = panelX + 12;
        const rowW = panelW - 24;
        const rowH = 36;
        const rowGap = 4;
        const startY = panelY + 60;
        this.menuRows = [];
        entries.forEach((entry, i) => {
            const y = startY + i * (rowH + rowGap);
            const bg = this.add.graphics();
            const label = this.add.text(rowX + 14, y + rowH / 2, entry.label, {
                fontFamily: "Trebuchet MS",
                fontSize: "17px",
                color: "#f7f2e8"
            }).setOrigin(0, 0.5);
            const zone = this.add.zone(rowX, y, rowW, rowH).setOrigin(0).setInteractive({ useHandCursor: true });
            zone.on("pointerover", () => {
                this.menuSelectedIndex = i;
                this.refreshMenuSelection();
            });
            zone.on("pointerdown", () => {
                this.menuSelectedIndex = i;
                this.refreshMenuSelection();
                entry.action();
            });
            this.menuRows.push({ bg, label, zone, execute: entry.action });
        });
        this.menuContainer = this.add.container(0, 0, [backdrop, panel, title, div]);
        this.menuContainer.setDepth(30);
        this.menuRows.forEach((row) => {
            row.bg.setDepth(31);
            row.label.setDepth(32);
            row.zone.setDepth(33);
        });
        this.toggleMenu(false);
        this.refreshMenuSelection();
    }
    refreshMenuSelection() {
        this.menuRows.forEach((row, i) => {
            const selected = i === this.menuSelectedIndex;
            row.bg.clear();
            row.bg.fillStyle(selected ? 0x2f4e7c : 0x12233a, selected ? 0.95 : 0.7);
            row.bg.lineStyle(selected ? 2 : 1, selected ? 0xf4b942 : 0x4d6486, selected ? 1 : 0.7);
            const x = row.zone.x;
            const y = row.zone.y;
            const w = row.zone.width;
            const h = row.zone.height;
            row.bg.fillRoundedRect(x, y, w, h, 8);
            row.bg.strokeRoundedRect(x, y, w, h, 8);
            row.label.setColor(selected ? "#fff4d2" : "#f7f2e8");
        });
    }
    toggleMenu(force) {
        const next = typeof force === "boolean" ? force : !this.menuOpen;
        this.menuOpen = next;
        const visible = this.menuOpen;
        this.menuContainer?.setVisible(visible);
        this.menuRows.forEach((row) => {
            row.bg.setVisible(visible);
            row.label.setVisible(visible);
            row.zone.setVisible(visible);
            if (visible) {
                row.zone.setInteractive({ useHandCursor: true });
            }
            else {
                row.zone.disableInteractive();
            }
        });
        if (visible) {
            this.menuSelectedIndex = 0;
            this.refreshMenuSelection();
        }
    }
    checkEncounter() {
        if (!this.encountersEnabled) {
            return;
        }
        if (this.state.foeDistance <= 0) {
            this.triggerEncounter("FOE closes in from behind! Forced battle!");
            return;
        }
        const pressure = this.state.risk + this.state.steps * 2;
        const triggerChance = Phaser.Math.Clamp((pressure - 26) / 100, 0, 0.65);
        if (Math.random() >= triggerChance) {
            return;
        }
        this.triggerEncounter("Enemy contact! Formation now!");
    }
    triggerEncounter(logLine) {
        if (this.locked) {
            return;
        }
        this.locked = true;
        this.pushLog(logLine);
        gameStore.setStatus("Encounter triggered at Forest Entrance.");
        this.refreshUI();
        this.time.delayedCall(260, () => gameStore.startSoloRun("normal"));
    }
    pushLog(line) {
        this.logLines.push(line);
        if (this.logLines.length > 16) {
            this.logLines = this.logLines.slice(-16);
        }
    }
    refreshUI() {
        const metrics = this.layoutMetrics;
        if (!metrics) {
            return;
        }
        const { boardY, centerX, centerW, boardH, rightX, rightW } = metrics;
        if (this.viewGraphics) {
            const g = this.viewGraphics;
            g.clear();
            const vb = this.viewBounds;
            if (vb) {
                const { vx, vy, vw, vh } = vb;
                // Update corridor sprites for current heading + POIs
                this.refreshCorridorView();
                // Risk tint: colour-coded overlay over the corridor view
                if (this.corrSprites) {
                    const tintAlpha = this.state.risk >= 70 ? 0.22 : this.state.risk >= 40 ? 0.14 : 0.05;
                    const tintColor = this.state.risk >= 70 ? 0x8f1f1f : this.state.risk >= 40 ? 0x8d5f24 : 0x1a3322;
                    this.corrSprites.riskTint.clear();
                    this.corrSprites.riskTint.fillStyle(tintColor, tintAlpha);
                    this.corrSprites.riskTint.fillRoundedRect(vx, vy, vw, vh, 10);
                }
                if (this.headingText) {
                    this.headingText.setPosition(vx + 14, vy + 12);
                    this.headingText.setText(`Heading ${this.headingLabel(this.state.heading)}`);
                }
                if (this.depthText) {
                    this.depthText.setPosition(vx + 14, vy + 30);
                    this.depthText.setText(`Depth Step ${this.state.steps}`);
                }
                // Fog-of-war minimap
                const floorW = this.activeFloor?.map.width ?? 7;
                const floorH = this.activeFloor?.map.height ?? 7;
                const miniCell = Math.max(4, Math.floor(160 / Math.max(floorW, floorH)));
                const miniW = miniCell * floorW;
                const miniH = miniCell * floorH;
                const mx = vx + vw - miniW - 18;
                const my = vy + 12;
                g.fillStyle(0x07101d, 0.9);
                g.fillRoundedRect(mx - 8, my - 8, miniW + 16, miniH + 16, 8);
                for (let cy = 0; cy < floorH; cy += 1) {
                    for (let cx = 0; cx < floorW; cx += 1) {
                        const key = this.cellKey(cx, cy);
                        const isVisited = this.visited.has(key);
                        const isCurrent = cx === this.state.x && cy === this.state.y;
                        const isKnown = isVisited || isCurrent;
                        g.fillStyle(isCurrent ? 0xf4b942 : isKnown ? 0x2f4f78 : 0x0b1524, 0.95);
                        g.fillRect(mx + cx * miniCell, my + cy * miniCell, Math.max(1, miniCell - 1), Math.max(1, miniCell - 1));
                    }
                }
            }
        }
        if (this.infoText) {
            this.infoText.setVisible(this.showStatusOverlay);
            if (this.showStatusOverlay) {
                const objective = gameStore.state.forestObjective;
                const objectiveLine = objective
                    ? `${objective.title}: ${objective.progressSteps}/${objective.targetSteps}${objective.completed ? " ✓" : ""}`
                    : "No tracked main objective";
                this.infoText.setPosition(centerX + 18, boardY + boardH - 126);
                const storyProgress = gameStore.state.forestMeta?.storyProgress ?? {};
                const unlockedFloor = Number(storyProgress.unlockedFloor ?? 1);
                this.infoText.setText([
                    `Floor: ${this.state.floorNumber}   Coords: [${this.state.x}, ${this.state.y}]   Heading: ${this.headingLabel(this.state.heading)}`,
                    `Steps: ${this.state.steps}   Supplies: ${this.state.supplies}`,
                    `Risk: ${this.state.risk}%   Pressure: ${this.state.pressure}%`,
                    `Scouts: ${this.state.scouts}   Thread: ${this.state.threads}   FOE: ${this.state.foeDistance}`,
                    `Story Gate: unlocked to floor ${unlockedFloor}`,
                    "",
                    objectiveLine,
                    this.locked ? "Encounter in progress..." : "Push forward or stabilize before contact."
                ]);
            }
        }
        if (this.logText) {
            this.logText.setText([
                "Expedition Log",
                "",
                ...this.logLines.slice(-14)
            ]);
        }
        // Keep right panel text anchored in a fixed-height viewport with auto-scroll.
        if (this.logText && this.logViewport) {
            const view = this.logViewport;
            this.logText.setPosition(view.x, view.y);
            this.logText.setWordWrapWidth(view.w - 10);
            const textHeight = this.logText.height;
            const overflow = Math.max(0, textHeight - view.h);
            this.logText.setY(view.y - overflow);
            if (this.logScrollbarGraphics) {
                this.logScrollbarGraphics.clear();
                this.logScrollbarGraphics.fillStyle(0x0f2139, 0.9);
                this.logScrollbarGraphics.fillRoundedRect(view.x + view.w + 4, view.y, 6, view.h, 4);
                const ratio = textHeight <= 0 ? 1 : Phaser.Math.Clamp(view.h / textHeight, 0.08, 1);
                const thumbH = Math.max(18, view.h * ratio);
                const scrollT = overflow <= 0 ? 0 : 1;
                const thumbY = view.y + (view.h - thumbH) * scrollT;
                this.logScrollbarGraphics.fillStyle(0xf4b942, 0.9);
                this.logScrollbarGraphics.fillRoundedRect(view.x + view.w + 4, thumbY, 6, thumbH, 4);
            }
        }
    }
}
function normalizeCoord(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const x = Number(value.x);
    const y = Number(value.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
    }
    return { x: Math.floor(x), y: Math.floor(y) };
}
function waitMs(delay) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, delay)));
}
