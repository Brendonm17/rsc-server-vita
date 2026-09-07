const Character = require('./character');
const dropDefinitions = require('@2003scape/rsc-data/rolls/drops');
const items = require('@2003scape/rsc-data/config/items');
const log = require('bole')('npc');
const npcRespawn = require('@2003scape/rsc-data/npc-respawn');
const npcs = require('@2003scape/rsc-data/config/npcs');
const { rollItemDrop } = require('../rolls');
const { rollNPCDamage, awardStyleExperience } = require('../combat');
const poison = require('../plugins/combat/poison');
const { getQOLConfig } = require('./qol-config');

const HERB_IDS = new Set(dropDefinitions.herb.map((entry) => entry.id));
const PARALYZE_MONSTER_ID = 12;
const enchantedCrowns = require('../plugins/skills/enchanted-crowns');
const valuableDrops = require('../plugins/custom/valuable-drops');
const party = require('../plugins/custom/party');
const achievements = require('../plugins/custom/achievements');
const BONE_IDS = new Set(Object.keys(enchantedCrowns.BONE_TIER).map(Number));

const RESTORE_TICKS = 100;

// per-NPC aggro-radius overrides, on top of the default of 1; matched by name
// and hostility so same-named NPCs stay distinct
const DEFAULT_AGGRO_RANGE = 1;

function findNpcId(name, hostility) {
    for (let id = 0; id < npcs.length; id += 1) {
        const def = npcs[id];

        if (
            def &&
            def.name &&
            def.name.toLowerCase() === name.toLowerCase() &&
            (typeof hostility === 'undefined' || def.hostility === hostility)
        ) {
            return id;
        }
    }

    return -1;
}

const AGGRO_RANGE_OVERRIDES = new Map();

for (const [name, hostility, radius] of [
    // the aggressive Bandit, distinct from the combative one
    ['Bandit', 'aggressive', 2],
    ['UndeadOne', 'aggressive', 3]
]) {
    const id = findNpcId(name, hostility);

    if (id !== -1) {
        AGGRO_RANGE_OVERRIDES.set(id, radius);
    }
}

// two identical "Black Knight" entries exist (66 and 108); pin id 66 by number
// since name cannot disambiguate them
if (npcs[66] && npcs[66].name.toLowerCase() === 'black knight') {
    AGGRO_RANGE_OVERRIDES.set(66, 10);
}

class NPC extends Character {
    constructor(world, { id, x, y, minX, maxX, minY, maxY }) {
        super(world);

        this.id = id;
        this.spawnX = x;
        this.spawnY = y;
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;

        this.x = this.spawnX;
        this.y = this.spawnY;

        this.definition = npcs[id];

        if (!this.definition) {
            throw new RangeError(`invalid NPC id ${this.id}`);
        }

        this.respawn = npcRespawn[id];

        // per-NPC aggro radius, falling back to the default of 1
        this.aggroRadius = AGGRO_RANGE_OVERRIDES.has(id)
            ? AGGRO_RANGE_OVERRIDES.get(id)
            : DEFAULT_AGGRO_RANGE;

        // an NPC must be aggressive-by-definition to ever be hostile;
        // wilderness only waives the level-difference check
        this.aggressive = this.definition.hostility === 'aggressive';

        // TODO add list of other NPCs that retreat
        this.retreats =
            !this.definition.hostility ||
            this.definition.hostility === 'retreats';

        this.skills = {
            attack: {
                current: this.definition.attack,
                base: this.definition.attack
            },
            strength: {
                current: this.definition.strength,
                base: this.definition.strength
            },
            hits: {
                current: this.definition.hits,
                base: this.definition.hits
            },
            defense: {
                current: this.definition.defense,
                base: this.definition.defense
            }
        };

        this.combatLevel = this.getCombatLevel();

        // more realistic random pathing
        this.visitedTiles = new Set();

        // used for automatic movement
        this.stepsLeft = 0;

        // stationary NPC
        this.stationary =
            this.x === minX &&
            this.x === maxX &&
            this.y === minY &&
            this.y === maxY;

        // players that can see this NPC
        this.knownPlayers = new Set();

        this.restoreTicks = RESTORE_TICKS;

        this.retreatTicks = 0;
    }

