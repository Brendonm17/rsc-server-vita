// mobile entities: characters and players

const Entity = require('./entity');
const directions = require('./directions');
// fisher-yates shuffle over math.random
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = array[i];
        array[i] = array[j];
        array[j] = t;
    }
    return array;
}
const enchantedCrowns = require('../plugins/skills/enchanted-crowns');
const { wildernessLevel } = require('../plugins/skills/magic');

// NaN-position walk steps logged so far, capped at 5
let walkNaNLogged = 0;

// direction number from a coord delta: deltaDirections[deltaX + 1][deltaY + 1]
const deltaDirections = [
    [directions.southWest, directions.west, directions.northWest],
    [directions.south, null, directions.north],
    [directions.southEast, directions.east, directions.northEast]
];

// [ { deltaX: 0, deltaY: 1 }, ... ]
const numberDirections = [];

for (let deltaX = -1; deltaX < 2; deltaX += 1) {
    for (let deltaY = -1; deltaY < 2; deltaY += 1) {
        const directionNumber = deltaDirections[deltaX + 1][deltaY + 1];

        if (typeof directionNumber === 'number') {
            numberDirections[directionNumber] = { deltaX, deltaY };
        }
    }
}

function getDirectionNumber(deltaX, deltaY) {
    if (deltaX === 0 && deltaY === 0) {
        return 0;
    }

    return deltaDirections[deltaX + 1][deltaY + 1];
}

function getDirectionDelta(directionNumber) {
    return numberDirections[directionNumber];
}

class Character extends Entity {
    constructor(world) {
        super(world);

        // direction number we're facing
        this.direction = 0;

        // the character we're fighting
        this.opponent = null;

        this.fightStage = -1;

        // the character we're talking to
        this.interlocutor = null;

        this.chasing = null;

        // movement lock; some npcs can still walk while locked (goblin generals)
        this.locked = false;

        // animation IDs
        this.animations = [];
        this.animations.length = 12;
        this.animations.fill(0, this.animations.length);

        // damage dealt per player, decides who gets the drop
        // { player.id: damage }
        this.playerDamage = new Map();

        this.isWalking = false;
    }

    lock() {
        this.locked = true;
    }

    unlock() {
        this.locked = false;
    }

    // emit dialogue, auto-delaying between messages
    async say(...messages) {
        for (const message of messages) {
            this.broadcastChat(message, true);
            await this.world.sleepTicks(2);

            if (message.length >= 25) {
                await this.world.sleepTicks(1);
            }
        }
    }

    // returns whether or not we died
    damage(damage, player) {
        if (player) {
            const totalDamage = this.playerDamage.get(player.id) || 0;
            this.playerDamage.set(player.id, totalDamage + damage);
        }

        // never store a negative hits.current; clamp at 0
        const newHitpoints = this.skills.hits.current - damage;

        this.skills.hits.current = newHitpoints > 0 ? newHitpoints : 0;

        if (newHitpoints <= 0) {
            this.die();
            return true;
        }

        // broadcast only on a non-fatal hit; die() handles the fatal one
        this.broadcastDamage(damage);
        return false;
    }

    faceDirection(deltaX, deltaY) {
        if (this.isWalking) {
            return this.direction;
        }

        this.isWalking = true;

        const direction = getDirectionNumber(deltaX, deltaY);

        if (this.direction === direction) {
            return this.direction;
        }

        this.direction = direction;
        this.broadcastDirection();

        return this.direction;
    }

    // face an entity (talking to an npc, picking up a ground item)
    faceEntity(entity) {
        if (this.isWalking) {
            return this.direction;
        }

        this.isWalking = true;

        if (this.x === entity.x && this.y === entity.y) {
            if (entity.direction === 0) {
                this.direction = 0;
            } else if (entity.direction === 1) {
                this.direction = 6;
            }

            return this.direction;
        }

        let deltaX = this.x - entity.x;

        if (deltaX > 0) {
            deltaX = 1;
        } else if (deltaX < 0) {
            deltaX = -1;
        }

        let deltaY = this.y - entity.y;

        if (deltaY > 0) {
            deltaY = 1;
        } else if (deltaY < 0) {
            deltaY = -1;
        }

        const direction = deltaDirections[deltaX + 1][deltaY + 1];

        if (this.direction === direction) {
            return this.direction;
        }

        this.direction = direction;
        this.broadcastDirection();

        return this.direction;
    }

