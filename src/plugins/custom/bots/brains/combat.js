// combat brain: a per-tick priority ladder, runs even while locked so it can eat mid-fight.
// order: eat > flee if out of food > assist party > wait if busy > swing > idle (bury/loot, leash, attack nearest whitelisted npc).

const { findPathAdjacent, findPathTo } = require('../pathfind');
const mood = require('../mood');
const botPvp = require('../pvp');
const botMemory = require('../memory');
const spellbook = require('../spellbook');
const gear = require('../gear');
const personality = require('../personality');
const itemKnowledge = require('../item-knowledge');
const learning = require('../learning');
const travel = require('../travel');
const economy = require('../economy');
const { wildernessLevel } = require('../../../skills/magic');
const edible = require('../../../items/edible');
const prayer = require('../../../skills/prayer');
const spellHandler = require('../../../../packet-handlers/spell');
const inventoryHandlers = require('../../../../packet-handlers/inventory');
const { npcAttackBlocked } = require('../../../../packet-handlers/npc');
const itemDefs = require('@2003scape/rsc-data/config/items');

// memoised lazy requires of social-emergent + factions for wilderness targeting.
let _seMod, _facMod;
function seMod() { return _seMod || (_seMod = require('../social-emergent')); }
function facMod() { return _facMod || (_facMod = require('../factions')); }

const BONES_ID = 20;
const COINS_ID = 10; // a dropped coin pile is always worth grabbing
const PLANE = 944; // RSC plane height (y / 944 = floor: 0 ground, 3 dungeon)
const planeOf = (y) => Math.floor(y / PLANE);

// foods a bot eats: bread, cooked meat, and every cooked fish (from the rsc-data cooking table).
const FOOD_IDS = (() => {
    const set = new Set([138, 132]); // bread, cooked meat
    try {
        const { uncooked } = require('@2003scape/rsc-data/skills/cooking');
        const items = require('@2003scape/rsc-data/config/items');
        for (const raw of Object.keys(uncooked || {})) {
            const cooked = uncooked[raw] && uncooked[raw].cooked;
            if (cooked != null && items[cooked] && /eat/i.test(items[cooked].command || '')) {
                set.add(cooked);
            }
        }
    } catch (e) {
        // fall back to bread + meat only
    }
    return [...set];
})();

class CombatBrain {
    constructor(bot, opts = {}) {
        this.bot = bot;
        this.targetIds = new Set(opts.targetIds || [62]); // goblins
        this.foodIds = opts.foodIds || FOOD_IDS; // bread + any cooked fish/meat it carries
        this.lootIds = new Set(opts.lootIds || []); // ids to pick up (bones always)
        this.home = opts.home || { x: bot.x, y: bot.y };
        this.leash = opts.leash || 12; // stay within this radius of home
        this.eatAt = typeof opts.eatAt === 'number' ? opts.eatAt : 0.5; // 50% HP
        // pker: hunt players, but only in the wilderness. set from the bot def.
        this.pvp = !!opts.pvp;
    }

    // is this tile in the wilderness (pk zone)?
    inWilderness(x, y) {
        return (
            wildernessLevel(x, y, this.bot.world.planeElevation || 944) > 0
        );
    }

    // can the bot attack this player? both in the wilderness, and the combat-level gap within either side's wilderness level.
    canAttackInWild(other) {
        const bot = this.bot;
        if (!this.inWilderness(other.x, other.y)) {
            return false;
        }
        const plane = bot.world.planeElevation;
        const myWild = wildernessLevel(bot.x, bot.y, plane);
        const theirWild = wildernessLevel(other.x, other.y, plane);
        const diff = Math.abs(bot.getCombatLevel() - other.getCombatLevel());
        return myWild >= 1 && theirWild >= 1 && diff <= myWild && diff <= theirWild;
    }

