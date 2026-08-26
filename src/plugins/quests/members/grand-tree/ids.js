
const QUEST_KEY = 'grandTree';

// NPCs
const KING_NARNODE_SHAREEN = 541;
const KING_NARNODE_SHAREEN_UNDERGROUND = 545;
const HAZELMERE = 546;
const GLOUGH = 547;
const CHARLIE = 550;
const GNOME_GUARD_PRISON = 551;
const GNOME_PILOT_GRANDTREE = 552;
const GNOME_PILOT_KARAMJA_BROKEN = 556;
const SHIPYARD_WORKER_ENTRANCE = 557;
const SHIPYARD_WORKER_WHITE = 558;
const SHIPYARD_WORKER_BLACK = 559;
const SHIPYARD_FOREMAN = 560;
const SHIPYARD_FOREMAN_HUT = 561;
const FEMI = 563;
const FEMI_STRONGHOLD = 564;
const ANITA = 565;
const GLOUGH_UNDERGROUND = 566;
const BLACK_DEMON_GRANDTREE = 568;
const GNOME_PILOT_KARAMJA = 569;
const GNOME_PILOT_VARROCK = 570;
const GNOME_PILOT_ALKHARID = 571;
const GNOME_PILOT_WHITEMOUNTAIN = 572;
const JOGRE = 523;

// Items
const COINS = 10;
const TREE_GNOME_TRANSLATION = 918;
const BARK_SAMPLE = 919;
const GLOUGHS_JOURNAL = 921;
const INVOICE = 922;
const GLOUGHS_KEY = 925;
const GLOUGHS_NOTES = 926;
const PEBBLE_1 = 927;
const PEBBLE_2 = 928;
const PEBBLE_3 = 929;
const PEBBLE_4 = 930;
const DACONIA_ROCK = 931;

// Objects
const GLOUGHS_CUPBOARD_OPEN = 620;
const GLOUGHS_CUPBOARD_CLOSED = 619;
const GLOUGH_CHEST_OPEN = 631;
const GLOUGH_CHEST_CLOSED = 632;
const TREE_LADDER_UP = 585;
const TREE_LADDER_DOWN = 586;
const SHIPYARD_GATE = 624;
const SHIPYARD_GATE_OPEN = 623;
const STRONGHOLD_GATE = 626;
const STRONGHOLD_GATE_OPEN = 181;
const WATCH_TOWER_UP = 635;
const WATCH_TOWER_DOWN = 646;
const WATCH_TOWER_STONE_STAND = 634;
const ROOT_ONE = 609;
const ROOT_TWO = 610;
const ROOT_THREE = 637;
const PUSH_ROOT = 638;
const PUSH_ROOT_BACK = 639;
const GLIDER = 618;

// reward: agility/attack +1200 base 1600 var, magic +200 base 600 var
const QUEST_POINTS = 5;

// find a nearby visible npc by id within range
function ifNearVisNpc(player, id, range) {
    const npcs = player.getNearbyEntitiesByID('npcs', id, range);
    return npcs.length ? npcs[0] : null;
}

// spawn npc id at x,y, remove after `seconds`
function addNpc(world, id, x, y, seconds) {
    const NPC = require('../../../../model/npc');
    const npc = new NPC(world, {
        id,
        x,
        y,
        minX: x - 2,
        maxX: x + 2,
        minY: y - 2,
        maxY: y + 2
    });
    delete npc.respawn;
    world.addEntity('npcs', npc);

    if (seconds && seconds > 0) {
        setTimeout(() => {
            try {
                if (npc.world) {
                    world.removeEntity('npcs', npc);
                }
            } catch (e) {
                // already removed
            }
        }, seconds * 1000);
    }

    return npc;
}

// grant the exact quest completion reward and mark the quest complete.
function handleReward(player) {
    player.message('well done you have completed the grand tree quest');

    // maxStat(skill) * varXP + baseXP, matching incStat()
    player.addExperience(
        'agility',
        player.skills.agility.base * 1200 + 1600,
        false
    );
    player.addExperience(
        'attack',
        player.skills.attack.base * 1200 + 1600,
        false
    );
    player.addExperience(
        'magic',
        player.skills.magic.base * 200 + 600,
        false
    );

    player.addQuestPoints(QUEST_POINTS);
    player.message(
        `@gre@You haved gained ${QUEST_POINTS} quest points!`
    );
}

module.exports = {
    QUEST_KEY,
    KING_NARNODE_SHAREEN,
    KING_NARNODE_SHAREEN_UNDERGROUND,
    HAZELMERE,
    GLOUGH,
    CHARLIE,
    GNOME_GUARD_PRISON,
    GNOME_PILOT_GRANDTREE,
    GNOME_PILOT_KARAMJA_BROKEN,
    SHIPYARD_WORKER_ENTRANCE,
    SHIPYARD_WORKER_WHITE,
    SHIPYARD_WORKER_BLACK,
    SHIPYARD_FOREMAN,
    SHIPYARD_FOREMAN_HUT,
    FEMI,
    FEMI_STRONGHOLD,
    ANITA,
    GLOUGH_UNDERGROUND,
    BLACK_DEMON_GRANDTREE,
    GNOME_PILOT_KARAMJA,
    GNOME_PILOT_VARROCK,
    GNOME_PILOT_ALKHARID,
    GNOME_PILOT_WHITEMOUNTAIN,
    JOGRE,
    COINS,
    TREE_GNOME_TRANSLATION,
    BARK_SAMPLE,
    GLOUGHS_JOURNAL,
    INVOICE,
    GLOUGHS_KEY,
    GLOUGHS_NOTES,
    PEBBLE_1,
    PEBBLE_2,
    PEBBLE_3,
    PEBBLE_4,
    DACONIA_ROCK,
    GLOUGHS_CUPBOARD_OPEN,
    GLOUGHS_CUPBOARD_CLOSED,
    GLOUGH_CHEST_OPEN,
    GLOUGH_CHEST_CLOSED,
    TREE_LADDER_UP,
    TREE_LADDER_DOWN,
    SHIPYARD_GATE,
    SHIPYARD_GATE_OPEN,
    STRONGHOLD_GATE,
    STRONGHOLD_GATE_OPEN,
    WATCH_TOWER_UP,
    WATCH_TOWER_DOWN,
    WATCH_TOWER_STONE_STAND,
    ROOT_ONE,
    ROOT_TWO,
    ROOT_THREE,
    PUSH_ROOT,
    PUSH_ROOT_BACK,
    GLIDER,
    QUEST_POINTS,
    ifNearVisNpc,
    addNpc,
    handleReward
};