    // face and lock onto a character
    engage(character) {
        const { world } = this;

        this.lock();
        this.chasing = null;
        this.interlocutor = character;

        character.lock();
        character.chasing = null;
        character.interlocutor = this;

        const distance = this.getDistance(character);

        // characters can't talk on the same tile; move the other off and re-face
        if (distance === 0) {
            const step = character.getFreeDirection();

            if (step) {
                world.setTickTimeout(() => {
                    character.walkTo(step.deltaX, step.deltaY);

                    world.setTickTimeout(() => {
                        this.faceEntity(character);
                        character.faceEntity(this);
                    }, 2);
                }, 2);
            }
        } else {
            world.setTickTimeout(() => {
                this.faceEntity(character);
                character.faceEntity(this);
            }, 2);
        }
    }

    // unlock both characters
    disengage() {
        this.unlock();

        if (this.interlocutor) {
            this.interlocutor.unlock();
            this.interlocutor.interlocutor = null;
            this.interlocutor = null;
        }
    }

    async attack(character) {
        if (character.opponent) {
            return false;
        }

        // pvp requires both sides in the wilderness, within a combat-level range
        // no wider than either side's wilderness level; duels and npcs bypass it
        if (
            !!this.username &&
            !!character.username &&
            !(this.duel && this.duel.isDuelActive()) &&
            !(character.duel && character.duel.isDuelActive())
        ) {
            const myWildLvl = wildernessLevel(
                this.x,
                this.y,
                this.world.planeElevation
            );
            const victimWildLvl = wildernessLevel(
                character.x,
                character.y,
                this.world.planeElevation
            );

            if (myWildLvl < 1 || victimWildLvl < 1) {
                return false;
            }

            const combatLevelDiff = Math.abs(
                this.combatLevel - character.combatLevel
            );

            if (combatLevelDiff > myWildLvl || combatLevelDiff > victimWildLvl) {
                return false;
            }
        }

        const { world } = this;

        this.toAttack = null;
        this.lock();

        if (this.chasing) {
            this.chasing = null;
        }

        let distance = this.getDistance(character);

        if (distance > 1.5) {
            await this.chase(character, 8);
        }

        distance = this.getDistance(character);

        if (character.opponent || distance > 1.5) {
            this.unlock();
            return false;
        }

        const deltaX = character.x - this.x;
        const deltaY = character.y - this.y;

        this.walkAction = true;

        if (!this.withinLineOfSight(character)) {
            this.walkAction = false;
            this.unlock();
            return false;
        }

        this.walkAction = false;

        // crown of mimicry (30%): an npc closing to melee on a player mid-gather
        // can dodge the engagement (no combat this tick); username also lets bots trigger it
        if (
            this.constructor.name === 'NPC' &&
            !!character.username &&
            character.gatheringSkill &&
            enchantedCrowns.shouldActivate(character, 'mimicry')
        ) {
            character.message(
                'Your crown shines and you dodge an attack!'
            );
            enchantedCrowns.useCharge(character, 'mimicry');

            if (typeof this.retreatTicks === 'number') {
                this.retreatTicks = Math.max(this.retreatTicks, 5);
            }

            this.unlock();
            return false;
        }

        if (character.username) {
            character.message('You are under attack!');
        }

        // wake a sleeping victim before the combat lock, so exitSleep's unlock
        // doesn't undo it
        if (character.interfaceOpen && character.interfaceOpen.sleep) {
            character.exitSleep(false);
        }

        character.lock();
        character.opponent = this;
        character.combatRounds = 0;
        character.fightStage = 1;

        if (character.walkQueue) {
            character.walkQueue.length = 0;
        } else {
            character.stepsLeft = 0;
        }

        if (character.direction !== 8) {
            world.nextTick(() => {
                if (character.opponent) {
                    character.direction = 8;
                    character.broadcastDirection();
                }
            });
        }

        this.opponent = character;
        this.combatRounds = 0;
        this.fightStage = 0;

        // npc-initiated attacks on a player and active duels use 2-tick rounds;
        // everything else uses 4
        const isDuelFight =
            !!this.username &&
            !!character.username &&
            this.duel &&
            this.duel.isDuelActive();
        const roundPeriod =
            (!this.username && !!character.username) || isDuelFight ? 2 : 4;

        this.combatRoundPeriod = roundPeriod;
        character.combatRoundPeriod = roundPeriod;

        // only player-vs-player can skull, never npcs or duels
        if (!!this.username && !!character.username && !isDuelFight) {
            this.setSkulledOn(character);
        }

        // fighting sprite is applied a tick later; guard against a first-round
        // kill or retreat leaving the character facing 9 with no opponent
        const faceOpponent = () => {
            if (!this.opponent || this.fightStage === -1) {
                return;
            }

            this.direction = 9;
            this.broadcastDirection();
        };

        if (deltaX !== 0 || deltaY !== 0) {
            world.nextTick(() => {
                this.walkTo(deltaX, deltaY);

                world.setTickTimeout(faceOpponent, 2);
            });
        } else {
            world.nextTick(faceOpponent);
        }

        return true;
    }

