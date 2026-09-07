// showing shilo village artifacts to trufitus

const { questsEnabled } = require('../../custom-gate.js');
const {
    TRUFITUS_ID,
    STONE_PLAQUE_ID,
    CRUMPLED_SCROLL_ID,
    TATTERED_SCROLL_ID,
    ZADIMUS_CORPSE_ID,
    BONE_KEY_ID,
    BONE_SHARD_ID,
    LOCATING_CRYSTAL_ID,
    BERVIRIUS_TOMB_NOTES_ID,
    SWORD_POMMEL_ID,
    RASHILIYA_CORPSE_ID
} = require('./ids.js');

const HANDLED_ITEMS = new Set([
    STONE_PLAQUE_ID,
    CRUMPLED_SCROLL_ID,
    TATTERED_SCROLL_ID,
    ZADIMUS_CORPSE_ID,
    BONE_KEY_ID,
    BONE_SHARD_ID,
    LOCATING_CRYSTAL_ID,
    BERVIRIUS_TOMB_NOTES_ID,
    SWORD_POMMEL_ID,
    RASHILIYA_CORPSE_ID
]);

// generic "quest complete, not much use" response
async function notMuchUse(player, npc) {
    await player.say('Have a look at this.');
    await npc.say(
        "Hmmm, I'm not sure you will get much use out of this.",
        'Why not see if you can sell it in Shilo Village.'
    );
}

async function bronzeNecklaceChat(player, npc) {
    await npc.say(
        'Well, Bwana, I would guess that you would need',
        'to get some bronze metal and work it into something',
        'that could be turned into a necklace?'
    );
    const option3 = await player.ask(
        ['What should I put on the necklace?', 'Thanks!'],
        true
    );
    if (option3 === 0) {
        await putOnNecklaceChat(player, npc);
    } else if (option3 === 1) {
        await npc.say(
            "You're more than welcome Bwana!",
            'Good luck for the rest of your quest.'
        );
    }
}

async function putOnNecklaceChat(player, npc) {
    await npc.say(
        "Perhaps Zadimus's clue has the answer?",
        'Now, what was it that he said again?',
        'Something about kin and keys?'
    );
    const option2 = await player.ask(
        ['How do I make a bronze necklace?', 'Thanks!'],
        true
    );
    if (option2 === 0) {
        await bronzeNecklaceChat(player, npc);
    } else if (option2 === 1) {
        await npc.say(
            "You're more than welcome Bwana!",
            'Good luck for the rest of your quest.'
        );
    }
}

async function offMyHandsChat(player, npc) {
    await npc.say(
        'I dare not take them, I may be taken',
        'over by the evil spirit of Rashiliyia!'
    );
    const opt = await player.ask(
        ['What should I do with them?', 'Thanks!'],
        true
    );
    if (opt === 0) {
        await doWithThemChat(player, npc);
    } else if (opt === 1) {
        await npc.say(
            "You're more than welcome Bwana!",
            'Good luck for the rest of your quest.'
        );
    }
}

async function doWithThemChat(player, npc) {
    await npc.say(
        "Hmm, I'm not exactly sure...",
        'perhaps there is a clue in one ',
        'of the artifacts you have found?'
    );
    const opt2 = await player.ask(
        ['Can you take them off my hands?', 'Thanks!'],
        true
    );
    if (opt2 === 0) {
        await offMyHandsChat(player, npc);
    } else if (opt2 === 1) {
        await npc.say(
            "You're more than welcome Bwana!",
            'Good luck for the rest of your quest.'
        );
    }
}

async function corpseBuriedChat(player, npc) {
    await npc.say(
        'Ah, interesting, so you think that Zadimus gave you the bone?',
        'What makes you say that?'
    );
    const alt = await player.ask(
        ['He said something after he gave it to me.', "I'm not sure."],
        true
    );
    if (alt === 0) {
        await npc.say('What did he say?');
        const opt = await player.ask(
            [
                'The spirit said something about keys and kin?',
                'The spirit rambled on about some nonsense.'
            ],
            false // do not send over
        );
        if (opt === 0) {
            await player.say(
                ' "The spirit said something about keys and kin?"'
            );
            await npc.say(
                "Hmmm, maybe it's a clue of some kind?",
                'Well, Rashiliyias only kin, Bervirius, is entombed',
                'on a small island which lies to the South West.',
                'I will do some research into this as well.',
                'But I think we must take this clue literally',
                'and get some item that belonged to Bervirius',
                'as it may be the only way to approach Rashiliyia.'
            );
            if (player.questStages.shiloVillage === 4) {
                player.questStages.shiloVillage = 5;
            }
        } else if (opt === 1) {
            await player.say('The spirit rambled on about some nonsense.');
            await npc.say(
                'Oh, so it most likely was not very important then?'
            );
        }
    } else if (alt === 1) {
        await npc.say(
            'Oh, right.',
            'Come back and talk with me if you get an idea.'
        );
    }
}

