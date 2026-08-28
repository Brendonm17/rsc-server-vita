
const items = require('@2003scape/rsc-data/config/items');

const SIDNEY_SMITH_ID = 778;

// uncerted item ids, resolved by name
const PRAYER_RESTORE_POT = 483;
const SUPER_ATTACK_POT = 486;
const SUPER_DEFENSE_POT = 495;
const SUPER_STRENGTH_POT = 492;
const DRAGON_BONES = 814;
const LIMPWURT_ROOT = 220;

// ITEM CERTED (certificate) ids
const PRAYER_CERT = 1272;
const SUPER_ATTACK_CERT = 1273;
const SUPER_DEFENSE_CERT = 1274;
const SUPER_STRENGTH_CERT = 1275;
const DRAGON_BONES_CERT = 1270;
const LIMPWURT_ROOT_CERT = 1271;

// item id <-> cert id maps
const GOODS_TO_CERT = {
    [PRAYER_RESTORE_POT]: PRAYER_CERT,
    [SUPER_ATTACK_POT]: SUPER_ATTACK_CERT,
    [SUPER_DEFENSE_POT]: SUPER_DEFENSE_CERT,
    [SUPER_STRENGTH_POT]: SUPER_STRENGTH_CERT,
    [DRAGON_BONES]: DRAGON_BONES_CERT,
    [LIMPWURT_ROOT]: LIMPWURT_ROOT_CERT
};

const CERT_TO_GOODS = {
    [PRAYER_CERT]: PRAYER_RESTORE_POT,
    [SUPER_ATTACK_CERT]: SUPER_ATTACK_POT,
    [SUPER_DEFENSE_CERT]: SUPER_DEFENSE_POT,
    [SUPER_STRENGTH_CERT]: SUPER_STRENGTH_POT,
    [DRAGON_BONES_CERT]: DRAGON_BONES,
    [LIMPWURT_ROOT_CERT]: LIMPWURT_ROOT
};

const ALL_TRADE_IDS = new Set([
    PRAYER_RESTORE_POT,
    SUPER_ATTACK_POT,
    SUPER_DEFENSE_POT,
    SUPER_STRENGTH_POT,
    DRAGON_BONES,
    LIMPWURT_ROOT,
    PRAYER_CERT,
    SUPER_ATTACK_CERT,
    SUPER_DEFENSE_CERT,
    SUPER_STRENGTH_CERT,
    DRAGON_BONES_CERT,
    LIMPWURT_ROOT_CERT
]);

// count inventory items by id
function countInventory(player, id) {
    let total = 0;

    for (const item of player.inventory.items) {
        if (item.id === id) {
            total += item.definition.stackable ? item.amount : 1;
        }
    }

    return total;
}

// builds the "how many" exchange menu, sized to holdings
async function calculateExchangeMenu(player, npc, useCertificate, itemID, certificateID) {
    const count = countInventory(player, useCertificate ? certificateID : itemID);
    const name = items[itemID].name;

    let mainMenu = -1;

    if (useCertificate) {
        await npc.say(`How many ${name} certificates do you want to change?`);

        if (count === 1) {
            const firstMenu = await player.ask(
                ['None thanks.', 'One Certificate please'],
                true
            );

            if (firstMenu === 0) {
                await npc.say('Ok, suit yourself.');
                return;
            } else if (firstMenu === 1) {
                mainMenu = 0;
            }
        } else if (count === 2) {
            mainMenu = await player.ask(
                ['One Certificate please', 'Two Certificates Please'],
                true
            );
        } else if (count === 3) {
            mainMenu = await player.ask(
                [
                    'One Certificate please',
                    'Two Certificates Please',
                    'Three Certificates Please.'
                ],
                true
            );
        } else if (count === 4) {
            mainMenu = await player.ask(
                [
                    'One Certificate please',
                    'Two Certificates Please',
                    'Three Certificates Please.',
                    'Four Certificates Please'
                ],
                true
            );
        } else if (count >= 5) {
            mainMenu = await player.ask(
                [
                    'One Certificate please',
                    'Two Certificates Please',
                    'Three Certificates Please.',
                    'Four Certificates Please',
                    'Five Certificates Please.'
                ],
                true
            );
        }
    } else {
        await npc.say(`How many ${name} would you like to certificate?`);

        if (count >= 5 && count < 10) {
            const firstMenu = await player.ask(['None', 'Five'], true);

            if (firstMenu === 0) {
                player.message('You decide not to change any items.');
                return;
            } else if (firstMenu === 1) {
                mainMenu = 0;
            }
        } else if (count >= 10 && count < 15) {
            mainMenu = await player.ask(['Five', 'Ten'], true);
        } else if (count >= 15 && count < 20) {
            mainMenu = await player.ask(['Five', 'Ten', 'Fifteen'], true);
        } else if (count >= 20 && count < 25) {
            mainMenu = await player.ask(
                ['Five', 'Ten', 'Fifteen', 'Twenty'],
                true
            );
        } else if (count >= 25) {
            mainMenu = await player.ask(
                ['Five', 'Ten', 'Fifteen', 'Twenty', 'Twenty Five'],
                true
            );
        } else {
            await npc.say(
                `Sorry, but you don't have enough ${name}.`,
                'You need at least five to make a certificate.'
            );
            return;
        }
    }

    if (mainMenu === -1) {
        return;
    }

    if (useCertificate) {
        await npc.say(`Ok, that's your ${name} certificates done.`);

        const certAmount = mainMenu + 1;
        const itemAmount = certAmount * 5;

        if (player.inventory.has(certificateID, certAmount)) {
            player.inventory.remove(certificateID, certAmount);
            player.inventory.add(itemID, itemAmount);
        }

        await player.say('Ok thanks.');
    } else {
        await npc.say(`Ok, that's your ${name} certificated.`);

        const multiplier = mainMenu + 1;
        const itemAmount = multiplier * 5;

        player.inventory.remove(itemID, itemAmount);
        player.inventory.add(certificateID, multiplier);

        await player.say('Ok thanks.');
    }
}

