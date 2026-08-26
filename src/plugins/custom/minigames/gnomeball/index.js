
const { ZONE, resolvePositionToZone } = require('./field');
const { IronmanMode } = require('../../../../model/game-modes');

// ids

const GNOME_BALL = 981;

const FIELD_GATE = 702;
const OPEN_GATE = 357; // doGate(player, obj, 357)

// GnomeNpcs constants (raw NpcId ids, == rsc-data ids)
const GNOME_BALLERS_ZONE_PASS = [605, 606, 607, 608];
const GNOME_BALLERS_ZONE1XP_OUTER = [603, 604];
const GNOME_BALLERS_ZONE2XP_OUTER = [595, 600, 602];
const GNOME_BALLERS_ZONE1XP_INNER = [597, 598, 599];
const GNOME_BALLER_NORTH = 609;
const GNOME_BALLER_SOUTH = 610;
const GOALIE = 596;
const CHEERLEADER = 611;
const REFEREE = 601;
const OFFICIAL = 625;

// gnome ballers that can be tackled, excludes the wingers
const GNOME_BALLER_TACKLE_IDS = [
    ...GNOME_BALLERS_ZONE_PASS,
    ...GNOME_BALLERS_ZONE1XP_OUTER,
    ...GNOME_BALLERS_ZONE2XP_OUTER,
    ...GNOME_BALLERS_ZONE1XP_INNER
];

// ranged + agility xp per goal, by zone and goal count
const SCORES_XP = [
    [20, 30, 35, 40, 220],
    [40, 50, 60, 70, 220]
];

// GnomeNpcs.TACKLING_XP (player tackles a gnome, random(0,1))
const TACKLING_XP_GRAB = [15, 20];
// xp for dodging a gnome's tackle
const TACKLING_XP_AVOID = [7, 10, 15, 20];

const GAME_TICK = 640;

// small helpers

// DataConversions.random(low, high) - inclusive on both ends
function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

function inArray(value, arr) {
    return arr.indexOf(value) !== -1;
}

function isGnomeBaller(id) {
    return inArray(id, GNOME_BALLER_TACKLE_IDS);
}

// state accessors

function hasBall(player) {
    return player.inventory.has(GNOME_BALL);
}

// id of the gnome baller holding the ball, 0 if none
function getGnomeballNpc(player) {
    return player.cache.gnomeball_npc || 0;
}

function setGnomeballNpc(player, value) {
    player.cache.gnomeball_npc = value;
}

function noGnomeHasBall(player) {
    const id = getGnomeballNpc(player);
    return id === -1 || id === 0;
}

// set while a throw or pass is in flight
function isThrowingBallGame(player) {
    return !!player.throwingBallGame;
}

function setThrowingBallGame(player, value) {
    player.throwingBallGame = value;
}

// ambient npc chat

// fire-and-forget ambient chat bubble, no engagement
function yellNpcChat(player, npc, message) {
    const previous = npc.interlocutor;
    npc.interlocutor = player;

    try {
        npc.broadcastChat(message);
    } finally {
        npc.interlocutor = previous;
    }
}

// paced ambient bubbles for lines fired outside a dialogue
async function sayNpcChat(player, npc, ...messages) {
    for (const message of messages) {
        yellNpcChat(player, npc, message);
        await player.world.sleepTicks(2);

        if (message.length >= 25) {
            await player.world.sleepTicks(1);
        }
    }
}

// tackle loop: gnome-tackles-player ai

function ensureTackleLoop(player) {
    if (player.gnomeBallTackleActive) {
        return;
    }

    player.gnomeBallTackleActive = true;
    scheduleTackleTick(player);
}

function scheduleTackleTick(player) {
    player.world.setTickTimeout(() => tackleTick(player), 1);
}

async function tackleTick(player) {
    const { world } = player;

    // player left the world (logged out / removed) -> stop
    if (!player.loggedIn || world.players.getByIndex(player.index) !== player) {
        player.gnomeBallTackleActive = false;
        return;
    }

    // nothing to tackle if player isn't carrying the ball
    if (!hasBall(player)) {
        player.gnomeBallTackleActive = false;
        return;
    }

    await maybeTacklePlayer(player);

    if (player.gnomeBallTackleActive && hasBall(player)) {
        scheduleTackleTick(player);
    } else {
        player.gnomeBallTackleActive = false;
    }
}

