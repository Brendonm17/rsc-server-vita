// Mage Arena (members) - Kolodion's transformation gauntlet, choosing a god, the
// Chamber Guardian's staff shop, and the arena cast-counter that unlocks Claws of
// Guthix / Saradomin Strike / Flames of Zamorak for use anywhere.
//
// this file owns Kolodion's fight chain, the pool teleports, the god-choice stones
// (set the mage_arena cache stage and hand out the cape), and the Chamber Guardian
// dialogue and staff shop. the learn-counter itself lives in packet-handlers/spell.js
// (shared cache key "<spell name>_casts", threshold 100).
//
// every npc/object/shop used already exists in rsc-data with a static spawn; only
// the 5 Kolodion combat forms are created at runtime. Gundai is handled by the
// generic npcs/banker.js.

const NPC = require('../../../../model/npc');
const GameObject = require('../../../../model/game-object');
const magic = require('../../../skills/magic');
const { ITEM: MAGIC_ITEM } = magic;

// ids (resolved by name)
const KOLODION_HUMAN_PASSIVE = 712; // static spawn, talks, not yet challenged
const KOLODION_HUMAN = 713; // first duel form (aggressive "human")
const KOLODION_OGRE = 757;
const KOLODION_SPIDER = 758;
const KOLODION_SOULESS = 759;
const KOLODION_DEMON = 760;
const KOLODION_FORMS = [
    KOLODION_HUMAN,
    KOLODION_OGRE,
    KOLODION_SPIDER,
    KOLODION_SOULESS,
    KOLODION_DEMON
];

const CHAMBER_GUARDIAN_ID = 784;
const BATTLE_MAGE_GUTHIX_ID = 789;
const BATTLE_MAGE_ZAMORAK_ID = 790;
const BATTLE_MAGE_SARADOMIN_ID = 791;
const BATTLE_MAGE_IDS = [
    BATTLE_MAGE_GUTHIX_ID,
    BATTLE_MAGE_ZAMORAK_ID,
    BATTLE_MAGE_SARADOMIN_ID
];
const LUNDAIL_ID = 793;

const GATE_OBJECT_IDS = [1019, 1020]; // "open"
const ENTRANCE_OBJECT_ID = 1027; // "walk through" (the mystical barrier)
const SARADOMIN_STONE_ID = 1152;
const GUTHIX_STONE_ID = 1153;
const ZAMORAK_STONE_ID = 1154;
const CHAMBER_POOL_ID = 1155; // in the arena chamber -> deeper underground
const ENTRY_POOL_ID = 1166; // sparkling pool -> Kolodion's cave

// transient ground-graphic each god spell leaves behind, removed after 2 ticks.
const GOD_SPELL_OBJECT = {
    CLAWS_OF_GUTHIX: 1142,
    SARADOMIN_STRIKE: 1031,
    FLAMES_OF_ZAMORAK: 1036
};

const STAFF_OF_GUTHIX = MAGIC_ITEM.STAFF_OF_GUTHIX;
const STAFF_OF_SARADOMIN = MAGIC_ITEM.STAFF_OF_SARADOMIN;
const STAFF_OF_ZAMORAK = MAGIC_ITEM.STAFF_OF_ZAMORAK;

const ZAMORAK_CAPE = MAGIC_ITEM.ZAMORAK_CAPE;
const SARADOMIN_CAPE = MAGIC_ITEM.SARADOMIN_CAPE;
const GUTHIX_CAPE = MAGIC_ITEM.GUTHIX_CAPE;
const GOD_CAPES = [ZAMORAK_CAPE, SARADOMIN_CAPE, GUTHIX_CAPE];

// staves exempt from the no-weapons arena-entry rule.
const ALLOWED_ENTRY_STAVES = [
    100, // Staff
    198, // Magic Staff
    101, // Staff of Air
    102, // Staff of Water (id 102)
    103, // Staff of Earth (id 103)
    197, // Staff of fire
    STAFF_OF_SARADOMIN,
    STAFF_OF_ZAMORAK,
    STAFF_OF_GUTHIX
];

const CHAMBER_GUARDIAN_SHOP = 'mage-arena-staves';
const LUNDAIL_SHOP = 'mage-arena-rune';

const ICE_GLOVES_ID = 556; // isNotAllowed's explicit OR-exception

