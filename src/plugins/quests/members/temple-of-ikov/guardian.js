// guardians of armadyl guard the staff; side with them or with lucien

const { questsEnabled } = require('../../custom-gate.js');

const GUARDIAN_MALE_ID = 362;
const GUARDIAN_FEMALE_ID = 363;
const GUARDIAN_IDS = [GUARDIAN_MALE_ID, GUARDIAN_FEMALE_ID];

const PENDANT_OF_LUCIEN_ID = 721;
const PENDANT_OF_ARMADYL_ID = 726;
const STAFF_OF_ARMADYL_ID = 725;

// Guardian conversation sub-branch (OpenRSC class Guardian)
const WORKINGFORLUCIEN = 0;

async function workingForLucien(player, npc) {
    await npc.say(
        'Thou art working for him?',
        'Thy fool',
        'Quick you must be cleansed to save your soul'
    );

    const menu = await player.ask(
        [
            'How dare you call me a fool?',
            "Erm I think I'll be leaving now",
            'Yes I could do with a bath'
        ],
        false
    );

    if (menu === 0) {
        await player.say(
            'How dare you call me a fool',
            'I will work for who I please'
        );
        await npc.say(
            'This one is too far gone',
            'He must be cut down to stop the spread of the blight'
        );
        player.disengage();
        await npc.attack(player);
    } else if (menu === 1) {
        await player.say("Erm, I think I'll be leaving now");
        await npc.say('We cannot allow an agent of Lucien to roam free');
        player.disengage();
        await npc.attack(player);
    } else if (menu === 2) {
        await player.say('Yes I could do with a bath');
        player.message('The guardian splashes holy water over you');
        await npc.say(
            'That should do the trick',
            'Now you say that Lucien sent you to retrieve the staff',
            'He must not get a hold of it',
            'He would become too powerful with the staff',
            'Hast thou heard of the undead necromancer?',
            'Who raised an undead army against Varrock a few years past',
            'That was Lucien',
            'If thou knowest where to find him maybe you can help us ' +
                'against him'
        );

        const lastMenu = await player.ask(
            [
                'Ok I will help',
                "No I shan't turn against my employer",
                'I need time to consider this'
            ],
            false
        );

        if (lastMenu === 0) {
            await npc.say('So you know where he lurks?');
            await player.say('Yes');
            await npc.say(
                'He must be growing in power again if he is after the staff',
                'If you can defeat him, it may weaken him for a time',
                'You will need to use this pendant to even be able to ' +
                    'attack him'
            );
            player.message('The guardian gives you a pendant');
            player.inventory.add(PENDANT_OF_ARMADYL_ID, 1);
            player.questStages.templeOfIkov = 2;
        } else if (lastMenu === 1) {
            await npc.say(
                'This one is too far gone',
                'He must be cut down to stop the spread of the blight'
            );
            player.disengage();
            await npc.attack(player);
        } else if (lastMenu === 2) {
            await npc.say('Come back when you have made your choice');
        }
    }
}

