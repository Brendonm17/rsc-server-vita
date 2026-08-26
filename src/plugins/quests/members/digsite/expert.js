// archaeological expert: 2 qp, mining and herblaw xp, 2 gold bars

const { questsEnabled } = require('../../custom-gate.js');
const {
    ARCHAEOLOGICAL_EXPERT_ID,
    GOLD_NUGGETS_ID,
    GOLD_ID,
    PANNING_TRAY_FULL_ID,
    PANNING_TRAY_GOLD_NUGGET_ID,
    PANNING_TRAY_ID,
    CRACKED_ROCK_SAMPLE_ID,
    TALISMAN_OF_ZAROS_ID,
    DIGSITE_SCROLL_ID,
    UNIDENTIFIED_LIQUID_ID,
    NITROGLYCERIN_ID,
    UNIDENTIFIED_POWDER_ID,
    AMMONIUM_NITRATE_ID,
    MIXED_CHEMICALS_1_ID,
    EXPLOSIVE_COMPOUND_ID,
    MIXED_CHEMICALS_2_ID,
    STONE_TABLET_ID,
    GOLD_BAR_ID,
    BELT_BUCKLE_ID,
    BONES_ID,
    BROKEN_ARROW_ID,
    BROKEN_GLASS_DIGSITE_LVL_2_ID,
    BROKEN_STAFF_ID,
    BUTTONS_ID,
    CERAMIC_REMAINS_ID,
    DAMAGED_ARMOUR_1_ID,
    DAMAGED_ARMOUR_2_ID,
    NEEDLE_ID,
    OLD_BOOT_ID,
    OLD_TOOTH_ID,
    ROCK_SAMPLE_GREEN_ID,
    ROCK_SAMPLE_ORANGE_ID,
    ROCK_SAMPLE_PURPLE_ID,
    ROTTEN_APPLES_ID,
    RUSTY_SWORD_ID,
    VASE_ID
} = require('./constants.js');

