import Phaser from "phaser";
import { restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
import { buildServiceSceneShell } from "./serviceSceneShell.js";

export class SeasonScene extends Phaser.Scene {
  private content?: Phaser.GameObjects.Text;

  constructor() {
    super(sceneNames.Season);
  }

  create(): void {
    restartOnResize(this);
    const width = sceneWidth(this);
    const height = sceneHeight(this);
    this.add.image(width / 2, height / 2, "bg_service_placeholder").setDisplaySize(width, height);
    const shell = buildServiceSceneShell(this, {
      title: "Season & Guild Board",
      width,
      height,
      panelWidthRatio: 0.76,
      panelMin: 700,
      panelMax: 1180,
      panelHeightRatio: 0.74,
      panelHMin: 430,
      panelHMax: 680,
      placeholderKey: "ph_season_npc",
      commands: [
        { label: "Refresh Board", onClick: () => void gameStore.fetchLiveops() },
        {
          label: "Create Guild",
          onClick: () => {
            const name = `Guild${Math.floor(Math.random() * 100)}`;
            void gameStore.createGuild(name);
          }
        },
        {
          label: "Join First Guild",
          onClick: () => {
            const guilds = (gameStore.state.liveopsMeta?.guilds as Array<Record<string, unknown>> | undefined) ?? [];
            const guildId = typeof guilds[0]?.guildId === "string" ? guilds[0].guildId : null;
            if (guildId) {
              void gameStore.joinGuild(guildId);
            } else {
              gameStore.setStatus("No guilds available to join yet.");
            }
          }
        }
      ],
      backSceneKey: sceneNames.City
    });

    this.content = this.add.text(shell.contentX, shell.contentY, "Loading season data...", {
      fontFamily: "Trebuchet MS",
      fontSize: "17px",
      color: "#f7f2e8",
      wordWrap: { width: shell.contentWidth },
      lineSpacing: 7
    });

    const unsubscribe = gameStore.subscribe(() => this.render());
    this.events.once("shutdown", unsubscribe);
    void gameStore.fetchLiveops();
    this.render();
  }

  private render(): void {
    if (!this.content) {
      return;
    }
    const meta = gameStore.state.liveopsMeta ?? {};
    const season = (meta.season as Record<string, unknown> | undefined) ?? {};
    const guilds = (meta.guilds as Array<Record<string, unknown>> | undefined) ?? [];
    const leaderboard = (meta.leaderboard as Array<Record<string, unknown>> | undefined) ?? [];
    const guildLines = guilds
      .slice(0, 5)
      .map((guild) => `• ${typeof guild.guildName === "string" ? guild.guildName : "-"} (${(guild.memberIds as unknown[] | undefined)?.length ?? 0} members)`);
    const boardLines = leaderboard
      .slice(0, 5)
      .map((row) => `• ${typeof row.playerId === "string" ? row.playerId : "-"} : ${Number(row.score ?? 0)}`);
    const visibleGuilds = guildLines.length > 0 ? guildLines : ["• No guilds listed yet."];
    const visibleBoard = boardLines.length > 0 ? boardLines : ["• Leaderboard data is not available yet."];
    const seasonName = typeof season.seasonName === "string" ? season.seasonName : "-";

    this.content.setText([
      `Season: ${seasonName}`,
      `Level: ${Number(season.level ?? 1)}  XP: ${Number(season.xp ?? 0)}`,
      "",
      "Guilds",
      ...visibleGuilds,
      "",
      "Leaderboard",
      ...visibleBoard
    ]);
  }
}