// stat-boosting potions banned from the arena on combat-odyssey worlds (treated
// as on here).
const STAT_BOOSTING_POTIONS = [
    474, // Full attack potion
    475, // Two-dose attack potion
    476, // One-dose attack potion
    221, // Full strength potion
    222, // Three-dose strength potion
    223, // Two-dose strength potion
    224, // One-dose strength potion
    486, // Full super attack potion
    487, // Two-dose super attack potion
    488, // One-dose super attack potion
    492, // Full super strength potion
    493, // Two-dose super strength potion
    494, // One-dose super strength potion
    477, // Full stat restoration potion
    478, // Two-dose stat restoration potion
    479 // One-dose stat restoration potion
];

// small helpers

function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

function inArray(value, arr) {
    return arr.indexOf(value) !== -1;
}

// drop the spell's ground graphic at the mob's tile, remove it 2 ticks later.
function spawnGodSpellObject(mob, objectId) {
    const { world } = mob;
    const obj = new GameObject(world, {
        id: objectId,
        x: mob.x,
        y: mob.y,
        direction: 0
    });

    world.addEntity('gameObjects', obj);
    world.setTickTimeout(() => world.removeEntity('gameObjects', obj), 2);
}

// true inside the mage-arena bounds.
function inMageArena(player) {
    const x = player.x;
    const y = player.y % player.world.planeElevation; // flatten to ground plane
    return x >= 217 && x <= 239 && y >= 119 && y <= 141;
}

// mage_arena stage stored on player.cache.
function getStage(player) {
    return player.cache.mage_arena || 0;
}

function setStage(player, stage) {
    player.cache.mage_arena = stage;
}

function hasStage(player) {
    return !!player.cache.mage_arena;
}

// "cantGo" - the no-weapons/no-armour arena-entry check. melee bonus =
// armour + weaponAim + weaponAim (the weaponAim-counted-twice quirk is kept).
function isNotAllowedItem(item) {
    const def = item.definition;

    if (!def.equip || def.equip.length === 0) {
        // non-wearable items are fine, except stat-boosting potions.
        return inArray(item.id, STAT_BOOSTING_POTIONS);
    }

    // necklace/cape slots are unrestricted
    if (inArray('cape', def.equip) || inArray('necklace', def.equip)) {
        return false;
    }

    // allowed staves (weapon slot) are exempt entirely
    if (inArray(item.id, ALLOWED_ENTRY_STAVES)) {
        return false;
    }

    // any other weapon (right-hand / left-hand / 2-handed) is disallowed
    if (
        inArray('right-hand', def.equip) ||
        inArray('left-hand', def.equip) ||
        inArray('2-handed', def.equip)
    ) {
        return true;
    }

    const w = def.wieldable || {};
    const armourBonus = w.armour || 0;
    const magicBonus = w.magic || 0;
    const prayerBonus = w.prayer || 0;
    const weaponAimBonus = w.weaponAim || 0;
    // melee bonus = armour + weaponAim + weaponAim
    const meleeBonus = armourBonus + weaponAimBonus + weaponAimBonus;

    // allow "low-tier" magic/prayer related equipment with low melee bonus
    if (
        ((magicBonus > 0 && magicBonus <= 10) ||
            (prayerBonus > 0 && prayerBonus <= 10)) &&
        meleeBonus <= 5
    ) {
        return false;
    }

    // allow very basic armour, or Ice gloves specifically (its armour bonus is 3).
    if (
        (armourBonus <= 2 && weaponAimBonus === 0 && w.weaponPower === 0) ||
        item.id === ICE_GLOVES_ID
    ) {
        return false;
    }

    // disallow any other wearable
    return true;
}

function cantGo(player) {
    for (const item of player.inventory.items) {
        if (isNotAllowedItem(item)) {
            return true;
        }
    }

    return false;
}

async function cantGoMessage(player) {
    player.message('@que@You cannot enter the arena...');
    await player.world.sleepTicks(3);
    // text includes "or melee potions" for combat-odyssey worlds.
    player.message('@que@...while carrying weapons, armour, or melee potions');
    await player.world.sleepTicks(3);
}

// the god-choice stones refuse a second cape (carried or banked).
function alreadyHasCape(player) {
    const carrying = GOD_CAPES.some((id) => player.inventory.has(id));
    const banked = GOD_CAPES.some((id) => player.bank.has(id));
    return carrying || banked;
}

// a god cape on the ground is refused if the player already owns one.
async function onGroundItemTake(player, groundItem) {
    if (!inArray(groundItem.id, GOD_CAPES)) {
        return false;
    }

    if (alreadyHasCape(player)) {
        player.message('you may only possess one sacred cape at a time');
    } else {
        player.world.removeEntity('groundItems', groundItem);
        player.sendSound('takeobject');
        player.inventory.add(groundItem.id, groundItem.amount);
    }

    return true;
}

