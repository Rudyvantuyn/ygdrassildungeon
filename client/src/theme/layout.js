import { theme } from "./tokens.js";
export const viewport = {
    width: () => window.innerWidth,
    height: () => window.innerHeight
};
export const layout = {
    titleY: 34,
    contentTop: 120,
    sidePadding: theme.spacing.xl,
    panelRadius: 14,
    panelStroke: 3
};
export function sceneWidth(scene) {
    return scene.scale.width;
}
export function sceneHeight(scene) {
    return scene.scale.height;
}
export function centerX(scene, width) {
    return (sceneWidth(scene) - width) / 2;
}
export function restartOnResize(scene) {
    void scene;
    // Temporarily disabled: frequent embedded-browser resize events can trigger
    // scene restarts during rendering/transitions, causing Canvas drawImage null
    // crashes and apparent UI hangs.
}
