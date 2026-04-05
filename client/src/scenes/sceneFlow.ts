import type Phaser from "phaser";

export function fadeInScene(scene: Phaser.Scene, duration = 180): void {
  scene.cameras.main.fadeIn(duration, 0, 0, 0);
}

export function startSceneWithFade(scene: Phaser.Scene, sceneKey: string, duration = 180): void {
  void duration;
  if (sceneKey === "CityScene") {
    // Stability-first fallback: Phaser scene swaps can crash in this
    // environment, so return-to-city uses a full app reload.
    window.location.reload();
    return;
  }
  const currentKey = scene.scene.key;
  try {
    scene.scene.start(sceneKey);
  } catch {
    // Best-effort retry path if scene manager is mid-transition.
    scene.time.delayedCall(20, () => {
      try {
        scene.scene.stop(currentKey);
        scene.scene.start(sceneKey);
      } catch {
        // Last-resort safety for hard lockups in embedded sessions.
        window.location.reload();
      }
    });
  }
}