// Kolodion spawn / fight-chain state (spawnedKolodion/magedKolodion are transient
// per-player fields, never persisted).

// spawn the next Kolodion form at the arena spot. on a fresh challenge, blast the
// player for 7-15 and remember the stage in the cache so a relog resumes the same form.
async function spawnKolodion(player, id, isContinue) {
    const { world } = player;

    const npc = new NPC(world, {
        id,
        x: 227,
        y: 130,
        minX: 222,
        maxX: 232,
        minY: 125,
        maxY: 135
    });
    delete npc.respawn;
    world.addEntity('npcs', npc);

    player.spawnedKolodion = npc;

    if (!isContinue) {
        player.cache.kolodion_stage = id;
        player.message(
            'kolodion blasts you ' +
                (id === KOLODION_HUMAN ? 'with his staff' : 'again')
        );
        player.damage(random(7, 15));
        player.sendTeleportBubble(player.x, player.y);
    }

    startKolodionAmbientEvent(player, npc);
}

// ambient loop: Kolodion randomly blasts the player for chip damage while they
// stand near him, ~1% per tick, separate from the real melee fight. stops when
// the npc is gone or the player leaves.
function startKolodionAmbientEvent(player, npc) {
    const { world } = player;

    const tick = () => {
        // npc no longer in the world (killed / removed) -> stop
        if (world.npcs.getByIndex(npc.index) !== npc) {
            return;
        }

        // player left the area -> despawn kolodion, stop
        if (!npc.withinRange(player, 16)) {
            world.removeEntity('npcs', npc);
            player.spawnedKolodion = null;
            return;
        }

        if (player.opponent || !npc.withinRange(player, 8)) {
            world.setTickTimeout(tick, 1);
            return;
        }

        const recentMaged = !!player.magedKolodion;

        if (random(1, 100) !== 1 && !recentMaged) {
            world.setTickTimeout(tick, 1);
            return;
        }

        if (recentMaged && random(0, 1) === 1) {
            player.message(
                Math.random() < 0.5
                    ? '@yel@kolodion: die you foolish mortal'
                    : '@yel@kolodion: the bigger the better'
            );
            player.magedKolodion = false;
            world.setTickTimeout(tick, 1);
            return;
        }

        let transformStage = 0;

        switch (npc.id) {
            case KOLODION_HUMAN:
                transformStage = 0;
                break;
            case KOLODION_SPIDER:
                transformStage = 1;
                break;
            case KOLODION_SOULESS:
                transformStage = 2;
                break;
            case KOLODION_DEMON:
                transformStage = 3;
                break;
        }

        const allElements = transformStage >= 2;
        const spellType = random(0, 1 + (allElements ? 1 : 0));

        // spellType 0/1/2 = claws of guthix / saradomin strike / flames of zamorak.
        const spellTypeObjectIds = [
            GOD_SPELL_OBJECT.CLAWS_OF_GUTHIX,
            GOD_SPELL_OBJECT.SARADOMIN_STRIKE,
            GOD_SPELL_OBJECT.FLAMES_OF_ZAMORAK
        ];
        spawnGodSpellObject(player, spellTypeObjectIds[spellType]);

        const messagesByType = [
            ['@yel@kolodion: roooaar', 'claws grab you from below'],
            [
                '@yel@kolodion: aaarrgghhh',
                '@yel@kolodion: feel the power of the elements',
                'you are hit by a lightning bolt'
            ],
            [
                '@yel@kolodion: feel the power of the elements mortal',
                'you burst into flames'
            ]
        ];

        if (transformStage === 3 && spellType === 2 && Math.random() < 0.5) {
            messagesByType[2] = [
                '@yel@kolodion: burn fool ....burn',
                'you burst into flames'
            ];
        }

        player.magedKolodion = false;

        (async () => {
            for (const message of messagesByType[spellType]) {
                player.message(message);
                await world.sleepTicks(2);
            }

            await world.sleepTicks(3);

            // reciprocal slope / shift-per-phase damage scaling.
            const maxHits = player.skills.hits.base;
            const reciprocalSlope = Math.floor(
                1.0 / (0.06 - (0.01 / 48.0) * maxHits)
            );
            const shiftPerPhase = Math.round(
                (0.004 * maxHits + 0.4) * reciprocalSlope
            );
            const currentHits = player.skills.hits.current;
            const dmg =
                Math.ceil(
                    Math.max(
                        currentHits + (transformStage - 1.0) * shiftPerPhase,
                        0
                    ) / reciprocalSlope
                ) + 1;

            player.damage(dmg);

            world.setTickTimeout(tick, 1);
        })();
    };

    world.setTickTimeout(tick, 1);
}

