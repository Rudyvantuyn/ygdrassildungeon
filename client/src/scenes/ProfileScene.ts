import Phaser from "phaser";
import { restartOnResize, sceneHeight, sceneWidth } from "../theme/layout.js";
import { gameStore } from "../state/gameStore.js";
import { sceneNames } from "./sceneNames.js";
import { buildServiceSceneShell } from "./serviceSceneShell.js";
import { startSceneWithFade } from "./sceneFlow.js";

export class ProfileScene extends Phaser.Scene {
  private content?: Phaser.GameObjects.Text;

  constructor() {
    super(sceneNames.Profile);
  }

  create(): void {
    restartOnResize(this);
    const width = sceneWidth(this);
    const height = sceneHeight(this);
    this.add.image(width / 2, height / 2, "bg_service_placeholder").setDisplaySize(width, height);
    const shell = buildServiceSceneShell(this, {
      title: "Profile & Ledger",
      width,
      height,
      panelWidthRatio: 0.68,
      panelMin: 620,
      panelMax: 980,
      panelHeightRatio: 0.74,
      panelHMin: 430,
      panelHMax: 680,
      placeholderKey: "ph_profile_emblem",
      commands: [
        { label: "Refresh Profile", onClick: () => void gameStore.fetchProfileMeta() },
        { label: "Open Season Board", onClick: () => startSceneWithFade(this, sceneNames.Season) }
      ],
      backSceneKey: sceneNames.City
    });

    this.content = this.add.text(shell.contentX, shell.contentY, "Loading profile...", {
      fontFamily: "Trebuchet MS",
      fontSize: "17px",
      color: "#f7f2e8",
      wordWrap: { width: shell.contentWidth },
      lineSpacing: 7
    });

    const unsubscribe = gameStore.subscribe(() => this.render());
    this.events.once("shutdown", unsubscribe);
    void gameStore.fetchProfileMeta();
    this.render();
  }

  private render(): void {
    if (!this.content) {
      return;
    }
    const meta = gameStore.state.profileMeta ?? {};
    const profile = (meta.profile as Record<string, unknown> | undefined) ?? {};
    const ledger = (meta.walletLedger as Array<Record<string, unknown>> | undefined) ?? [];
    const tail = ledger.slice(-8).reverse().map((entry) =>
      `• ${typeof entry.kind === "string" ? entry.kind : "-"}: ${Number(entry.amount ?? 0)} (${typeof entry.reason === "string" ? entry.reason : "-"})`
    );
    const ledgerLines = tail.length > 0 ? tail : ["• No ledger entries yet."];
    const displayName = typeof profile.name === "string" ? profile.name : gameStore.state.displayName;
    this.content.setText([
      `Name: ${displayName}`,
      `Account Level: ${Number(profile.accountLevel ?? 1)}`,
      `Currency: ${Number(profile.currency ?? 0)}g`,
      `Skill Points: ${Number(profile.skillPoints ?? 0)}`,
      "",
      "Wallet Ledger (latest)",
      ...ledgerLines
    ]);
  }
}