// gnome baller tackle check and attempt, from the player's side
async function maybeTacklePlayer(player) {
    const now = Date.now();

    // NpcBehavior: currentTimeMillis() - lastTackleAttempt > GAME_TICK * 5
    if (now - (player.gnomeBallLastTackle || 0) <= GAME_TICK * 5) {
        return;
    }

    // player must hold ball, no gnome holds it, not mid-throw
    if (isThrowingBallGame(player) || !noGnomeHasBall(player)) {
        return;
    }

    // find an adjacent (within 1 tile) tackle-eligible gnome baller
    let gnome = null;

    for (const id of GNOME_BALLER_TACKLE_IDS) {
        gnome = player.getNearestEntityByID('npcs', id, 1);

        if (gnome) {
            break;
        }
    }

    if (!gnome) {
        return;
    }

    player.gnomeBallLastTackle = now;
    attemptTacklePlayer(player, gnome);
}

// the gnome tries to take the ball off the player
function attemptTacklePlayer(player, gnome) {
    player.message('the gnome trys to tackle you');

    if (random(0, 1) === 0) {
        // player avoids the tackle -> agility xp
        player.message('@que@You manage to push him away');
        yellNpcChat(player, gnome, 'grrrrr');
        player.addExperience('agility', TACKLING_XP_AVOID[random(0, 3)], true);
    } else {
        // re-check guard since state may have changed since the roll
        if (!noGnomeHasBall(player) || isThrowingBallGame(player)) {
            return;
        }

        setGnomeballNpc(player, gnome.id);
        player.inventory.remove(GNOME_BALL);
        player.message('@que@he takes the ball...');
        player.message('@que@and pushes you to the floor');
        player.damage(Math.ceil(player.skills.hits.current * 0.05));
        player.say('ouch');
        yellNpcChat(player, gnome, 'yeah');
    }
}

// scoring

function handleScore(player, scoreZone) {
    let totalXp = 0;
    let totalGoals = 1;

    if (typeof player.cache.gnomeball_total_goals === 'number') {
        totalGoals += player.cache.gnomeball_total_goals;
    }

    if (typeof player.cache.gnomeball_xp === 'number') {
        totalXp += player.cache.gnomeball_xp;
    }

    const prevGoalCount = player.cache.gnomeball_goals || 0;
    const gained = SCORES_XP[scoreZone][prevGoalCount];

    player.addExperience('ranged', gained, true);
    player.addExperience('agility', gained, true);
    totalXp += gained;

    showScoreWindow(player, prevGoalCount + 1);

    if (prevGoalCount + 1 === 5) {
        player.sendTeleportBubble(player.x, player.y, true);
    }

    player.cache.gnomeball_goals = (prevGoalCount + 1) % 5;
    player.cache.gnomeball_xp = totalXp;
    player.cache.gnomeball_total_goals = totalGoals;
}

// goal message, with well done + agility bonus on the 5th goal
function showScoreWindow(player, goalNum) {
    player.message(goalNum > 1 ? `@yel@goal ${goalNum}` : '@yel@goal');

    if (goalNum === 5) {
        player.message('Well Done');
        player.message('@red@Agility Bonus');
    }
}

// cheerleader celebrates, ambient
async function cheerLeaderCelebrate(player, cheerleader) {
    switch (random(0, 2)) {
        case 0:
            await sayNpcChat(player, cheerleader, 'yeah', 'good goal');
            break;
        case 1:
            await sayNpcChat(player, cheerleader, 'yahoo', 'go go traveller');
            break;
        case 2:
            await sayNpcChat(
                player,
                cheerleader,
                'yeah baby',
                'gimme a g, gimme an o, gimme an a, gimme an l'
            );
            break;
    }
}

// throw the ball to another player