async function guardianDialogue(player, npc) {
    const stage = player.questStages.templeOfIkov || 0;

    switch (stage) {
        case 1: {
            // Pendant of Lucien equipped + no staff -> the guardians attack.
            if (
                player.inventory.isEquipped(PENDANT_OF_LUCIEN_ID) &&
                !player.inventory.has(STAFF_OF_ARMADYL_ID)
            ) {
                await npc.say(
                    'Ahh tis a foul agent of Lucien',
                    "Get ye from our master's house"
                );
                player.disengage();
                await npc.attack(player);
                return;
            }

            // Carrying the staff -> the guardians give chase.
            if (player.inventory.has(STAFF_OF_ARMADYL_ID)) {
                await npc.say(
                    'Stop',
                    'You cannot take the staff of Armadyl'
                );
                player.disengage();
                await npc.attack(player);
                return;
            }

            await npc.say(
                'Thou dost venture deep in the tunnels',
                'It has been many a year since someone has passed thus far'
            );

            const menu = await player.ask(
                [
                    'I seek the staff of Armadyl',
                    'Out of my way fool',
                    'Who are you?'
                ],
                false
            );

            if (menu === 0) {
                await npc.say(
                    'We guard that here',
                    'As did our fathers',
                    "And our father's fathers",
                    'Why dost thou seeketh it?'
                );

                const seekMenu = await player.ask(
                    [
                        'A guy named Lucien is paying me',
                        'Just give it to me',
                        'I am a collector of rare and powerful artifacts'
                    ],
                    false
                );

                if (seekMenu === 0) {
                    await player.say('A guy named Lucien is paying me');
                    await workingForLucien(player, npc);
                } else if (seekMenu === 1) {
                    await player.say('Just give it to me');
                    await npc.say(
                        'The staff is a sacred object',
                        'Not to be given away to anyone who asks'
                    );
                } else if (seekMenu === 2) {
                    await player.say(
                        'I am a collector of rare and powerful objects'
                    );
                    await npc.say('The staff is not yours to collect');
                }
            } else if (menu === 1) {
                await npc.say('I may be a fool, but I will not step aside');

                const foolMenu = await player.ask(
                    [
                        'Why not?',
                        'Then I must strike you down',
                        'Then I guess I will turn back'
                    ],
                    false
                );

                if (foolMenu === 0) {
                    await npc.say(
                        'Only members of our order are allowed further'
                    );
                } else if (foolMenu === 1) {
                    player.disengage();
                    await npc.attack(player);
                }
            } else if (menu === 2) {
                await npc.say(
                    'I am a guardian of Armadyl',
                    'We have kept this place safe and holy',
                    'For many generations',
                    'Many evil souls would like to get their hands on what ' +
                        'lies here',
                    'Especially the Mahjarrat'
                );

                const whoMenu = await player.ask(
                    [
                        'What is an Armadyl?',
                        'Who are the Mahjarrat?',
                        'Wow you must be old'
                    ],
                    false
                );

                if (whoMenu === 0) {
                    await npc.say(
                        'Armadyl is our God',
                        'We are his servants',
                        'Who have the honour to stay here',
                        'And guard his artifacts',
                        'Till he needs them to smite his enemies'
                    );

                    const bla = await player.ask(
                        [
                            "Ok that's nice to know",
                            'Someone told me there were only three gods'
                        ],
                        false
                    );

                    if (bla === 0) {
                        await player.say(
                            'I am a collector of rare and powerful objects'
                        );
                        await npc.say('The staff is not yours to collect');
                    } else if (bla === 1) {
                        await player.say(
                            'Someone told me there were only three gods',
                            'Saradomin, Zamorak and Guthix'
                        );
                        await npc.say(
                            'Was that someone a Saradominist?',
                            'I hear Saradominism is the principle doctrine',
                            'Out in the world currently',
                            'They only Acknowledge those three gods',
                            'They are wrong',
                            'Depending on what you define as a god',
                            'We are aware of at least twenty'
                        );
                    }
                } else if (whoMenu === 1) {
                    await npc.say(
                        'Ancient powerful beings',
                        'They are very evil',
                        'They were said to once dominate this plane of ' +
                            'existance',
                        'Zamorak was said to once have been of their stock',
                        'They are few in number and have less power these ' +
                            'days',
                        'Some still have presence in this world in their ' +
                            'liche forms',
                        'Mahjarrat such as Lucien and Azzanadra would become ' +
                            'extremely powerful',
                        'If they got their hands on the staff of Armadyl'
                    );

                    const maj = await player.ask(
                        [
                            'Did you say Lucien?',
                            'You had better guard it well then'
                        ],
                        false
                    );

                    if (maj === 0) {
                        await player.say(
                            'Did you say Lucien?',
                            "He's the one who sent me to fetch the staff"
                        );
                        await workingForLucien(player, npc);
                    } else if (maj === 1) {
                        await player.say('You had better guard it well them');
                        await npc.say("Don't fret, for we shall");
                    }
                } else if (whoMenu === 2) {
                    await npc.say(
                        'No no, I have not guarded here for all those ' +
                            'generations',
                        'Many generations of my family have though'
                    );
                }
            }
            break;
        }
        case 2: {
            await npc.say('Any luck against Lucien?');

            if (!player.inventory.has(PENDANT_OF_ARMADYL_ID)) {
                const option = await player.ask(
                    ['Not yet', "No I've lost the pendant you gave me"],
                    false
                );

                if (option === 0) {
                    await npc.say('Well good luck on your quest');
                } else if (option === 1) {
                    await npc.say(
                        'Thou art a careless buffoon',
                        'Have another one'
                    );
                    player.message('The guardian gives you a pendant');
                    player.inventory.add(PENDANT_OF_ARMADYL_ID, 1);
                }
            } else {
                await player.say('Not yet');
                await npc.say('Well good luck on your quest');
            }
            break;
        }
        case -1: {
            await player.say('I have defeated Lucien');
            await npc.say(
                'Well done',
                'We can only hope that will keep him quiet for a while'
            );
            break;
        }
        case -2: {
            await npc.say(
                'Get away from here',
                'Thou evil agent of Lucien'
            );
            break;
        }
    }
}

async function onTalkToNPC(player, npc) {
    if (!questsEnabled(player)) {
        return false;
    }

    if (!GUARDIAN_IDS.includes(npc.id)) {
        return false;
    }

    player.engage(npc);
    await guardianDialogue(player, npc);

    if (player.interlocutor) {
        player.disengage();
    }

    return true;
}

module.exports = { onTalkToNPC };