    nearestPlayerTarget() {
        const bot = this.bot;

        if (!this.pvp || !this.inWilderness(bot.x, bot.y)) {
            return null;
        }

        const myLevel = bot.getCombatLevel();
        let best = null;
        let bestDist = Infinity;

        for (const other of bot.getNearbyEntities('players', 32)) {
            if (
                other === bot ||
                other.id === bot.id ||
                other.opponent ||
                (other.skills &&
                    other.skills.hits &&
                    other.skills.hits.current <= 0) ||
                !this.canAttackInWild(other)
            ) {
                continue;
            }

            // steer clear of someone who recently killed the bot (a fading grudge).
            if (botMemory.holdsGrudge(bot, other.username)) {
                continue;
            }

            // don't pick a foe too strong for the bot's nerve (pvp.boldness).
            const theirLevel = other.getCombatLevel();
            if (!botPvp.willEngageLevel(bot, myLevel, theirLevel)) {
                continue;
            }

            // prefer a standing rival, so feuds play out in the wilderness.
            let dist = bot.getDistance(other);
            try {
                if (seMod().tagOf(bot, other.username) === 'rival') {
                    dist -= 1000; // strongly preferred
                }
            } catch (e) {
            }

            if (dist < bestDist) {
                bestDist = dist;
                best = other;
            }
        }

        return best;
    }

    // a nearby player the bot has a real grudge against and can legally attack; returned even for a non-pker.
    hotGrudgeTarget() {
        const bot = this.bot;
        if (!this.inWilderness(bot.x, bot.y)) {
            return null;
        }
        let em;
        try { em = seMod(); } catch (e) { return null; }
        let factions = null, myFaction = null;
        try { factions = facMod(); myFaction = factions.factionOf(bot); } catch (e) {  }
        const myLevel = bot.getCombatLevel();
        let best = null, bestScore = 0;
        for (const other of bot.getNearbyEntities('players', 12)) {
            if (other === bot || other.id === bot.id || other.opponent) {
                continue;
            }
            if (other.skills && other.skills.hits && other.skills.hits.current <= 0) {
                continue;
            }
            if (!this.canAttackInWild(other)) {
                continue;
            }
            if (other.getCombatLevel() > myLevel * 1.3) {
                continue; // it can't dent them
            }
            let feel = 0;
            try { feel = em.sentiment(bot, other.username); } catch (e) {  }
            const tag = (function () { try { return em.tagOf(bot, other.username); } catch (e) { return null; } })();
            const personalGrudge = tag === 'rival' || feel <= -4;
            // a member of a faction at war with the bot's is fair game in the wild.
            let atWar = false;
            if (factions && myFaction) {
                try { const theirs = factions.allegianceName(other); atWar = !!(theirs && factions.atWar(myFaction.name, theirs)); } catch (e) {  }
            }
            if (!personalGrudge && !atWar) continue;
            // score: pick the bitterest personal enemy, but a war target is always worth engaging.
            const score = (atWar ? 3 : 0) + Math.max(0, -feel);
            if (score > bestScore) { bestScore = score; best = other; }
        }
        return best;
    }

    hp() {
        return this.bot.skills.hits.current;
    }

    maxHp() {
        return this.bot.skills.hits.base;
    }

    foodSlot() {
        return this.bot.inventory.items.find((it) => this.foodIds.includes(it.id));
    }

    // eat threshold from personality + mood, else the fixed opt.
    effectiveEatAt() {
        const hasIdentity =
            this.bot.cache && this.bot.cache.bot && this.bot.cache.bot.mood;
        const base = hasIdentity ? mood.combatEatAt(this.bot) : this.eatAt;
        // nudge by what the bot has learned (deaths -> eat sooner, dominance -> braver).
        return learning.eatAtFor(this.bot, base);
    }

    shouldEat() {
        return this.hp() <= Math.floor(this.maxHp() * this.effectiveEatAt());
    }