    async retreat() {
        if (this.fightStage === -1 || this.retreating) {
            return;
        }

        const { world } = this;
        const opponent = this.opponent;

        this.retreating = true;
        this.unlock();
        this.fightStage = -1;

        if (opponent) {
            opponent.unlock();
            opponent.fightStage = -1;

            if (opponent.constructor.name === 'NPC' && !opponent.retreats) {
                opponent.retreatTicks = 4;

                world.setTickTimeout(() => {
                    if (!this.locked && opponent.skills.hits.current > 0) {
                        opponent.attack(this);
                    }
                }, 4);
            }
        }

        world.nextTick(() => {
            if (
                !this.isWalking &&
                this.direction >= 8 &&
                (this.walkQueue ? !this.walkQueue.length : !this.stepsLeft)
            ) {
                this.faceDirection(0, 0);
            }

            if (opponent) {
                if (opponent.direction >= 8) {
                    opponent.faceDirection(0, 0);
                }

                opponent.opponent = null;
                this.opponent = null;
            }

            this.retreating = false;
        });
    }

    // collision check for the next step
    canWalk(deltaX, deltaY) {
        // reject a zero-delta step
        if (deltaX === 0 && deltaY === 0) {
            return false;
        }

        if (
            !this.world.pathFinder.isValidGameStep(
                { x: this.x, y: this.y },
                { deltaX, deltaY }
            )
        ) {
            return false;
        }

        const destX = this.x + deltaX;
        const destY = this.y + deltaY;

        if (
            this.toAttack &&
            this.toAttack.x === destX &&
            this.toAttack.y === destY
        ) {
            return true;
        }

        // hostile npcs block the path
        const npcs = this.world.npcs.getAtPoint(destX, destY);

        for (const npc of npcs) {
            if (npc.definition.hostility && !npc.opponent) {
                return false;
            }
        }

        // can't end the path on a player (walking through is fine)
        if (
            !this.walkAction &&
            (this.stepsLeft === 0 ||
                (this.walkQueue && !this.walkQueue.length)) &&
            (this.world.players.getAtPoint(destX, destY).length ||
                this.world.npcs.getAtPoint(destX, destY).length)
        ) {
            return false;
        }

        return true;
    }

    //TODO changeDirection?
    walkTo(deltaX, deltaY) {
        if (this.isWalking) {
            return;
        }

        this.isWalking = true;

        const oldX = this.x;
        const oldY = this.y;

        this.x += deltaX;
        this.y += deltaY;

        // non-finite position after the step: log it with the caller, first 5 only
        if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
            if (walkNaNLogged < 5) {
                walkNaNLogged += 1;
                console.log(
                    `[diag] NaN position after walkTo: ${this} from ` +
                        `${oldX},${oldY} delta ${deltaX},${deltaY} ` +
                        `following=${this.following} opponent=${this.opponent}\n` +
                        new Error().stack.split('\n').slice(1, 8).join('\n')
                );
            }
        }