// ambient cosmetic event: near a battle mage after a recent Kolodion blast, get
// "maged" for chip damage and a message. the real spell-learning is in spell.js.
// started on passing through the arena gate at stage 4 (has a staff).
function learnSpellEvent(player) {
    const { world } = player;

    const tick = () => {
        if (!inMageArena(player)) {
            return;
        }

        if (player.opponent) {
            world.setTickTimeout(tick, 3);
            return;
        }

        const recentMaged = !!player.magedKolodion;

        if (!recentMaged) {
            world.setTickTimeout(tick, 3);
            return;
        }

        if (random(0, 1) === 1) {
            player.magedKolodion = false;
            world.setTickTimeout(tick, 3);
            return;
        }

        const guthix = player.getNearestEntityByID(
            'npcs',
            BATTLE_MAGE_GUTHIX_ID,
            2
        );
        const zamorak = player.getNearestEntityByID(
            'npcs',
            BATTLE_MAGE_ZAMORAK_ID,
            2
        );
        const saradomin = player.getNearestEntityByID(
            'npcs',
            BATTLE_MAGE_SARADOMIN_ID,
            2
        );

        player.magedKolodion = false;

        const hitDamage = () =>
            player.skills.hits.current < 20
                ? 2
                : Math.ceil(player.skills.hits.current * 0.08);

        if (guthix && guthix.withinRange(player, 1)) {
            spawnGodSpellObject(player, GOD_SPELL_OBJECT.CLAWS_OF_GUTHIX);
            player.message('@yel@guthix mage: feel the wrath of guthix');
            player.damage(hitDamage());
        } else if (zamorak && zamorak.withinRange(player, 1)) {
            spawnGodSpellObject(player, GOD_SPELL_OBJECT.FLAMES_OF_ZAMORAK);
            player.message('@yel@zamorak mage: feel the wrath of zamarok');
            player.damage(hitDamage());
        } else if (saradomin && saradomin.withinRange(player, 1)) {
            spawnGodSpellObject(player, GOD_SPELL_OBJECT.SARADOMIN_STRIKE);
            player.message('@yel@Saradomin mage: feel the wrath of Saradomin');
            player.damage(hitDamage());
        }

        world.setTickTimeout(tick, 3);
    };

    world.setTickTimeout(tick, 3);
}

// Kolodion dialogue.
async function talkToKolodion(player, npc) {
    player.engage(npc);

    if (player.skills.magic.base < 60) {
        await player.say('hello there', 'what is this place?');
        await npc.say(
            'do not waste my time with trivial questions!',
            'i am the great kolodion, master of battle magic',
            'i have an arena to run'
        );
        await player.say('can i enter?');
        await npc.say("hah, a wizard of your level..don't be absurd");
        player.disengage();
        return;
    }

    if (hasStage(player)) {
        const stage = getStage(player);

        if (stage === 1) {
            await player.say('hi');
            await npc.say(
                'you return young conjurer..',
                '..you obviously have a taste for the darkside of magic',
                'let us continue with the battle...now'
            );

            if (cantGo(player)) {
                player.disengage();
                await cantGoMessage(player);
                return;
            }

            player.disengage();
            player.teleport(229, 130);
            player.skills.attack.current = 0;
            player.skills.strength.current = 0;
            player.sendStats();
            await spawnKolodion(player, player.cache.kolodion_stage, true);
        } else if (stage === 2) {
            await player.say('hello kolodion');
            await npc.say("hello  young mage.. you're a tough one you");
            await player.say('what now?');
            await npc.say(
                'step into the magic pool, it will take you to the chamber',
                "there you must decide which god you'll represent in the arena"
            );
            await player.say('ok .. thanks kolodion');
            await npc.say("that's what i'm here for");
            player.disengage();
        } else if (stage >= 3) {
            await player.say('hello kolodion');
            await npc.say('hey there, how are you?, enjoying the bloodshed?');
            await player.say("it's not bad, i've seen worse");

            const menu = await player.ask(
                [
                    "i think i've had enough for now",
                    'how can i use my new spells outside of the arena?'
                ],
                true
            );

            if (menu === 0) {
                await npc.say(
                    'shame , you are a good battle mage',
                    'hope to see you soon'
                );
            } else if (menu === 1) {
                await npc.say(
                    'experience my friend, experience',
                    "once you've used the spell enough times in the arena...",
                    "...you'll be able to use them in the rest of runescape"
                );
                await player.say('good stuff');
                await npc.say(
                    "not so good for the citizens, they won't stand a chance"
                );
                await player.say('how am i doing so far?');

                const spellNames = [
                    'Saradomin strike',
                    'Claws of Guthix',
                    'Flames of Zamorak'
                ];
                const shortNames = ['strike', 'claw', 'flame'];

                for (let i = 0; i < spellNames.length; i += 1) {
                    const key = `${spellNames[i]}_casts`;
                    const casts = player.cache[key] || 0;

                    if (casts >= 100) {
                        await npc.say(
                            `you're fully trained to use the ${shortNames[i]} spell anywhere`
                        );
                    } else {
                        await npc.say(
                            `you still need to train with the ${shortNames[i]} spell...`,
                            '...inside the arena before you can use it outside'
                        );
                    }
                }
            }

            player.disengage();
        } else {
            player.disengage();
        }

        return;
    }

    await player.say('hello there', 'what is this place?');
    await npc.say(
        'i am the great kolodion, master of battle magic ...',
        '... and this is my battle arena',
        'top wizards travel from all over to fight here'
    );

    const choice = await player.ask(
        ['can i fight here?', "what's the point of that?", "that's barbaric"],
        true
    );

    if (choice === 0) {
        await canIFight(player, npc);
    } else if (choice === 1) {
        await whatsThePoint(player, npc);
    } else if (choice === 2) {
        await barbaric(player, npc);
    }
}

