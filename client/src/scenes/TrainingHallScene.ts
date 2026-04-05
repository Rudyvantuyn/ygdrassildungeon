import Phaser from "phaser";
import { restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
import { buildServiceSceneShell } from "./serviceSceneShell.js";

export class TrainingHallScene extends Phaser.Scene {
  private content?: Phaser.GameObjects.Text;

  constructor() {
    super(sceneNames.TrainingHall);
  }

  create(): void {
    restartOnResize(this);
    const width = sceneWidth(this);
    const height = sceneHeight(this);
    this.add.image(width / 2, height / 2, "bg_service_placeholder").setDisplaySize(width, height);
    const shell = buildServiceSceneShell(this, {
      title: "Training Hall",
      width,
      height,
      panelWidthRatio: 0.72,
      panelMin: 650,
      panelMax: 1080,
      panelHeightRatio: 0.72,
      panelHMin: 420,
      panelHMax: 640,
      placeholderKey: "ph_training_npc",
      commands: [
        {
          label: "Refresh Tree",
          onClick: () => {
            void gameStore.fetchTraining(gameStore.state.selectedClass);
            void gameStore.fetchProfileMeta();
          }
        },
        {
          label: "Unlock First",
          onClick: () => {
            const nodes = (gameStore.state.trainingMeta?.nodes as Array<Record<string, unknown>> | undefined) ?? [];
            const firstNodeId = typeof nodes[0]?.id === "string" ? nodes[0].id : null;
            if (firstNodeId) {
              void gameStore.unlockTrainingNode(gameStore.state.selectedClass, firstNodeId);
            } else {
              gameStore.setStatus("No unlockable nodes available yet.");
            }
          }
        }
      ],
      backSceneKey: sceneNames.City
    });

    this.content = this.add.text(shell.contentX, shell.contentY, "Loading skill tree...", {
      fontFamily: "Trebuchet MS",
      fontSize: "17px",
      color: "#f7f2e8",
      wordWrap: { width: shell.contentWidth },
      lineSpacing: 8
    });

    const unsubscribe = gameStore.subscribe(() => this.render());
    this.events.once("shutdown", unsubscribe);
    void gameStore.fetchTraining(gameStore.state.selectedClass);
    void gameStore.fetchProfileMeta();
    this.render();
  }

  private render(): void {
    if (!this.content) {
      return;
    }
    const profile = (gameStore.state.profileMeta?.profile as Record<string, unknown> | undefined) ?? {};
    const nodes = (gameStore.state.trainingMeta?.nodes as Array<Record<string, unknown>> | undefined) ?? [];
    const tree = (gameStore.state.trainingMeta?.tree as Record<string, unknown> | undefined) ?? {};
    const unlocked = ((tree.unlockedNodeIds as string[] | undefined) ?? []).map(String);
    const lines = nodes.map((node) => {
      const id = typeof node.id === "string" ? node.id : "-";
      const cost = Number(node.cost ?? 0);
      const unlockedMark = unlocked.includes(id) ? "✓" : "•";
      return `${unlockedMark} ${typeof node.name === "string" ? node.name : id} (cost ${cost})`;
    });
    const nodeLines = lines.length > 0 ? lines : ["• No skill nodes available for this class yet."];
    this.content.setText([
      `Class: ${gameStore.state.selectedClass}`,
      `Skill points: ${Number(profile.skillPoints ?? 0)}`,
      "",
      "Skill Nodes",
      ...nodeLines
    ]);
  }
}