    carried(id) {
        let n = 0;
        for (const it of this.bot.inventory.items) {
            if (it.id === id) {
                n += it.amount || 1;
            }
        }
        return n;
    }

    // can the bot teleport to safety now? (magic 25, teleport runes, wilderness < 20).
    canEscapeTeleport() {
        const bot = this.bot;
        if (!bot.skills.magic || bot.skills.magic.current < 25) {
            return false;
        }
        if (wildernessLevel(bot.x, bot.y, bot.world.planeElevation || 944) >= 20) {
            return false;
        }
        return (
            this.carried(31) >= 1 && this.carried(33) >= 3 && this.carried(42) >= 1
        );
    }

    // bail from a losing fight: break off, then teleport out, else flee to the nearest bank.
    escape() {
        const bot = this.bot;

        if (bot.opponent) {
            bot.retreat().catch(() => {});
        }
        if (this.canEscapeTeleport()) {
            spellHandler
                .castSelf({ player: bot }, { id: 12 }) // Varrock teleport
                .catch(() => {});
            return;
        }
        if (bot.locked) {
            return;
        }
        if (!travel.isTraveling(bot)) {
            const bank = economy.nearestBank(bot);
            if (bank) {
                travel.begin(bot, bank);
            }
        }
        travel.step(bot);
    }

    distanceFromHome() {
        return (
            Math.abs(this.bot.x - this.home.x) +
            Math.abs(this.bot.y - this.home.y)
        );
    }

    nearestTarget() {
        const bot = this.bot;
        let best = null;
        let bestDist = Infinity;

        // rest a few ticks after an empty scan (a new mob is still picked up within ~2s).
        if (bot._targetScanCd > 0) {
            bot._targetScanCd -= 1;
            return null;
        }

        const skip = bot._unreachable;
        const now = (bot.world && bot.world.ticks) | 0;
        for (const npc of bot.getNearbyEntities('npcs', 32)) {
            if (
                !this.targetIds.has(npc.id) ||
                npc.skills.hits.current <= 0 ||
                npc.opponent || // already being fought
                (skip && skip.has(npc.index) && now - skip.get(npc.index) < 200) // could not reach it lately
            ) {
                continue;
            }

            const dist = bot.getDistance(npc);

            if (dist < bestDist) {
                bestDist = dist;
                best = npc;
            }
        }

        if (!best) {
            bot._targetScanCd = 3;
        }

        return best;
    }

    // walk toward (tx,ty) with real pathfinding; returns true if a route was set
    pathTo(tx, ty) {
        const steps = findPathAdjacent(this.bot.world, this.bot.x, this.bot.y, tx, ty);

        if (steps && steps.length) {
            this.bot.walkQueue = steps;
            return true;
        }

        return false;
    }

    // remember an unreachable monster for a while so the idle scan skips it.
    markUnreachable(target) {
        const bot = this.bot;
        if (!target || typeof target.index !== 'number') return;
        const m = bot._unreachable || (bot._unreachable = new Map());
        m.set(target.index, (bot.world && bot.world.ticks) | 0);
        if (m.size > 32) { const first = m.keys().next().value; m.delete(first); }
    }

    // attack via the same guards a human's packet passes; a refused monster is skipped as unreachable.
    guardedAttack(target, ranged) {
        const bot = this.bot;
        const go = () => (ranged ? bot.shootRanged(target) : bot.attack(target));
        if (target.username) {
            go().catch(() => {});
            return;
        }
        Promise.resolve(npcAttackBlocked(bot, target, ranged))
            .then((blocked) => {
                if (blocked) {
                    this.markUnreachable(target);
                    return undefined;
                }
                return go();
            })
            .catch(() => {});
    }

    // does the bot have a working ranged kit (a bow/crossbow + ammunition)?
    hasRangedKit() {
        const inv = this.bot.inventory;
        return !!inv.getRangedWeapon() && inv.getAmmunitionID(false) !== -1;
    }