function handleReward(player) {
    // reward: message, quest points, xp per skill, clears caches
    player.message('Congratulations, you have finished the digsite quest');

    player.questStages.digsite = -1;
    player.addQuestPoints(2);

    // incStat(MINING, 300, 300) == 300 + 300 * miningLevel
    player.addExperience(
        'mining',
        300 + 300 * player.skills.mining.base,
        false
    );
    // incStat(HERBLAW, 125, 125) == 125 + 125 * herblawLevel
    player.addExperience(
        'herblaw',
        125 + 125 * player.skills.herblaw.base,
        false
    );

    delete player.cache.winch_rope_2;
    delete player.cache.winch_rope_1;
    delete player.cache.digsite_winshaft;
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== ARCHAEOLOGICAL_EXPERT_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.digsite;

    if (stage === -1) {
        await npc.say(
            'Hello again',
            'I am now studying this mysterious altar and its inhabitants',
            'The markings are strange, but it refers to a god I have never',
            'heard of before named Zaros. It must be some pagan superstition.',
            'That was a great find, who knows what other secrets',
            'Lie buried beneath the surface of our land...'
        );
    } else {
        // stages 0..6
        await player.say('Hello, who are you ?');
        await npc.say(
            'Good day to you',
            'My name is Terry balando',
            'I am an expert on digsite finds',
            'I am employed by the museum in varrock',
            'To oversee all finds in this digsite',
            'Anything you find must be reported to me'
        );
        await player.say(
            'Oh, okay if I find anything of interest I will bring it here'
        );
        await npc.say('Very good', 'Can I help you at all ?');

        const menu = await player.ask(
            [
                'I have something I need checking out',
                'No thanks',
                'Can you tell me anything about the digsite?'
            ],
            false
        );

        if (menu === 0) {
            await player.say('I have something I need checking out');
            await npc.say("Okay, give it to me and I'll have a look for you");
        } else if (menu === 1) {
            await player.say('No thanks');
            await npc.say('Good, let me know if you find anything unusual');
        } else if (menu === 2) {
            await player.say('Can you tell me anything about the digsite ?');
            await npc.say(
                'Yes indeed, I am currently studying the lives of the settlers',
                'During the end of the third age, this used to be a great city',
                "It's inhabitants were humans, supporters of the god Saradomin",
                "It's not recorded what happened to the community here",
                'I suspect nobody has lived here for over a millenium!'
            );
        }
    }

    player.disengage();
    return true;
}

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== ARCHAEOLOGICAL_EXPERT_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages.digsite;

    switch (item.id) {
        case GOLD_NUGGETS_ID:
            await player.say('I have these gold nuggets');
            if (player.inventory.has(GOLD_NUGGETS_ID, 3)) {
                player.message('You give the nuggets to the expert');
                player.inventory.remove(GOLD_NUGGETS_ID, 3);
                player.inventory.add(GOLD_ID, 1);
                await npc.say(
                    "Good, that's 3, I can exchange them for normal gold now",
                    'You can get this refined and make a profit!'
                );
                await player.say('Excellent!');
            } else {
                await npc.say(
                    "I can't do much with these nuggets yet",
                    'Come back when you have 3, and I will exchange them for you'
                );
                await player.say("Okay I will, thanks");
            }
            break;

        case PANNING_TRAY_FULL_ID:
            player.message('You give the panning tray to the expert');
            await npc.say('Have you searched this tray yet ?');
            await player.say('Not that I remember');
            await npc.say(
                "It may contain something, I don't want to get my hands dirty"
            );
            player.message('The expert hands the tray back to you');
            break;

        case PANNING_TRAY_GOLD_NUGGET_ID:
            player.message('You give the panning tray to the expert');
            await npc.say('Did you realize there is something in this tray ?');
            await player.say('Err, not really');
            await npc.say('Check it out thoroughly first');
            player.message('The expert hands you back the tray');
            break;

        case PANNING_TRAY_ID:
            player.message('You give the panning tray to the expert');
            await npc.say('I have no need for panning trays');
            break;

        case CRACKED_ROCK_SAMPLE_ID:
            await player.say('I found this rock...');
            await npc.say(
                "What a shame it's cracked, this looks like it would have " +
                    'been a good sample'
            );
            break;

        case TALISMAN_OF_ZAROS_ID:
            await player.say('What about this ?');
            await npc.say(
                'Unusual...',
                "This object doesn't appear right...",
                'Hmmm.....'
            );
            await player.world.sleepTicks(3);
            await npc.say(
                'I wonder...Let me check my guide...',
                'Could it be ? surely not...',
                'From the markings on it it seems to be',
                'a ceremonial ornament to a god named...',
                'Zaros? I have never heard of him before',
                'This is a great discovery, we know very little',
                'of the pagan gods that people worshipped',
                'in the olden days. There is some strange writing',
                'embossed upon it - it says',
                "'Zaros will return and wreak his vengeance",
                "upon Zamorak the pretender' - I wonder what",
                'it means by that? Some silly superstition probably.',
                'Still, I wonder what this is doing around here...',
                "I'll tell you what, as you have found this",
                'I will allow you to use the private dig shaft',
                'You obviously have a keen eye...',
                'Take this letter and give it to one of the workmen',
                'And they will allow you to use it'
            );
            player.message('The expert hands you a letter');
            player.inventory.remove(TALISMAN_OF_ZAROS_ID);
            player.inventory.add(DIGSITE_SCROLL_ID);
            break;

        case UNIDENTIFIED_LIQUID_ID:
            await player.say('Do you know what this is ?');
            await npc.say('Where did you get this ?');
            await player.say('From one of the barrels at the digsite');
            await npc.say(
                'This is a dangerous liquid called nitroglycerin',
                'Be careful how you handle it'
            );
            player.inventory.remove(UNIDENTIFIED_LIQUID_ID);
            player.inventory.add(NITROGLYCERIN_ID);
            break;

        case NITROGLYCERIN_ID:
            await player.say('Can you tell me any more about this ?');
            await npc.say(
                'nitroglycerin...this is a dangerous substance',
                'This is normally mixed with other chemicals',
                'To produce a potent compound...',
                'Be sure not to drop it!',
                'That stuff is highly volatile...'
            );
            break;

        case UNIDENTIFIED_POWDER_ID:
            await player.say('Do you know what this powder is ?');
            await npc.say(
                'Really you do find the most unusual items',
                'I know what this is...',
                "It's called ammonium nitrate - A strong chemical",
                "Why you want this i'll never know..."
            );
            player.inventory.remove(UNIDENTIFIED_POWDER_ID);
            player.inventory.add(AMMONIUM_NITRATE_ID);
            break;

        case MIXED_CHEMICALS_1_ID:
            await player.say('Hey, look at this');
            await npc.say(
                'Hmmm, that looks dangerous...',
                "Handle it carefully and don't drop it!"
            );
            break;

        case EXPLOSIVE_COMPOUND_ID:
            await player.say('What do you think about this ?');
            await npc.say(
                'What have you concocted now ?',
                'Just be careful when playing with chemicals...'
            );
            break;

        case MIXED_CHEMICALS_2_ID:
            await player.say('See what I have done with the compound now');
            await npc.say(
                'Seriously, I think you have a death wish!',
                'What on earth are you going to do with that stuff ?'
            );
            await player.say("I'll find a use for it");
            break;

        case STONE_TABLET_ID:
            if (stage === -1) {
                await npc.say(
                    "I don't need another tablet",
                    'One is enough thank you!'
                );
                break;
            }
            if (stage === 6) {
                await player.say(
                    'I found this in a hidden cavern beneath the digsite'
                );
                player.inventory.remove(STONE_TABLET_ID);
                await npc.say('Incredible!');
                await player.say(
                    'There is an altar down there',
                    'The place is crawling with skeletons!'
                );
                await npc.say(
                    'Yuck!',
                    'This is an amazing discovery!',
                    'All this while we were convinced...',
                    'That no other race had lived here',
                    'It seems the followers of Saradomin',
                    'Have tried to cover up the evidence of the zaros altar',
                    'This whole city must have been built over it!',
                    'Thanks for your help',
                    'Your sharp eyes have spotted what many have missed...',
                    'Here, take this as your reward'
                );
                player.message('The expert gives you 2 gold bars as payment');
                player.inventory.add(GOLD_BAR_ID, 2);
                handleReward(player);
            }
            break;

        case BELT_BUCKLE_ID:
            // belt buckle shares an id with cracked rock sample; that case wins
            await player.say('Have a look at this unusual item');
            await npc.say(
                'Let me see..',
                'This is a belt buckle',
                'I should imagine it came from a guard'
            );
            break;

        case BONES_ID:
            await player.say('Have a look at these bones');
            await npc.say(
                'Ah yes, a fine bone example',
                'No noticeable fractures, and in good condition',
                'There are common cow bones however',
                'They have no archaeological value'
            );
            break;

        case BROKEN_ARROW_ID:
            await player.say('Have a look at this arrow');
            await npc.say(
                'No doubt this arrow was shot by a strong warrior',
                "It's split in half!",
                'It is not a valuable object though...'
            );
            break;

        case BROKEN_GLASS_DIGSITE_LVL_2_ID:
            await player.say('Have a look at this glass');
            await npc.say(
                'Hey you should be careful of that',
                'It might cut your fingers, throw it away!'
            );
            break;

        case BROKEN_STAFF_ID:
            await player.say('Have a look at this staff');
            await npc.say(
                'Look at this...interesting',
                'This appers to belong to a cleric of some kind',
                'Certainly not a follower of saradomin however...',
                'I wonder if there was another civilization before the ' +
                    'saradominists ?'
            );
            break;

        case BUTTONS_ID:
            await player.say('I found these buttons');
            await npc.say(
                "Let's have a look",
                'Ah, I think these are from the nobility',
                'Perhaps a royal servant ?',
                'Not valuable but an unusual find for this area'
            );
            break;

        case CERAMIC_REMAINS_ID:
            await player.say('I found some potery pieces');
            await npc.say(
                'Yes many parts are discovered',
                'The inhabitants of these parts were great potters...'
            );
            await player.say('You mean they were good at using potions ?');
            await npc.say(
                'No no silly - they are were known for their skill with clay'
            );
            break;

        case DAMAGED_ARMOUR_1_ID:
            await player.say('I found some old armour');
            await npc.say(
                'Hmm...unusual',
                "This armour dosen't seem to match with the other finds",
                'Keep looking, this could be evidence of an older ' +
                    'civilization!'
            );
            break;

        case DAMAGED_ARMOUR_2_ID:
            await player.say('I found some armour');
            await npc.say(
                'It looks like the wearer of this fought a mighty battle'
            );
            break;

        case NEEDLE_ID:
            await player.say('I found a needle');
            await npc.say(
                'Hmm yes, I wondered why this race were so well dressed!',
                'It looks like they had a mastery of needlework'
            );
            break;

        case OLD_BOOT_ID:
            await player.say('Have a look at this');
            await npc.say(
                'Ah yes, an old boot',
                'Not really an ancient artifact is it?'
            );
            break;

        case OLD_TOOTH_ID:
            await player.say('Hey look at this');
            await npc.say(
                'Oh, an old tooth',
                '..It looks like it has come from a mighty being'
            );
            break;

        case DIGSITE_SCROLL_ID:
            await npc.say("There's no point in giving me this back!");
            break;

        case ROCK_SAMPLE_GREEN_ID:
        case ROCK_SAMPLE_ORANGE_ID:
        case ROCK_SAMPLE_PURPLE_ID:
            await player.say('Have a look at this rock');
            if (item.id === ROCK_SAMPLE_ORANGE_ID) {
                await npc.say(
                    'This rock has been picked at',
                    'It looks like it could belong to someone...'
                );
            } else if (item.id === ROCK_SAMPLE_GREEN_ID) {
                await npc.say(
                    'This has been partly prepared',
                    'It looks like it may belong to someone...'
                );
            } else if (item.id === ROCK_SAMPLE_PURPLE_ID) {
                await npc.say(
                    'This rock is not naturally formed',
                    'It looks like it might belong to someone...'
                );
            }
            break;

        case ROTTEN_APPLES_ID:
            await player.say('I found these...');
            await npc.say('Ew! throw them away this instant!');
            break;

        case RUSTY_SWORD_ID:
            await player.say('I found an old sword');
            await npc.say(
                "Oh, its very rusty isn't it ?",
                "I'm not sure this sword belongs here",
                'It looks very out of place...'
            );
            break;

        case VASE_ID:
            await player.say('I found a vase');
            await npc.say(
                'Ah yes these are commonly found in these parts',
                'Not a valuable item'
            );
            break;

        default:
            player.message('Nothing interesting happens');
            break;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC, onUseWithNPC };
