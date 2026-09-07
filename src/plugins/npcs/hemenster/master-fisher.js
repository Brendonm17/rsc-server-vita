// master fisher: greets guild entrants (level-68 gate) and, at 99 fishing, sells the
// fishing cape for 99,000 coins. greetings gated on wantMissingGuildGreetings and the
// cape branch on wantSkillcapePerks, both on by default for single-player. cape id is
// resolved by name and seeded with 10 charges.

const { resolveCapeIds } = require('../../skills/skill-capes');

const MASTER_FISHER_ID = 368;
const COINS_ID = 10;
const FISHING_CAPE_PRICE = 99000;
const FISHING_CAPE_MAX_CHARGES = 10;

function wantMissingGuildGreetings(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantMissingGuildGreetings !== false;
}

function wantSkillcapePerks(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantSkillcapePerks !== false;
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== MASTER_FISHER_ID || !wantMissingGuildGreetings(player)) {
        return false;
    }

    player.engage(npc);

    if (player.skills.fishing.current < 68) {
        await npc.say('Hello only the top fishers are allowed in here');
        player.message('You need a fishing level of 68 to enter');
    } else {
        await npc.say(
            'Hello, welcome to the fishing guild',
            'Please feel free to make use of any of our facilities'
        );
    }

    if (wantSkillcapePerks(player) && player.skills.fishing.base >= 99) {
        const menu = await player.ask(['I like your cape', 'Thank you'], true);

        if (menu === 0) {
            await npc.say(
                'Huh?',
                "Oh it's just me Fishing cape",
                "Looks like you're good enough at fishing to have one if you want",
                "It'll cost you 99,000 coins though"
            );

            const wantCape = await player.ask(
                ['Yes please', 'No thank you'],
                true
            );

            if (wantCape === 0) {
                if (player.inventory.has(COINS_ID, FISHING_CAPE_PRICE)) {
                    player.message('@que@The Master Fisher takes your coins');
                    await player.world.sleepTicks(3);

                    player.inventory.remove(COINS_ID, FISHING_CAPE_PRICE);

                    player.message('@que@And hands you a Fishing cape');
                    await player.world.sleepTicks(3);

                    player.inventory.add(resolveCapeIds().fishing, 1);
                    player.cache.fishing_cape_charges = FISHING_CAPE_MAX_CHARGES;

                    await npc.say(
                        'There',
                        'This cape allows you to form a special bond with sharks.',
                        "Don't ask me how it works, but just think very hard about sharks,",
                        "and surround yourself with sharks, and you'll find yourself back here.",
                        'You might also have a better haul at the fishing trawler.'
                    );
                } else {
                    await npc.say(
                        "You don't have enough coins " +
                            (player.isMale() ? 'lad' : 'lass')
                    );
                }
            }
        }
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
