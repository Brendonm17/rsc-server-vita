// Family Crest (members) quest: Dimintheis, Caleb (chef), Avan, Johnathon, Boot
// and Chronozon; collect the three crest fragments and return the crest.
//
// questStages.familyCrest:
//   0/undefined : not started (talk to Dimintheis in Varrock)
//   1           : find Caleb (chef, Catherby)
//   2           : Caleb wants cooked swordfish/bass/tuna/salmon/shrimp
//   3           : got Caleb's fragment - find Avan
//   4           : found Avan in the scorpion pit near Al Kharid
//   5           : Avan wants a perfect gold ruby ring + necklace (lead: Boot)
//   6           : Boot told you the perfect gold is east of Ardougne
//   7           : gave Avan the jewellery, got his fragment - Johnathon is poisoned
//   8           : cured Johnathon - kill Chronozon for the last fragment
//   -1          : complete
//
// player.cache flags:
//   north_leverA / south_lever / north_leverB : Fitzharmon dungeon lever state (down = true)
//   johnathon_ill      : Johnathon has shown you he is poisoned
//   famcrest_gauntlets : gauntlet enchant id (0 STEEL, 1 GOLDSMITHING, 2 COOKING, 3 CHAOS)
//   skipped_menu       : Caleb's dialogue branch flag
//
// reward: 1 quest point, no xp.
// perfect-gold jewellery production and the gauntlet passive effects live in
// the skill plugins and are not implemented; the quest-side exchanges are.

const { questsEnabled } = require('../custom-gate.js');

// NPCs (rsc-data/config/npcs, ids identical to OpenRSC NpcId)
const DIMINTHEIS_ID = 309;
const CHEF_ID = 310; // Caleb, the 1st son
const AVAN_ID = 307; // the man in the scorpion pit
const JOHNATHON_ID = 314; // the young mage
const BOOT_ID = 313; // Boot the dwarf
const CHRONOZON_ID = 315;

// items (ids identical to OpenRSC ItemId)
const COINS_ID = 10;
const ASHES_ID = 181;
const RUBY_RING_ID = 286; // unused directly (normal); kept for reference
const RUBY_NECKLACE_ID = 291; // unused directly (normal)
const GOLD_BAR_FAMILYCREST_ID = 691;
const RUBY_RING_FAMILYCREST_ID = 692;
const RUBY_NECKLACE_FAMILYCREST_ID = 693;
const FAMILY_CREST_ID = 694;
const CREST_FRAGMENT_ONE_ID = 695;
const CREST_FRAGMENT_TWO_ID = 696;
const CREST_FRAGMENT_THREE_ID = 697;
const STEEL_GAUNTLETS_ID = 698;
const GAUNTLETS_OF_GOLDSMITHING_ID = 699;
const GAUNTLETS_OF_COOKING_ID = 700;
const GAUNTLETS_OF_CHAOS_ID = 701;
const SWORDFISH_ID = 370;
const BASS_ID = 555;
const TUNA_ID = 367;
const SALMON_ID = 357;
const SHRIMP_ID = 350;
const DRUNK_DRAGON_ID = 872; // BLURBERRY_BARMAN_DRUNK_DRAGON in OpenRSC
const DRUNK_DRAGON_MADE_ID = 943; // DRUNK_DRAGON (player-made) in OpenRSC
const FULL_CURE_POISON_ID = 566;
const TWO_CURE_POISON_ID = 567;
const ONE_CURE_POISON_ID = 568;

// fitzharmon dungeon levers
const NORTH_LEVER_A_ID = 316;
const SOUTH_LEVER_ID = 317;
const NORTH_LEVER_B_ID = 318;

// fitzharmon dungeon doors
const DOOR_88_ID = 88; // south-left door
const DOOR_90_ID = 90; // south-right door
const DOOR_91_ID = 91; // front door (hellhound room)
const DOOR_92_ID = 92; // north door

// gauntlet enchant id to item id
const GAUNTLETS = {
    STEEL: { id: 0, item: STEEL_GAUNTLETS_ID },
    GOLDSMITHING: { id: 1, item: GAUNTLETS_OF_GOLDSMITHING_ID },
    COOKING: { id: 2, item: GAUNTLETS_OF_COOKING_ID },
    CHAOS: { id: 3, item: GAUNTLETS_OF_CHAOS_ID }
};

function gauntletCatalogById(id) {
    switch (id) {
        case GAUNTLETS.GOLDSMITHING.id:
            return GAUNTLETS.GOLDSMITHING.item;
        case GAUNTLETS.COOKING.id:
            return GAUNTLETS.COOKING.item;
        case GAUNTLETS.CHAOS.id:
            return GAUNTLETS.CHAOS.item;
        default:
            return GAUNTLETS.STEEL.item;
    }
}

// OpenRSC getGauntletEnchantment: cache int, defaulting to STEEL.
function getGauntletEnchantment(player) {
    if (typeof player.cache.famcrest_gauntlets === 'number') {
        return player.cache.famcrest_gauntlets;
    }
    return GAUNTLETS.STEEL.id;
}

function getStage(player) {
    return player.questStages.familyCrest || 0;
}

// unenchanted steel gauntlets
function hasPlainSteelGauntlets(player) {
    return (
        player.inventory.has(STEEL_GAUNTLETS_ID) &&
        getGauntletEnchantment(player) === GAUNTLETS.STEEL.id
    );
}

// Dimintheis (quest starter, Varrock)

const DIM = { THREE_SONS: 0, TRADITION: 1 };

