export function playSlashEffect(scene, x, y) {
    const slash = scene.add.image(x, y, "vfx_slash").setAlpha(0).setScale(0.5);
    scene.tweens.add({
        targets: slash,
        alpha: 1,
        scale: 1.1,
        angle: 22,
        duration: 120,
        yoyo: true,
        onComplete: () => slash.destroy()
    });
}
export function playArcaneBurst(scene, x, y) {
    const burst = scene.add.image(x, y, "vfx_arcaneBurst").setAlpha(0).setScale(0.2);
    scene.tweens.add({
        targets: burst,
        alpha: 0.9,
        scale: 1.2,
        duration: 260,
        ease: "Sine.Out",
        onComplete: () => burst.destroy()
    });
}
export function playSummonCircle(scene, x, y) {
    const circle = scene.add.image(x, y, "vfx_summonCircle").setAlpha(0).setScale(0.4);
    scene.tweens.add({
        targets: circle,
        alpha: 0.95,
        scale: 1,
        angle: 240,
        duration: 900,
        ease: "Linear",
        onComplete: () => circle.destroy()
    });
}
