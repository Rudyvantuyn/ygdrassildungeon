export function mapLobbyVm(state) {
    if (!state.room) {
        return null;
    }
    return {
        roomId: state.room.roomId,
        roomStatus: state.room.status,
        members: state.room.players.map((player) => ({
            name: player.displayName,
            className: player.selectedClass,
            ready: player.isReady,
            connected: player.connected
        }))
    };
}
export function mapCombatVm(state) {
    if (!state.combat) {
        return null;
    }
    return {
        activeEntityId: state.combat.activeEntityId,
        turn: state.combat.turn,
        allies: state.combat.allies.map((ally) => `${ally.name} ${ally.currentHp}/${ally.stats.maxHp}`),
        enemies: state.combat.enemies.map((enemy) => `${enemy.name} ${enemy.currentHp}/${enemy.stats.maxHp}`),
        lastLog: state.combat.logs[state.combat.logs.length - 1]?.message ?? "-"
    };
}