async function canIFight(player, npc) {
    await npc.say(
        'my arena is open to any high level wizard',
        'but this is no game traveller, wizards fall in this arena..',
        '..never to rise again, the strongest of mages have been destroyed',
        "but if you're sure you want in?"
    );

    const choice = await player.ask(['yes indeedy', "no, i don't"], true);

    if (choice === 0) {
        await joinFight(player, npc);
    } else {
        await npc.say('your loss');
        player.disengage();
    }
}

async function whatsThePoint(player, npc) {
    await npc.say(
        'we learn how to use our magic to it fullest...',
        '..,how to channel forces of the cosmos into our world..',
        '..,but mainly I just like blasting people into dust'
    );

    const choice = await player.ask(
        ['can i fight here?', "that's barbaric"],
        true
    );

    if (choice === 0) {
        await canIFight(player, npc);
    } else {
        await barbaric(player, npc);
    }
}

async function barbaric(player, npc) {
    await npc.say(
        "nope, it's magic, but I know what you mean",
        'so do you want to join us?'
    );

    const choice = await player.ask(['yes indeedy', "no, i don't"], true);

    if (choice === 0) {
        await joinFight(player, npc);
    } else {
        await npc.say('your loss');
        player.disengage();
    }
}

async function joinFight(player, npc) {
    await npc.say(
        'good..good, you have a healthy sense of competition',
        'remember traveller in my arena hand to hand combat is useless',
        'your strength will diminish as you enter the arena',
        'but the spells you can learn are amongst the most powerful in runescape',
        'before i can accept you in, we must duel',
        'you may not take armour or weapons into the arena'
    );

    if (cantGo(player)) {
        player.disengage();
        await cantGoMessage(player);
        return;
    }

    const choice = await player.ask(["ok let's fight", 'no thanks'], true);

    if (choice !== 0) {
        await npc.say('your loss');
        player.disengage();
        return;
    }

    await npc.say("I must check that you're up to scratch");
    await player.say("you don't need to worry about that");
    await npc.say(
        'not just any magician can enter traveller',
        'only the most powerful, the most feared',
        'before you use the power of this arena',
        'you must prove yourself against me',
        'now!'
    );

    if (!hasStage(player)) {
        setStage(player, 1);
    }

    player.disengage();
    player.teleport(229, 130);
    player.skills.attack.current = 0;
    player.skills.strength.current = 0;
    player.sendStats();

    await spawnKolodion(player, KOLODION_HUMAN, false);
}