// two pages of goods menus
async function goodsMenuOne(player, npc) {
    const goods = await player.ask(
        [
            '* Prayer Restore Potion * ',
            '* Super Attack Potion *',
            '* Super Defense Potion *',
            '* Super Strength Potion *',
            '-*- Menu 2 -*-'
        ],
        true
    );

    if (goods === 0) {
        if (player.inventory.has(PRAYER_RESTORE_POT, 5)) {
            await calculateExchangeMenu(player, npc, false, PRAYER_RESTORE_POT, PRAYER_CERT);
        } else {
            await npc.say(
                "You don't have any Prayer potions to certificate.",
                'Which goods would you like to certificate?'
            );
            await goodsMenuOne(player, npc);
        }
    } else if (goods === 1) {
        if (player.inventory.has(SUPER_ATTACK_POT, 5)) {
            await calculateExchangeMenu(player, npc, false, SUPER_ATTACK_POT, SUPER_ATTACK_CERT);
        } else {
            await npc.say("You don't have enough Super Attack potions to certificate.");
            await player.say('Ok thanks.');
        }
    } else if (goods === 2) {
        if (player.inventory.has(SUPER_DEFENSE_POT, 5)) {
            await calculateExchangeMenu(player, npc, false, SUPER_DEFENSE_POT, SUPER_DEFENSE_CERT);
        } else {
            await npc.say(
                "You don't have any Super Defense potions to certificate.",
                'Which goods would you like to certificate?'
            );
            await goodsMenuOne(player, npc);
        }
    } else if (goods === 3) {
        if (player.inventory.has(SUPER_STRENGTH_POT, 5)) {
            await calculateExchangeMenu(player, npc, false, SUPER_STRENGTH_POT, SUPER_STRENGTH_CERT);
        } else {
            await npc.say(
                "You don't have any Super Strength potions to certificate.",
                'Which goods would you like to certificate?'
            );
            await goodsMenuOne(player, npc);
        }
    } else if (goods === 4) {
        await goodsMenuTwo(player, npc);
    }
}

async function goodsMenuTwo(player, npc) {
    const goods = await player.ask(
        ['* Dragon Bones *', '* Limpwurt Root *', '-*- Menu 1 -*-'],
        true
    );

    if (goods === 0) {
        if (player.inventory.has(DRAGON_BONES, 5)) {
            await calculateExchangeMenu(player, npc, false, DRAGON_BONES, DRAGON_BONES_CERT);
        } else {
            await npc.say(
                "You don't have any Dragon Bones to certificate.",
                'Which goods would you like to certificate?'
            );
            await goodsMenuOne(player, npc);
        }
    } else if (goods === 1) {
        if (player.inventory.has(LIMPWURT_ROOT, 5)) {
            await calculateExchangeMenu(player, npc, false, LIMPWURT_ROOT, LIMPWURT_ROOT_CERT);
        } else {
            await npc.say(
                "You don't have any Limpwurt Roots to certificate.",
                'Which goods would you like to certificate?'
            );
            await goodsMenuOne(player, npc);
        }
    } else if (goods === 2) {
        await goodsMenuOne(player, npc);
    }
}

