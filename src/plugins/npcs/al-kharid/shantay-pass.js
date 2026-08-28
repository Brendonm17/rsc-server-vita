// shantay pass: shopkeeper, assistant, and gate guards

const SHANTAY_ID = 549;
const ASSISTANT_ID = 720;
const SHANTAY_PASS_GUARD_STANDING_ID = 717;
const SHANTAY_PASS_GUARD_MOVING_ID = 719;

const COINS_ID = 10;
const SHANTAY_DESERT_PASS_ID = 1030;
const A_FREE_SHANTAY_DISCLAIMER_ID = 1099;
// kebab recipe ground-item drop, 1-in-25 from shantay
const SCRUMPLED_PIECE_OF_PAPER_ID = 1120;

const SHOP_NAME = 'shantay-pass';

const IronmanMode = { Ultimate: 2 };

// Java: sendToPortSarim(player, n, path)
async function sendToPortSarim(player, npc, path) {
    if (path === 0) {
        await npc.say(
            'You are to be transported to a maximum security prison in ' +
                'Port Sarim.',
            "I hope you've learnt an important lesson from this."
        );
    } else if (path === 1) {
        await npc.say(
            'Very well, I grow tired of you, ' +
                "you'll be taken to a new jail in Port Sarim."
        );
    }

    player.teleport(281, 665, false);
    delete player.cache.shantay_jail;
}

// shared "pay 5gp or go to port sarim" sub-flow
async function payFineOrBank(player, npc, isShantay) {
    if (player.inventory.has(COINS_ID, 5)) {
        player.message('You hand over five gold pieces to Shantay.');
        await npc.say('Great Effendi, now please try to keep the peace.');

        if (isShantay) {
            player.message('Shantay unlocks the door to the cell.');
        } else {
            player.message('The assistant unlocks the door to the cell.');
        }

        player.inventory.remove(COINS_ID, 5);
        delete player.cache.shantay_jail;

        return false; // inJail = false
    }

    await npc.say(
        "You don't have that kind of cash on you I see.",
        'But perhaps you have some in your bank?',
        'You can transfer some money from your bank and pay the fine.',
        'or you will be sent to a maximum security prison in Port Sarim.',
        'Which is it going to be?'
    );

    const menu8 = await player.ask(
        ["I'll pay the fine.", "I'm not paying the fine!"],
        false
    );

    if (menu8 === 0) {
        await player.say("I'll pay the fine.");

        if (player.isIronMan(IronmanMode.Ultimate)) {
            player.message('As an Ultimate Ironman, you cannot use the bank.');
            return true;
        }

        await npc.say("Ok then..., you'll need access to your bank.");
        player.bank.open();
        delete player.cache.shantay_jail;

        return false; // inJail = false
    } else if (menu8 === 1) {
        await player.say("No thanks, you're not having my money.");
        await sendToPortSarim(player, npc, 1);
        return false; // inJail = false
    }

    return true;
}