    // how this bot fights, from its focus + what it owns: 'melee', 'magic' (level+runes), 'ranged' (bow+ammo).
    // 'auto' picks magic > ranged > melee by gear; an explicit focus falls back to melee without the kit.
    combatMode() {
        const cb = this.bot.cache && this.bot.cache.bot;
        const focus = (cb && cb.focus) || 'auto';

        if (focus === 'melee') {
            return 'melee';
        }
        if (focus === 'magic') {
            return spellbook.canFightWithMagic(this.bot) ? 'magic' : 'melee';
        }
        if (focus === 'ranged') {
            return this.hasRangedKit() ? 'ranged' : 'melee';
        }
        // auto: prefer whatever gear it carries
        if (spellbook.canFightWithMagic(this.bot)) {
            return 'magic';
        }
        if (this.hasRangedKit()) {
            return 'ranged';
        }
        return 'melee';
    }

    // cast a missile spell at a target (npc or player) via the spell handler.
    castAt(target, spell) {
        if (!spell || !target || typeof target.index !== 'number') {
            return;
        }
        const bot = this.bot;
        const args = { index: target.index, id: spell.index };

        if (target.username) {
            spellHandler.castPlayer({ player: bot }, args).catch(() => {});
        } else {
            spellHandler.castNPC({ player: bot }, args).catch(() => {});
        }
    }

    // co-op dps on the party's boss: a mage/archer damages a boss a melee bot tanks (multi-combat).
    // returns true if it took a co-op shot; false for melee (turn-take instead).
    coopAttack(npc) {
        const bot = this.bot;
        if (bot.locked || bot.walkQueue.length) {
            return true; // mid kite/step this tick, but committed to the boss
        }
        const mode = this.combatMode();
        const dist = bot.getDistance(npc);

        if (mode === 'magic') {
            const spell = spellbook.bestCombatSpell(bot);
            if (!spell) {
                return false; // out of runes -> can't co-DPS, turn-take instead
            }
            if (dist <= 5 && bot.withinLineOfSight(npc, true)) {
                this.castAt(npc, spell);
            } else {
                this.pathTo(npc.x, npc.y);
            }
            return true;
        }

        if (mode === 'ranged') {
            if (bot.rangedTimeout) {
                return true; // shot on cooldown
            }
            if (dist <= 1.5) {
                this.stepAwayFrom(npc); // open a gap so the bow fires
            } else {
                this.guardedAttack(npc, true);
            }
            return true;
        }

        return false; // melee -> single-combat, take turns
    }

    // a melee bot sets its attack style to train the lagging melee stat (throttled).
    // style: 3 = defensive (def), 2 = accurate (atk), 1 = aggressive (str), 0 = controlled (all three).
    tuneCombatStyle() {
        const bot = this.bot;
        if (this.combatMode() !== 'melee') {
            return;
        }
        this._styleTick = (this._styleTick || 0) + 1;
        if (this._styleTick % 15 !== 1) {
            return; // re-evaluate occasionally, not on every attack
        }
        const lvl = (s) => (bot.skills && bot.skills[s] ? bot.skills[s].base : 1);
        const atk = lvl('attack'), str = lvl('strength'), def = lvl('defense');
        const min = Math.min(atk, str, def);
        if (Math.max(atk, str, def) - min >= 3) {
            // a clear imbalance -> train the laggard (ties: defense first).
            if (def === min) { bot.combatStyle = 3; } else if (atk === min) { bot.combatStyle = 2; } else { bot.combatStyle = 1; }
            return;
        }
        // balanced -> aggressive bots build strength, the rest split evenly.
        bot.combatStyle = personality.of(bot).aggression >= 0.6 ? 1 : 0;
    }

