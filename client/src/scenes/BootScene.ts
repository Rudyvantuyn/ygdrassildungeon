import Phaser from "phaser";
import { manifest } from "../assets/manifest.js";
import { sceneNames } from "./sceneNames.js";
import { preloadBossPresentation } from "../combat/bossPresentation.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(sceneNames.Boot);
  }

  preload(): void {
    this.load.image("bg_login", manifest.backgrounds.login);
    this.load.image("bg_lobby", manifest.backgrounds.lobby);
    this.load.image("bg_combat", manifest.backgrounds.combat);
    this.load.image("bg_results", manifest.backgrounds.results);
    this.load.image("bg_city", "/assets/backgrounds/city-hub.png");
    this.load.image("bg_shop", "/assets/backgrounds/shop-interior.png");
    this.load.image("npc_shopkeeper", manifest.placeholders.shopkeeperNpc);
    this.load.image("ph_mission_npc", manifest.placeholders.missionNpc);
    this.load.image("ph_training_npc", manifest.placeholders.trainingNpc);
    this.load.image("ph_blacksmith_npc", manifest.placeholders.blacksmithNpc);
    this.load.image("ph_profile_emblem", manifest.placeholders.profileEmblem);
    this.load.image("ph_season_npc", manifest.placeholders.seasonNpc);
    this.load.image("bg_service_placeholder", manifest.placeholders.serviceBackground);
    this.load.image("ph_coop_banner", manifest.placeholders.coopBanner);
    this.load.image("ph_lobby_banner", manifest.placeholders.lobbyBanner);

    for (const [className, path] of Object.entries(manifest.classPortraits as Record<string, string>)) {
      this.load.image(`class_${className}`, path);
    }
    for (const [enemyId, path] of Object.entries(manifest.enemies)) {
      this.load.image(`enemy_${enemyId}`, path);
    }
    for (const [skillId, path] of Object.entries(manifest.skills)) {
      this.load.image(`skill_${skillId}`, path);
    }
    this.load.image("vfx_slash", manifest.vfx.slash);
    this.load.image("vfx_arcaneBurst", manifest.vfx.arcaneBurst);
    this.load.image("vfx_summonCircle", manifest.vfx.summonCircle);
    preloadBossPresentation(this);
    for (const [key, path] of Object.entries(manifest.forest)) {
      this.load.image(`forest_${key}`, path as string);
    }
  }

  create(): void {
    this.game.events.emit("bootComplete");
  }
}
