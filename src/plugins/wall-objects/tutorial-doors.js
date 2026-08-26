
const { hasStage, getStage } = require('../npcs/tutorial-island/stage');

// id -> { x, y, stage, missingMessage }
const TUTORIAL_DOORS = new Map([
    [75, { x: 222, y: 743, stage: 10, missingMessage: 'You should speak to a guide before going through this door' }],
    [76, { x: 224, y: 737, stage: 15, missingMessage: 'Speak to the controls guide before going through this door' }],
    [77, { x: 220, y: 727, stage: 25, missingMessage: 'Speak to the combat instructor before going through this door' }],
    [78, { x: 212, y: 729, stage: 35, missingMessage: 'You should speak to a cooking instructor before going through this door' }],
    [80, { x: 206, y: 730, stage: 40, missingMessage: 'You should speak to a finance advisor before going through this door' }],
    [81, { x: 201, y: 734, stage: 45, missingMessage: 'You should speak to the fishing instructor before going through this door' }],
    [82, { x: 198, y: 746, stage: 55, missingMessage: 'You should speak to the mining instructor before going through this door' }],
    [83, { x: 204, y: 752, stage: 60, missingMessage: 'You should speak to a bank assistant before going through this door' }],
    [84, { x: 209, y: 754, stage: 65, missingMessage: 'You should speak to the quest advisor before going through this door' }],
    [85, { x: 217, y: 760, stage: 70, missingMessage: 'You should speak to the wilderness guide before going through this door' }],
    [88, { x: 222, y: 760, stage: 80, missingMessage: 'You should speak to a magic instructor before going through this door' }],
    [89, { x: 226, y: 760, stage: 90, missingMessage: 'You should speak to a fatigue expert before going through this door' }],
    [90, { x: 230, y: 759, stage: 100, missingMessage: 'You should speak to the community instructor before going through this door' }]
]);

async function onWallObjectCommandOne(player, wallObject) {
    const door = TUTORIAL_DOORS.get(wallObject.id);

    if (!door || wallObject.x !== door.x || wallObject.y !== door.y) {
        return false;
    }

    if (hasStage(player) && getStage(player) >= door.stage) {
        await player.enterDoor(wallObject);
    } else {
        player.message(door.missingMessage);
    }

    return true;
}

module.exports = { onWallObjectCommandOne };