async function onUseWithPlayer(player, otherPlayer, item) {
    if (item.id !== GNOME_BALL) {
        return false;
    }

    const isOtherIronman =
        otherPlayer.isIronMan(IronmanMode.Ironman) ||
        otherPlayer.isIronMan(IronmanMode.Ultimate) ||
        otherPlayer.isIronMan(IronmanMode.Hardcore) ||
        otherPlayer.isIronMan(IronmanMode.Transfer);

    if (isOtherIronman) {
        player.message(
            `${otherPlayer.username} is an Ironman. ` +
                `${otherPlayer.isMale() ? 'He' : 'She'} stands alone.`
        );

        return true;
    }

    // ball flight visual, transfer happens one tick later
    player.sendProjectile(otherPlayer, 3);
    await player.world.sleepTicks(1);

    if (otherPlayer.loggedIn) {
        player.inventory.remove(GNOME_BALL);
        player.message('you throw the ball');

        // only the shops interface is reset/closed if they are accessing it
        if (otherPlayer.shop) {
            otherPlayer.exitShop();
        }

        otherPlayer.inventory.add(GNOME_BALL);
        otherPlayer.message(`Warning! ${player.username} is shooting at you!`);
        otherPlayer.message('you catch the ball');
        player.say('good catch');

        ensureTackleLoop(otherPlayer);
    }

    return true;
}

// pick the ball up off the ground

async function onGroundItemTake(player, groundItem) {
    if (groundItem.id !== GNOME_BALL) {
        return false;
    }

    if (hasBall(player)) {
        player.message('@que@you can only carry one ball at a time');
        await player.world.sleepTicks(2);
        player.message('@que@otherwise it would be too easy');
        await player.world.sleepTicks(2);
    } else {
        player.world.removeEntity('groundItems', groundItem);
        player.inventory.add(GNOME_BALL, 1);
        ensureTackleLoop(player);
    }

    return true;
}

// shoot the ball: pass to a winger or throw at goal

async function onInventoryCommand(player, item) {
    if (item.id !== GNOME_BALL) {
        return false;
    }

    const playerZone = resolvePositionToZone(player);

    if (playerZone === ZONE.NO_PASS) {
        player.message("you can't make the pass from here");
    } else if (playerZone === ZONE.PASS) {
        const gnomeTeam =
            player.y <= 449
                ? player.getNearestEntityByID('npcs', GNOME_BALLER_NORTH, 10)
                : player.getNearestEntityByID('npcs', GNOME_BALLER_SOUTH, 10);

        if (gnomeTeam) {
            await passToTeam(player, gnomeTeam);
        }
    } else if (
        playerZone === ZONE.ONE_XP_OUTER ||
        playerZone === ZONE.ONE_XP_INNER
    ) {
        setThrowingBallGame(player, true);

        const goalie = player.getNearestEntityByID('npcs', GOALIE, 15);

        if (goalie) {
            player.sendProjectile(goalie, 3);
        }

        // logic to try to score from 1xp
        player.sendBubble(GNOME_BALL);
        player.message('@que@you throw the ball at the goal');
        await player.world.sleepTicks(3);
        player.inventory.remove(GNOME_BALL);

        const roll = random(0, 4);

        if (roll < 2 + (playerZone === ZONE.ONE_XP_INNER ? 2 : 0)) {
            player.message('@que@it flys through the net...');
            await player.world.sleepTicks(3);
            player.message('@que@into the hands of the goal catcher');
            await player.world.sleepTicks(3);

            const cheerleader = player.getNearestEntityByID(
                'npcs',
                CHEERLEADER,
                10
            );

            if (cheerleader) {
                await cheerLeaderCelebrate(player, cheerleader);
            }

            handleScore(player, 0);
        } else if (random(0, 2) < 2 || playerZone === ZONE.ONE_XP_OUTER) {
            player.message('@que@the ball flys way over the net');
            await player.world.sleepTicks(3);
        } else {
            player.message('@que@the ball just misses the net');
            await player.world.sleepTicks(3);
        }
    } else if (
        playerZone === ZONE.TWO_XP_OUTER ||
        playerZone === ZONE.TWO_XP_INNER
    ) {
        setThrowingBallGame(player, true);

        const goalie = player.getNearestEntityByID('npcs', GOALIE, 15);

        if (goalie) {
            player.sendProjectile(goalie, 3);
        }

        // logic to try to score from 2xp
        player.sendBubble(GNOME_BALL);
        player.message('@que@you throw the ball at the goal');
        await player.world.sleepTicks(3);
        player.inventory.remove(GNOME_BALL);

        const roll = random(0, 9);

        if (roll < 4 + (playerZone === ZONE.TWO_XP_INNER ? 2 : 0)) {
            player.message('@que@it flys through the net...');
            await player.world.sleepTicks(3);
            player.message('@que@into the hands of the goal catcher');
            await player.world.sleepTicks(3);

            const cheerleader = player.getNearestEntityByID(
                'npcs',
                CHEERLEADER,
                10
            );

            if (cheerleader) {
                await cheerLeaderCelebrate(player, cheerleader);
            }

            handleScore(player, 1);
        } else if (random(0, 2) < 2 || playerZone === ZONE.TWO_XP_OUTER) {
            player.message('@que@you miss by a mile!');
            await player.world.sleepTicks(3);
        } else {
            player.message('@que@the ball flys way over the net');
            await player.world.sleepTicks(3);
        }
    } else if (
        playerZone === ZONE.NOT_VISIBLE ||
        playerZone === ZONE.OUTSIDE_THROWABLE
    ) {
        player.sendBubble(GNOME_BALL);
        player.message('@que@you throw the ball at the goal');
        await player.world.sleepTicks(3);
        player.message('@que@you miss by a mile!');
        await player.world.sleepTicks(3);
        player.message('@que@maybe you should try playing on the pitch!');
        await player.world.sleepTicks(3);
    }
    // ZONE.OUTSIDE_KEEP: nothing happens (the ball is simply kept)

    return true;
}

