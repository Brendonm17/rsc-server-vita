// gunnjorn runs the ardougne agility course
// sells the agility cape at 99 agility for 99,000 coins, behind the skillcape-perks toggle

const { resolveCapeIds } = require('../../skills/skill-capes');

const GUNNJORN_ID = 588;
const COINS_ID = 10;
const AGILITY_CAPE_PRICE = 99000;

function wantSkillcapePerks(player) {
    const config =
        player && player.world && player.world.server
            ? player.world.server.config
            : null;

    return !config || config.wantSkillcapePerks !== false;
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== GUNNJORN_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Haha welcome to my obstacle course',
        "Have fun, but remember this isn't a child's playground",
        'People have died here',
        'The best way to train',
        'Is to go round the course in a clockwise direction'
    );

    if (wantSkillcapePerks(player)) {
        const menu = await player.ask(
            ['Do barbarians often wear capes?', 'Thank you'],
            true
        );

        if (menu === 0) {
            await npc.say(
                'Not usually',
                'But this cape is worn by only the most agile warriors'
            );

            if (player.skills.agility.base >= 99) {
                await npc.say(
                    "You definitely look like someone who's worthy of this cape",
                    'I can sell you one for 99,000 gold',
                    'This cape will give you superhuman balance',
                    'And also allow you to travel to the Yanille agility dungeon',
                    'Do you want one?'
                );

                const wantCape = await player.ask(['Yes', 'No thankyou'], true);

                if (wantCape === 0) {
                    if (player.inventory.has(COINS_ID, AGILITY_CAPE_PRICE)) {
                        player.message('@que@Gunnjorn takes your coins');
                        await player.world.sleepTicks(3);

                        player.inventory.remove(COINS_ID, AGILITY_CAPE_PRICE);

                        player.message('@que@And hands you an Agility cape');
                        await player.world.sleepTicks(3);

                        player.inventory.add(resolveCapeIds().agility, 1);
                        await npc.say('Wear it with pride');
                    } else {
                        await npc.say("You don't have enough coins on you!");
                    }
                }
            } else {
                await npc.say(
                    "You'd better get back to running the course if you ever want one"
                );
            }
        }
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
