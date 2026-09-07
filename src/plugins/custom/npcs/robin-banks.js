// robin banks (in-game name "balrog") sells the thieving cape for 99,000gp once
// thieving is 99, gated on customQuestsEnabled; cape id via resolveCapeIds()

const npcs = require('@2003scape/rsc-data/config/npcs');
const { customQuestsEnabled } = require('../../quests/custom-gate.js');
const { resolveCapeIds } = require('../../skills/skill-capes.js');

const COINS_ID = 10;

let ROBIN_BANKS_ID = null;
function robinBanksId() {
    if (ROBIN_BANKS_ID === null) {
        ROBIN_BANKS_ID = npcs.findIndex(
            (def) => def && def.name && def.name.toLowerCase() === 'balrog'
        );
        if (ROBIN_BANKS_ID === -1) {
            throw new RangeError('robin-banks.js: no npc named "Balrog"');
        }
    }
    return ROBIN_BANKS_ID;
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== robinBanksId()) {
        return false;
    }

    player.engage(npc);

    if (player.skills.thieving.base >= 99) {
        if (customQuestsEnabled(player)) {
            await npc.say(
                "think you've mastered thieving?",
                'you know nothing',
                'but i never avoid a chance to get more coin',
                'hand over 99,000 and you can have this cape'
            );

            const choice = await player.ask(["I'll buy one", 'Not at the moment'], true);

            if (choice === 0) {
                if (player.inventory.has(COINS_ID, 99000)) {
                    player.inventory.remove(COINS_ID, 99000);
                    player.inventory.add(resolveCapeIds().thieving, 1);
                    await npc.say(
                        'wearing this cape makes you more nimble',
                        "your victims won't feel your attempts as often",
                        'now get lost'
                    );
                } else {
                    await npc.say(
                        "i won't sell it for less",
                        'you call yourself a thief?'
                    );
                }
            } else {
                await npc.say(
                    "if you know what's good for you",
                    "you'll remove yourself from this place"
                );
            }
        }
    } else {
        await npc.say(
            "if you know what's good for you",
            "you'll remove yourself from this place"
        );
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