// pass to a winger, who throws a long ball back 8 ticks later

async function passToTeam(player, npc) {
    const currentZone = resolvePositionToZone(player);

    if (currentZone === ZONE.NO_PASS) {
        player.message("you can't make the pass from here");
        return;
    }

    if (currentZone === ZONE.PASS) {
        if (!hasBall(player)) {
            player.message('you need the ball first');
            return;
        }

        setThrowingBallGame(player, true);
        player.sendProjectile(npc, 3); // BallProjectileEvent visual
        player.message('you pass the ball to the gnome');
        player.inventory.remove(GNOME_BALL);
        await sayNpcChat(player, npc, 'run long..');

        // SingleEvent GAME_TICK * 8 later: the gnome throws the ball back.
        player.world.setTickTimeout(() => {
            if (!player.loggedIn) {
                return;
            }

            player.message('the gnome throws you a long ball');
            player.inventory.add(GNOME_BALL, 1);
            setThrowingBallGame(player, false);
            ensureTackleLoop(player);
        }, 8);

        return;
    }

    // any other zone
    if (!hasBall(player)) {
        player.message('you need the ball first');
    } else {
        player.message("you can't make the pass from here");
    }
}

// player tackles the gnome that stole the ball

async function tackleGnomeBaller(player, npc) {
    // the gnome must be the one currently carrying the ball
    if (getGnomeballNpc(player) === 0 || npc.id !== getGnomeballNpc(player)) {
        player.message("the gnome isn't carrying the ball");
        return;
    }

    player.sendBubble(GNOME_BALL);
    player.message('@que@you attempt to tackle the gnome');
    await player.world.sleepTicks(3);

    if (random(0, 1) === 0) {
        // successful tackle gives agility xp
        player.message('@que@You skillfully grab the ball');
        player.message('@que@and push the gnome to the floor');
        await npc.say('grrrr');
        player.inventory.add(GNOME_BALL, 1);
        player.addExperience('agility', TACKLING_XP_GRAB[random(0, 1)], true);
        setGnomeballNpc(player, 0);
        // suppress the gnome's re-tackle for a few ticks
        player.gnomeBallLastTackle = Date.now();
        ensureTackleLoop(player);
    } else {
        player.message('@que@You\'re pushed away by the gnome');
        player.say('ouch');
        player.damage(Math.ceil(player.skills.hits.current * 0.05));
        await npc.say('hee hee');
    }
}

