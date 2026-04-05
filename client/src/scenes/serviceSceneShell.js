import Phaser from "phaser";
import { createTitle, drawOrnatePanel } from "../theme/components.js";
import { layout } from "../theme/layout.js";
import { fadeInScene, startSceneWithFade } from "./sceneFlow.js";
export function buildServiceSceneShell(scene, options) {
    const { title, width, height, panelWidthRatio, panelMin, panelMax, panelHeightRatio, panelHMin, panelHMax, commands, onBack, backSceneKey, backLabel = "Back To City", placeholderKey, commandHint = "Arrows to navigate, Enter to confirm", menuTitle = "Service Menu", npcTitle = "Attendant", dialogueLines = ["Welcome, traveler.", "Choose a service from the menu."] } = options;
    fadeInScene(scene);
    const sceneTitle = createTitle(scene, title);
    sceneTitle.setPosition(width / 2 - sceneTitle.width / 2, layout.titleY);
    const panelW = Phaser.Math.Clamp(width * panelWidthRatio, panelMin, panelMax);
    const panelH = Phaser.Math.Clamp(height * panelHeightRatio, panelHMin, panelHMax);
    const panelX = width / 2 - panelW / 2;
    const panelY = Phaser.Math.Clamp(height / 2 - panelH / 2 - 8, 84, height - panelH - 28);
    drawOrnatePanel(scene, panelX, panelY, panelW, panelH, 0.92);
    const gap = 16;
    const leftW = Phaser.Math.Clamp(panelW * 0.34, 280, 430);
    const rightW = panelW - leftW - gap;
    const leftX = panelX;
    const rightX = leftX + leftW + gap;
    drawOrnatePanel(scene, leftX, panelY, leftW, panelH, 0.9, 0x091327);
    drawOrnatePanel(scene, rightX, panelY, rightW, panelH, 0.9);
    scene.add.text(leftX + leftW / 2, panelY + 16, npcTitle, {
        fontFamily: "Georgia",
        fontSize: "28px",
        color: "#f4b942"
    }).setOrigin(0.5, 0);
    const leftDivider = scene.add.graphics();
    leftDivider.lineStyle(1, 0xf4b942, 0.45);
    leftDivider.lineBetween(leftX + 14, panelY + 52, leftX + leftW - 14, panelY + 52);
    const artX = leftX + 12;
    const artY = panelY + 60;
    const artW = leftW - 24;
    const artH = panelH * 0.62;
    drawOrnatePanel(scene, artX, artY, artW, artH, 0.78, 0x0a1224);
    if (placeholderKey) {
        scene.add.image(artX + artW / 2, artY + artH / 2, placeholderKey).setDisplaySize(artW - 12, artH - 12);
    }
    const dialogueY = artY + artH + 10;
    const dialogueH = panelY + panelH - dialogueY - 12;
    drawOrnatePanel(scene, leftX + 12, dialogueY, leftW - 24, dialogueH, 0.78, 0x0a1224);
    scene.add.text(leftX + 20, dialogueY + 12, dialogueLines.join("\n"), {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        color: "#f7f2e8",
        lineSpacing: 7,
        wordWrap: { width: leftW - 40 }
    });
    scene.add.text(rightX + 20, panelY + 18, menuTitle, {
        fontFamily: "Georgia",
        fontSize: "28px",
        color: "#f4b942"
    });
    const rightDivider = scene.add.graphics();
    rightDivider.lineStyle(1, 0xf4b942, 0.45);
    rightDivider.lineBetween(rightX + 16, panelY + 52, rightX + rightW - 16, panelY + 52);
    const commandW = Phaser.Math.Clamp(rightW * (options.commandWidthRatio ?? 0.34), 200, 300);
    const cmdX = rightX + 14;
    const cmdBtnW = commandW - 10;
    const reservedBottom = 102;
    const commandCount = Math.max(commands.length, 1);
    const availableForCommands = Math.max(180, panelH - 66 - reservedBottom);
    const cmdStep = Phaser.Math.Clamp(Math.floor(availableForCommands / commandCount), 48, 58);
    const cmdBtnH = Phaser.Math.Clamp(cmdStep - 6, 40, 52);
    const cmdGap = cmdStep - cmdBtnH;
    const cmdStartY = panelY + 62;
    const commandRows = [];
    let selectedIndex = 0;
    drawOrnatePanel(scene, rightX + 12, panelY + 58, commandW, panelH - 70, 0.76, 0x0a1224);
    const registerRow = (labelText, x, y, w, h, execute) => {
        const frame = scene.add.graphics();
        const label = scene.add.text(x + 14, y + h / 2, labelText, {
            fontFamily: "Trebuchet MS",
            fontSize: "18px",
            color: "#f7f2e8"
        }).setOrigin(0, 0.5);
        const rowIndex = commandRows.length;
        const zone = scene.add
            .zone(x, y, w, h)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => {
            selectedIndex = rowIndex;
            refreshSelection();
        })
            .on("pointerdown", () => {
            selectedIndex = rowIndex;
            refreshSelection();
            execute();
        });
        scene.events.once("shutdown", () => zone.removeAllListeners());
        commandRows.push({ frame, label, x, y, w, h, execute });
    };
    commands.forEach((cmd, index) => {
        registerRow(cmd.label, cmdX, cmdStartY + index * (cmdBtnH + cmdGap), cmdBtnW, cmdBtnH, cmd.onClick);
    });
    const backY = panelY + panelH - 54;
    if (onBack || backSceneKey) {
        registerRow(backLabel, cmdX, backY, cmdBtnW, 44, () => {
            if (onBack) {
                onBack();
                return;
            }
            if (backSceneKey) {
                startSceneWithFade(scene, backSceneKey);
            }
        });
    }
    const drawRow = (entry, selected) => {
        entry.frame.clear();
        entry.frame.fillStyle(selected ? 0x2f4e7c : 0x162844, selected ? 0.95 : 0.7);
        entry.frame.lineStyle(selected ? 2 : 1, selected ? 0xf4b942 : 0x5f7394, selected ? 1 : 0.75);
        entry.frame.fillRoundedRect(entry.x, entry.y, entry.w, entry.h, 10);
        entry.frame.strokeRoundedRect(entry.x, entry.y, entry.w, entry.h, 10);
        entry.label.setColor(selected ? "#fff4d2" : "#f7f2e8");
    };
    const refreshSelection = () => {
        commandRows.forEach((entry, index) => drawRow(entry, index === selectedIndex));
        if (hintText) {
            const selected = commandRows[selectedIndex];
            const selectedLabel = selected?.label.text ?? "-";
            hintText.setText(`${commandHint}  |  Selected: ${selectedLabel}`);
        }
    };
    const hintText = scene.add.text(cmdX + 2, panelY + panelH - 84, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#8ea7c8",
        wordWrap: { width: commandW - 18 }
    });
    refreshSelection();
    const onKeyDown = (event) => {
        if (commandRows.length === 0) {
            return;
        }
        if (event.key === "ArrowUp") {
            selectedIndex = (selectedIndex - 1 + commandRows.length) % commandRows.length;
            refreshSelection();
            return;
        }
        if (event.key === "ArrowDown") {
            selectedIndex = (selectedIndex + 1) % commandRows.length;
            refreshSelection();
            return;
        }
        if (event.key === "Enter") {
            commandRows[selectedIndex]?.execute();
            return;
        }
        if (event.key === "Escape" && commandRows.length > 0) {
            commandRows[commandRows.length - 1]?.execute();
            return;
        }
        if (/^[1-9]$/.test(event.key)) {
            const num = Number(event.key) - 1;
            if (num >= 0 && num < commandRows.length) {
                selectedIndex = num;
                refreshSelection();
                commandRows[num]?.execute();
            }
        }
    };
    scene.input.keyboard?.on("keydown", onKeyDown);
    scene.events.once("shutdown", () => scene.input.keyboard?.off("keydown", onKeyDown));
    const contentX = rightX + commandW + 34;
    const contentY = panelY + 68;
    const contentWidth = rightW - commandW - 54;
    drawOrnatePanel(scene, contentX - 12, contentY - 10, contentWidth + 24, panelH - 94, 0.76, 0x0a1224);
    return {
        panelX,
        panelY,
        panelW,
        panelH,
        rightX,
        rightW,
        contentX,
        contentY,
        contentWidth
    };
}