// certMenuOne/certMenuTwo
async function certMenuOne(player, npc) {
    const certs = await player.ask(
        [
            '* Restore Prayer Potion Certificates * ',
            '* Super Attack Potion Certificates *',
            '* Super Defense Potion Certificates *',
            '* Super Strength Potion Certificates *',
            '-*- Menu 2 -*-'
        ],
        true
    );

    if (certs === 0) {
        if (player.inventory.has(PRAYER_CERT)) {
            await calculateExchangeMenu(player, npc, true, PRAYER_RESTORE_POT, PRAYER_CERT);
        } else {
            await npc.say(
                'Sorry, but you don\'t have any ',
                'Prayer Restore Potion Certificates to change.'
            );
        }
    } else if (certs === 1) {
        if (player.inventory.has(SUPER_ATTACK_CERT)) {
            await calculateExchangeMenu(player, npc, true, SUPER_ATTACK_POT, SUPER_ATTACK_CERT);
        } else {
            await npc.say(
                'Sorry, but you don\'t have any ',
                'Super attack Potion Certificates to change.'
            );
        }
    } else if (certs === 2) {
        if (player.inventory.has(SUPER_DEFENSE_CERT)) {
            await calculateExchangeMenu(player, npc, true, SUPER_DEFENSE_POT, SUPER_DEFENSE_CERT);
        } else {
            await npc.say(
                'Sorry, but you don\'t have any ',
                'Super Defense Potion Certificates to change.'
            );
        }
    } else if (certs === 3) {
        if (player.inventory.has(SUPER_STRENGTH_CERT)) {
            await calculateExchangeMenu(player, npc, true, SUPER_STRENGTH_POT, SUPER_STRENGTH_CERT);
        } else {
            await npc.say(
                'Sorry, but you don\'t have any ',
                'Super Strength Potion Certificates to change.'
            );
        }
    } else if (certs === 4) {
        await certMenuTwo(player, npc);
    }
}

async function certMenuTwo(player, npc) {
    const menu = await player.ask(
        [
            '* Dragon Bones Certificates *',
            '* Limpwurt Root Certificates *',
            '-*- Menu 1 -*-'
        ],
        true
    );

    if (menu === 0) {
        if (player.inventory.has(DRAGON_BONES_CERT)) {
            await calculateExchangeMenu(player, npc, true, DRAGON_BONES, DRAGON_BONES_CERT);
        } else {
            await npc.say(
                'Sorry, but you don\'t have any ',
                'Dragon Bone Certificates to change.'
            );
        }
    } else if (menu === 1) {
        if (player.inventory.has(LIMPWURT_ROOT_CERT)) {
            await calculateExchangeMenu(player, npc, true, LIMPWURT_ROOT, LIMPWURT_ROOT_CERT);
        } else {
            await npc.say(
                'Sorry, but you don\'t have any ',
                'Limpwurt Root Certificates to change.'
            );
        }
    } else if (menu === 2) {
        await certMenuOne(player, npc);
    }
}

// top-level menu plus four sub-menus
async function sidneyCert(player, npc) {
    await npc.say(
        "Hello, I'm Sidney Smith, the certification Clerk.",
        'How can I help you ?'
    );

    const menu = await player.ask(
        [
            "I'd like to certificate some goods please.",
            "I'd like to change some certificates for goods please.",
            'What is certification ?',
            'Which goods do you certificate ?'
        ],
        false
    );

    if (menu === 0) {
        await player.say("I'd like to certificate some goods please.");
        await goodsToCertificate(player, npc);
    } else if (menu === 1) {
        await player.say(
            "I'd like to change some certificates for goods please."
        );
        await certificateToGoods(player, npc);
    } else if (menu === 2) {
        await player.say('What is certification?');
        await whatIsCertification(player, npc);
    } else if (menu === 3) {
        await player.say('Which goods do you certificate ?');
        await whichGoods(player, npc);
    }
}

