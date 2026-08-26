// customQuests toggle gates only the 2 custom quests; authentic quests always on
function questsEnabled() {
    return true;
}

function customQuestsEnabled(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.customQuests !== false;
}

module.exports = { questsEnabled, customQuestsEnabled };