        // keep the spatial index in sync so a point query this tick finds the new tile
        const list =
            this.username === undefined ? this.world.npcs : this.world.players;
        if (list !== undefined && list.reindex !== undefined) {
            list.reindex(this);
        }

        this.direction = getDirectionNumber(oldX - this.x, oldY - this.y);
        this.broadcastMove();
    }

    getPointSteps(destX, destY, overlap = true) {
        const { world } = this;

        const steps = [];

        const path = world.pathFinder.getLineOfSight(
            { x: this.x, y: this.y },
            { x: destX, y: destY }
        );

        if (overlap) {
            path.push({ x: destX, y: destY });
        }

        let x = this.x;
        let y = this.y;

        for (const { x: stepX, y: stepY } of path) {
            if (stepX === this.x && stepY === this.y) {
                continue;
            }

            const deltaX = stepX - x;
            const deltaY = stepY - y;

            const validStep = world.pathFinder.isValidGameStep(
                { x, y },
                { deltaX, deltaY }
            );

            if (validStep) {
                steps.push({ deltaX, deltaY });
            } else {
                break;
            }

            x += deltaX;
            y += deltaY;
        }

        return steps;
    }

    async walkToPoint(destX, destY, overlap = true) {
        const { world } = this;
        const steps = this.getPointSteps(destX, destY, overlap);

        for (const { deltaX, deltaY } of steps) {
            if (
                (this.walkQueue && this.walkQueue.length) ||
                this.stepsLeft > 0
            ) {
                return;
            }

            this.walkTo(deltaX, deltaY);
            await world.sleepTicks(1);
        }
    }

    async chase(entity, range = 16, overlap = false) {
        const { world } = this;

        let ticks = 0;

        this.stepsLeft = 0;
        this.chasing = entity;

        newSteps: do {
            const destX = this.chasing.x;
            const destY = this.chasing.y;

            const steps = this.getPointSteps(destX, destY, overlap);

            ticks += 1;

            if (ticks >= 10) {
                break;
            }

            for (const { deltaX, deltaY } of steps) {
                if (ticks >= 10) {
                    break newSteps;
                }

                if (
                    !this.chasing ||
                    (this.walkQueue
                        ? this.walkQueue.length
                        : this.stepsLeft > 0) ||
                    this.chasing.getDistance(this) >= range
                ) {
                    break newSteps;
                }

                if (this.chasing.x !== destX || this.chasing.y !== destY) {
                    continue newSteps;
                }

                if (
                    this.withinWalkBounds &&
                    !this.withinWalkBounds(this.x + deltaX, this.y + deltaY)
                ) {
                    break newSteps;
                }

                if (!overlap && !this.canWalk(deltaX, deltaY)) {
                    break newSteps;
                }

                this.walkTo(deltaX, deltaY);
                await world.sleepTicks(1);

                ticks += 1;
            }
        } while (
            this.chasing &&
            (overlap
                ? this.x !== this.chasing.x || this.y !== this.chasing.y
                : this.getDistance(this.chasing) > 1.5)
        );

        this.chasing = null;
    }

    getFreeDirection(visitedTiles, random = false) {
        const directions = random
            ? shuffle(numberDirections.slice())
            : numberDirections;

        for (const { deltaX, deltaY } of directions) {
            const destX = this.x + deltaX;
            const destY = this.y + deltaY;

            if (
                (deltaX === 0 && deltaY === 0) ||
                (visitedTiles && visitedTiles.has(destX * 8192 + destY))
            ) {
                continue;
            }

            if (this.canWalk(deltaX, deltaY)) {
                return { deltaX: deltaX, deltaY: deltaY };
            }
        }
    }

    getFrontPoint() {
        const { deltaX, deltaY } = getDirectionDelta(this.direction);

        return {
            x: this.x + deltaX,
            y: this.y + deltaY
        };
    }

    getBackPoint() {
        const { deltaX, deltaY } = getDirectionDelta(this.direction);

        return {
            x: this.x - deltaX,
            y: this.y - deltaY
        };
    }

}

module.exports = Character;