// "what is this place?" outlaw/inexperienced/adventurer tree
async function whatIsThisPlace(player, npc, isShantay) {
    if (player.cache.shantay_in_jail) {
        await npc.say(
            'You should be in jail!',
            'Well, no doubt the authorities in Port Sarim know what ' +
                "they're doing.",
            "But if you get into any more trouble, you'll be stuck back " +
                'in jail.'
        );
        delete player.cache.shantay_in_jail;
        return;
    }

    await npc.say('This is the pass of Shantay.');

    if (isShantay) {
        await npc.say(
            'I guard this area with my men.',
            'I am responsible for keeping this pass open and repaired.',
            'My men and I prevent outlaws from getting out of the desert.',
            'And we stop the inexperienced from a dry death in the sands.'
        );
    } else {
        await npc.say(
            'Mr Shantay guards this area with his men.',
            'He is responsible for keeping this pass open and repaired.',
            'He and his men prevent outlaws from getting out of the desert.',
            'And he stops the inexperienced from a dry death in the sands.'
        );
    }

    await npc.say('Which would you say you were?');

    const menu2 = await player.ask(
        [
            'I am definitely an outlaw, prepare to die!',
            'I am a little inexperienced.',
            "Er, neither, I'm an adventurer."
        ],
        false
    );

    if (menu2 === 0) {
        await npc.say(
            'Ha, very funny.....',
            'The guards seize you and drag you off to the cells!'
        );
        player.message('The guards arrest you and place you in the jail.');

        if (isShantay) {
            player.teleport(67, 729, false);
            player.cache.shantay_jail = true;
        }

        await npc.say(
            "You'll have to stay in there until you pay the fine of five " +
                'gold pieces.',
            'Do you want to pay now?'
        );

        player.cache.shantay_in_jail = true;

        const menu6 = await player.ask(
            ['Yes, Ok.', "No thanks, you're not having my money."],
            false
        );

        if (menu6 === 0) {
            await npc.say('Good, I see that you have come to your senses.');
            player.cache.shantay_in_jail = await payFineOrBank(
                player,
                npc,
                isShantay
            );
        } else if (menu6 === 1) {
            await npc.say(
                'You have a choice.',
                'You can either pay five gold pieces or...',
                'You can be transported to a maximum security prison in ' +
                    'Port Sarim.',
                'Will you pay the five gold pieces?'
            );

            const menu7 = await player.ask(
                ['Yes, Ok.', 'No, do your worst!'],
                false
            );

            if (menu7 === 0) {
                await npc.say(
                    'Good, I see that you have come to your senses.'
                );
                player.cache.shantay_in_jail = await payFineOrBank(
                    player,
                    npc,
                    isShantay
                );
            } else if (menu7 === 1) {
                await sendToPortSarim(player, npc, 0);
                delete player.cache.shantay_in_jail;
            }
        }
    } else if (menu2 === 1) {
        await npc.say(
            'Can I recommend that you purchase a full waterskin and a knife!',
            'These items will no doubt save your life...',
            'A waterskin will keep water from evaporating in the desert.',
            'And a keen woodsman with a knife can extract the juice from a ' +
                'cactus.',
            "Before you go into the desert, it's advisable to wear desert " +
                'clothes.',
            "It's very hot in the desert and you'll surely cook if you " +
                'wear armour.',
            'To  keep the pass open and bandit free, we charge a small ' +
                'toll of five gold pieces.',
            isShantay
                ? 'You can buy a desert pass from me, just ask me the open ' +
                      'the shop.'
                : 'You can buy a desert pass from me, just ask me to open ' +
                      'the shop.',
            'You can also use our free banking services by clicking on the ' +
                'chest.'
        );

        const menu5 = await player.ask(
            ['Can I see what you have to sell please?', 'I must be going.'],
            false
        );

        if (menu5 === 0) {
            await npc.say('Absolutely Effendi!');
            player.disengage();
            player.openShop(SHOP_NAME);
            return;
        } else if (menu5 === 1) {
            await npc.say(' So long...');
        }
    } else if (menu2 === 2) {
        await npc.say(
            'Great, I have just the thing for the desert adventurer.',
            'I sell desert clothes which will keep you cool in the heat of ' +
                'the desert.',
            "I also sell waterskins so that you won't die in the desert.",
            'A waterskin and a knife help you survive from the juice of a ' +
                'cactus.',
            "Use the chest to store your items, we'll take them to the bank.",
            "It's hot in the desert, you'll bake in all that armour.",
            'To keep the pass open we ask for 5 gold pieces.',
            'and we give you a Shantay Pass, just ask to see what I sell ' +
                'to buy one.'
        );

        const menu3 = await player.ask(
            [
                'Can I see what you have to sell please?',
                'I must be going.',
                'Why do I have to pay to go into the desert?'
            ],
            false
        );

        if (menu3 === 0) {
            await npc.say('Absolutely Effendi!');
            player.disengage();
            player.openShop(SHOP_NAME);
            return;
        } else if (menu3 === 1) {
            await npc.say('So long...');
        } else if (menu3 === 2) {
            if (isShantay) {
                player.message(
                    'Shantay opens his arms wide as if too embrace you.'
                );
                await npc.say(
                    'Effendi, you insult me!',
                    'I am not interested in making a profit from you!'
                );
            } else {
                player.message(
                    'The Assistant opens his arms wide as if too embrace you.'
                );
                await npc.say(
                    'Effendi, you insult me!',
                    'We are not interested in making a profit from you!'
                );
            }

            await npc.say(
                'I merely seek to cover my expenses in keeping this pass ' +
                    'open.',
                'There is repair work to carry out and also the mens ' +
                    'wages to consider.',
                'For the paltry sum of 5 Gold pieces, I think we offer a ' +
                    'great service.'
            );

            const menu4 = await player.ask(
                [
                    'Can I see what you have to sell please?',
                    'I must be going.'
                ],
                false
            );

            if (menu4 === 0) {
                // Java: empty branch (bug preserved 1:1 - menu4==0 does nothing)
            } else if (menu4 === 1) {
                await npc.say(' Absolutely Effendi!');
                player.disengage();
                player.openShop(SHOP_NAME);
                return;
            }
        }
    }
}