    // engage a target: a mage casts from range, a melee bot approaches and attacks.
    engage(target) {
        const bot = this.bot;
        this.tuneCombatStyle();

        if (this.combatMode() === 'magic') {
            const spell = spellbook.bestCombatSpell(bot);

            if (spell) {
                if (bot.withinRange(target, 5)) {
                    this.castAt(target, spell);
                } else if (!this.pathTo(target.x, target.y)) {
                    this.markUnreachable(target);
                }
                return;
            }
            // out of runes -> fall through and melee this tick
        }

        if (bot.withinRange(target, 5)) {
            this.guardedAttack(target, false);
        } else if (!this.pathTo(target.x, target.y)) {
            this.markUnreachable(target);
        }
    }

    // full combat loop for a ranged attacker (magic or bow): acquire, kite to re-open distance, attack from range.
    distanceCombatTick(mode) {
        const bot = this.bot;

        // readiness (and, for magic, which spell) depends on the mode
        const spell = mode === 'magic' ? spellbook.bestCombatSpell(bot) : null;
        const ready = mode === 'magic' ? !!spell : this.hasRangedKit();

        if (!ready) {
            this.meleeIdle(); // out of runes/ammo -> brawl instead
            return;
        }

        // keep the current opponent if still alive, else acquire a new one
        let target = bot.opponent;
        if (
            !target ||
            (target.skills && target.skills.hits && target.skills.hits.current <= 0)
        ) {
            target = null;
        }
        if (!target) {
            // anger first: a hated rival caught in the wild is fair game even for a non-PKer.
            target = this.hotGrudgeTarget();
            if (!target && this.pvp) {
                const prey = this.nearestPlayerTarget();
                if (prey && botPvp.wantsToEngage(bot)) {
                    target = prey;
                }
            }
            if (!target) {
                target = this.nearestTarget();
            }
        }

        // nothing to fight -> loot / leash / idle like a normal fighter
        if (!target) {
            if (bot.locked || bot.walkQueue.length) {
                return;
            }
            if (this.buryOrLoot()) {
                return;
            }
            if (this.distanceFromHome() > this.leash) {
                this.pathTo(this.home.x, this.home.y);
            }
            return;
        }

        // kite: break the melee lock to attack from distance again.
        if (bot.opponent && bot.locked) {
            bot.retreat().catch(() => {});
            return;
        }
        if (bot.locked || bot.walkQueue.length) {
            return; // mid-action / walking
        }

        const dist = bot.getDistance(target);

        if (mode === 'magic') {
            if (dist <= 5 && bot.withinLineOfSight(target, true)) {
                this.castAt(target, spell);
            } else {
                this.pathTo(target.x, target.y);
            }
            return;
        }

        // ranged: step back to open a gap (shootRanged melees anything adjacent).
        if (bot.rangedTimeout) {
            return; // shot on cooldown
        }
        if (dist <= 1.5) {
            this.stepAwayFrom(target);
            return;
        }
        this.guardedAttack(target, true);
    }

    // walk a few tiles directly away from a target (to re-open ranged distance).
    stepAwayFrom(target) {
        const bot = this.bot;
        const dx = Math.sign(bot.x - target.x) || (Math.random() < 0.5 ? 1 : -1);
        const dy = Math.sign(bot.y - target.y) || (Math.random() < 0.5 ? 1 : -1);
        const tries = [
            { x: bot.x + dx * 3, y: bot.y + dy * 3 },
            { x: bot.x + dx * 3, y: bot.y },
            { x: bot.x, y: bot.y + dy * 3 }
        ];
        for (const t of tries) {
            const steps = findPathTo(bot.world, bot.x, bot.y, t.x, t.y);
            if (steps && steps.length) {
                bot.walkQueue = steps;
                return true;
            }
        }
        return false;
    }

    // idle-fighter melee behaviour (loot -> leash -> acquire -> engage).
    meleeIdle() {
        const bot = this.bot;

        if (bot.locked || bot.walkQueue.length || bot.opponent) {
            return;
        }
        if (this.buryOrLoot()) {
            return;
        }
        if (this.distanceFromHome() > this.leash) {
            this.pathTo(this.home.x, this.home.y);
            return;
        }
        const target = this.nearestTarget();
        if (target) {
            this.engage(target);
        }
    }