async function dimintheisThreeSons(player, npc) {
    await npc.say(
        'Well my 3 sons took it with them many years ago',
        'When they rode out to fight in the war',
        'Against the undead necromancer and his army',
        "I didn't hear from them for many years and mourned them dead",
        'However recently I heard word that my son Caleb is alive',
        'trying to earn his fortune',
        'As a great chef, far away in the lands beyond white wolf mountain'
    );
    // do not send over
    const menu = await player.ask([
        'Ok I will help you',
        "I'm not interested in that adventure right now"
    ]);
    if (menu === 0) {
        await player.say('Ok, I will help you');
        await npc.say('I thank you greatly', 'If you find Caleb send him my love');
        player.questStages.familyCrest = 1; // QUEST STARTED
    } else if (menu === 1) {
        await player.say("I'm not interested in that adventure right now");
    }
}

async function dimintheisTradition(player, npc) {
    await npc.say(
        'We have this tradition in the Varrocian arostocracy',
        'Each noble family has an ancient crest',
        'This represents the honour and lineage of the family',
        "If you are to lose this crest, the family's estate is given to the crown",
        'until the crest is returned',
        'In times past when there was much infighting between the various families',
        "Capturing a family's crest meant you captured their land"
    );
    await player.say('so where is this crest?');
    await dimintheisThreeSons(player, npc);
}

async function dimintheisDialogue(player, npc) {
    const { world } = player;
    const stage = getStage(player);

    switch (stage) {
        case 0: {
            await npc.say(
                'Hello, my name is Dimintheis',
                'Of the noble family of Fitzharmon'
            );
            // do not send over
            const menu = await player.ask([
                'Why would a nobleman live in a little hut like this?',
                "You're rich then?, can I have some money?",
                'Hi, I am bold adventurer'
            ]);
            if (menu === 0) {
                await player.say(
                    'Why would a nobleman live in a little hut like this?'
                );
                await npc.say(
                    'The king has taken my estate from me',
                    'Until I can show him my family crest'
                );
                const first = await player.ask(
                    ['Why would he do that?', 'So where is this crest?'],
                    true
                );
                if (first === 0) {
                    await dimintheisTradition(player, npc);
                } else if (first === 1) {
                    await dimintheisThreeSons(player, npc);
                }
            } else if (menu === 1) {
                await player.say("You're rich then?", 'Can I have some money?');
                await npc.say(
                    'Lousy beggar',
                    "There's to many of your sort about these days",
                    'If I gave money to each of you who asked',
                    "I'd be living on the streets myself"
                );
            } else if (menu === 2) {
                await player.say('Hi, I am a bold adventurer');
                await npc.say(
                    'An adventurer hmm?',
                    'I may have an adventure for you',
                    'I desperatly need my family crest returning to me'
                );
                // do not send over
                const menu2 = await player.ask([
                    'Why are you so desperate for it?',
                    'So where is this crest?',
                    "I'm not interested in that adventure right now"
                ]);
                if (menu2 === 0) {
                    await player.say('Why are you desperate for it?');
                    await dimintheisTradition(player, npc);
                } else if (menu2 === 1) {
                    await player.say('so where is this crest?');
                    await dimintheisThreeSons(player, npc);
                } else if (menu2 === 2) {
                    await player.say(
                        "I'm not interested in that adventure right now"
                    );
                }
            }
            break;
        }
        case 1:
            await player.say('Where did you say I could find Caleb?');
            await npc.say(
                'I heard word that my son Caleb is alive trying to earn his ' +
                    'fortune',
                'As a great chef, far away in the lands beyond white wolf ' +
                    'mountain'
            );
            break;
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8: {
            let gaveCrest = false;
            if (player.inventory.has(FAMILY_CREST_ID)) {
                await player.say('I have retrieved your crest');
                player.message('@que@You give the crest to Dimintheis');
                await world.sleepTicks(3);
                player.inventory.remove(FAMILY_CREST_ID);
                gaveCrest = true;
            } else if (
                player.inventory.has(CREST_FRAGMENT_ONE_ID) &&
                player.inventory.has(CREST_FRAGMENT_TWO_ID) &&
                player.inventory.has(CREST_FRAGMENT_THREE_ID)
            ) {
                await player.say('I have retrieved your crest');
                player.message('@que@You give the parts of the crest to Dimintheis');
                player.inventory.remove(CREST_FRAGMENT_ONE_ID);
                player.inventory.remove(CREST_FRAGMENT_TWO_ID);
                player.inventory.remove(CREST_FRAGMENT_THREE_ID);
                gaveCrest = true;
            }

            if (gaveCrest) {
                delete player.cache.north_leverA;
                delete player.cache.south_lever;
                delete player.cache.north_leverB;
                await npc.say(
                    'Thankyou for your kindness',
                    'I cannot express my gratitude enough',
                    'You truly are a great hero'
                );
                completeQuest(player);
                await npc.say(
                    'How can I reward you I wonder?',
                    'I suppose these gauntlets would make a good reward',
                    'If you die you will always retain these gauntlets'
                );
                player.message('@que@Dimintheis gives you a pair of gauntlets');
                player.inventory.add(STEEL_GAUNTLETS_ID);
                player.cache.famcrest_gauntlets = GAUNTLETS.STEEL.id;
                await npc.say(
                    'These gautlets can be granted extra powers',
                    'Take them to one of my boys, they can each do something ' +
                        'to them',
                    'Though they can only receive one of the three powers'
                );
                return;
            }

            await npc.say('How are you doing finding the crest');
            await player.say("I don't have it yet");
            break;
        }
        case -1:
            await npc.say(
                'Thankyou for saving our family honour',
                'We will never forget you'
            );
            // gauntlets recovered on death
            await postQuestGauntletDialogue(player, npc);
            break;
    }
}

