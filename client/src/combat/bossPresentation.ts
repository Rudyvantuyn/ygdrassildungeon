import Phaser from "phaser";
import { manifest } from "../assets/manifest.js";
import { playArcaneBurst, playSummonCircle } from "./effectsTimeline.js";

export type BossCue = "phaseSwap" | "summonAdds";

export function applyBossCue(scene: Phaser.Scene, cue: BossCue): void {
  if (cue === "phaseSwap") {
    scene.cameras.main.flash(250, 90, 10, 160);
    playArcaneBurst(scene, 920, 210);
    const banner = createWarningBanner(scene, "PHASE SHIFT - ABYSS HYDRA");
    scene.time.delayedCall(1500, () => banner.destroy());
    return;
  }
  scene.cameras.main.shake(180, 0.006);
  playSummonCircle(scene, 920, 220);
  const banner = createWarningBanner(scene, "SUMMONING ADDS - OBSIDIAN LICH");
  scene.time.delayedCall(1500, () => banner.destroy());
}

function createWarningBanner(scene: Phaser.Scene, label: string): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  bg.fillStyle(0x2f1022, 0.95);
  bg.lineStyle(2, 0xffd166, 1);
  bg.fillRoundedRect(360, 30, 560, 56, 12);
  bg.strokeRoundedRect(360, 30, 560, 56, 12);

  const txt = scene.add.text(640, 58, label, {
    fontFamily: "Georgia",
    fontSize: "26px",
    color: "#ffe29a"
  });
  txt.setOrigin(0.5);

  const container = scene.add.container(0, 0, [bg, txt]).setAlpha(0);
  scene.tweens.add({ targets: container, alpha: 1, duration: 180 });
  return container;
}

export function preloadBossPresentation(scene: Phaser.Scene): void {
  scene.load.image("boss_hydra", manifest.bosses.abyssHydra);
  scene.load.image("boss_lich", manifest.bosses.obsidianLich);
}
