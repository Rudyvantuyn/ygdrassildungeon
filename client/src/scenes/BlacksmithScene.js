import Phaser from "phaser";
import { restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
import { buildServiceSceneShell } from "./serviceSceneShell.js";
export class BlacksmithScene extends Phaser.Scene {
    content;
    constructor() {
        super(sceneNames.Blacksmith);
    }
    create() {
        restartOnResize(this);
        const width = sceneWidth(this);
        const height = sceneHeight(this);
        this.add.image(width / 2, height / 2, "bg_service_placeholder").setDisplaySize(width, height);
        const shell = buildServiceSceneShell(this, {
            title: "Blacksmith",
            width,
            height,
            panelWidthRatio: 0.72,
            panelMin: 650,
            panelMax: 1080,
            panelHeightRatio: 0.72,
            panelHMin: 420,
            panelHMax: 640,
            placeholderKey: "ph_blacksmith_npc",
            commands: [
                { label: "Refresh Forge", onClick: () => void gameStore.fetchBlacksmith() },
                { label: "Upgrade First", onClick: () => void this.applyOnFirst("upgrade") },
                { label: "Salvage First", onClick: () => void this.applyOnFirst("salvage") },
                { label: "Reroll First", onClick: () => void this.applyOnFirst("reroll") }
            ],
            backSceneKey: sceneNames.City
        });
        this.content = this.add.text(shell.contentX, shell.contentY, "Loading forge...", {
            fontFamily: "Trebuchet MS",
            fontSize: "17px",
            color: "#f7f2e8",
            wordWrap: { width: shell.contentWidth },
            lineSpacing: 8
        });
        const unsubscribe = gameStore.subscribe(() => this.render());
        this.events.once("shutdown", unsubscribe);
        void gameStore.fetchBlacksmith();
        void gameStore.fetchProfileMeta();
        this.render();
    }
    async applyOnFirst(action) {
        const items = gameStore.state.blacksmithMeta?.items ?? [];
        const firstItem = items[0];
        const itemInstanceId = typeof firstItem?.instanceId === "string" ? firstItem.instanceId : null;
        if (!itemInstanceId) {
            gameStore.setStatus("No forge items found. Buy loot first.");
            return;
        }
        if (action === "upgrade") {
            await gameStore.blacksmithUpgrade(itemInstanceId);
        }
        else if (action === "salvage") {
            await gameStore.blacksmithSalvage(itemInstanceId);
        }
        else {
            await gameStore.blacksmithReroll(itemInstanceId);
        }
        this.render();
    }
    render() {
        if (!this.content) {
            return;
        }
        const profile = gameStore.state.profileMeta?.profile ?? {};
        const items = gameStore.state.blacksmithMeta?.items ?? [];
        const lines = items.map((item) => {
            const id = typeof item.instanceId === "string" ? item.instanceId : "-";
            const def = typeof item.definitionId === "string" ? item.definitionId : "-";
            const level = Number(item.level ?? 1);
            return `• ${def}  [${id}]  lv.${level}`;
        });
        const itemLines = lines.length > 0 ? lines : ["• No forged items in inventory yet."];
        this.content.setText([
            `Currency: ${Number(profile.currency ?? 0)}g`,
            "",
            "Forge Inventory",
            ...itemLines
        ]);
    }
}
