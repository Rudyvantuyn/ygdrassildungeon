import Phaser from "phaser";
import { restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
import { buildServiceSceneShell } from "./serviceSceneShell.js";

export class LobbyScene extends Phaser.Scene {
  private contentText?: Phaser.GameObjects.Text;

  constructor() {
    super(sceneNames.Lobby);
  }

  create(): void {
    restartOnResize(this);
    const width = sceneWidth(this);
    const height = sceneHeight(this);

    this.add.image(width / 2, height / 2, "bg_service_placeholder").setDisplaySize(width, height);
    const shell = buildServiceSceneShell(this, {
      title: "Guild Hall",
      width,
      height,
      panelWidthRatio: 0.9,
      panelMin: 980,
      panelMax: 1400,
      panelHeightRatio: 0.8,
      panelHMin: 520,
      panelHMax: 820,
      placeholderKey: "ph_lobby_banner",
      npcTitle: "Guild Bulletin",
      menuTitle: "Mission Desk",
      dialogueLines: [
        "Side contracts are posted here.",
        "Daily requests refresh each cycle."
      ],
      commands: [
        {
          label: "Refresh Contracts",
          onClick: () => {
            void gameStore.fetchMissions();
            this.refresh();
          }
        },
        {
          label: "Claim First Reward",
          onClick: () => {
            const templates = (gameStore.state.missionMeta?.templates as Array<Record<string, unknown>> | undefined) ?? [];
            const progress = (gameStore.state.missionMeta?.progress as Array<Record<string, unknown>> | undefined) ?? [];
            const sideMissionIds = new Set(
              templates
                .filter((template) => (typeof template.track === "string" ? template.track : "") === "side")
                .map((template) => (typeof template.id === "string" ? template.id : ""))
                .filter((id) => id.length > 0)
            );
            const claimable = progress.find(
              (entry) =>
                Boolean(entry.completed) &&
                !Boolean(entry.claimed) &&
                sideMissionIds.has(typeof entry.missionId === "string" ? entry.missionId : "")
            );
            const missionId = typeof claimable?.missionId === "string" ? claimable.missionId : null;
            if (!missionId) {
              gameStore.setStatus("No claimable side/daily reward available.");
              return;
            }
            void gameStore.claimMissionReward(missionId).then(() => this.refresh());
          }
        }
      ],
      backSceneKey: sceneNames.City
    });

    this.contentText = this.add.text(shell.contentX, shell.contentY, "Loading side and daily contracts...", {
      fontFamily: "Trebuchet MS",
      fontSize: "17px",
      color: "#f7f2e8",
      lineSpacing: 8,
      wordWrap: { width: shell.contentWidth }
    });

    const unsubscribe = gameStore.subscribe(() => this.refresh());
    this.events.once("shutdown", unsubscribe);
    void gameStore.fetchMissions();
    void gameStore.fetchProfileMeta();
    this.refresh();
  }

  private refresh(): void {
    if (!this.contentText) {
      return;
    }

    const profile = (gameStore.state.profileMeta?.profile as Record<string, unknown> | undefined) ?? {};
    const currency = Number(profile.currency ?? 0);
    const skillPoints = Number(profile.skillPoints ?? 0);

    const lines: string[] = [
      `Guild Member: ${gameStore.state.displayName}`,
      `Wallet: ${currency}g`,
      `Skill Points: ${skillPoints}`,
      "",
      "Guild Hall scope:",
      "• Side missions",
      "• Daily missions",
      "• Reward claim desk",
      ""
    ];

    const meta = gameStore.state.missionMeta ?? {};
    const templates = (meta.templates as Array<Record<string, unknown>> | undefined) ?? [];
    const progress = (meta.progress as Array<Record<string, unknown>> | undefined) ?? [];
    const missionRows = templates
      .filter((template) => (typeof template.track === "string" ? template.track : "") === "side")
      .slice(0, 8)
      .map((template) => {
        const id = typeof template.id === "string" ? template.id : "-";
        const title = typeof template.title === "string" ? template.title : id;
        const p = progress.find((entry) => (typeof entry.missionId === "string" ? entry.missionId : "") === id);
        const amount = Number(p?.progress ?? 0);
        const target = Number(p?.target ?? 0);
        const completed = Boolean(p?.completed);
        const claimed = Boolean(p?.claimed);
        return `${claimed ? "✓" : completed ? "!" : "•"} ${title} (${amount}/${target})`;
      });

    lines.push("Side + Daily Contracts", ...(missionRows.length > 0 ? missionRows : ["• No contracts available yet."]));

    lines.push("", `Status: ${gameStore.state.lastStatus || "-"}`);
    this.contentText.setText(lines);
  }
}