// guard's own talk-to conversation: pass sale and gate walkthrough
async function standingGuardDialogue(player, npc) {
    await npc.say('Hello there!', 'What can I do for you?');

    const menu = await player.ask(
        ["I'd like to go into the desert please.", 'Nothing thanks.'],
        false
    );

    if (menu === 0) {
        await npc.say('Of course!');

        if (!player.inventory.has(SHANTAY_DESERT_PASS_ID)) {
            await npc.say(
                "You'll need a Shantay pass to go through the gate into " +
                    'the desert.',
                "See Shantay, he'll sell you one for a very reasonable price."
            );

            return;
        }

        let menus;

        if (!player.inventory.has(A_FREE_SHANTAY_DISCLAIMER_ID)) {
            player.message(
                'There is a large poster on the wall near the gateway. It ' +
                    'reads..'
            );
            player.message(
                'The Desert is a VERY Dangerous place...do not enter if ' +
                    'you are scared of dying.'
            );
            player.message(
                'Beware of high temperatures, sand storms, robbers, and ' +
                    'slavers...'
            );
            player.message('No responsibility is taken by Shantay ');
            player.message(
                'If anything bad should happen to you in any circumstances ' +
                    'whatsoever.'
            );
            player.message(
                'That seems pretty scary! Are you sure you want to go ' +
                    'through?'
            );

            menus = await player.ask(
                [
                    "Yeah, that poster doesn't scare me!",
                    "No, I'm having serious second thoughts now."
                ],
                false
            );
        } else {
            player.message(
                'A poster on the wall says exactly the same as the ' +
                    'disclaimer.'
            );
            player.message('Are you sure you want to go through?');

            menus = await player.ask(
                [
                    "Yeah, I'm not scared!",
                    "No, I'm having serious second thoughts now."
                ],
                false
            );
        }

        if (menus === 0) {
            await npc.say('Can I see your Shantay Desert Pass please.');
            player.message('You hand over a Shantay Pass.');
            player.inventory.remove(SHANTAY_DESERT_PASS_ID);
            await player.say('Sure, here you go!');

            if (!player.inventory.has(A_FREE_SHANTAY_DISCLAIMER_ID)) {
                await npc.say(
                    'Here, have a disclaimer...',
                    "It means that Shantay isn't responsible if you die in " +
                        'the desert.'
                );
                player.message('The guard gives you a disclaimer.');
                player.inventory.add(A_FREE_SHANTAY_DISCLAIMER_ID);
            }

            player.message('you go through the gate');
            player.teleport(62, 735);
        } else if (menus === 1) {
            player.message(
                'You decide that your visit to the desert can be ' +
                    'postponed..'
            );
            player.message('Perhaps indefinitely!');
        }
    } else if (menu === 1) {
        await npc.say('Ok then, have a nice day.');
    }
}

