// Hero's Quest - the Brimhaven mansion doors (Scarface Pete's mansion).
//
// wall-object ids: 75/76/77/78 "Door", 79 "Strange Panel", 80/81 "Door"
//
// gated by wallObject.x/y; same ids repeat near (200-224, 727-743)
//   78 @ (448,682) Alfonse's private door   76 @ (439,694) Grubor's password door
//   75 @ (463,681) Garv's inspection door   77 @ (463,676) Grip's door
//   79 @ (456,679) secret panel             80 @ (459,674) Miscellaneous-key door
//   81 @ (472,674) Bunch-of-keys door
// key-on-door: id check only, no coordinates

const { questsEnabled } = require('../../custom-gate.js');
const {
    GRUBOR_ID,
    GARV_ID,
    ALFONSE_THE_WAITER_ID,
    MISCELLANEOUS_KEY_ID,
    BUNCH_OF_KEYS_ID,
    isBlackArmGang,
    ifNearVisNpc
} = require('./common.js');
const { garvInspectDialogue } = require('./index.js');

// --- OpBound (the "Open" / "Push" command on the boundary) --------------------

// Door 78 @ (448,682): Alfonse's private door into the Shrimp & Parrot back room.
async function alfonseDoor(player, wallObject) {
    if (player.cache.talked_alf || player.questStages.herosQuest === -1) {
        player.message('you open the door');
        player.message('You go through the door');
        await player.enterDoor(wallObject);
    } else {
        const alf = ifNearVisNpc(player, ALFONSE_THE_WAITER_ID, 10);
        if (alf) {
            player.engage(alf);
            await alf.say("Hey you can't go through there, that's private");
            player.disengage();
        }
    }
}

// Door 76 @ (439,694): Grubor's door. Black Arm gang password "four leaved
// clover"; small talk once the quest is complete.
async function gruborDoor(player, wallObject) {
    const grubor = ifNearVisNpc(player, GRUBOR_ID, 10);

    if (player.questStages.herosQuest === -1) {
        if (grubor) {
            player.engage(grubor);
            await grubor.say('Yes? what do you want?');

            const mem = await player.ask(
                [
                    'Would you like to have your windows refitting?',
                    'I want to come in',
                    'Do you want to trade?'
                ],
                false
            );

            if (mem === 0) {
                await player.say(
                    'Would you like to have your windows refitting?'
                );
                await grubor.say("Don't be daft, we don't have any windows");
            } else if (mem === 1) {
                await player.say('I want to come in');
                await grubor.say('No, go away');
            } else if (mem === 2) {
                await player.say('Do you want to trade');
                await grubor.say("No I'm busy");
            }

            player.disengage();
        }
        return;
    }

    if (player.cache.blackarm_mission) {
        if (player.cache.talked_grubor) {
            player.message('you open the door');
            player.message('You go through the door');
            await player.enterDoor(wallObject);
        } else if (grubor) {
            player.engage(grubor);
            await grubor.say('Yes? what do you want?');

            const menu = await player.ask(
                [
                    "Rabbit's foot",
                    'four leaved clover',
                    'Lucky Horseshoe',
                    'Black cat'
                ],
                false
            );

            if (menu === 1) {
                await player.say('Four leaved clover');
                await grubor.say(
                    "Oh you're one of the gang are you",
                    "Just a second I'll let you in"
                );
                player.message('You here the door being unbarred');
                player.cache.talked_grubor = true;
                player.disengage();
                return;
            }

            if (menu === 0) {
                await player.say("Rabbit's foot");
            } else if (menu === 2) {
                await player.say('Lucky Horseshoe');
            } else if (menu === 3) {
                await player.say('Black cat');
            }

            await grubor.say('What are you on about', 'Go away');
            player.disengage();
        }
    } else {
        player.message("The door won't open");
    }
}

// Door 75 @ (463,681): Garv inspects the black-knight disguise + i.d paper.
async function garvDoor(player, wallObject) {
    const garv = ifNearVisNpc(player, GARV_ID, 12);

    if (player.cache.garv_door || player.questStages.herosQuest === -1) {
        player.message('you open the door');
        player.message('You go through the door');
        await player.enterDoor(wallObject);
        return;
    }

    if (garv) {
        player.engage(garv);
        await garv.say("Where do you think you're going?");
        if (isBlackArmGang(player) && player.cache.hq_impersonate) {
            await garvInspectDialogue(player, garv);
        }
        player.disengage();
    }
}

// Door 77 @ (463,676): Grip's door. Requires having handed Grip the i.d paper.
// SP adaptation: Grip's walk-out flourish dropped
async function gripDoor(player, wallObject) {
    if (player.cache.talked_grip || player.questStages.herosQuest === -1) {
        player.message('you open the door');
        player.message('You go through the door');
        await player.enterDoor(wallObject);
    } else {
        player.message("You can't get through the door");
        player.message('You need to speak to grip first');
    }
}

async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const { id, x, y } = wallObject;

    if (id === 78 && x === 448 && y === 682) {
        await alfonseDoor(player, wallObject);
        return true;
    }

    if (id === 76 && x === 439 && y === 694) {
        await gruborDoor(player, wallObject);
        return true;
    }

    if (id === 75 && x === 463 && y === 681) {
        await garvDoor(player, wallObject);
        return true;
    }

    if (id === 77 && x === 463 && y === 676) {
        await gripDoor(player, wallObject);
        return true;
    }

    // secret panel: id 79 only, no coordinate gate
    if (id === 79) {
        player.sendSound('secretdoor');
        player.message('You just went through a secret door');
        await player.enterDoor(wallObject);
        return true;
    }

    if (id === 80 && x === 459 && y === 674) {
        player.message('The door is locked');
        await player.say(
            "This room isn't a lot of use on it's own",
            'Maybe I can get extra help from the inside somehow',
            'I wonder if any of the other players have found a way in'
        );
        return true;
    }

    if (id === 81 && x === 472 && y === 674) {
        player.message('The door is locked');
        return true;
    }

    return false;
}

// --- UseBound (using a key on the boundary) -----------------------------------
// key-on-door: id only, no coordinate check, key not consumed
async function onUseWithWallObject(player, wallObject, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (wallObject.id === 80) {
        if (item.id === MISCELLANEOUS_KEY_ID) {
            player.sendBubble(item.id);
            player.message('You unlock the door');
            player.message('You go through the door');
            await player.enterDoor(wallObject);
        }
        return true;
    }

    if (wallObject.id === 81) {
        if (item.id === BUNCH_OF_KEYS_ID) {
            player.message('You open the door');
            player.message('You go through the door');
            await player.enterDoor(wallObject);
        }
        return true;
    }

    return false;
}

module.exports = { onWallObjectCommandOne, onUseWithWallObject };
