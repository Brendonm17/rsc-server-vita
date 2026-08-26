
const QUEST_KEY = 'merlinsCrystal';
const ARHEIN_ID = 280;

async function shipBranchDialogue(player, npc, option) {
    if (option === 0) {
        await player.say('Do you deliver to the fort just down the coast?');
        await npc.say(
            'Yes I do have orders to deliver there from time to time',
            'I think I may have some bits and pieces for them',
            'when I leave here next actually'
        );

        const option2 = await player.ask(
            [
                'Can you drop me off on the way down please',
                "Aren't you worried about supplying evil knights?"
            ],
            false
        );

        if (option2 === 0) {
            await player.say('can you drop me off on the way down please');
            await npc.say(
                "I don't think Sir Mordred would like that",
                'He wants as few outsiders visiting as possible',
                "I wouldn't want to lose his buisness"
            );
        } else if (option2 === 1) {
            await player.say("Aren't you worried about supplying evil knights");
            await npc.say(
                'Hey you gotta take business where you can find it these days',
                "Besides if I didn't supply them, someone else would"
            );
        }
    } else if (option === 1) {
        await player.say('Where do you deliver to?');
        await npc.say(
            'Oh various places up and down the coast',
            'Mostly Karamja and Port Sarim'
        );

        const option2 = await player.ask(
            [
                "I don't suppose I could get a lift anywhere?",
                'Well good luck with your buisness'
            ],
            false
        );

        if (option2 === 0) {
            await player.say("I don't suppose I could get a lift anywhere?");
            await npc.say("I'm not quite ready to sail yet");
        } else if (option2 === 1) {
            await player.say('Well good luck with your business');
        }
    } else if (option === 2) {
        await player.say('Are you rich then?');
        await npc.say(
            'Business is going reasonably well',
            "I wouldn't say I was the richest of merchants ever",
            "But I'm doing reasonably well"
        );
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== ARHEIN_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Hello would you like to trade');

    // Java multi(player, n, options...) defaults send-over true.
    const option = await player.ask(
        ['Yes ok', 'No thankyou', 'Is that your ship?'],
        true
    );

    if (option === 0) {
        player.disengage();
        player.openShop('arheins-general');
        return true;
    } else if (option === 2) {
        await npc.say(
            'Yes I use it to make deliver my goods up and down the coast',
            'These crates here are all ready for my next trip'
        );

        let menuOptions = ['Where do you deliver too?', 'Are you rich then?'];
        let offset = 0;

        if (player.questStages[QUEST_KEY] === 2) {
            menuOptions = [
                'Do you deliver to the fort just down the coast?',
                'Where do you deliver too?',
                'Are you rich then?'
            ];
        } else {
            offset = 1;
        }

        const shipOption = await player.ask(menuOptions, false);
        await shipBranchDialogue(player, npc, shipOption + offset);
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