    getDrops() {
        let drops = rollItemDrop(dropDefinitions, this.id);

        if (!this.world.members) {
            // on free-to-play worlds, drop 10 coins instead of unid'd herbs
            for (const drop of drops) {
                if (HERB_IDS.has(drop.id)) {
                    drop.id = 10;
                    drop.amount = 10;
                }
            }

            drops = drops.filter((drop) => !items[drop.id].members);
        }

        return drops;
    }

    getCombatLevel() {
        return Math.floor(
            (this.skills.attack.base +
                this.skills.defense.base +
                this.skills.strength.base +
                this.skills.hits.base) /
                4
        );
    }

    // combat level with hits weighted half, used only for on-kill XP
    getCombatLevelSpecial() {
        const { attack, defense, strength, hits } = this.skills;

        return Math.floor(
            (2 * (attack.base + strength.base) + 2 * defense.base + hits.base) /
                7
        );
    }

    // on-kill XP: combatLevelSpecial * 2 + 20
    getCombatExperience() {
        return this.getCombatLevelSpecial() * 2 + 20;
    }

    die() {
        const { world } = this;

        // re-entrancy guard: die() defers into an async .then, so poison and
        // melee in the same tick could otherwise double-drop
        if (this.dying) {
            return;
        }
        this.dying = true;

        // clear any poison on death, regardless of killer
        poison.cure(this);

        let maxDamage = 0;
        let victorID = -1;

        for (const [playerID, damage] of this.playerDamage.entries()) {
            if (damage > maxDamage) {
                maxDamage = damage;
                victorID = playerID;
            }
        }

        let victor;

        if (victorID === -1) {
            victor = this.opponent;
        } else {
            victor = world.players.getByID(victorID);
        }

        world
            .callPlugin('onNPCDeath', victor, this)
            .then((blocked) => {
                if (blocked) {
                    // a regenerate handler cancelled the death, re-arm the guard
                    this.dying = false;
                    return;
                }

                // isolate the drop loop so a bad drop id can't strand the
                // removal and combat teardown below
                try {
                    const drops = this.getDrops();

                    for (const item of drops) {
                    // crown of the occult: destroy bone drops for prayer XP
                    // instead of dropping them, per-tier via bone_conf
                    if (
                        victor &&
                        BONE_IDS.has(item.id) &&
                        enchantedCrowns.shouldActivate(victor, 'occult')
                    ) {
                        const conf =
                            typeof victor.cache.bone_conf === 'number'
                                ? victor.cache.bone_conf
                                : 7;
                        const tier = enchantedCrowns.getBoneTier(item.id);

                        if (enchantedCrowns.isKthBitSet(conf, tier + 1)) {
                            enchantedCrowns.giveBonesExperience(
                                victor,
                                item.id
                            );
                            victor.message(
                                'Your crown shines and the bone gets ' +
                                    'destroyed'
                            );
                            enchantedCrowns.useCharge(victor, 'occult');
                            continue;
                        }
                    }

                    // crown of the herbalist: destroy unid-herb drops for
                    // herblaw XP instead of dropping them, per-tier via herb_conf
                    if (
                        victor &&
                        HERB_IDS.has(item.id) &&
                        enchantedCrowns.shouldActivate(victor, 'herbalist')
                    ) {
                        const conf =
                            typeof victor.cache.herb_conf === 'number'
                                ? victor.cache.herb_conf
                                : 7;
                        const tier = enchantedCrowns.getHerbTier(item.id);

                        if (enchantedCrowns.isKthBitSet(conf, tier + 1)) {
                            enchantedCrowns.giveHerbExperience(
                                victor,
                                item.id
                            );
                            victor.message(
                                'Your crown shines and the herb gets ' +
                                    'destroyed'
                            );
                            enchantedCrowns.useCharge(victor, 'herbalist');
                            continue;
                        }
                    }

                    world.addPlayerDrop(victor, item, this.x, this.y);
                    valuableDrops.onDrop(victor, item);
                    }
                } catch (e) {
                    log.error(e);
                }

                // removal and combat release run even if a drop or reward throws
                world.removeEntity('npcs', this);
                this.opponent = null;

                if (!victor) {
                    return;
                }

                victor.retreat(); // unlocks the killer + clears its fightStage
                victor.opponent = null;

                // kill rewards are fallible, isolate them from the teardown above
                try {
                    victor.sendSound('victory');

                    const totalExperience = this.getCombatExperience();

                    // XP splits across every damager by their share of max hits;
                    // magic gives none, loot stays with the top damager. a player's
                    // share is typed by their most-recent attack (_lastCombatType)
                    const npcMaxHits = this.skills.hits.base;
                    const rangedGivesXpHit = getQOLConfig(
                        world.server.config
                    ).rangedGivesXpHit;

                    for (const [
                        playerID,
                        playerDamage
                    ] of this.playerDamage.entries()) {
                        const damager = world.players.getByID(playerID);

                        if (!damager || playerDamage <= 0) {
                            continue;
                        }

                        if (damager._lastCombatType === 'magic') {
                            continue;
                        }

                        if (damager._lastCombatType === 'ranged') {
                            const maxTotalXP = Math.floor(
                                ((totalExperience * 4) / npcMaxHits) *
                                    playerDamage
                            );
                            const alreadyGivenXp = rangedGivesXpHit
                                ? Math.floor((16 * playerDamage) / 3)
                                : 0;
                            const remainderXP = maxTotalXP - alreadyGivenXp;

                            if (remainderXP > 0) {
                                damager.addExperience('ranged', remainderXP);
                            }

                            continue;
                        }

                        const share = Math.floor(
                            (totalExperience / npcMaxHits) * playerDamage
                        );

                        awardStyleExperience(damager, share);
                    }

                    // Party shared kill-XP: nearby party members get a bonus.
                    party.shareKillXP(victor, totalExperience);

                    // Achievement check (kill counts / wealth milestones).
                    achievements.check(victor);
                } catch (e) {
                    log.error(e);
                }
            })
            .catch((e) => log.error(e));
    }