async function postQuestGauntletDialogue(player, npc) {
    const { world } = player;
    const gauntletsId = gauntletCatalogById(getGauntletEnchantment(player));

    if (
        !player.inventory.has(gauntletsId) &&
        !player.bank.has(gauntletsId)
    ) {
        const menu = await player.ask(
            ["You're welcome!", "I've lost my gauntlets"],
            true
        );
        if (menu !== 1) {
            return;
        }
        await npc.say(
            "That's unfortunate",
            'However they are magically bound to you',
            'You can get them back by simply dying'
        );
        const menu2 = await player.ask(
            ["Oh okay I'll go do that", "I don't want to die!"],
            true
        );
        if (menu2 !== 1) {
            return;
        }
        await npc.say(
            "I guess that's fair enough",
            'Thankfully I know a bit of magic myself'
        );
        player.message('@que@Dimintheis produces your gauntlets and hands them to you');
        player.inventory.add(gauntletsId);
        await world.sleepTicks(3);
        await npc.say(
            'There you are',
            "I trust you'll take better care of them this time"
        );
    } else {
        await disenchantGauntlets(player, npc);
    }
}

// disenchant: enchanted gauntlets -> steel, for 3 drunk dragons + 200000gp
async function disenchantGauntlets(player, npc) {
    const { world } = player;
    const goldCost = 200000;
    const drunkDragons = 3;
    const enchant = getGauntletEnchantment(player);
    const gauntletsId = gauntletCatalogById(enchant);

    if (
        !player.inventory.has(gauntletsId) ||
        enchant === GAUNTLETS.STEEL.id
    ) {
        return;
    }

    const hasBoughtDrinks = countId(player, DRUNK_DRAGON_ID) >= drunkDragons;
    const hasMadeDrinks = countId(player, DRUNK_DRAGON_MADE_ID) >= drunkDragons;

    if (
        (hasBoughtDrinks || hasMadeDrinks) &&
        player.inventory.has(COINS_ID, goldCost)
    ) {
        const menu = await player.ask(
            ["You're welcome", "I've got your stuff, let's do this"],
            true
        );
        if (menu === 1) {
            for (let i = 0; i < drunkDragons; i += 1) {
                player.message('@que@You give a Drunk dragon to Dimintheis');
                await world.sleepTicks(3);
                if (hasBoughtDrinks) {
                    player.inventory.remove(DRUNK_DRAGON_ID);
                } else if (hasMadeDrinks) {
                    player.inventory.remove(DRUNK_DRAGON_MADE_ID);
                }
            }
            player.message(`@que@You give ${goldCost} coins to Dimintheis`);
            await world.sleepTicks(3);
            player.inventory.remove(COINS_ID, goldCost);
            player.message('@que@You give your gauntlets to Dimintheis');
            await world.sleepTicks(3);
            player.inventory.remove(gauntletsId);
            player.message('@que@Dimintheis takes your gauntlets');
            await world.sleepTicks(3);
            player.message("@que@He mutters some words that you don't understand");
            await world.sleepTicks(3);
            player.message('@que@He hands you back a pair of steel gauntlets');
            await world.sleepTicks(3);
            player.inventory.add(STEEL_GAUNTLETS_ID);
            player.cache.famcrest_gauntlets = GAUNTLETS.STEEL.id;
            await npc.say("It's done", "Just don't tell my kids about this");
        }
    } else {
        const menu = await player.ask(
            ["You're welcome", 'I may have made an error in judgement...'],
            true
        );
        if (menu === 1) {
            await npc.say('How so?');
            const choice = await player.ask(
                [
                    'I should have sided with the demon',
                    'While I love my enchanted gauntlets, I would like a ' +
                        'different enchantment'
                ],
                true
            );
            if (choice === 0) {
                await npc.say('Bit late for that now...');
            } else if (choice === 1) {
                await npc.say(
                    'Alright I can disenchant your gauntlets',
                    'If you do me a favor'
                );
                await player.say("I'm all ears");
                await npc.say(
                    `I'm going to need ${drunkDragons} Drunk dragons and ` +
                        `${goldCost} coins`
                );
                const choice2 = await player.ask(
                    [
                        'Sure no problem',
                        'No way',
                        'How am I supposed to get a dragon drunk?'
                    ],
                    true
                );
                if (choice2 === 2) {
                    await npc.say(
                        "You don't",
                        "It's a fancy-schmancy cocktail made by the little " +
                            'folk that live in trees'
                    );
                    await player.ask(
                        [
                            'Sure I can do that',
                            "That seems like too much effort, I'll pass"
                        ],
                        true
                    );
                }
            }
        }
    }
}

function countId(player, id) {
    let count = 0;
    for (const item of player.inventory.items) {
        if (item.id === id) {
            count += item.definition.stackable ? item.amount : 1;
        }
    }
    return count;
}

// Caleb / Chef (1st son, Catherby)

async function chefHaveYourBit(player, n) {
    await n.say('Well I am the oldest son, by rights it is mine');
    await player.say(
        "It's not a lot of use to you without the rest of it though"
    );
    await n.say(
        'Well true',
        "So I'll tell you what I'll do",
        'I am struggling to complete my seafood salad',
        "I don't seem to be able to get hold of the ingredients I need",
        "Help me and I'll help you"
    );
    await player.say('What are you missing exactly?');
    await n.say('I need cooked swordfish,bass,tuna,salmon and shrimp');
    const menu = await player.ask(
        ['Ok I will get those', "Why don't you just give me the crest?"],
        true
    );
    if (menu === 0) {
        player.questStages.familyCrest = 2;
    } else if (menu === 1) {
        await n.say("No I don't want to just give it away");
    }
}