async function boneKeyWork(player, npc) {
    await npc.say('Does the key work?');
    const menu = await player.ask(
        [
            'Yes and I explored inside some sort of cavern.',
            "I don't know, I haven't tried it yet."
        ],
        true
    );
    if (menu === 0) {
        await npc.say('How interesting Bwana, did you find anything?');
        const submenu = await player.ask(
            ['Not really.', 'Yes, I found lots of things.'],
            true
        );
        if (submenu === 0) {
            if (player.questStages.shiloVillage === -1) {
                await npc.say(
                    'Maybe you should go back and try to find some more things.',
                    'Maybe there are more items to be found at Ah Za Rhoon?'
                );
                return;
            }
            await npc.say(
                'Maybe you should go back and try to find some more things.',
                'Show me any other items that you may have.',
                "We need any clue to locate Rashiliyia's resting place."
            );
        } else if (submenu === 1) {
            await npc.say(
                'If you let me see them Bwana,',
                'perhaps I can offer you some extra information.'
            );
        }
    } else if (menu === 1) {
        await npc.say(
            'It may be an idea to try it and then scout out the area.',
            'If it relates to Rashiliyia, it might help us to defeat her.'
        );
    }
}

async function onUseWithNPC(player, npc, item) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (npc.id !== TRUFITUS_ID || !HANDLED_ITEMS.has(item.id)) {
        return false;
    }

    player.engage(npc);

    if (player.questStages.shiloVillage === -1) {
        await notMuchUse(player, npc);
        player.disengage();
        return true;
    }

    switch (item.id) {
        case RASHILIYA_CORPSE_ID: {
            player.message('You show Trufitus the remains...');
            await player.say('Could you have a look at this..');
            await npc.say(
                'This is truly incredible bwana...',
                'so these are the remains of the dread queen Rashiliyia?'
            );
            await player.say('Yes, I think so.');
            const menu = await player.ask(
                [
                    'What should I do with them?',
                    'Can you take them off my hands?'
                ],
                true
            );
            if (menu === 0) {
                await doWithThemChat(player, npc);
            } else if (menu === 1) {
                await offMyHandsChat(player, npc);
            }
            break;
        }
        case SWORD_POMMEL_ID: {
            player.message('You show Trufitus the sword pommel.');
            await npc.say(
                'It is a very nice item Bwana.',
                'It may be just what we need to gain access to Rashiliyias tomb.',
                'While you were away, I did some research',
                'Rashiliyia would spare the lives of those who wore bronze necklaces.',
                'This item may have some significance to Bervirius.',
                'Perhaps you can craft something from it that can help?',
                'My guess is that you will need some protection to enter her tomb!'
            );
            const option = await player.ask(
                [
                    'How do I make a bronze necklace?',
                    'What should I put on the necklace?'
                ],
                true
            );
            if (option === 0) {
                await bronzeNecklaceChat(player, npc);
            } else if (option === 1) {
                await putOnNecklaceChat(player, npc);
            }
            break;
        }
        case BERVIRIUS_TOMB_NOTES_ID: {
            player.message('You hand the notes over to Trufitus.');
            await npc.say(
                'Hmm, these notes are quite extraordinary Bwana.',
                'They give location details of Rashiliyias tomb, ',
                'and some information on how to use the crystal.',
                'The information is quite specific, North of Ah Za Rhoon!',
                "That's a great place to start looking!"
            );
            if (player.questStages.shiloVillage === 6) {
                player.questStages.shiloVillage = 7;
            }
            break;
        }
        case LOCATING_CRYSTAL_ID: {
            player.message('You show Trufitus the Locating Crystal');
            await npc.say('This is incredible Bwana,');
            await player.say('It is?');
            await npc.say(
                'Absolutely!',
                "This will help you to locate the entrance to Rashiliyia's tomb.",
                'Simply activate it when you think you are near, and it should ',
                'glow different colours to show how near you are.'
            );
            break;
        }
        case BONE_KEY_ID: {
            await player.say('Have a look at this!');
            await npc.say(
                'This is amazing Bwana,the level of detail is incredible.',
                'Where did you find it?'
            );
            const menu = await player.ask(
                [
                    'I made it from the bone shard that Zadimus gave me.',
                    'Do you know what it opens?'
                ],
                true
            );
            if (menu === 0) {
                await npc.say(
                    'How very inventive Bwana.',
                    'You must have seen the lock to have crafted it so well.'
                );
                await boneKeyWork(player, npc);
            } else if (menu === 1) {
                await npc.say(
                    'You must already know what it opens to have carved it',
                    'so pefectly.',
                    'Perhaps in your travels you have come ',
                    'across some unique doors with a unique lock',
                    'I hope this helps with your quest.'
                );
            }
            break;
        }
        case BONE_SHARD_ID: {
            player.message('You show Trufitus the Bone Shard.');
            await player.say('Could you have a look at this please ?');
            player.message('@que@Trufitus looks at the object for a moment.');
            await player.world.sleepTicks(3);
            await npc.say(
                'It looks like a simple shard of bone.',
                'Why do you think it is significant ?'
            );
            const menu = await player.ask(
                [
                    "It appeared when I buried Zadimus's Corpse.",
                    'No reason really.'
                ],
                true
            );
            if (menu === 0) {
                await corpseBuriedChat(player, npc);
            } else if (menu === 1) {
                await npc.say('Well why are you showing it to me then?');
                const subMenu = await player.ask(
                    [
                        "It appeared when I buried Zadimus's Corpse.",
                        "I'm not sure."
                    ],
                    true
                );
                if (subMenu === 0) {
                    await corpseBuriedChat(player, npc);
                } else if (subMenu === 1) {
                    await npc.say(
                        'Oh, right.',
                        'Come back and talk with me if you get an idea.'
                    );
                }
            }
            break;
        }
        case CRUMPLED_SCROLL_ID: {
            player.message('You hand the crumpled scroll to Trufitus.');
            await player.say(
                'Have a look at this, tell me what you think.'
            );
            await npc.say(
                'I am speechless Bwana, this is truly ancient.',
                'Where did you find it?'
            );
            await player.say('In an underground building of some sort.');
            await npc.say(
                'You must truly have found the temple of Ah Za Rhoon!',
                'The scroll gives some interesting details about ',
                "Rashiliyia, some things I didn't know before."
            );
            player.message('Trufitus gives back the scroll.');
            const menu = await player.ask(
                ['Anything that can help?', 'Ok, thanks!'],
                true
            );
            if (menu === 0) {
                await npc.say(
                    'Hmmm, well just that part about the wards..'
                );
                player.message('@que@Trufitus seems to drift off in thought.');
                await player.world.sleepTicks(3);
                await npc.say(
                    'It may be possible to make a ward like that?',
                    'But what is the best thing to make it from?'
                );
                if (player.inventory.has(ZADIMUS_CORPSE_ID)) {
                    await npc.say('Now...what was it that Zadimus said...');
                } else {
                    await npc.say(
                        "Perhaps you'll get some clues from other items?"
                    );
                }
            } else if (menu === 1) {
                await npc.say("You're quite welcome Bwana.");
            }
            break;
        }
        case TATTERED_SCROLL_ID: {
            player.message('You hand the Tattered Scroll to Trufitus');
            await player.say('What do you make of this?');
            await npc.say(
                'Truly amazing Bwana, this scroll must be ancient.',
                'I am unsure if I get any more meaning from it than you though.',
                "Perhaps Bervirius' tomb is still accessible?"
            );
            player.message('Trufitus hands the Tattered scroll back to you.');
            break;
        }
        case ZADIMUS_CORPSE_ID: {
            player.message('You show Trufitus the corpse.');
            await player.say('What do you make of this?');
            await npc.say(
                '! GASP !',
                "That's incredible, where did you find it?"
            );
            await player.say(
                'I found the corpse in a decomposing gallows',
                'I get a very strange feeling every time I try to bury the body'
            );
            await npc.say(
                'Hmmm, that sounds very strange',
                'I sense a spirit in torment, you should try to bury the remains.'
            );
            const menu = await player.ask(
                [
                    'Is there any sacred ground around here?',
                    'Can you dispose of this for me?'
                ],
                true
            );
            if (menu === 0) {
                await npc.say(
                    'The ground in the centre of the village is very sacred to us',
                    'Maybe you could try there ?'
                );
            } else if (menu === 1) {
                player.message('Trufitus pulls away');
                await npc.say(
                    'I dare not touch it. I am a spiritual man and',
                    'the spirit of this being may possess me and ',
                    'turn me into a minion of Rashiliyia.'
                );
            }
            break;
        }
        case STONE_PLAQUE_ID: {
            player.message('You hand over the Stone Plaque to Trufitus.');
            await player.say('Can you decipher this please?');
            await npc.say('This is an ancient artifact!');
            player.message('Trufitus looks at the item in awe.');
            await npc.say(
                'I can certainly try!',
                'Hmm, incredible, it seems very ancient,',
                'and mentions something about Zadimus and Ah Za Rhoon.',
                "It says,'Here lies the traitor Zadimus, let his spirit",
                "be forever tormented'"
            );
            player.message('Trufitus hands the Stone Plaque back');
            await npc.say(
                'If you have found anything else that you need help with',
                'please just let me know.'
            );
            break;
        }
    }

    player.disengage();
    return true;
}

module.exports = { onUseWithNPC };