    // run away after retreating
    async flee(ticks = 8) {
        const { world } = this;
        const visitedTiles = new Set();

        this.retreatTicks = ticks;

        for (let i = 0; i < ticks; i += 1) {
            if (this.locked) {
                break;
            }

            const step = this.getFreeDirection(visitedTiles);

            if (step) {
                this.walkTo(step.deltaX, step.deltaY);
                await world.sleepTicks(1);
                visitedTiles.add(this.x * 8192 + this.y);
            } else {
                break;
            }
        }

        this.retreatTicks = 0;
    }

    // drop players that logged out or walked out of range from knownPlayers
    updateKnownPlayers() {
        for (const player of this.knownPlayers) {
            if (!player.loggedIn || !player.withinRange(this, 16)) {
                player.localEntities.removed.npcs.add(this);
                player.localEntities.moved.npcs.delete(this);
                this.knownPlayers.delete(player);
            }
        }
    }

    withinWalkBounds(destX, destY) {
        if (
            destX > this.maxX ||
            destX < this.minX ||
            destY > this.maxY ||
            destY < this.minY
        ) {
            return false;
        }

        return true;
    }

    canWalk(deltaX, deltaY) {
        const destX = this.x + deltaX;
        const destY = this.y + deltaY;

        if (!this.withinWalkBounds(destX, destY)) {
            return false;
        }

        return super.canWalk(deltaX, deltaY);
    }

    walkNextRandomStep() {
        if (this.stepsLeft > 0) {
            if (
                this.stepsLeft < 3 &&
                Math.random() >= 0.25 &&
                this.canWalk(this.lastDeltaX, this.lastDeltaY)
            ) {
                this.stepsLeft -= 1;
                this.walkTo(this.lastDeltaX, this.lastDeltaY);
            } else {
                const deltas = this.getFreeDirection(this.visitedTiles, true);

                if (deltas) {
                    const { deltaX, deltaY } = deltas;

                    this.lastDeltaX = deltaX;
                    this.lastDeltaY = deltaY;
                    this.stepsLeft -= 1;

                    this.walkTo(deltaX, deltaY);
                    this.visitedTiles.add(this.x * 8192 + this.y);
                }
            }
        } else if (!this.locked) {
            if (Math.random() <= 0.15) {
                this.visitedTiles.clear();
                this.visitedTiles.add(this.x * 8192 + this.y);
                this.stepsLeft = Math.floor(Math.random() * 8) + 1;
            }
        }
    }