async function chefInitialDialogue(player, n, option) {
    if (option === 0) {
        await player.say('Are you Caleb Fitzharmon?');
        await n.say('I am he, and who might you be?');
        await player.say(
            'I have been sent by your father',
            'He wants me to retrieve the Fitzharmon family crest'
        );
        await n.say('Ah, yes hmm well I do have a bit of it yes');
        const opt = await player.ask(
            [
                'Err what happened to the rest of crest?',
                'So can I have your bit?'
            ],
            true
        );
        if (opt === 0) {
            await n.say(
                'Well we had a bit of a fight over it',
                'We all wanted to be the heir of our fathers lands',
                'we each ended up with a piece of the crest',
                'none of us wanted to give their piece of the crest up to any ' +
                    'of the others',
                'And none of us wanted to face our father',
                'coming home without a complete crest'
            );
            await player.say('So can I have your bit?');
            await chefHaveYourBit(player, n);
        } else if (opt === 1) {
            await chefHaveYourBit(player, n);
        }
    } else if (option === 1) {
        await player.say('Nothing I will be on my way');
    } else if (option === 2) {
        await player.say('I see you are a chef', 'Will you cook me anything?');
        await n.say(
            'I would, but I am very busy',
            'Trying to prepare my special fish salad',
            'Which I hope will significantly increase my renown as a master chef'
        );
    }
}

async function chefTellCrestStory(player, n) {
    await n.say(
        'Well we had a bit of a fight over it',
        'We all wanted to be the heir of our fathers lands',
        'we each ended up with a piece of the crest',
        'none of us wanted to give their piece of the crest up to any of the ' +
            'others',
        'And none of us wanted to face our father',
        'coming home without a complete crest'
    );
    await player.say(
        'So do you know where I could find any of your brothers?'
    );
    await n.say(
        "Well we haven't really kept in touch",
        'What with all falling out over the crest',
        'I did hear from my brother Avan about a year ago though',
        'He said he was a living in a town in the desert',
        'Ask around the desert and you may find him',
        'My brother has very expensive tastes',
        'He may not give up the crest easily'
    );
}

async function chefDialogue(player, n) {
    const { world } = player;
    const stage = getStage(player);

    switch (stage) {
        case -1:
            if (
                typeof player.cache.famcrest_gauntlets === 'number' &&
                player.cache.famcrest_gauntlets !== GAUNTLETS.STEEL.id
            ) {
                await n.say(
                    'I hear you have bought the completed crest to my father',
                    'Impressive work I must say'
                );
                return;
            }
            await n.say(
                'I hear you have brought the completed crest to my father',
                'Impressive work I must say'
            );
            if (hasPlainSteelGauntlets(player)) {
                await player.say(
                    'My Father says you can improve these gauntlets for me'
                );
                await n.say(
                    'Yes that is true',
                    'I can change them to gauntlets of cooking',
                    'Wearing them means you will burn your lobsters, swordish ' +
                        'and shark less'
                );
                const menu = await player.ask(
                    [
                        'Yes please do that for me',
                        "I'll see what your brothers have to offer first"
                    ],
                    true
                );
                if (menu === 0) {
                    player.message('@que@Caleb holds the gauntlets and closes his eyes');
                    await world.sleepTicks(3);
                    player.message('@que@Caleb concentrates');
                    await world.sleepTicks(3);
                    player.message('@que@Caleb hands the gauntlets to you');
                    await world.sleepTicks(3);
                    player.inventory.remove(STEEL_GAUNTLETS_ID);
                    player.inventory.add(GAUNTLETS_OF_COOKING_ID);
                    player.cache.famcrest_gauntlets = GAUNTLETS.COOKING.id;
                } else if (menu === 1) {
                    await n.say('Ok suit yourself');
                }
            }
            return;
        case 0:
        case 1: {
            await n.say('Who are you? What are you after?');
            if (stage === 0) {
                // do not send over
                const choice = await player.ask([
                    'Nothing, I will be on my way',
                    'I see you are a chef, will you cook me anything?'
                ]);
                if (choice >= 0) {
                    // OpenRSC maps [0,1] here to initialDialogue(choice+1) = [1,2]
                    await chefInitialDialogue(player, n, choice + 1);
                }
            } else {
                // do not send over
                const choice = await player.ask([
                    'Are you Caleb Fitzharmon?',
                    'Nothing, I will be on my way',
                    'I see you are a chef, will you cook me anything?'
                ]);
                await chefInitialDialogue(player, n, choice);
            }
            break;
        }
        case 2:
            await n.say('How is the fish collecting going?');
            if (
                !player.inventory.has(SWORDFISH_ID) ||
                !player.inventory.has(BASS_ID) ||
                !player.inventory.has(TUNA_ID) ||
                !player.inventory.has(SALMON_ID) ||
                !player.inventory.has(SHRIMP_ID)
            ) {
                await player.say("I haven't got all the fish yet");
                await n.say(
                    'Remember I want cooked swordfish, bass, tuna, salmon and ' +
                        'shrimp'
                );
            } else {
                await player.say('Yes i have all of that now');
                player.message('@que@You give all of the fish to Caleb');
                await world.sleepTicks(3);
                player.inventory.remove(SWORDFISH_ID);
                player.inventory.remove(BASS_ID);
                player.inventory.remove(TUNA_ID);
                player.inventory.remove(SALMON_ID);
                player.inventory.remove(SHRIMP_ID);
                player.message('Caleb gives you his piece of the crest');
                player.inventory.add(CREST_FRAGMENT_ONE_ID);
                player.cache.skipped_menu = true;
                player.questStages.familyCrest = 3;
                const m = await player.ask(
                    [
                        'Err what happened to the rest of it?',
                        'Thankyou very much'
                    ],
                    true
                );
                if (m === 0) {
                    await chefTellCrestStory(player, n);
                    delete player.cache.skipped_menu;
                }
            }
            return;
        case 3:
            if (player.cache.skipped_menu) {
                await n.say(
                    "Hello again, I'm just putting the finishing touches to " +
                        'my salad'
                );
                // do not send over
                const menu = await player.ask([
                    'Err what happened to the rest of the crest?',
                    'Good luck with that then'
                ]);
                if (menu === 0) {
                    await player.say(
                        'Err what happened to the rest of the crest?'
                    );
                    await chefTellCrestStory(player, n);
                    delete player.cache.skipped_menu;
                } else if (menu === 1) {
                    await player.say('Good look with that then');
                }
                return;
            }
            await player.say('Where did you say I could find Avan?');
            await n.say(
                'He said he was a living in a town in the desert',
                'Ask around the desert and you may find him'
            );
            return;
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
            await n.say('How are you doing getting the rest of the crest?');
            if (player.inventory.has(FAMILY_CREST_ID)) {
                await player.say('I have found it');
                await n.say('Well done, take it to my father');
            } else if (!player.inventory.has(CREST_FRAGMENT_ONE_ID)) {
                const menu = await player.ask(
                    [
                        'I am still working on it',
                        'I have lost the piece you gave me'
                    ],
                    true
                );
                if (menu === 0) {
                    await n.say('Well good luck in your quest');
                } else if (menu === 1) {
                    await n.say('Ah well here is another one');
                    player.inventory.add(CREST_FRAGMENT_ONE_ID);
                }
            } else {
                await player.say('I am still working on it');
                await n.say('Well good luck in your quest');
            }
            return;
    }
}

