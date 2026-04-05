import { io } from "socket.io-client";
const configuredUrl = import.meta.env["VITE_SERVER_URL"];
const serverUrl = typeof configuredUrl === "string" ? configuredUrl : "http://localhost:3000";
const socket = io(serverUrl);
const initialPlayerId = getOrCreateLocalPlayerId();
const state = {
    playerId: initialPlayerId,
    room: null,
    combat: null,
    displayName: `Player${Math.floor(Math.random() * 1000)}`,
    selectedClass: "Guardian",
    lastStatus: "Booting...",
    lastRewards: "-",
    profileMeta: null,
    missionMeta: null,
    shopMeta: null,
    trainingMeta: null,
    blacksmithMeta: null,
    liveopsMeta: null,
    forestMeta: null,
    forestObjective: null
};
const listeners = new Set();
function notify() {
    for (const listener of listeners) {
        listener(state);
    }
}
function parseErrorMessage(data, fallback) {
    if (data && typeof data === "object") {
        const message = data.message;
        if (typeof message === "string" && message.trim().length > 0) {
            return message;
        }
    }
    return fallback;
}
async function requestJson(path, options) {
    const response = await fetch(path, options);
    let data = null;
    try {
        data = await response.json();
    }
    catch {
        if (!response.ok) {
            throw new Error(`Request failed (${response.status}).`);
        }
        return {};
    }
    if (!response.ok) {
        throw new Error(parseErrorMessage(data, `Request failed (${response.status}).`));
    }
    return data && typeof data === "object" ? data : {};
}
export const gameStore = {
    socket,
    state,
    subscribe(listener) {
        listeners.add(listener);
        listener(state);
        return () => listeners.delete(listener);
    },
    setDisplayName(name) {
        state.displayName = name;
        notify();
    },
    setSelectedClass(className) {
        state.selectedClass = className;
        notify();
    },
    setStatus(text) {
        state.lastStatus = text;
        notify();
    },
    setForestObjective(title, targetSteps) {
        state.forestObjective = {
            title,
            targetSteps: Math.max(1, targetSteps),
            progressSteps: 0,
            active: true,
            completed: false
        };
        this.setStatus(`Main objective set: ${title}`);
        notify();
    },
    advanceForestObjective(stepDelta = 1) {
        const objective = state.forestObjective;
        if (!objective || !objective.active || objective.completed) {
            return;
        }
        objective.progressSteps = Math.min(objective.targetSteps, objective.progressSteps + Math.max(0, stepDelta));
        if (objective.progressSteps >= objective.targetSteps) {
            objective.completed = true;
            objective.active = false;
            this.setStatus(`Objective complete: ${objective.title}`);
        }
        notify();
    },
    async fetchProfileMeta() {
        if (!state.playerId) {
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/profile/${state.playerId}`);
            state.profileMeta = data;
            notify();
        }
        catch (error) {
            this.setStatus(`Profile load failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async fetchMissions() {
        if (!state.playerId) {
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/missions/${state.playerId}`);
            state.missionMeta = data;
            notify();
        }
        catch (error) {
            this.setStatus(`Mission load failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async claimMissionReward(missionId) {
        if (!state.playerId) {
            this.setStatus("Session not ready yet. Please wait.");
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/missions/${state.playerId}/claim`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ missionId })
            });
            state.missionMeta = data;
            await this.fetchProfileMeta();
            notify();
        }
        catch (error) {
            this.setStatus(`Mission claim failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async fetchShop() {
        if (!state.playerId) {
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/shop/${state.playerId}`);
            state.shopMeta = data;
            notify();
        }
        catch (error) {
            this.setStatus(`Shop load failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async buyShopItem(entryId) {
        if (!state.playerId) {
            this.setStatus("Session not ready yet. Please wait.");
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/shop/${state.playerId}/buy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entryId })
            });
            state.shopMeta = data;
            await this.fetchProfileMeta();
            await this.fetchBlacksmith();
            notify();
        }
        catch (error) {
            this.setStatus(`Purchase failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async fetchTraining(className) {
        if (!state.playerId) {
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/training/${state.playerId}?className=${className}`);
            state.trainingMeta = data;
            notify();
        }
        catch (error) {
            this.setStatus(`Training load failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async unlockTrainingNode(className, nodeId) {
        if (!state.playerId) {
            this.setStatus("Session not ready yet. Please wait.");
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/training/${state.playerId}/unlock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ className, nodeId })
            });
            state.trainingMeta = data;
            await this.fetchProfileMeta();
            notify();
        }
        catch (error) {
            this.setStatus(`Unlock failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async fetchBlacksmith() {
        if (!state.playerId) {
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/blacksmith/${state.playerId}`);
            state.blacksmithMeta = data;
            notify();
        }
        catch (error) {
            this.setStatus(`Blacksmith load failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async blacksmithUpgrade(itemInstanceId) {
        await this.blacksmithAction("upgrade", itemInstanceId);
    },
    async blacksmithSalvage(itemInstanceId) {
        await this.blacksmithAction("salvage", itemInstanceId);
    },
    async blacksmithReroll(itemInstanceId) {
        await this.blacksmithAction("reroll", itemInstanceId);
    },
    async fetchLiveops() {
        if (!state.playerId) {
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/liveops/${state.playerId}`);
            state.liveopsMeta = data;
            notify();
        }
        catch (error) {
            this.setStatus(`Season board load failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async fetchForestMeta() {
        if (!state.playerId) {
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/forest/${state.playerId}`);
            state.forestMeta = { ...(state.forestMeta ?? {}), ...data };
            notify();
        }
        catch (error) {
            this.setStatus(`Forest metadata load failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async fetchForestFloor(floorNumber) {
        if (!state.playerId) {
            this.setStatus("Session not ready yet. Please wait.");
            return false;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/forest/${state.playerId}/floor/${Math.max(1, Math.floor(floorNumber))}`);
            state.forestMeta = { ...(state.forestMeta ?? {}), ...data };
            notify();
            return true;
        }
        catch (error) {
            this.setStatus(`Forest floor load failed: ${error instanceof Error ? error.message : "Unknown error."}`);
            return false;
        }
    },
    async createGuild(guildName) {
        if (!state.playerId) {
            this.setStatus("Session not ready yet. Please wait.");
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/liveops/${state.playerId}/guild/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guildName })
            });
            state.liveopsMeta = data;
            notify();
        }
        catch (error) {
            this.setStatus(`Guild creation failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async joinGuild(guildId) {
        if (!state.playerId) {
            this.setStatus("Session not ready yet. Please wait.");
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/liveops/${state.playerId}/guild/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guildId })
            });
            state.liveopsMeta = data;
            notify();
        }
        catch (error) {
            this.setStatus(`Guild join failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    async blacksmithAction(action, itemInstanceId) {
        if (!state.playerId) {
            this.setStatus("Session not ready yet. Please wait.");
            return;
        }
        try {
            const data = await requestJson(`${serverUrl}/meta/blacksmith/${state.playerId}/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemInstanceId })
            });
            state.blacksmithMeta = data;
            await this.fetchProfileMeta();
            notify();
        }
        catch (error) {
            const label = action.charAt(0).toUpperCase() + action.slice(1);
            this.setStatus(`${label} failed: ${error instanceof Error ? error.message : "Unknown error."}`);
        }
    },
    startSoloRun(difficulty = "normal") {
        socket.emit("startSoloRun", {
            displayName: state.displayName,
            selectedClass: state.selectedClass,
            difficulty
        });
    },
    connectHandlers(onLobby, onCombat, onResults) {
        socket.on("connect", () => {
            state.playerId = state.playerId ?? getOrCreateLocalPlayerId();
            socket.emit("identify", { playerId: state.playerId });
            this.setStatus("Welcome to Asteria.");
        });
        socket.on("disconnect", () => this.setStatus("Connection lost. Reconnecting..."));
        socket.on("sessionAssigned", ({ playerId }) => {
            state.playerId = playerId;
            localStorage.setItem("ygd_player_id", playerId);
            this.setStatus("");
            void this.fetchProfileMeta();
            void this.fetchMissions();
            void this.fetchShop();
            void this.fetchTraining(state.selectedClass);
            void this.fetchBlacksmith();
            void this.fetchLiveops();
            void this.fetchForestMeta();
        });
        socket.on("roomUpdated", (room) => {
            state.room = room;
            if (room.status === "lobby") {
                state.combat = null;
            }
            notify();
            if (room.status === "lobby") {
                onLobby();
            }
        });
        socket.on("runStarted", ({ combat }) => {
            state.combat = combat;
            notify();
            onCombat();
        });
        socket.on("combatUpdated", ({ combat }) => {
            state.combat = combat;
            notify();
            if (combat.encounterComplete) {
                onResults();
            }
        });
        socket.on("rewardGranted", ({ reward }) => {
            if (reward) {
                state.lastRewards = `+${reward.currency}g / +${reward.xp}xp / ${reward.itemDrops.join(", ") || "no drops"}`;
            }
            notify();
        });
        socket.on("serverError", ({ message }) => this.setStatus(`Error: ${message}`));
    }
};
function getOrCreateLocalPlayerId() {
    const existing = localStorage.getItem("ygd_player_id");
    if (existing && existing.trim().length > 0) {
        return existing;
    }
    const created = `p_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("ygd_player_id", created);
    return created;
}
