
const CUSTOMS_OFFICIAL_ID = 317;
const KARAMJA_RUM_ID = 318;
const COINS_ID = 10;

const SHIP_IDS = new Set([320, 321]);

const ARDOUGNE_ARRIVE = { x: 538, y: 617 };

async function talkToCustoms(player, npc) {
    await npc.say('You need to be searched before you can board');

    // Java multi(player, n, options...) defaults send-over true.
    const subOption = await player.ask(
        [
            'Why?',
            'Search away I have nothing to hide',
            "You're not putting your hands on my things"
        ],
        true
    );

    if (subOption === 0) {
        await npc.say(
            'Because Kandarin has banned the import of intoxicating spirits'
        );
    } else if (subOption === 1) {
        if (player.inventory.has(KARAMJA_RUM_ID)) {
            await npc.say('Aha trying to smuggle rum are we?');
            player.message('@que@The customs official confiscates your rum');
            await player.world.sleepTicks(3);
            player.inventory.remove(KARAMJA_RUM_ID);
        } else {
            await npc.say(
                "Well you've got some odd stuff, but it's all legal",
                'Now you need to pay a boarding charge of 30 gold'
            );

            const payOption = await player.ask(
                ['Ok', "Oh, I'll not bother then"],
                false
            );

            if (payOption === 0) {
                if (player.inventory.has(COINS_ID, 30)) {
                    player.inventory.remove(COINS_ID, 30);
                    await player.say('Ok');
                    player.message('@que@You pay 30 gold');
                    await player.world.sleepTicks(3);
                    player.message('@que@You board the ship');
                    await player.world.sleepTicks(3);
                    player.teleport(ARDOUGNE_ARRIVE.x, ARDOUGNE_ARRIVE.y);
                    player.message('@que@The ship arrives at Ardougne');
                } else {
                    await player.say(
                        "Oh dear I don't seem to have enough money"
                    );
                }
            } else if (payOption === 1) {
                await player.say("Oh I'll not bother then");
            }
        }
    } else if (subOption === 2) {
        await npc.say("You're not getting on this ship then");
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== CUSTOMS_OFFICIAL_ID) {
        return false;
    }

    player.engage(npc);

    // Java multi(player, n, options...) defaults send-over true.
    const option = await player.ask(
        [
            'Can I board this ship?',
            'Does Karamja have any unusual customs then?'
        ],
        true
    );

    if (option === 0) {
        await talkToCustoms(player, npc);
    } else if (option === 1) {
        await npc.say("I'm not that sort of customs officer");
    }

    player.disengage();

    return true;
}

async function onGameObjectCommandOne(player, gameObject) {
    if (!SHIP_IDS.has(gameObject.id)) {
        return false;
    }

    // OpenRSC onOpLoc: only boards when the player's x is 467 or 468.
    if (player.x < 467 || player.x > 468) {
        return true;
    }

    const { world } = player;

    const official = Array.from(
        world.npcs.getAllByID(CUSTOMS_OFFICIAL_ID)
    ).find((npc) => {
        return (
            !npc.interlocutor &&
            player.localEntities.known.npcs.has(npc) &&
            player.getDistance(npc) <= 5
        );
    });

    if (official) {
        player.engage(official);
        await talkToCustoms(player, official);
        player.disengage();
    } else {
        player.message(
            '@que@I need to speak to the customs official before boarding ' +
                'the ship.'
        );
    }

    return true;
}

module.exports = { onTalkToNPC, onGameObjectCommandOne };