// Avan (2nd son, the man in the scorpion pit near Al Kharid)

async function avanDialogue(player, npc) {
    const { world } = player;
    const stage = getStage(player);

    switch (stage) {
        case -1:
            await npc.say(
                'I have heard word from my father',
                'Thankyou for helping to restore our family honour'
            );
            if (hasPlainSteelGauntlets(player)) {
                await player.say(
                    'Your father said that you could improve these Gauntlets ' +
                        'in some way for me'
                );
                await npc.say(
                    'Indeed I can',
                    'In my quest to find the perfect gold I learned a lot',
                    "I can make it so when you're wearing these"
                );
                await npc.say('You gain more experience when smithing gold');
                // do not send over
                const menu = await player.ask([
                    'That sounds good, improve them for me',
                    "I think I'll check my other options with your brothers"
                ]);
                if (menu === 0) {
                    await player.say('That sounds good, enchant them for me');
                    player.message('@que@Avan takes out a little hammer');
                    await world.sleepTicks(3);
                    player.message('@que@He starts pounding on the gauntlets');
                    await world.sleepTicks(3);
                    player.message('@que@Avan hands the gauntlets to you');
                    await world.sleepTicks(3);
                    player.inventory.remove(STEEL_GAUNTLETS_ID);
                    player.inventory.add(GAUNTLETS_OF_GOLDSMITHING_ID);
                    player.cache.famcrest_gauntlets = GAUNTLETS.GOLDSMITHING.id;
                } else if (menu === 1) {
                    await player.say(
                        "I think I'll check my other options with your brothers"
                    );
                    await npc.say(
                        'Ok if you insist on getting help from the likes of them'
                    );
                }
            }
            break;
        case 0:
        case 1:
        case 2:
        case 3:
            await npc.say("Can't you see I'm busy?");
            break;
        case 4: {
            // do not send over
            const menu = await player.ask([
                'Why are you hanging around in a scorpion pit?',
                "I'm looking for a man named Avan"
            ]);
            if (menu === 0) {
                await player.say('Why are you hanging about in a scorpion pit?');
                await npc.say("It's a good place to find gold");
            } else if (menu === 1) {
                await player.say("I'm looking for a man named Avan");
                await npc.say("I'm called Avan yes");
                await player.say(
                    'You have part of a crest',
                    'I have been sent to fetch it'
                );
                await npc.say(
                    'Is one of my good for nothing brothers after it again?'
                );
                await player.say('no your father would like it back');
                await npc.say(
                    'Oh Dad wants it this time',
                    "Well I'll tell you what I'll do",
                    "I'm trying to obtain the perfect jewellry",
                    'There is a lady I am trying to impress',
                    'What I want is a gold ring with a red stone in',
                    'And a necklace to match',
                    'Not just any gold mind you',
                    "The gold in these rocks doesn't seem to be of the best " +
                        'quality',
                    'I want as good a quality as you can get'
                );
                await player.say('Any ideas where I can find that?');
                await npc.say(
                    'Well I have been looking for such gold for a while',
                    'My latest lead was a dwarf named Boot',
                    'Though he has gone back to his home in the mountain now'
                );
                await player.say('Ok I will try to get what you are after');
                player.questStages.familyCrest = 5;
            }
            break;
        }
        case 5:
            await npc.say('So how are you doing getting the jewellry?');
            await player.say("I'm still after that perfect gold");
            await npc.say(
                'Well I have been looking for such gold for a while',
                'My latest lead was a dwarf named Boot',
                'Though he has gone back to his home in the mountain now'
            );
            break;
        case 6:
            await npc.say('So how are you doing getting the jewellry?');
            if (
                player.inventory.has(RUBY_RING_FAMILYCREST_ID) &&
                player.inventory.has(RUBY_NECKLACE_FAMILYCREST_ID)
            ) {
                await player.say('I have it');
                await npc.say('These are brilliant');
                player.message('You exchange the jewellry for a piece of crest');
                player.inventory.remove(RUBY_RING_FAMILYCREST_ID);
                player.inventory.remove(RUBY_NECKLACE_FAMILYCREST_ID);
                player.inventory.add(CREST_FRAGMENT_TWO_ID);
                await npc.say(
                    'These are a fine piece of work',
                    'Such marvelous gold to',
                    'I suppose you will be after the last piece of crest now',
                    'I heard my brother Johnathon is now a young mage',
                    'He is hunting some demon in the wilderness',
                    "But he's not doing a very good job of it",
                    'He spends most his time recovering in an inn',
                    'on the edge of the wilderness'
                );
                player.questStages.familyCrest = 7;
            } else {
                await player.say(
                    'I have spoken to boot about the perfect gold',
                    "I haven't bought you your jewellry yet though"
                );
                await npc.say(
                    'Remember I want a gold ring with a red stone in',
                    'And a necklace to match'
                );
            }
            break;
        case 7:
            await player.say('Where did you say I could find Johnathon again?');
            await npc.say(
                'I heard my brother Johnathon is now a young mage',
                'He is hunting some demon in the wilderness',
                "But he's not doing a very good job of it",
                'He spends most his time recovering in an inn',
                'on the edge of the wilderness'
            );
            break;
        case 8:
            await npc.say('How are you doing getting the rest of the crest?');
            if (player.inventory.has(FAMILY_CREST_ID)) {
                await player.say('I have found it');
                await npc.say('Well done, take it to my father');
            } else if (!player.inventory.has(CREST_FRAGMENT_TWO_ID)) {
                const menu = await player.ask(
                    [
                        'I am still working on it',
                        'I have lost the piece you gave me'
                    ],
                    true
                );
                if (menu === 0) {
                    await npc.say('Well good luck in your quest');
                } else if (menu === 1) {
                    await npc.say('Ah well here is another one');
                    player.inventory.add(CREST_FRAGMENT_TWO_ID);
                }
            } else {
                await player.say('I am still working on it');
                await npc.say('Well good luck in your quest');
            }
            break;
    }
}