    broadcastChat(message) {
        for (const player of this.knownPlayers) {
            player.localEntities.characterUpdates.npcChat.push({
                npcIndex: this.index,
                playerIndex: this.interlocutor.index,
                message
            });
        }
    }

    broadcastDirection() {
        for (const player of this.knownPlayers) {
            player.localEntities.spriteChanged.npcs.add(this);
        }
    }

    broadcastMove() {
        for (const player of this.knownPlayers) {
            player.localEntities.moved.npcs.add(this);
        }
    }

    broadcastDamage(damage) {
        const message = {
            index: this.index,
            damageTaken: damage,
            currentHealth: this.skills.hits.current,
            maxHealth: this.skills.hits.base
        };

        for (const player of this.knownPlayers) {
            player.localEntities.characterUpdates.npcHits.push(message);
        }
    }

    fight() {
        // one hit every combatRoundPeriod ticks (2 vs a player, else 4)
        if (this.fightStage % (this.combatRoundPeriod || 4) === 0) {
            const opponent = this.opponent;
            const paralyzed = !!opponent.prayers[PARALYZE_MONSTER_ID];
            const damage = rollNPCDamage(this, opponent);

            // paralyze monster blocks only the damage; poison still runs
            // unless the hit killed the victim
            let died = false;

            if (!paralyzed) {
                died = opponent.damage(damage);
            }

            if (!died) {
                poison.onMeleeHit(this, opponent, this.world.server.config);
            }

            this.fightStage = 1;
            this.combatRounds += 1;
        } else {
            this.fightStage += 1;
        }

        // retreat after 3 rounds once hits fall to 25% of max
        if (
            this.retreats &&
            this.combatRounds >= 3 &&
            this.skills.hits.current <= Math.ceil(this.skills.hits.base * 0.25)
        ) {
            this.opponent.message('Your opponent is retreating');

            this.retreat()
                .then(() => this.flee())
                .catch((err) => log.error(err));
        }
    }

    normalizeSkills() {
        if (this.restoreTicks > 0) {
            this.restoreTicks -= 1;
            return;
        }

        this.restoreTicks = RESTORE_TICKS;

        for (const [skillName, { base, current }] of Object.entries(
            this.skills
        )) {
            if (current < base) {
                this.skills[skillName].current += 1;
            } else if (current > base) {
                this.skills[skillName].current -= 1;
            }
        }
    }

    tick() {
        this.normalizeSkills();

        // tick poison, independent of skill restoration
        poison.tickPoison(this);

        if (this.opponent) {
            if (
                this.skills.hits.current > 0 &&
                this.opponent.skills.hits.current > 0
            ) {
                this.fight();
            } else {
                // self or target is dead, release instead of swinging at a corpse
                this.opponent = null;
            }
        }

        if (!this.stationary && !this.locked && this.knownPlayers.size) {
            this.updateKnownPlayers();

            if (!this.chasing) {
                let foundPlayer = false;

                if (this.aggressive && this.retreatTicks <= 0) {
                    for (const player of this.knownPlayers) {
                        if (
                            !player.opponent &&
                            this.isAggressive(player) &&
                            this.canAggro(player) &&
                            player.withinRange(this, this.aggroRadius) &&
                            player.withinLineOfSight(this)
                        ) {
                            foundPlayer = true;
                            this.attack(player);
                            break;
                        }
                    }
                }

                if (!foundPlayer && this.retreatTicks === 0) {
                    this.walkNextRandomStep();
                }
            }
        }

        if (this.retreatTicks > 0) {
            this.retreatTicks -= 1;
        }

        this.isWalking = false;
    }

    // aggro when the player's combat level is under npcLevel*2+1, or both are
    // in the wilderness
    isAggressive(player) {
        const levelMeetsStandard = player.combatLevel < this.combatLevel * 2 + 1;
        const bothInWilderness =
            player.withinRegion('wilderness') && this.withinRegion('wilderness');

        return levelMeetsStandard || bothInWilderness;
    }

    // an NPC may not target a player within 5 ticks of that player logging in
    canAggro(player) {
        if (typeof player.lastLogin !== 'number') {
            return true;
        }

        return Date.now() - player.lastLogin >= 5 * 640;
    }

    toString() {
        return `[NPC (id=${this.id}, x=${this.x}, y=${this.y})]`;
    }
}

module.exports = NPC;