// referee, cheerleader, official dialogue; talking to a baller is a tackle

async function talkToCheerleader(player, npc) {
    await player.say('hello');
    await npc.say('hi there, how are you doing?');
    await player.say('not bad thanks');
    await npc.say(
        'i just love the big games',
        'all those big muscle bound gnomes running around'
    );
    await player.say('big?');
    await npc.say('do you play gnome ball?');

    // do not auto-say the choice
    const option = await player.ask(
        ['what is it?', "play! i'm a gnome ball master"],
        false
    );

    if (option === 0) {
        await player.say('what is it?');
        await npc.say('like, only the greatest gnome ball game ever made!');
        await player.say('are there many gnome ball games');
        await npc.say("no, there's just one", "and it's the best");
        await player.say('ok, so how do you play?');
        await npc.say('the attacker gets the ball and runs towards the goal net');
        await player.say('and...?');
        await npc.say('scores of course');
        await player.say('sounds easy enough');
        await npc.say(
            "you'll be playing against the best defenders in the gnome ball league"
        );
        await player.say('really, are there many teams in the league?');
        await npc.say('nope, just us!');
    } else if (option === 1) {
        await player.say("play! i'm a gnome ball master?");
        await npc.say("really, that's amazing, you're not even a gnome");
        await player.say('it does give me a height advantage');
        await npc.say('i look forward to cheering you on');
        await player.say("the first goal's for you");
        await npc.say('wow!, thanks');
    }
}

async function talkToOfficial(player, npc) {
    await player.say('hello there');
    await npc.say('well hello adventurer, are you playing?');

    // multi(...): auto-say the choice
    const option = await player.ask(
        ['not at the moment', "yes, i'm just having a break"],
        true
    );

    if (option === 0) {
        await npc.say(
            "well really you shouldn't be on the pitch",
            'some of these games get really rough'
        );

        const subOption = await player.ask(
            ['how do you play?', 'it looks like a silly game anyway'],
            true
        );

        if (subOption === 0) {
            await npc.say(
                "it's easy, you're given a ball from the ref",
                'the gnomes in orange are on your team',
                'you then charge at the gnome defense and try to throw the ball..',
                '..through the net to the goal catcher, it\'s a rough game but great fun',
                "it's also a great way to improve your agility"
            );
        } else if (option === 1) {
            await npc.say(
                'gnome ball silly!, this my friend is the backbone of our community',
                'it also happens to be a great way to stay fit and agile'
            );
        }
    } else if (option === 1) {
        await npc.say(
            "good stuff, there's nothing like chasing a pigs bladder..",
            "..to remind one that they're alive"
        );
    }
}