async function whichGoods(player, npc) {
    await npc.say(
        'Well, I can certificate the following items.',
        'Prayer Restore Potion,',
        'Super Attack Potion,',
        'Super Defense Potion,',
        'Super Strength Potion,',
        'Dragon Bones,',
        'and Limpwurt Root.'
    );

    const subMenu = await player.ask(
        [
            'How many items do you need to make a certificate.',
            "I'd like to certificate some goods please.",
            "I'd like to change some certificates for goods please.",
            'Ok, thanks.'
        ],
        true
    );

    if (subMenu === 0) {
        await howManyItems(player, npc);
    } else if (subMenu === 1) {
        await goodsToCertificate(player, npc);
    } else if (subMenu === 2) {
        await certificateToGoods(player, npc);
    }
}

async function whatIsCertification(player, npc) {
    await npc.say(
        "It's quite easy really..",
        'You swap some goods for certificates which are easier to store.',
        'I specialise in certificating very rare items.',
        'The kinds of items only Legendary Runescape citizens will own.'
    );

    const subMenu = await player.ask(
        [
            "I'd like to certificate some goods please.",
            "I'd like to change some certificates for goods please.",
            'Ok thanks.'
        ],
        true
    );

    if (subMenu === 0) {
        await goodsToCertificate(player, npc);
    } else if (subMenu === 1) {
        await certificateToGoods(player, npc);
    }
}

async function howManyItems(player, npc) {
    await npc.say(
        'Well, you need at the least five items to make a certificate.',
        "We'll turn any five items into one certificate.",
        'It makes storage and transportation much easier.'
    );

    const subMenu = await player.ask(
        ['Which goods do you certificate?', 'Ok, thanks.'],
        true
    );

    if (subMenu === 0) {
        await whichGoods(player, npc);
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== SIDNEY_SMITH_ID) {
        return false;
    }

    player.engage(npc);
    await sidneyCert(player, npc);
    player.disengage();

    return true;
}

// re-checks holding >=5 certifiable items on every entry
async function goodsToCertificate(player, npc) {
    if (
        player.inventory.has(PRAYER_RESTORE_POT, 5) ||
        player.inventory.has(SUPER_ATTACK_POT, 5) ||
        player.inventory.has(SUPER_DEFENSE_POT, 5) ||
        player.inventory.has(SUPER_STRENGTH_POT, 5) ||
        player.inventory.has(DRAGON_BONES, 5) ||
        player.inventory.has(LIMPWURT_ROOT, 5)
    ) {
        await npc.say('Which goods would you like to certificate?');
        await goodsMenuOne(player, npc);
    } else {
        await npc.say(
            "Sorry, but you either don't have enough items for me to certificate.",
            "or you don't have the right type of items for me to certificate."
        );

        const subMenu = await player.ask(
            [
                'Which goods do you certificate?',
                'How many items do you need to make a certificate.'
            ],
            true
        );

        if (subMenu === 0) {
            await whichGoods(player, npc);
        } else if (subMenu === 1) {
            await howManyItems(player, npc);
        }
    }
}

// re-checks holding certificates on every entry
async function certificateToGoods(player, npc) {
    if (
        player.inventory.has(PRAYER_CERT) ||
        player.inventory.has(SUPER_ATTACK_CERT) ||
        player.inventory.has(SUPER_DEFENSE_CERT) ||
        player.inventory.has(SUPER_STRENGTH_CERT) ||
        player.inventory.has(DRAGON_BONES_CERT) ||
        player.inventory.has(LIMPWURT_ROOT_CERT)
    ) {
        await npc.say('Ok then, which certificates would you like to change?');
        await certMenuOne(player, npc);
    } else {
        await npc.say(
            "Sorry, but you don't have any certificates that I can change.",
            'I can only change the following certificates into goods.',
            'Dragon Bone Certificates,',
            'Limpwurt Root Certificates,',
            'Prayer Potion Certificates,',
            'Super Attack Potion Certificates,',
            'Super Defense Potion Certificates,',
            'and Super Strength Potion Certificates.'
        );
    }
}

// dragging goods/certs onto her opens the exchange menu
async function onUseWithNPC(player, npc, item) {
    if (npc.id !== SIDNEY_SMITH_ID || !ALL_TRADE_IDS.has(item.id)) {
        return false;
    }

    player.engage(npc);

    if (item.id in GOODS_TO_CERT) {
        await calculateExchangeMenu(player, npc, false, item.id, GOODS_TO_CERT[item.id]);
    } else if (item.id in CERT_TO_GOODS) {
        await calculateExchangeMenu(player, npc, true, CERT_TO_GOODS[item.id], item.id);
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC, onUseWithNPC };