// the transformation chain: each Kolodion form spawns the next on death.
async function onNPCDeath(player, npc) {
    if (!player || !inArray(npc.id, KOLODION_FORMS)) {
        return false;
    }

    const { world } = player;
    world.removeEntity('npcs', npc);
    player.spawnedKolodion = null;

    if (npc.id === KOLODION_HUMAN) {
        player.message('@que@kolodion slumps to the floor..');
        await world.sleepTicks(3);
        player.message('@que@..his body begins to grow and he changes form');
        await world.sleepTicks(3);
        player.message('@que@He becomes an intimidating ogre');
        await world.sleepTicks(3);
        await spawnKolodion(player, KOLODION_OGRE, false);
    } else if (npc.id === KOLODION_OGRE) {
        player.message('@que@kolodion slumps to the floor once more..');
        await world.sleepTicks(3);
        player.message(
            '@que@..but again his body begins to grow and he changes form'
        );
        await world.sleepTicks(3);
        player.message('@que@He becomes an enormous spider');
        await world.sleepTicks(3);
        await spawnKolodion(player, KOLODION_SPIDER, false);
    } else if (npc.id === KOLODION_SPIDER) {
        player.message('@que@kolodion again slumps to the floor..');
        await world.sleepTicks(3);
        player.message(
            '@que@..but again his body begins to grow as he changes form'
        );
        await world.sleepTicks(3);
        player.message('@que@He becomes an ethereal being');
        await world.sleepTicks(3);
        await spawnKolodion(player, KOLODION_SOULESS, false);
    } else if (npc.id === KOLODION_SOULESS) {
        player.message('@que@kolodion again slumps to the floor..motionless');
        await world.sleepTicks(3);
        player.message(
            '@que@..but again his body begins to grow as he changes form'
        );
        await world.sleepTicks(3);
        player.message('@que@...larger this time');
        await world.sleepTicks(3);
        player.message('@que@He becomes a vicious demon');
        await world.sleepTicks(3);
        await spawnKolodion(player, KOLODION_DEMON, false);
    } else if (npc.id === KOLODION_DEMON) {
        player.message('@que@kolodion again slumps to the floor..motionless');
        await world.sleepTicks(3);
        player.message('@que@..he slowly rises to his feet in his true form');
        await world.sleepTicks(3);
        player.message('@que@@yel@Kolodion: "well done young adventurer"');
        await world.sleepTicks(3);
        player.message('@que@@yel@Kolodion: "you truly are a worthy battle mage"');
        await world.sleepTicks(3);
        player.message('kolodion teleports you to his cave');
        player.teleport(446, 3370);

        const kolodion = player.getNearestEntityByID(
            'npcs',
            KOLODION_HUMAN_PASSIVE,
            8
        );

        if (!kolodion) {
            player.message('kolodion is currently busy');
        } else {
            player.engage(kolodion);
            await player.say(
                'what now kolodion? how can i learn some of those spells?'
            );
            await kolodion.say(
                'these spells are gifts from the gods',
                'first you must choose which god...',
                '...you will represent in the mage arena'
            );
            await player.say('cool');
            await kolodion.say(
                'step into the magic pool, it will carry you to the chamber'
            );
            await player.say('the chamber?');
            await kolodion.say('there you must decide your loyalty');
            await player.say('ok kolodion , thanks for the battle');
            await kolodion.say(
                'remember young mage, you must use the spells...',
                '...many times in the arena before you can use them outside'
            );
            await player.say('no problem');
            player.disengage();
        }

        setStage(player, 2);
        delete player.cache.kolodion_stage;
    }

    return true;
}

// dying drops the reference to this player's spawned Kolodion (the npc stays in the world).
async function onPlayerDeath(player) {
    if (player.spawnedKolodion) {
        player.spawnedKolodion = null;
    }

    return false;
}

// refuse to fight another player's spawned Kolodion, or the battle mages before
// stage 2. the WANT_COMBAT_ODYSSEY re-attack branch is not ported (no re-attack
// primitive here); left always-unblocked once ready.
async function onNPCAttack(player, npc) {
    if (inArray(npc.id, KOLODION_FORMS)) {
        if (player.spawnedKolodion !== npc) {
            player.message('that mage is busy.');
            return true;
        }
        return false;
    }

    if (inArray(npc.id, BATTLE_MAGE_IDS)) {
        if (getStage(player) <= 2) {
            player.message('you are not yet ready to fight the battle mages');
            return true;
        }
        return false;
    }

    return false;
}

// the same check for casting at Kolodion or a battle mage, from spell.js's dispatch.
async function onSpellNPC(player, npc) {
    if (inArray(npc.id, KOLODION_FORMS)) {
        if (player.spawnedKolodion !== npc) {
            player.message('that mage is busy.');
        }
        return true;
    }

    if (inArray(npc.id, BATTLE_MAGE_IDS) && getStage(player) < 2) {
        player.message('you are not yet ready to fight the battle mages');
        return true;
    }

    return false;
}