// Johnathon (3rd son, the young mage in the wilderness-edge inn)

async function johnathonDefeat(player, npc) {
    await npc.say(
        'Well you will need to be a good mage',
        "And I don't seem to be able to manage it",
        'He will need to be hit by the 4 elemental spells of death',
        'Before he can be defeated'
    );
    const menu = await player.ask(
        [
            'Where can I find Chronozon?',
            'So how did you end up getting poisoned',
            'I will be on my way now'
        ],
        true
    );
    if (menu === 0) {
        await johnathonFind(player, npc);
    } else if (menu === 1) {
        await johnathonPoisoned(player, npc);
    }
}

async function johnathonPoisoned(player, npc) {
    await npc.say(
        "There are spiders towards the entrance to Chronozon's cave",
        'I must have taken a nip from one of them'
    );
    const menu = await player.ask(
        [
            'So is this Chronozon hard to defeat?',
            'Where can I find Chronozon?',
            'I will be on my way now'
        ],
        true
    );
    if (menu === 0) {
        await johnathonDefeat(player, npc);
    } else if (menu === 1) {
        await johnathonFind(player, npc);
    }
}

async function johnathonFind(player, npc) {
    await npc.say(
        'He is in the wilderness, somewhere below the obelisk of air'
    );
    const menu = await player.ask(
        [
            'So is this Chronozon hard to defeat?',
            'So how did you end up getting poisoned',
            'I will be on my way now'
        ],
        true
    );
    if (menu === 0) {
        await johnathonDefeat(player, npc);
    } else if (menu === 1) {
        await johnathonPoisoned(player, npc);
    }
}

async function johnathonDialogue(player, npc) {
    const stage = getStage(player);

    if (stage >= 0 && stage < 7) {
        await npc.say('I am so very tired, leave me to rest');
    } else if (stage === 7) {
        if (player.cache.johnathon_ill) {
            await npc.say(
                'Arrgh what has that spider done to me',
                'I feel so ill, I can hardly think'
            );
            return;
        }
        await player.say('Greetings, are you Johnathon Fitzharmon?');
        await npc.say('That is I');
        await player.say('I seek your fragment of the Fitzharmon family quest');
        await npc.say(
            'The poison it is too much',
            'arrgh my head is all of a spin'
        );
        player.message("Sweat is pouring down Johnathon's face");
        player.cache.johnathon_ill = true;
    } else if (stage === 8) {
        if (player.inventory.has(CREST_FRAGMENT_THREE_ID)) {
            await player.say('I have your part of the crest now');
            await npc.say('Well done take it to my father');
            return;
        }
        await npc.say(
            "I'm trying to kill the demon chronozon  that you mentioned"
        );
        const menu = await player.ask(
            [
                'So is this Chronozon hard to defeat?',
                'Where can I find Chronozon?',
                'Wish me luck'
            ],
            true
        );
        if (menu === 0) {
            await johnathonDefeat(player, npc);
        } else if (menu === 1) {
            await johnathonFind(player, npc);
        } else if (menu === 2) {
            await npc.say('Good luck');
        }
    } else if (stage === -1) {
        await npc.say('Hello again');
        if (hasPlainSteelGauntlets(player)) {
            await player.say(
                'Your father tells me, you can improve these gauntlets a bit'
            );
            await npc.say(
                'He would be right',
                "Though I didn't get good enough at the death spells to " +
                    'defeat chronozon',
                'I am pretty good at the chaos spells',
                'I can enchant your gauntlets so that your bolt spells are ' +
                    'more effective'
            );
            const menu = await player.ask(
                [
                    'That sounds good to me',
                    'I shall see what options your brothers can offer me first'
                ],
                true
            );
            if (menu === 0) {
                player.message('@que@Johnathon waves his staff');
                await player.world.sleepTicks(3);
                player.message('@que@The gauntlets sparkle and shimmer');
                await player.world.sleepTicks(3);
                player.inventory.remove(STEEL_GAUNTLETS_ID);
                player.inventory.add(GAUNTLETS_OF_CHAOS_ID);
                player.cache.famcrest_gauntlets = GAUNTLETS.CHAOS.id;
            }
        } else {
            await npc.say('My family now considers you a hero');
        }
    }
}

