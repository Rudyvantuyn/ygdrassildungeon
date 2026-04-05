import Phaser from "phaser";
import { restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
import { buildServiceSceneShell } from "./serviceSceneShell.js";

export class MissionBoardScene extends Phaser.Scene {
  private content?: Phaser.GameObjects.Text;

  constructor() {
    super(sceneNames.MissionBoard);
  }

  create(): void {
    restartOnResize(this);
    const width = sceneWidth(this);
    const height = sceneHeight(this);
    this.add.image(width / 2, height / 2, "bg_service_placeholder").setDisplaySize(width, height);
    const shell = buildServiceSceneShell(this, {
      title: "Explorers Guild",
      width,
      height,
      panelWidthRatio: 0.76,
      panelMin: 700,
      panelMax: 1180,
      panelHeightRatio: 0.74,
      panelHMin: 430,
      panelHMax: 680,
      placeholderKey: "ph_mission_npc",
      npcTitle: "Story Registrar",
      menuTitle: "Guild Orders",
      dialogueLines: [
        "Main expedition records are filed here.",
        "Follow the story route to descend deeper."
      ],
      commands: [
        {
          label: "Refresh Story Board",
          onClick: () => {
            void gameStore.fetchMissions();
            this.render();
          }
        },
        {
          label: "Track Main Quest",
          onClick: () => {
            gameStore.setForestObjective("Reach step 8 in Forest Entrance", 8);
            gameStore.setStatus("Main quest tracked. Proceed to Forest Entrance.");
            this.render();
          }
        }
      ],
      backSceneKey: sceneNames.City
    });

    this.content = this.add.text(shell.contentX, shell.contentY, "Loading story missions...", {
      fontFamily: "Trebuchet MS",
      fontSize: "17px",
      color: "#f7f2e8",
      wordWrap: { width: shell.contentWidth },
      lineSpacing: 8
    });

    const unsubscribe = gameStore.subscribe(() => this.render());
    this.events.once("shutdown", unsubscribe);
    void gameStore.fetchMissions().then(() => this.render());
    void gameStore.fetchProfileMeta();
    this.render();
  }

  private render(): void {
    if (!this.content) {
      return;
    }
    const meta = gameStore.state.missionMeta ?? {};
    const templates = (meta.templates as Array<Record<string, unknown>> | undefined) ?? [];
    const progress = (meta.progress as Array<Record<string, unknown>> | undefined) ?? [];
    const mainTemplates = templates.filter((template) => (typeof template.track === "string" ? template.track : "") === "main");
    const rows = mainTemplates.map((template) => {
      const id = typeof template.id === "string" ? template.id : "-";
      const title = typeof template.title === "string" ? template.title : id;
      const gate = template.progressionGate;
      const unlocksFloor =
        gate && typeof gate === "object" && typeof (gate as Record<string, unknown>).unlocksFloor === "number"
          ? Number((gate as Record<string, unknown>).unlocksFloor)
          : null;
      const p = progress.find((entry) => (typeof entry.missionId === "string" ? entry.missionId : "") === id);
      const amount = Number(p?.progress ?? 0);
      const target = Number(p?.target ?? 0);
      const completed = Boolean(p?.completed);
      const claimed = Boolean(p?.claimed);
      const gateText = unlocksFloor ? ` -> unlock F${unlocksFloor}` : "";
      return `${claimed ? "✓" : completed ? "!" : "•"} ${title}  (${amount}/${target})${gateText}`;
    });
    const storyRows = rows.length > 0
      ? rows.slice(0, 6)
      : [
          "• Chapter I: A Whisper Beneath Asteria (0/1)",
          "• Chapter II: Roots in the Fogwood (0/1)",
          "• Chapter III: Broken Sigils of the Deep (0/1)"
        ];

    const currency = Number((gameStore.state.profileMeta?.profile as Record<string, unknown> | undefined)?.currency ?? 0);
    const storyProgress = (meta.storyProgress as Record<string, unknown> | undefined) ?? {};
    const unlockedFloor = Number(storyProgress.unlockedFloor ?? 1);
    const contentPlan = (meta.contentPlan as Array<Record<string, unknown>> | undefined) ?? [];
    const plannedSeasons = contentPlan
      .filter((row) => (typeof row.releaseState === "string" ? row.releaseState : "") === "planned")
      .map((row) => `- ${typeof row.seasonName === "string" ? row.seasonName : "Unknown season"} (full release)`);
    this.content.setText([
      `Currency: ${currency}g`,
      "",
      "Main Story Missions",
      ...storyRows,
      "",
      `Story Gate: Highest unlocked floor is F${unlockedFloor}`,
      "",
      gameStore.state.forestObjective
        ? `Tracked Objective: ${gameStore.state.forestObjective.title} (${gameStore.state.forestObjective.progressSteps}/${gameStore.state.forestObjective.targetSteps})`
        : "Tracked Objective: none",
      "",
      "Upcoming season packs:",
      ...(plannedSeasons.length > 0 ? plannedSeasons : ["- none"]),
      "",
      "Tip: follow story progress from here; side/daily contracts are in Guild Hall."
    ]);
  }
}