// onTalkToNPC dispatch: Kolodion (712 only), Chamber Guardian, Lundail.

// Chamber Guardian dialogue + staff shop.
async function talkToChamberGuardian(player, npc) {
    player.engage(npc);

    const stage = getStage(player);

    if (stage === 2) {
        await player.say('hello my friend, kolodion sent me down');
        await npc.say(
            'sssshhh...the gods are talking..i can hear their whispers',
            "..can you hear them adventurer...they're calling you"
        );
        await player.say('erm...ok!');
        await npc.say(
            'go and chant to the the sacred stone of your chosen god',
            'you will be rewarded'
        );
        await player.say('ok?');
        await npc.say(
            "once you're done come back to me...",
            "...and i'll supply you with a mage staff ready for battle"
        );
        setStage(player, 3);
        player.disengage();
        return;
    }

    // only the carried inventory is checked here, not the bank.
    const carryingCape = GOD_CAPES.some((id) => player.inventory.has(id));

    if (stage === 3 && carryingCape) {
        await npc.say('hello adventurer, have you made your choice?');
        await player.say('i have');
        await npc.say(
            'good, good .. i hope you chose well',
            'you will have been rewarded with a magic cape',
            'now i will give you a magic staff',
            "these are all the weapons and armour you'll need here"
        );
        player.message('the mage guardian gives you a magic staff');

        if (player.inventory.has(ZAMORAK_CAPE)) {
            player.inventory.add(STAFF_OF_ZAMORAK);
        } else if (player.inventory.has(SARADOMIN_CAPE)) {
            player.inventory.add(STAFF_OF_SARADOMIN);
        } else if (player.inventory.has(GUTHIX_CAPE)) {
            player.inventory.add(STAFF_OF_GUTHIX);
        }

        setStage(player, 4);
        player.disengage();
        return;
    }

    if (stage === 4) {
        await player.say('hello again');
        await npc.say('hello adventurer, are you looking for another staff?');

        const choice = await player.ask(
            [
                'what do you have to offer?',
                'no thanks',
                'tell me what you know about the charge spell?'
            ],
            true
        );

        if (choice === 0) {
            await npc.say('take a look');
            player.disengage();
            player.openShop(CHAMBER_GUARDIAN_SHOP);
            return;
        } else if (choice === 1) {
            await npc.say('well, let me know if you need one');
        } else if (choice === 2) {
            await npc.say(
                'we believe the spells are gifts from the gods',
                'the charge spell draws even more power from the cosmos',
                'while wearing a matching cape and staff',
                'it will double the damage caused by ...',
                'battle mage spells for several minutes'
            );
            await player.say('good stuff');
        }

        player.disengage();
        return;
    }

    await npc.say('hello adventurer, have you made your choice?');
    await player.say('no, not yet.');
    await npc.say(
        "once you're done come back to me...",
        "...and i'll supply you with a mage staff ready for battle"
    );
    player.disengage();
}

// Lundail rune shop + flavour dialogue.
async function talkToLundail(player, npc) {
    player.engage(npc);

    await player.say('well hello sir');
    await npc.say('hello brave adventurer', 'how can i help you?');

    const choice = await player.ask(
        ['what are you selling?', "what's that big old building behind us?"],
        true
    );

    if (choice === 0) {
        await npc.say(
            'why, i sell rune stones',
            "i've got some good stuff, real powerful little rocks",
            'take a look'
        );
        player.disengage();
        player.openShop(LUNDAIL_SHOP);
        return;
    } else if (choice === 1) {
        await npc.say(
            'why that my friend...',
            '...is the mage battle arena',
            'top mages come from all over to compete in the arena',
            'few return back, most get fried...hence the smell'
        );
        await npc.say('hmmm.. i did notice');
    }

    player.disengage();
}

async function onTalkToNPC(player, npc) {
    if (npc.id === KOLODION_HUMAN_PASSIVE) {
        await talkToKolodion(player, npc);
        return true;
    }

    if (npc.id === CHAMBER_GUARDIAN_ID) {
        await talkToChamberGuardian(player, npc);
        return true;
    }

    if (npc.id === LUNDAIL_ID) {
        await talkToLundail(player, npc);
        return true;
    }

    return false;
}

// onGameObjectCommandOne: gates, the mystical barrier, god-choice stones, the two magical pools.

