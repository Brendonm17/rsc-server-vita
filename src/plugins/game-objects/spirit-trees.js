// spirit tree network: 3 trees gated on quest completion

const STRONGHOLD_SPIRIT_TREE_ID = 661;
const TREE_GNOME_VILLAGE_SPIRIT_TREE_ID = 390;
const YOUNG_SPIRIT_TREE_ID = 391;

const PLAGUE_SAMPLE_ID = 812;

async function breakPlagueSample(player) {
    if (!player.inventory.has(PLAGUE_SAMPLE_ID)) {
        return;
    }

    player.message('@que@the plague sample is too delicate...');
    await player.world.sleepTicks(1);
    player.message('@que@it disintegrates in the crossing');

    while (player.inventory.has(PLAGUE_SAMPLE_ID)) {
        player.inventory.remove(PLAGUE_SAMPLE_ID);
    }
}

function questComplete(player, questKey) {
    return player.questStages[questKey] === -1;
}

async function onGameObjectCommandOne(player, gameObject) {
    const { world } = player;

    if (gameObject.id === STRONGHOLD_SPIRIT_TREE_ID) {
        if (!questComplete(player, 'grandTree')) {
            player.message('@que@the tree doesn\'t feel like talking');
            return true;
        }

        player.message('@que@The tree talks in an old tired voice...');
        await world.sleepTicks(3);
        player.message(
            '@que@@yel@Spirit Tree: You friend of gnome people, you friend of mine'
        );
        await world.sleepTicks(3);
        player.message(
            '@que@@yel@Spirit Tree: Would you like me to take you somewhere?'
        );
        await world.sleepTicks(3);

        const choice = await player.ask(
            ['No thanks old tree', 'Where can i go?'],
            false
        );

        if (choice === 0) {
            await player.say('no thanks old tree');
            return true;
        }

        await player.say('where can i go?');
        player.message('@que@The tree talks again..');
        await world.sleepTicks(3);
        player.message('@que@@yel@Spirit Tree: You can travel to the trees');
        await world.sleepTicks(3);
        player.message('@que@@yel@Spirit Tree: Which are related to myself');
        await world.sleepTicks(3);

        const dest = await player.ask(
            [
                'Battlefield of Khazard',
                'Forest north of Varrock',
                'the gnome tree village'
            ],
            false
        );

        player.message(
            '@que@You place your hands on the dry tough bark of the spirit tree'
        );
        await world.sleepTicks(3);
        player.message('@que@and feel a surge of energy run through your veins');
        await world.sleepTicks(3);

        await breakPlagueSample(player);

        if (dest === 0) {
            player.teleport(629, 629, false);
        } else if (dest === 1) {
            player.teleport(161, 453, false);
        } else if (dest === 2) {
            player.teleport(656, 694, false);
        }

        return true;
    }

    if (gameObject.id === TREE_GNOME_VILLAGE_SPIRIT_TREE_ID) {
        if (!questComplete(player, 'treeGnomeVillage')) {
            player.message('@que@The tree doesn\'t feel like talking');
            return true;
        }

        player.message('@que@The tree talks in an old tired voice...');
        await world.sleepTicks(3);
        player.message(
            '@que@@yel@Spirit Tree: You friend of gnome people, you friend of mine'
        );
        await world.sleepTicks(3);
        player.message(
            '@que@@yel@Spirit Tree: Would you like me to take you somewhere?'
        );
        await world.sleepTicks(3);

        const choice = await player.ask(
            ['No thanks old tree', 'Where can i go?'],
            false
        );

        if (choice === 0) {
            await player.say('no thanks old tree');
            return true;
        }

        await player.say('where can i go?');
        player.message('@que@The tree talks again..');
        await world.sleepTicks(3);
        player.message('@que@@yel@Spirit Tree: You can travel to the trees');
        await world.sleepTicks(3);
        player.message('@que@@yel@Spirit Tree: Which are related to myself');
        await world.sleepTicks(3);

        const dest = await player.ask(
            [
                'Battlefield of Khazard',
                'Forest north of Varrock',
                'the gnome stronghold'
            ],
            false
        );

        player.message(
            '@que@You place your hands on the dry tough bark of the spirit tree'
        );
        await world.sleepTicks(3);
        player.message('@que@and feel a surge of energy run through your veins');
        await world.sleepTicks(3);

        await breakPlagueSample(player);

        if (dest === 0) {
            player.teleport(629, 629, false);
        } else if (dest === 1) {
            player.teleport(161, 453, false);
        } else if (dest === 2) {
            player.teleport(703, 487, false);
        }

        return true;
    }

    if (gameObject.id === YOUNG_SPIRIT_TREE_ID) {
        if (!questComplete(player, 'treeGnomeVillage')) {
            player.message('@que@The tree doesn\'t feel like talking');
            return true;
        }

        player.message('@que@The young spirit tree talks..');
        player.message('@que@@yel@Young Spirit Tree: Hello gnome friend');
        await world.sleepTicks(3);
        player.message(
            '@que@@yel@Young Spirit Tree: Would you like to travel to the ' +
                'home of the tree gnomes?'
        );
        await world.sleepTicks(3);

        const choice = await player.ask(['No thank you', 'Yes please'], false);

        if (choice === 0) {
            await player.say('No thank you');
            return true;
        }

        await player.say('Yes please');
        player.message(
            '@que@You place your hands on the dry tough bark of the spirit tree'
        );
        await world.sleepTicks(3);
        player.message('@que@and feel a surge of energy run through your veins');
        await world.sleepTicks(3);

        await breakPlagueSample(player);

        player.teleport(658, 695, false);

        return true;
    }

    return false;
}

module.exports = { onGameObjectCommandOne };