// Boot the dwarf (Dwarven mine)

async function bootDialogue(player, n) {
    await n.say('Hello tall person');

    const stage = getStage(player);
    const options = [];
    if (stage === 5) {
        options.push('Hello I\'m in search of very high quality gold');
    }
    options.push('Hello short person');
    options.push('Why are you called boot?');

    const option = await player.ask(options, true);

    if (stage === 5) {
        if (option === 0) {
            await n.say(
                'Hmm well the best gold I know of',
                'is east of the great city of Ardougne',
                'In some certain rocks underground there',
                "Its not the easiest of rocks to get to though I've heard"
            );
            player.questStages.familyCrest = 6;
        } else if (option === 2) {
            await n.say(
                'Because when I was a very young dwarf',
                'I used to sleep in a large boot'
            );
        }
    } else {
        if (option === 1) {
            await n.say(
                'Because when I was a very young dwarf',
                'I used to sleep in a large boot'
            );
        }
    }
}

// free-world (non-members) fallback dialogue

async function freePlayerDialogue(player, npc) {
    if (npc.id === DIMINTHEIS_ID) {
        await npc.say(
            "Hello traveller, can't talk now",
            'maybe you can come back later'
        );
    } else if (npc.id === JOHNATHON_ID) {
        await npc.say('I am so very tired, leave me to rest');
    } else if (npc.id === AVAN_ID) {
        await npc.say("Can't you see I'm busy?");
    }
}

// talk dispatch

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    const members =
        player.world && player.world.members !== undefined
            ? player.world.members
            : true;

    let handler;
    switch (npc.id) {
        case DIMINTHEIS_ID:
            handler = members ? dimintheisDialogue : freePlayerDialogue;
            break;
        case CHEF_ID:
            handler = chefDialogue;
            break;
        case AVAN_ID:
            handler = members ? avanDialogue : freePlayerDialogue;
            break;
        case JOHNATHON_ID:
            handler = members ? johnathonDialogue : freePlayerDialogue;
            break;
        case BOOT_ID:
            handler = bootDialogue;
            break;
        default:
            return false;
    }

    player.engage(npc);
    await handler(player, npc);
    player.disengage();

    return true;
}

// fitzharmon dungeon levers

function leverName(objectId) {
    if (objectId === NORTH_LEVER_A_ID) {
        return 'north_leverA';
    } else if (objectId === SOUTH_LEVER_ID) {
        return 'south_lever';
    } else if (objectId === NORTH_LEVER_B_ID) {
        return 'north_leverB';
    }
    return null;
}

function doLever(player, objectId) {
    if (getStage(player) === -1) {
        player.message('nothing interesting happens');
        return;
    }
    if (typeof player.cache.north_leverA !== 'boolean') {
        player.cache.north_leverA = false;
        player.cache.south_lever = false;
        player.cache.north_leverB = false;
    }
    const name = leverName(objectId);
    player.cache[name] = !player.cache[name];
    player.message(
        `You pull the lever ${player.cache[name] ? 'down' : 'up'}`
    );
    player.message('you hear a clunk');
}

function inspectLever(player, objectId) {
    if (getStage(player) === -1) {
        player.message('nothing interesting happens');
        return;
    }
    const name = leverName(objectId);
    player.message(
        `The lever is ${player.cache[name] ? 'down' : 'up'}`
    );
}

// command one = "Pull"
async function onGameObjectCommandOne(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (
        gameObject.id === NORTH_LEVER_A_ID ||
        gameObject.id === SOUTH_LEVER_ID ||
        gameObject.id === NORTH_LEVER_B_ID
    ) {
        doLever(player, gameObject.id);
        return true;
    }
    return false;
}

// command two = "Inspect"
async function onGameObjectCommandTwo(player, gameObject) {
    if (!questsEnabled(player)) {
        return false;
    }
    if (
        gameObject.id === NORTH_LEVER_A_ID ||
        gameObject.id === SOUTH_LEVER_ID ||
        gameObject.id === NORTH_LEVER_B_ID
    ) {
        inspectLever(player, gameObject.id);
        return true;
    }
    return false;
}

// fitzharmon dungeon doors

async function onWallObjectCommandOne(player, wallObject) {
    if (!questsEnabled(player)) {
        return false;
    }

    const a = !!player.cache.north_leverA;
    const s = !!player.cache.south_lever;
    const b = !!player.cache.north_leverB;
    const hasA = typeof player.cache.north_leverA === 'boolean';
    const hasS = typeof player.cache.south_lever === 'boolean';
    const hasB = typeof player.cache.north_leverB === 'boolean';

    switch (wallObject.id) {
        case DOOR_88_ID:
            if (
                wallObject.x === 509 &&
                wallObject.y === 3441
            ) {
                if ((hasA && hasS && a && s) || (hasA && hasB && hasS && a && b && s)) {
                    player.message('The door swings open');
                    player.message('You go through the door');
                    await player.enterDoor(wallObject);
                } else {
                    player.message('The door is locked');
                }
                return true;
            }
            return false;
        case DOOR_90_ID:
            if (wallObject.x === 512 && wallObject.y === 3441) {
                if (
                    (hasA && hasS && a && !s) ||
                    (hasA && hasB && hasS && a && b && !s)
                ) {
                    player.message('The door swings open');
                    player.message('You go through the door');
                    await player.enterDoor(wallObject);
                } else {
                    player.message('The door is locked');
                }
                return true;
            }
            return false;
        case DOOR_91_ID:
            if (hasA && hasB && hasS && a && b && !s) {
                player.message('The door swings open');
                player.message('You go through the door');
                await player.enterDoor(wallObject);
            } else if (getStage(player) === -1) {
                // free access to the hellhound room after completing the quest
                player.message('The door swings open');
                player.message('You go through the door');
                await player.enterDoor(wallObject);
            } else {
                player.message('The door is locked');
            }
            return true;
        case DOOR_92_ID:
            if (hasA && (hasB || hasS) && !a && (s || b)) {
                player.message('The door swings open');
                player.message('You go through the door');
                await player.enterDoor(wallObject);
            } else {
                player.message('The door is locked');
            }
            return true;
        default:
            return false;
    }
}