// chant to a god stone.
async function chantToStone(player, godName, capeId) {
    const stage = getStage(player);

    if (stage >= 3) {
        player.message(`you kneel and chant to ${godName}`);
        await player.world.sleepTicks(3);

        if (!alreadyHasCape(player)) {
            player.message(
                '@que@you feel a rush of energy charge through your veins'
            );
            await player.world.sleepTicks(3);
            player.message('@que@...and a cape appears before you');
            await player.world.sleepTicks(3);
            player.inventory.add(capeId);
        } else {
            player.message('@que@but there is no response');
            await player.world.sleepTicks(3);
        }

        return;
    }

    if (stage === 2) {
        player.message(`@que@you kneel and begin to chant to ${godName}`);
        await player.world.sleepTicks(3);
        player.message('@que@you feel a rush of energy charge through your veins');
        await player.world.sleepTicks(3);
        player.sendTeleportBubble(player.x, player.y);
        player.inventory.add(capeId);
        setStage(player, 3);
    }
}

async function onGameObjectCommandOne(player, gameObject) {
    if (inArray(gameObject.id, GATE_OBJECT_IDS)) {
        player.message('you open the gate ...');
        player.message('... and walk through');

        // cross to the far side of the gate tile
        const dx = player.x < gameObject.x ? 1 : -1;
        player.teleport(player.x + dx, player.y);

        if (getStage(player) === 4) {
            learnSpellEvent(player);
        }

        return true;
    }

    if (gameObject.id === ENTRANCE_OBJECT_ID) {
        const flatY = player.y % player.world.planeElevation;

        if (flatY >= 120) {
            player.message('you pass through the mystical barrier');
            player.teleport(228, 118);

            if (player.spawnedKolodion) {
                player.world.removeEntity('npcs', player.spawnedKolodion);
                player.spawnedKolodion = null;
            }
        } else if (getStage(player) >= 4) {
            player.message('@que@the barrier is checking your person for weapons');
            await player.world.sleepTicks(3);

            if (!cantGo(player)) {
                player.teleport(228, 120);
            } else {
                await cantGoMessage(player);
            }
        } else {
            player.message(
                'you cannot enter without the permission of kolodion'
            );
        }

        return true;
    }

    if (gameObject.id === SARADOMIN_STONE_ID) {
        await chantToStone(player, 'saradomin', SARADOMIN_CAPE);
        return true;
    }

    if (gameObject.id === GUTHIX_STONE_ID) {
        await chantToStone(player, 'guthix', GUTHIX_CAPE);
        return true;
    }

    if (gameObject.id === ZAMORAK_STONE_ID) {
        await chantToStone(player, 'zamorak', ZAMORAK_CAPE);
        return true;
    }

    if (gameObject.id === CHAMBER_POOL_ID) {
        if (getStage(player) >= 2) {
            player.teleport(471, 3385);
            player.message('you are teleported further under ground');
        } else {
            player.message('@que@you step into the pool');
            await player.world.sleepTicks(2);
            player.message('@que@you wet your boots');
            await player.world.sleepTicks(2);
        }

        return true;
    }

    if (gameObject.id === ENTRY_POOL_ID) {
        player.message('@que@you step into the sparkling water');
        await player.world.sleepTicks(2);
        player.message('@que@you feel energy rush through your veins');
        await player.world.sleepTicks(2);
        player.teleport(447, 3373);
        player.message('you are teleported to kolodions cave');
        return true;
    }

    return false;
}

module.exports = {
    onTalkToNPC,
    onNPCDeath,
    onNPCAttack,
    onSpellNPC,
    onPlayerDeath,
    onGameObjectCommandOne,
    onGroundItemTake,
    // exported for the standalone harness / potential reuse
    _internal: {
        inMageArena,
        getStage,
        setStage,
        hasStage,
        cantGo,
        alreadyHasCape,
        KOLODION_FORMS,
        KOLODION_HUMAN,
        KOLODION_OGRE,
        KOLODION_SPIDER,
        KOLODION_SOULESS,
        KOLODION_DEMON,
        KOLODION_HUMAN_PASSIVE,
        CHAMBER_GUARDIAN_ID,
        BATTLE_MAGE_GUTHIX_ID,
        BATTLE_MAGE_ZAMORAK_ID,
        BATTLE_MAGE_SARADOMIN_ID,
        LUNDAIL_ID,
        GATE_OBJECT_IDS,
        ENTRANCE_OBJECT_ID,
        SARADOMIN_STONE_ID,
        GUTHIX_STONE_ID,
        ZAMORAK_STONE_ID,
        CHAMBER_POOL_ID,
        ENTRY_POOL_ID
    }
};
