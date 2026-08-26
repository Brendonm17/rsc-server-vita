// tutorial progress stored as an int in player.cache.tutorialStage; unset once not on tutorial

function hasStage(player) {
    return typeof player.cache.tutorialStage === 'number';
}

function getStage(player) {
    return hasStage(player) ? player.cache.tutorialStage : null;
}

function setStage(player, stage) {
    player.cache.tutorialStage = stage;
}

// stage only ever moves forward, never backward
function setStageIfLess(player, stage) {
    if (!hasStage(player) || player.cache.tutorialStage < stage) {
        setStage(player, stage);
    }
}

module.exports = { hasStage, getStage, setStage, setStageIfLess };