// cure poison potion on Johnathon

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    const curePotions = [FULL_CURE_POISON_ID, TWO_CURE_POISON_ID, ONE_CURE_POISON_ID];

    if (npc.id !== JOHNATHON_ID || !curePotions.includes(item.id)) {
        return false;
    }

    const { world } = player;

    player.engage(npc);

    if (getStage(player) === 7) {
        player.message('@que@You feed your potion to Johnathon');
        await world.sleepTicks(3);
        player.inventory.remove(item.id);
        player.questStages.familyCrest = 8;
        if (player.cache.johnathon_ill) {
            delete player.cache.johnathon_ill;
        }
        await npc.say(
            "Wow I'm feeling a lot better now",
            'Thankyou, what can I do for you?'
        );
        await player.say("I'm after your part of the fitzharmon family crest");
        await npc.say(
            "Ooh I don't think I have that anymore",
            'I have been trying to slay chronozon the blood demon',
            'and I think I dropped a lot of my things near him when he drove ' +
                'me away',
            'He will have it now'
        );
        const menu = await player.ask(
            [
                'So is this Chronozon hard to defeat?',
                'Where can I find Chronozon?',
                'So how did you end up getting poisoned'
            ],
            true
        );
        if (menu === 0) {
            await johnathonDefeat(player, npc);
        } else if (menu === 1) {
            await johnathonFind(player, npc);
        } else if (menu === 2) {
            await johnathonPoisoned(player, npc);
        }
    } else {
        player.message('nothing interesting happens');
    }

    player.disengage();
    return true;
}

// chronozon: all four elements required to kill. blast casts set
// player.chronozonWeakened[element]; until all four are set he regenerates on death

const CHRONOZON_ELEMENTS = ['wind', 'water', 'earth', 'fire'];

async function onNPCDeath(player, npc) {
    // victor may be undefined if no player recorded damage; bail safely.
    if (!player || !questsEnabled(player)) {
        return false;
    }

    if (npc.id !== CHRONOZON_ID) {
        return false;
    }

    const { world } = player;

    // Has the player landed all four elemental blasts this fight?
    const weakened = player.chronozonWeakened || {};
    let regenerate = false;

    for (const element of CHRONOZON_ELEMENTS) {
        if (!weakened[element]) {
            regenerate = true;
            break;
        }
    }

    if (regenerate) {
        npc.skills.hits.current = npc.skills.hits.base;
        player.message('Chronozon regenerates');
        // block the default death, chronozon survives
        return true;
    }

    // all 4 elements cast: drop ashes + quest fragment
    world.addPlayerDrop(player, { id: ASHES_ID }, npc.x, npc.y);

    if (getStage(player) === 8) {
        world.addPlayerDrop(
            player,
            { id: CREST_FRAGMENT_THREE_ID },
            npc.x,
            npc.y
        );
    }

    // clear weakening flags
    delete player.chronozonWeakened;

    // allow default death
    return false;
}

// Al-Kharid kebab-seller hint (stages 3-4): points toward Avan in the desert

async function kebabSellerAdamFitzharmon(npc) {
    await npc.say(
        "I haven't seen him",
        "I'm sure if he's been to Al Kharid recently",
        'Someone around here will have seen him though'
    );
}

// gem trader hint (stages 3-4): points to Avan (scorpion pit) and advances to stage 4

async function gemTraderAdamFitzharmon(player, npc) {
    await npc.say(
        'Fitzharmon eh?',
        "Thats the name of a Varrocian noble family if I'm not mistaken",
        'I have seen a man of that persuasion about the place as of late',
        'Wearing a poncey yellow cape',
        'Came to my store, said he was after jewelry made from the perfect gold',
        'Whatever that means',
        "He's round about the desert still, looking for the perfect gold",
        "He'll be somewhere where he might get some gold I'd wager",
        'He might even be desperate enough to brave the scorpions'
    );
    player.questStages.familyCrest = 4;
}

// reward (1 QP, no XP)

function completeQuest(player) {
    player.questStages.familyCrest = -1;
    player.addQuestPoints(1);
    player.message('@gre@You haved gained 1 quest point!');
    player.message('Well done you have completed the family crest quest');
}

module.exports = {
    onTalkToNPC,
    onGameObjectCommandOne,
    onGameObjectCommandTwo,
    onWallObjectCommandOne,
    onUseWithNPC,
    onNPCDeath,
    // reused by src/plugins/npcs/al-kharid/kebab-seller.js (do not remove)
    kebabSellerAdamFitzharmon,
    // reused by src/plugins/npcs/al-kharid/gem-trader.js (do not remove);
    // advances Family Crest stage 3 -> 4
    gemTraderAdamFitzharmon
};