async function onTalkToNPC(player, npc) {
    if (
        npc.id !== SHANTAY_ID &&
        npc.id !== ASSISTANT_ID &&
        npc.id !== SHANTAY_PASS_GUARD_STANDING_ID &&
        npc.id !== SHANTAY_PASS_GUARD_MOVING_ID
    ) {
        return false;
    }

    // members-only gate, reproduced for parity
    if (!player.world.members) {
        return true;
    }

    player.engage(npc);

    if (npc.id === SHANTAY_PASS_GUARD_STANDING_ID) {
        await standingGuardDialogue(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === SHANTAY_PASS_GUARD_MOVING_ID) {
        await npc.say(
            'Go talk to Shantay or one of his assistants.',
            "I'm on duty and I don't have time to talk to the likes of you!"
        );
        player.message('The guard seems quite bad tempered,');
        player.message(
            'probably from having to wear heavy armour in this intense heat.'
        );
        player.disengage();
        return true;
    }

    const isShantay = npc.id === SHANTAY_ID;

    if (isShantay) {
        // Java: 1-in-25 chance to drop the kebab recipe scrumpled paper.
        if (Math.floor(Math.random() * 25) === 0) {
            player.world.addPlayerDrop(
                player,
                { id: SCRUMPLED_PIECE_OF_PAPER_ID },
                npc.x,
                npc.y
            );
        }

        await npc.say('Hello Effendi, I am Shantay.');

        if (!player.inventory.has(A_FREE_SHANTAY_DISCLAIMER_ID)) {
            await npc.say(
                "I see you're new!",
                'Make sure you read the poster before going into the desert.'
            );
        }

        // tourist trap quest-stage hint
        if (player.questStages && player.questStages.touristTrap === 0) {
            await npc.say(
                'There is a heartbroken Mother just past the gates and in ' +
                    'the Desert.',
                "Her name is Irena and she mourns her lost Daughter. Such a " +
                    'shame.'
            );
        }
    } else {
        // Assistant
        await npc.say('Hello Effendi, I am a Shantay Pass Assistant.');

        if (!player.inventory.has(A_FREE_SHANTAY_DISCLAIMER_ID)) {
            await npc.say(
                "I see you're new!",
                'Make sure you read the poster before going into the desert.'
            );
        }
    }

    const menu = await player.ask(
        [
            'What is this place?',
            'Can I see what you have to sell please?',
            'I must be going.'
        ],
        false
    );

    if (menu === 0) {
        await whatIsThisPlace(player, npc, isShantay);
    } else if (menu === 1) {
        await npc.say('Absolutely Effendi!');
        player.disengage();
        player.openShop(SHOP_NAME);
        return true;
    } else if (menu === 2) {
        await npc.say('So long...');
    }

    player.disengage();
    return true;
}

// picking up the disclaimer prompts to read it immediately
async function onGroundItemTake(player, groundItem) {
    if (groundItem.id !== A_FREE_SHANTAY_DISCLAIMER_ID) {
        return false;
    }

    player.message(
        'This looks very important indeed, would you like to read it now?'
    );
    player.inventory.add(A_FREE_SHANTAY_DISCLAIMER_ID);
    player.world.removeEntity('groundItems', groundItem);

    const menu = await player.ask(
        ['Yes, ' + "I'll read it now!", "No thanks, it'll keep!"],
        false
    );

    if (menu === 0) {
        player.message('*** Shantay Disclaimer***');
        player.message('The Desert is a VERY Dangerous place.');
        player.message("Do not enter if you're scared of dying.");
        player.message('Beware of high temperatures, sand storms, and slavers');
        player.message('No responsibility is taken by Shantay');
        player.message(
            'If anything bad happens to you under any circumstances.'
        );
    } else if (menu === 1) {
        player.message('You decide not to read the disclaimer.');
    }

    return true;
}

module.exports = { onTalkToNPC, onGroundItemTake };