    tick() {
        const bot = this.bot;

        // 0. survival: eat when hurt (fires even mid-combat).
        if (this.shouldEat()) {
            const food = this.foodSlot();

            if (food) {
                edible.onInventoryCommand(bot, food).catch(() => {});
                return;
            }

            // 1. out of food and hurt: bail (teleport/flee) in the wild, else break off and hold.
            if (this.pvp || this.inWilderness(bot.x, bot.y)) {
                this.escape();
                return;
            }
            if (bot.opponent) {
                // break off and set the flee window panic.fleeStep consumes (retreat only breaks the lock).
                bot._fleeFrom = { x: bot.opponent.x, y: bot.opponent.y };
                bot._fleeing = 8;
                bot.retreat().catch(() => {});
            }
            return;
        }

        // 2. recruited into a party -> assist the leader instead of grinding.
        if (
            bot.party &&
            bot.party.members.length > 1 &&
            bot.party.leader !== bot.username
        ) {
            this.assist();
            return;
        }

        // 2b. a ranged attacker (mage/archer) owns its whole combat loop (kite + attack).
        const mode = this.combatMode();
        if (mode !== 'melee') {
            this.distanceCombatTick(mode);
            return;
        }

        // 3. busy: mid attack-chase, mid-eat, or walking a queued path.
        if (bot.locked || bot.walkQueue.length) {
            return;
        }

        // 4. already fighting -> the world tick swings.
        if (bot.opponent) {
            return;
        }

        // 5. idle. bury/loot first, then leash, then acquire a target.
        if (this.buryOrLoot()) {
            return;
        }

        if (this.distanceFromHome() > this.leash) {
            this.pathTo(this.home.x, this.home.y);
            return;
        }

        // worn out? take a breather instead of pulling the next mob.
        if (mood.wantsBreather(this.bot) && Math.random() < 0.6) {
            return;
        }

        // anger first: even a non-pker fights a hated rival caught in the wild.
        const grudge = this.hotGrudgeTarget();
        if (grudge) {
            this.engage(grudge);
            return;
        }

        // a pker in the wild hunts players first, but appetite decides whether it commits.
        if (this.pvp) {
            const prey = this.nearestPlayerTarget();

            if (prey && botPvp.wantsToEngage(bot)) {
                this.engage(prey);
                return;
            }
        }

        const target = this.nearestTarget();

        if (target) {
            this.engage(target);
        }
    }

    // a pker grabs any worthwhile drop in the wild (the spoils after a kill).
    wantsWildLoot(id) {
        if (!this.pvp || !this.inWilderness(this.bot.x, this.bot.y)) {
            return false;
        }
        const def = itemDefs[id];
        return !!(def && (def.price || 0) > 0 && !def.members);
    }

    // bury bones, else pick up nearby loot + gear upgrades and wield the best; returns true if it acted.
    buryOrLoot() {
        const bot = this.bot;

        const bone = bot.inventory.items.find((it) => it.id === BONES_ID);

        if (bone) {
            prayer.onInventoryCommand(bot, bone).catch(() => {});
            return true;
        }

        // the ground scan rests a few ticks after finding nothing worth taking
        if (bot._lootScanCd > 0) {
            bot._lootScanCd -= 1;
        } else {
        for (const gi of bot.getNearbyEntities('groundItems', 16)) {
            // grab whitelist loot, bones, a wieldable upgrade, or (in the wild) any valuable drop.
            const wanted =
                this.lootIds.has(gi.id) ||
                gi.id === BONES_ID ||
                gi.id === COINS_ID ||
                itemKnowledge.isUncutGem(gi.id) ||
                gear.wantsGearDrop(bot, gi.id) ||
                this.wantsWildLoot(gi.id);

            if (!wanted || (gi.owner && gi.owner !== bot.id)) {
                continue;
            }

            if (gi.withinRange(bot, 2, true)) {
                inventoryHandlers
                    .groundItemTake({ player: bot }, { x: gi.x, y: gi.y, id: gi.id })
                    .then(() => gear.equipBestOwned(bot)) // wield the new upgrade
                    .catch(() => {});
                return true;
            }

            if (this.pathTo(gi.x, gi.y)) {
                return true;
            }
        }
        bot._lootScanCd = 4;
        }

        // occasionally make sure it's wearing its best gear (throttled).
        this._gearTick = (this._gearTick || 0) + 1;
        if (this._gearTick % 25 === 0) {
            gear.equipBestOwned(bot);
        }

        return false;
    }

