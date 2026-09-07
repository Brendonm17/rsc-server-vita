// scot ruth (in-game name "greatwood") sells one-time tunnel access to the
// chaos altar for 200,000gp; cache "scotruth_to_chaos_altar" marks it bought

const npcs = require('@2003scape/rsc-data/config/npcs');

const COINS_ID = 10;
const STATE_KEY = 'scotruth_to_chaos_altar';

let SCOT_RUTH_ID = null;
function scotRuthId() {
    if (SCOT_RUTH_ID === null) {
        SCOT_RUTH_ID = npcs.findIndex(
            (def) => def && def.name && def.name.toLowerCase() === 'greatwood'
        );
        if (SCOT_RUTH_ID === -1) {
            throw new RangeError('scot-ruth.js: no npc named "Greatwood"');
        }
    }
    return SCOT_RUTH_ID;
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== scotRuthId()) {
        return false;
    }

    player.engage(npc);

    if (player.cache[STATE_KEY]) {
        player.message("Thanks for yer business. The tunnel's just over there");
    } else {
        await npc.say(
            `Hey, ${player.username}!`,
            "You like savin' time? I can help",
            "Took me a while, but I just finished this here tunnel",
            "If yer lookin to reach the chaos altar, there's no better way",
            "For a small 200,000gp investment, I'll let ye use it forever",
            'What do ya say? Do we have a deal?'
        );

        const choice = await player.ask(['Yes', 'No, 200,000gp is a rip-off'], true);

        if (choice === 0) {
            if (player.inventory.has(COINS_ID, 200000)) {
                await npc.say(
                    "Excellent. Keep in mind ye'll appear in the deep wilderness",
                    "and ye can't use this tunnel te come back"
                );
                player.inventory.remove(COINS_ID, 200000);
                player.cache[STATE_KEY] = true;
            } else {
                await npc.say("Come back with the money and you've a deal, lad");
            }
        } else if (choice === 1) {
            await npc.say('Suit yerself.');
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
