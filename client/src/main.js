import Phaser from "phaser";
import { gameStore } from "./state/gameStore.js";
import { viewport } from "./theme/layout.js";
import { sceneNames } from "./scenes/sceneNames.js";
import { BootScene } from "./scenes/BootScene.js";
let gameRef = null;
const loadedScenes = new Set([sceneNames.Boot]);
const loadingScenes = new Map();
const sceneLoaders = {
    [sceneNames.City]: async () => new (await import("./scenes/CityScene.js")).CityScene(),
    [sceneNames.ForestEntrance]: async () => new (await import("./scenes/ForestEntranceScene.js")).ForestEntranceScene(),
    [sceneNames.Login]: async () => new (await import("./scenes/LoginScene.js")).LoginScene(),
    [sceneNames.PartySetup]: async () => new (await import("./scenes/PartySetupScene.js")).PartySetupScene(),
    [sceneNames.Lobby]: async () => new (await import("./scenes/LobbyScene.js")).LobbyScene(),
    [sceneNames.Combat]: async () => new (await import("./scenes/CombatScene.js")).CombatScene(),
    [sceneNames.Results]: async () => new (await import("./scenes/ResultsScene.js")).ResultsScene(),
    [sceneNames.MissionBoard]: async () => new (await import("./scenes/MissionBoardScene.js")).MissionBoardScene(),
    [sceneNames.Shop]: async () => new (await import("./scenes/ShopScene.js")).ShopScene(),
    [sceneNames.Blacksmith]: async () => new (await import("./scenes/BlacksmithScene.js")).BlacksmithScene(),
    [sceneNames.TrainingHall]: async () => new (await import("./scenes/TrainingHallScene.js")).TrainingHallScene(),
    [sceneNames.Profile]: async () => new (await import("./scenes/ProfileScene.js")).ProfileScene(),
    [sceneNames.Season]: async () => new (await import("./scenes/SeasonScene.js")).SeasonScene(),
    [sceneNames.CoOpParty]: async () => new (await import("./scenes/CoOpPartyScene.js")).CoOpPartyScene()
};
async function ensureScene(scene) {
    if (!gameRef || loadedScenes.has(scene)) {
        return;
    }
    const existing = loadingScenes.get(scene);
    if (existing) {
        await existing;
        return;
    }
    const loader = sceneLoaders[scene];
    if (!loader) {
        return;
    }
    const pending = (async () => {
        const sceneInstance = await loader();
        if (!gameRef) {
            return;
        }
        gameRef.scene.add(scene, sceneInstance, false);
        loadedScenes.add(scene);
    })();
    loadingScenes.set(scene, pending);
    await pending;
    loadingScenes.delete(scene);
}
async function startScene(scene) {
    if (!gameRef) {
        return;
    }
    await ensureScene(scene);
    const activeScenes = gameRef.scene.getScenes(true);
    for (const activeScene of activeScenes) {
        const key = activeScene.scene.key;
        if (key !== scene) {
            gameRef.scene.stop(key);
        }
    }
    if (!gameRef.scene.isActive(scene)) {
        gameRef.scene.start(scene);
    }
}
function activeSceneKey() {
    if (!gameRef) {
        return null;
    }
    const active = gameRef.scene.getScenes(true)[0];
    return active?.scene.key ?? null;
}
async function preloadCoreScenes() {
    await Promise.all([
        ensureScene(sceneNames.City),
        ensureScene(sceneNames.ForestEntrance),
        ensureScene(sceneNames.Login),
        ensureScene(sceneNames.PartySetup),
        ensureScene(sceneNames.Lobby),
        ensureScene(sceneNames.Combat),
        ensureScene(sceneNames.Results),
        ensureScene(sceneNames.MissionBoard),
        ensureScene(sceneNames.Shop),
        ensureScene(sceneNames.Blacksmith),
        ensureScene(sceneNames.TrainingHall),
        ensureScene(sceneNames.Profile),
        ensureScene(sceneNames.Season),
        ensureScene(sceneNames.CoOpParty)
    ]);
}
gameStore.connectHandlers(() => {
    const current = activeSceneKey();
    if (current === sceneNames.Combat ||
        current === sceneNames.Results ||
        current === sceneNames.Lobby ||
        current === sceneNames.CoOpParty) {
        void startScene(sceneNames.City);
    }
}, () => {
    const current = activeSceneKey();
    if (current === sceneNames.City ||
        current === sceneNames.ForestEntrance ||
        current === sceneNames.Lobby ||
        current === sceneNames.Results) {
        void startScene(sceneNames.Combat);
    }
}, () => {
    if (activeSceneKey() === sceneNames.Combat) {
        void startScene(sceneNames.Results);
    }
});
gameRef = new Phaser.Game({
    // Canvas mode is more stable for the current SVG-heavy UI prototype in
    // embedded browsers where WebGL texture lifecycle can intermittently fail.
    type: Phaser.CANVAS,
    width: viewport.width(),
    height: viewport.height(),
    parent: "game",
    backgroundColor: "#05070f",
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: viewport.width(),
        height: viewport.height()
    },
    scene: [BootScene]
});
gameRef.events.on("bootComplete", () => {
    void (async () => {
        await preloadCoreScenes();
        await startScene(sceneNames.City);
    })();
});