    // party assist is single-combat: fight a free target near the leader, else wait adjacent to take a
    // contested boss the instant it frees (turn-taking). defendMate: rush a party-mate's pker attacker.
    defendMate() {
        const bot = this.bot;
        if (
            !bot.party || !bot.party.members ||
            bot.opponent || bot.locked || bot.walkQueue.length
        ) {
            return false;
        }
        if (!this.inWilderness(bot.x, bot.y) || botPvp.boldness(bot) <= 0) {
            return false; // player fights only happen in the wild; no nerve -> stay out
        }
        for (const m of bot.party.members) {
            if (!m || m === bot || m.username === bot.username) {
                continue;
            }
            const foe = m.opponent;
            if (
                foe && foe.username && foe.username !== bot.username &&
                foe.skills && foe.skills.hits && foe.skills.hits.current > 0 &&
                bot.getDistance(foe) <= 15
            ) {
                // warn the party, then wade in on the attacker.
                try {
                    if (bot.party.broadcast && !bot._defendCalled) {
                        bot.party.broadcast(bot.username, m.username + ' is under attack - get them!');
                        bot._defendCalled = true;
                    }
                } catch (e) {
                }
                this.engage(foe);
                return true;
            }
        }
        bot._defendCalled = false;
        return false;
    }

    // help a nearby friend (or party member) fighting a monster; in the wild, also one attacked by a player.
    helpFriend() {
        const bot = this.bot;
        if (bot.opponent || bot.locked || bot.walkQueue.length) {
            return false;
        }
        if (bot._helpCd && bot._helpCd > 0) {
            bot._helpCd -= 1;
            return false;
        }
        bot._helpCd = 8;
        let social = null;
        try { social = require('../social-emergent'); } catch (e) { social = null; }
        let nearby = [];
        try { nearby = bot.getNearbyEntities('players', 12) || []; } catch (e) { return false; }
        for (const m of nearby) {
            if (!m || m === bot || m.username === bot.username) {
                continue;
            }
            const foe = m.opponent;
            if (!foe || !foe.skills || !foe.skills.hits || foe.skills.hits.current <= 0) {
                continue;
            }
            const inParty = !!(bot.party && bot.party.members && bot.party.members.indexOf(m) >= 0);
            let fond = inParty;
            if (!fond && social) {
                try { fond = social.sentiment(bot, m.username) >= 3; } catch (e) { fond = false; }
            }
            if (!fond) {
                continue;
            }
            const foeIsPlayer = !!foe.username;
            if (foeIsPlayer) {
                // a player fight: only in the wilderness, only with the nerve for it
                if (foe.username === bot.username || !this.inWilderness(bot.x, bot.y) || botPvp.boldness(bot) <= 0) {
                    continue;
                }
            } else if (m.skills && m.skills.hits && m.skills.hits.base && m.skills.hits.current / m.skills.hits.base > 0.6 && !m.isBot === false) {
                // a healthy bot friend manages; a human friend gets help regardless.
                continue;
            }
            if (bot.getDistance(foe) > 12) {
                continue;
            }
            const who = (m.getFormattedUsername && m.getFormattedUsername()) || m.username;
            try {
                bot._reactionSpeak = true;
                bot.broadcastChat(["hold on " + who + ", i'm coming!", "hang in there " + who + "!", "on my way, " + who + "!"][Math.floor(Math.random() * 3)]);
            } catch (e) {  } finally { bot._reactionSpeak = false; }
            bot._helpCd = 120;
            this.engage(foe);
            return true;
        }
        return false;
    }