async function talkToReferee(player, npc) {
    if (!player.cache.gnomeball) {
        await npc.say('hi, welcome to gnome ball');
        await player.say('gnome ball?, how do you play?');
        await npc.say(
            "it's pretty simple really, you take the ball from me",
            'charge at the gnome defense and try to throw the ball..',
            '..through the net to the goal catcher, it\'s a rough game but great fun',
            "it's also a great way to improve your agility",
            'so do you fancy a game?'
        );

        const option = await player.ask(
            ['looks too dangerous for me', "ok then i'll have a go"],
            true
        );

        if (option === 0) {
            await npc.say("you may be right, we've seen humans die on this field");
        } else if (option === 1) {
            await npc.say(
                'great stuff',
                'there are no rules to gnome ball, so it can get a bit rough',
                'you can pass to the winger gnomes if your behind the start line',
                "then you can make a run and they'll pass back",
                'otherwise, if you\'re feeling brave you, can just charge and dodge'
            );
            await player.say('sounds easy enough');
            await npc.say(
                'the main aim is to leave with no broken limbs',
                'i think you should be fine'
            );
            player.cache.gnomeball = true;
            await npc.say('ready ...  go');
            player.message('@que@the ref throws the ball into the air');
            await player.world.sleepTicks(2);
            player.message('@que@you jump up and catch it');
            await player.world.sleepTicks(2);
            player.inventory.add(GNOME_BALL, 1);
            ensureTackleLoop(player);
        }

        return;
    }

    // player does not have ball
    if (!hasBall(player)) {
        // and neither does a gnome baller
        if (noGnomeHasBall(player)) {
            setThrowingBallGame(player, false);
            await npc.say('ready ...  go');
            player.message('@que@the ref throws the ball into the air');
            await player.world.sleepTicks(2);
            player.message('@que@you jump up and catch it');
            await player.world.sleepTicks(2);
            player.inventory.add(GNOME_BALL, 1);
            ensureTackleLoop(player);
        } else {
            await npc.say("the ball's still in play");
        }
    } else {
        await npc.say("the ball's still in play");
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id === CHEERLEADER) {
        player.engage(npc);
        await talkToCheerleader(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === OFFICIAL) {
        player.engage(npc);
        await talkToOfficial(player, npc);
        player.disengage();
        return true;
    }

    if (npc.id === REFEREE) {
        player.engage(npc);
        await talkToReferee(player, npc);
        player.disengage();
        return true;
    }

    if (isGnomeBaller(npc.id)) {
        player.engage(npc);
        await tackleGnomeBaller(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

// pass to a winger, or tackle a gnome baller

async function onNPCCommand(player, npc, command) {
    if (npc.id === GNOME_BALLER_NORTH || npc.id === GNOME_BALLER_SOUTH) {
        // re-verify winger is within range
        if (!npc.withinRange(player, 2)) {
            return true;
        }

        if (command === 'pass to') {
            await passToTeam(player, npc);
        }

        return true;
    }

    if (isGnomeBaller(npc.id)) {
        if (!npc.withinRange(player, 2)) {
            return true;
        }

        player.engage(npc);
        await tackleGnomeBaller(player, npc);
        player.disengage();
        return true;
    }

    return false;
}

// you can't attack the gnome ballers

async function onNPCAttack(player, npc) {
    if (!isGnomeBaller(npc.id)) {
        return false;
    }

    player.message('@que@you can\'t attack this gnome');
    await player.world.sleepTicks(2);
    player.message('@que@that\'s cheating');
    await player.world.sleepTicks(2);
    return true;
}

async function onSpellNPC(player, npc) {
    if (!isGnomeBaller(npc.id)) {
        return false;
    }

    player.message('@que@you can\'t attack this gnome');
    await player.world.sleepTicks(2);
    player.message('@que@that\'s cheating');
    await player.world.sleepTicks(2);
    return true;
}

// field gate: must be south of pitch to leave carrying the ball

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== FIELD_GATE) {
        return false;
    }

    if (player.y > 456 || !hasBall(player)) {
        player.message('you open the gate');
        player.message('and walk through');
        // swap to open gate, walk player through, swap back
        await player.enterGate(gameObject, OPEN_GATE);
    } else {
        player.message('you have to leave the ball here');
    }

    return true;
}

module.exports = {
    onUseWithPlayer,
    onGroundItemTake,
    onInventoryCommand,
    onTalkToNPC,
    onNPCCommand,
    onNPCAttack,
    onSpellNPC,
    onGameObjectCommandOne,
    // exported for the standalone harness / potential reuse
    _internal: {
        GNOME_BALL,
        FIELD_GATE,
        OPEN_GATE,
        GNOME_BALLER_TACKLE_IDS,
        GNOME_BALLER_NORTH,
        GNOME_BALLER_SOUTH,
        GOALIE,
        CHEERLEADER,
        REFEREE,
        OFFICIAL,
        SCORES_XP,
        TACKLING_XP_GRAB,
        TACKLING_XP_AVOID,
        random,
        isGnomeBaller,
        hasBall,
        getGnomeballNpc,
        setGnomeballNpc,
        noGnomeHasBall,
        isThrowingBallGame,
        setThrowingBallGame,
        handleScore,
        showScoreWindow,
        passToTeam,
        tackleGnomeBaller,
        attemptTacklePlayer,
        maybeTacklePlayer,
        ensureTackleLoop
    }
};
