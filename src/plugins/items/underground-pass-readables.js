// underground pass: flavour text for four quest items

const ANA_IN_A_BARREL_ID = 1039;
const RANDASS_JOURNAL_ID = 996;
const A_DOLL_OF_IBAN_ID = 1004;
const STAFF_OF_IBAN_BROKEN_ID = 1031;

const RANDASS_JOURNAL_LINES = [
    '@red@I came to cleanse these mountain passes of the dark forces',
    '@red@that dwell here, I knew my journey would be treacherous.',
    ' ',
    '@red@I have deposited Spheres of Light in some of the tunnels',
    '@red@These spheres are a beacon of safety for all who come.',
    '@red@I still feel iban relentlessly tugging at my weak soul.',
    ' ',
    '@red@The spheres were created by Saradominist mages.',
    '@red@When held they boost faith and courage',
    '@red@bringing out any innate goodness to ones heart',
    '@red@illuminating the dark caverns with the light of saradomin',
    '@red@bringing fear and pain to all who embrace the dark side.',
    ' ',
    "@red@My men are still repelled by 'ibans well', it seems as if",
    '@red@there pure hearts bar them from entering',
    '@red@ibans realm',
    '@red@my turn has come, I dare not admit it to my loyal men',
    '@red@But I fear for my soul'
];

// cache flag -> smear/pour description
const DOLL_SMEARS = [
    ['poison_on_doll', 'Blood has been smeared onto the doll'],
    ['cons_on_doll', 'Crushed bones have been smeared onto the doll'],
    ['ash_on_doll', 'Burnt ash has been smeared onto the doll'],
    ['shadow_on_doll', 'A dark liquid has been poured over the doll']
];

async function handleAnaInABarrel(player) {
    const { world } = player;

    player.message('Ana looks pretty angry, she starts shouting at you.');
    await world.sleepTicks(3);
    player.message('@gre@Ana: Get me out of here!');
    await world.sleepTicks(3);
    player.message('@gre@Ana: Do you hear me!');
    await world.sleepTicks(3);
    player.message('@gre@Ana: Get me out of here I say!');
    await world.sleepTicks(3);
}

async function handleRandassJournal(player) {
    const { world } = player;

    player.message('the journal is old and worn');
    await world.sleepTicks(3);
    player.message('it reads...');

    for (const line of RANDASS_JOURNAL_LINES) {
        player.message(line);
    }
}

async function handleADollOfIban(player) {
    const { world } = player;

    player.message('you carefully search the doll');
    await world.sleepTicks(3);

    for (const [cacheKey, text] of DOLL_SMEARS) {
        if (player.cache[cacheKey]) {
            player.message(text);
            await world.sleepTicks(3);
        }
    }

    player.message('the doll is made from old wood and cloth');
    await world.sleepTicks(4);
}

async function handleStaffOfIban(player) {
    const { world } = player;

    player.message('the staff is broken');
    await world.sleepTicks(3);
    player.message('you must have a dark mage repair it');
    await world.sleepTicks(3);
    player.message('before it can be used');
    await world.sleepTicks(4);
}

async function onInventoryCommand(player, item) {
    switch (item.id) {
        case ANA_IN_A_BARREL_ID:
            await handleAnaInABarrel(player);
            return true;
        case RANDASS_JOURNAL_ID:
            await handleRandassJournal(player);
            return true;
        case A_DOLL_OF_IBAN_ID:
            await handleADollOfIban(player);
            return true;
        case STAFF_OF_IBAN_BROKEN_ID:
            await handleStaffOfIban(player);
            return true;
        default:
            return false;
    }
}

module.exports = { onInventoryCommand };