    assist() {
        const bot = this.bot;
        const leader = bot.party.members.find(
            (m) => m.username === bot.party.leader
        );

        // don't interrupt an active fight; a pending walk is allowed so a freed boss can preempt the follow-walk.
        if (!leader || bot.opponent || bot.locked) {
            return;
        }

        // defend a party-mate being PK'd before anything else.
        if (this.defendMate()) {
            return;
        }
        if (this.helpFriend()) {
            return true;
        }

        // living whitelisted targets around the leader and the bot, plus the leader's current target,
        // so the party gangs up on the leader's boss and turn-taking survives the leader walking off.
        const lead = leader.opponent;
        const bossId = lead && !lead.username && lead.id !== undefined ? lead.id : -1;
        const near = [];
        const seen = new Set();
        for (const src of [leader, bot]) {
            for (const npc of src.getNearbyEntities('npcs', 20)) {
                if (
                    !seen.has(npc) &&
                    (this.targetIds.has(npc.id) || npc.id === bossId) &&
                    npc.skills.hits.current > 0
                ) {
                    seen.add(npc);
                    near.push(npc);
                }
            }
        }

        const byDist = (a, b) => bot.getDistance(a) - bot.getDistance(b);
        // a free creature (an add, or a freed boss) -> take it, preempting a follow-walk.
        const free = near.filter((n) => !n.opponent).sort(byDist);
        if (free.length) {
            travel.cancel(bot);
            bot._followDest = null;
            if (bot.walkQueue.length) {
                bot.walkQueue.length = 0; // abandon the follow-walk; the boss is ours to take
            }
            this.engage(free[0]);
            return;
        }

        // nothing free to grab: let a mid-walk finish rather than re-plan every tick.
        if (bot.walkQueue.length) {
            return;
        }

        if (near.length) {
            // there's contested fighting to shadow -> stop trailing the leader.
            travel.cancel(bot);
            bot._followDest = null;

            // only contested targets remain (a boss a party-mate is holding).
            const contested = near.sort(byDist)[0];

            // co-op dps on the leader's boss if multi-combat allows; else stand ready to take the next turn.
            if (contested.id === bossId && this.coopAttack(contested)) {
                return;
            }

            if (bot.getDistance(contested) > 1.5) {
                this.pathTo(contested.x, contested.y);
            }

            return;
        }

        // nothing to fight: keep formation with the leader, waypoint-travelling when far.
        this.followLeader(leader);
    }

    // trail the leader: a local step when close + same floor, else waypoint travel.
    followLeader(leader) {
        const bot = this.bot;
        const samePlane = planeOf(bot.y) === planeOf(leader.y);
        const dist = bot.getDistance(leader);

        if (samePlane && dist <= 12) {
            travel.cancel(bot);
            bot._followDest = null;
            if (dist > 4) {
                this.pathTo(leader.x, leader.y);
            }
            return;
        }

        const dest = bot._followDest;
        const leaderMoved =
            !dest || Math.abs(dest.x - leader.x) + Math.abs(dest.y - leader.y) > 8;

        if (!travel.isTraveling(bot) || leaderMoved) {
            bot._followDest = { x: leader.x, y: leader.y };
            travel.begin(bot, { x: leader.x, y: leader.y });
        }

        if (travel.isTraveling(bot)) {
            travel.step(bot);
        } else {
            this.pathTo(leader.x, leader.y); // unroutable -> best-effort local
        }
    }
}

module.exports = CombatBrain;
