// career scheduler: hold combat/gather/wander tasks, run one per time-block then re-roll by personality.
// swaps only while idle (never mid-action); a party recruit forces the combat task.

const SpikeWoodcutterBrain = require('./spike-woodcutter');
const ResourceGatherer = require('./resource-gatherer');
const CombatBrain = require('./combat');
const WanderBrain = require('./wander');
const personality = require('../personality');
const economy = require('../economy');
const auction = require('../auction');
const questing = require('../questing');
const questsData = require('../quests-data');
const travel = require('../travel');
const botPvp = require('../pvp');
const botMemory = require('../memory');
const goals = require('../goals');
const lifecycle = require('../lifecycle');
const learning = require('../learning');
const needs = require('../needs');
const prayerAltar = require('../prayer-altar');
const deathRun = require('../death-run');
const spawnRun = require('../spawn-run'); // rare greedy trip to a valuable item-spawn (money-maker)
const mapData = require('../map-data'); // data-driven spawn snapping (go where the enemies actually are)
const SITES = require('../sites');

// a site's coordinate is an anchor; snap it onto the nearest real npc spawn (combat) or resource
// object (gather) near it, else keep the anchor. memoised on the site object.
const SITE_SNAP_RADIUS = 64;   // combat: npc spawn near the anchor
const GATHER_SNAP_RADIUS = 40; // gather: resource object near the anchor (trees snap within ~15)
// resource object ids per gather skill, from the rsc-data skill tables; woodcutting is the default.
const TREE_IDS = new Set(Object.keys(require('@2003scape/rsc-data/skills/woodcutting').trees).map(Number));
const ROCK_IDS = new Set(Object.keys(require('@2003scape/rsc-data/skills/mining').rocks).map(Number));
const SPOT_IDS = new Set(Object.keys(require('@2003scape/rsc-data/skills/fishing').spots).map(Number));
// which resource objects a gather site works, or null when it shouldn't snap (e.g. a thieving market).
function gatherResourceIds(site) {
    if (site.gatherSkill === 'mining') { return ROCK_IDS; }
    if (site.gatherSkill === 'fishing') { return SPOT_IDS; }
    if (site.gatherSkill === 'woodcutting') { return TREE_IDS; }
    if (!site.gatherSkill && site.tier != null) { return TREE_IDS; } // a woodcutting gather spot (has a tier)
    return null; // thieving/market or unknown -> keep the anchor
}
function siteHome(site) {
    if (!site) { return { x: 0, y: 0 }; }
    if (site._home) { return site._home; }
    let h = null;
    try {
        if (site.type === 'combat' && site.targetIds && site.targetIds.length) {
            h = mapData.nearestNpcNear(site, site.targetIds, { radius: SITE_SNAP_RADIUS });
        } else if (site.type === 'gather') {
            const ids = gatherResourceIds(site);
            if (ids) { h = mapData.nearestSiteNear(site, ids, { radius: GATHER_SNAP_RADIUS }); }
        }
    } catch (e) { h = null; }
    h = h || { x: site.x, y: site.y };
    site._home = h;
    return h;
}

// ~10 min at 640ms/tick (the AIOAIO block length).
const DEFAULT_BLOCK = 900;

// a production skill is trained by gathering its input then processing it, so PRODUCTION_INPUT maps
// each production skill to its input gather skill.
const PRODUCTION_INPUT = { smithing: 'mining', cooking: 'fishing', fletching: 'woodcutting', firemaking: 'woodcutting' };

// how well a gather site's resource tier fits the bot's skill level: a usable higher tier weighs more,
// an under-level site is penalised; combat and non-gather sites are neutral.
function tierFit(bot, s) {
    if (s.type !== 'gather') {
        return 1;
    }
    const tier = s.tier || 1;
    const skill = s.gatherSkill || 'woodcutting';
    const sk = bot.skills && bot.skills[skill];
    const level = sk ? sk.base : 1;
    if (level >= tier) {
        return 1 + Math.min(tier, level) / 15; // ~1.07 at a starter spot up to ~5x at a top-tier one
    }
    return 0.4; // best resource still locked; keep low bots on lower spots
}

function goalSiteMultiplier(goal, s) {
    if (!goal) {
        return 1;
    }
    switch (goal.type) {
        case 'skill': {
            // prayer is trained by fighting for bones -> route to a fight, not a gather spot.
            if (goal.skill === 'prayer') {
                return s.type === 'combat' ? 3 : 0.6;
            }
            // crafting (leather) comes from cowhide -> route to a hide-dropping fight.
            if (goal.skill === 'crafting') {
                if (s.type === 'combat') {
                    return (s.loot && s.loot.includes(147)) ? 6 : 2; // 6x a cowhide site, mild for other fights
                }
                return 0.5;
            }
            // herblaw comes from grimy herbs (chaos-druid drops, loot 165) -> route to that fight.
            if (goal.skill === 'herblaw') {
                if (s.type === 'combat') {
                    return (s.loot && s.loot.includes(165)) ? 6 : 1.5;
                }
                return 0.5;
            }
            const skill = PRODUCTION_INPUT[goal.skill] || goal.skill;
            if (skill === 'mining' || skill === 'fishing') {
                if (s.type === 'gather' && s.gatherSkill === skill) {
                    return 6;
                }
                return s.type === 'gather' ? 0.5 : 0.2;
            }
            // woodcutting (or any other) -> a plain tree gather site (no gatherSkill tag)
            if (s.type === 'gather' && !s.gatherSkill) {
                return 6;
            }
            return s.type === 'gather' ? 0.5 : 0.2;
        }
        case 'getRich':
            return s.type === 'gather' ? 3 : 1;
        case 'levelUp':
        case 'gearUp':
            return s.type === 'combat' ? 3 : 0.6;
        default:
            return 1;
    }
}

class CareerBrain {
    constructor(bot, opts = {}) {
        this.bot = bot;

        const home = opts.home || { x: bot.x, y: bot.y };
        const leash = opts.leash || 20;
        const targetIds = opts.targetIds || [62, 19, 29]; // goblins, rats
        const pvp = !!(bot.cache && bot.cache.bot && bot.cache.bot.pvp);

        // gather brains, memoised per skill; woodcutting is the default, a mining/fishing site swaps it.
        this._gatherers = { woodcutting: new SpikeWoodcutterBrain(bot) };
        this.tasks = {
            combat: new CombatBrain(bot, { home, leash, targetIds, pvp }),
            gather: this._gatherers.woodcutting,
            wander: new WanderBrain(bot, { home, leash: Math.min(leash, 10) })
        };

        this.blockTicks = opts.blockTicks || DEFAULT_BLOCK;
        this.currentName = null;
        this.current = null;
        this.ticksLeft = 0;
    }

    // activity pull from personality, nudged by the bot's current goal; all non-zero so every bot varies.
    weights() {
        const p = personality.of(this.bot);
        const bias = goals.activityBias(this.bot);
        // shaken after a death -> fight less, potter about more until it settles.
        const shaken = lifecycle.shaken(this.bot) ? 0.45 : 0;
        // a veteran bot winds down: grinds less, potters/socialises more.
        let vet = 0;
        try { const st = require('../evolve').stage(this.bot); if (st === 'veteran') { vet = (this.bot.cache && this.bot.cache.bot && this.bot.cache.bot.retired) ? 0.55 : 0.25; } } catch (e) {  }
        return {
            combat: Math.max(0.05, 0.1 + p.aggression + bias.combat - shaken - vet * 0.5),
            gather: Math.max(0.05, 0.1 + p.diligence * (1 - p.aggression * 0.5) + bias.gather + shaken * 0.4 - vet * 0.35),
            wander: Math.max(0.05, 0.05 + p.curiosity * (1 - p.diligence) + bias.wander + shaken * 0.5 + vet * 0.9)
        };
    }

    rollTask() {
        const w = this.weights();
        const total = w.combat + w.gather + w.wander;
        let r = Math.random() * total;

        for (const name of ['combat', 'gather', 'wander']) {
            r -= w[name];
            if (r <= 0) {
                return name;
            }
        }

        return 'gather';
    }

    // pick the next activity, weighted, but avoid repeating the same one block after block.
    pick() {
        const first = this.rollTask();
        if (first !== this.currentName) {
            return first;
        }
        const w = this.weights();
        const others = ['combat', 'gather', 'wander'].filter(
            (n) => n !== this.currentName
        );
        const total = others.reduce((s, n) => s + w[n], 0);
        if (total <= 0) {
            return first;
        }
        let r = Math.random() * total;
        for (const n of others) {
            r -= w[n];
            if (r <= 0) {
                return n;
            }
        }
        return others[others.length - 1];
    }

    idle() {
        const b = this.bot;
        return !(
            b.locked ||
            b.opponent ||
            b.walkQueue.length ||
            b.gatheringSkill
        );
    }

    setTask(name) {
        this.currentName = name;
        this.current = this.tasks[name];
        this.ticksLeft = this.blockTicks;
    }

    tick() {
        const bot = this.bot;

        // recruited -> always run combat so assist / boss turn-taking kicks in
        if (
            bot.party &&
            bot.party.members.length > 1 &&
            bot.party.leader !== bot.username
        ) {
            if (this.currentName !== 'combat') {
                this.setTask('combat');
            }
            this.current.tick();
            return;
        }

        // a boss goal near the lair: lock combat onto the boss.
        this.lockBossIfNear();

        // paced-leveling: outrunning the player -> wander instead of training (governor sets _paceSlack).
        if (bot._paceSlack) {
            if (this.currentName !== 'wander') {
                this.setTask('wander');
            }
            this.current.tick();
            return;
        }

        // full bag -> a logistics run (sell or bank), handled below before task rotation.
        // yield while processing.js is walking the bot to / working it at a facility.
        if (bot._processTrip) {
            return;
        }
        // low on food -> walk to a bank and withdraw the reserve.
        if (bot._foodRun) {
            if (economy.foodRunTick(bot) === 'done') {
                bot._foodRun = null;
            }
            return;
        }
        if (economy.shouldRestockFood(bot)) {
            economy.startFoodRun(bot);
            economy.foodRunTick(bot);
            return;
        }

        // death run: a bot that just died runs back to its death tile to reclaim the dropped pile.
        if (bot._deathRun) {
            if (deathRun.deathRunTick(bot) === 'done') { bot._deathRun = null; }
            return;
        }
        if (deathRun.shouldRetrieve(bot)) {
            deathRun.startDeathRun(bot);
            deathRun.deathRunTick(bot);
            return;
        }

        // survival restock: an alcher out of runes / an archer out of arrows tops up from its bank reserve.
        if (bot._runeRun) {
            if (economy.runeRunTick(bot) === 'done') { bot._runeRun = null; }
            return;
        }
        if (economy.shouldRestockRunes(bot)) {
            economy.startRuneRun(bot);
            economy.runeRunTick(bot);
            return;
        }
        if (bot._ammoRun) {
            if (economy.ammoRunTick(bot) === 'done') { bot._ammoRun = null; }
            return;
        }
        if (economy.shouldRestockAmmo(bot)) {
            economy.startAmmoRun(bot);
            economy.ammoRunTick(bot);
            return;
        }

        // needs: the bot works out what it lacks and buys it; a need it can't afford yet falls through to earn first.
        if (bot._needTrip) {
            if (needs.needTripTick(bot) === 'done') { bot._needTrip = null; }
            return;
        }
        if (bot._needCd == null) { bot._needCd = 0; }
        if (--bot._needCd <= 0) {
            bot._needCd = 40 + Math.floor(Math.random() * 40);
            // don't start a discretionary shopping trip while a quest owns the bot.
            if (!bot._quest) {
                const need = needs.assess(bot);
                if (need && need.plan === 'buy') {
                    // set the trade hint (_wantBuy) so a neighbour can source it; wait a couple of cycles before the shop trek.
                    bot._wantBuy = need.itemId;
                    let localFirst = false;
                    try { localFirst = require('../trades').sellerNearby(bot, need.itemId) && (bot._localWait || 0) < 2; } catch (e) {  }
                    if (localFirst) {
                        bot._localWait = (bot._localWait || 0) + 1; // fall through to normal work; the trade poller sources it
                    } else {
                        bot._localWait = 0;
                        needs.startAcquire(bot, need);
                        needs.needTripTick(bot);
                        return;
                    }
                } else {
                    bot._wantBuy = null; // nothing to buy -> clear the trade hint
                }
            }
        }
        // money lean: 'smart' decides per-situation; 'alch' alchs in place, 'sell' visits shops, 'bank' hoards.
        const money = (bot.cache.bot && bot.cache.bot.money) || 'smart';
        // for a 'smart' bot, resolve the concrete action from its current loot.
        const smart = money === 'smart' ? economy.smartMoneyChoice(bot) : null;
        const alchLean = money === 'alch' || smart === 'alch';

        // an alcher turns loot straight into gold in place, owning the tick while any alchable loot remains.
        if (alchLean && economy.canAlch(bot)) {
            if (economy.hasAlchableLoot(bot)) {
                bot._alching = true;
                economy.tryAlchOne(bot);
                return;
            }
            bot._alching = false;
        }
        if (bot._shopTrip) {
            if (economy.shopTripTick(bot) === 'done') {
                bot._shopTrip = null;
            }
            return;
        }
        if (bot._bankRun) {
            if (economy.bankRunTick(bot) === 'done') {
                bot._bankRun = null;
            }
            return;
        }
        if (economy.shouldBank(bot)) {
            // sell (or smart-says-sell) visits a shop; otherwise deposit at a bank.
            const sells = money === 'sell' || smart === 'sell';
            // use the auction house when it pays better than a shop and a clerk is near.
            if (sells && auction.shouldRun(bot)) {
                auction.tick(bot);
                return;
            }
            if (sells) {
                economy.startShopTrip(bot);
                economy.shopTripTick(bot);
            } else {
                economy.startBankRun(bot);
                economy.bankRunTick(bot);
            }
            return;
        }

        // prayer recharge: a prayer user low on points tops up at the nearest church altar.
        if (bot._prayerRun) {
            if (prayerAltar.prayerRunTick(bot) === 'done') { bot._prayerRun = null; }
            return;
        }
        if (prayerAltar.shouldRecharge(bot)) {
            prayerAltar.startPrayerRun(bot);
            prayerAltar.prayerRunTick(bot);
            return;
        }

        // gear up: with surplus coins, occasionally splurge on a weapon/armour upgrade.
        if (bot._gearRun) {
            if (economy.gearRunTick(bot) === 'done') {
                bot._gearRun = null;
            }
            return;
        }
        if (!bot._quest && economy.shouldBuyGear(bot)) {
            economy.startGearRun(bot);
            economy.gearRunTick(bot);
            return;
        }

        // auctions: list spare goods and buy needs off the auction house.
        if (bot._auctionRun) {
            if (auction.tick(bot) === 'done') {
                bot._auctionRun = null;
            }
            return;
        }
        if (!bot._quest && auction.shouldRun(bot)) {
            auction.tick(bot);
            return;
        }

        // spawn run: a rare greedy trip to a known valuable item-spawn; lowest-priority, only when free.
        if (spawnRun.onTick(bot)) {
            return;
        }

        // a quest in progress owns the bot until it completes (questing.js).
        if (bot._quest) {
            if (questing.questTick(bot) === 'done') {
                bot._quest = null;
            }
            return;
        }

        // a relocation in progress owns the bot until it arrives, then it works there.
        if (bot._relocateSite) {
            if (this.relocateArrived()) {
                this.applySite(bot._relocateSite);
                this.setTask(
                    bot._relocateSite.type === 'gather' ? 'gather' : 'combat'
                );
                bot._relocateSite = null;
            }
            return;
        }

        // rotate when the block expires, only while idle; a rotation may relocate to a different site.
        if ((this.ticksLeft <= 0 || !this.current) && this.idle()) {
            // if the goal is a quest, drive that specific quest until done.
            const g = goals.current(bot);
            if (g && g.type === 'quest' && !questing.isComplete(bot, g.key)) {
                let qdef = null;
                try { qdef = questsData.find((x) => x.key === g.key); } catch (e) {  }
                if (qdef && questing.prereqsMet(bot, qdef)) {
                    questing.startQuest(bot, qdef);
                    return;
                }
                // prereqs unmet (level/QP) -> fall through and train up first (authentic bootstrap).
            }
            // otherwise, sometimes set off on a random quest as flavour (curiosity spice)
            if (questing.shouldQuest(bot)) {
                const quest = questing.pickQuest(bot);
                if (quest) {
                    questing.startQuest(bot, quest);
                    return;
                }
            }
            // a boss goal sends the bot to the lair first.
            const boss = this.bossRelocateSite();
            if (boss) {
                this.startRelocate(boss);
                return;
            }
            const starved = !!bot._starved;
            bot._starved = false;
            const site = this.maybeRelocate(starved);
            if (site) {
                this.startRelocate(site);
                return;
            }
            this.setTask(this.pick());
        }

        this.ticksLeft -= 1;

        if (this.current) {
            this.current.tick();
        }
    }

    // sometimes choose a distant work site to move to (null = stay); only ones the bot's level can handle.
    // force = a starved task, which always moves on
    maybeRelocate(force) {
        const p = personality.of(this.bot);
        // a starved task (nothing to work here) always moves on; otherwise curiosity rolls
        if (!force && Math.random() >= 0.3 + p.curiosity * 0.35) {
            return null;
        }
        const here = this.bot;
        const combat = here.combatLevel || here.getCombatLevel();
        // head to a wilderness site only when the pvp appetite roll passes.
        // freshly killed + timid/rattled -> lie low: no wilderness at all.
        const shaken = lifecycle.shaken(here);
        const huntNow = !shaken && botPvp.wantsToHunt(here);
        const bold = botPvp.boldness(here);
        const far = SITES.filter(
            (s) =>
                Math.abs(s.x - here.x) + Math.abs(s.y - here.y) > 25 &&
                (!s.pvp || huntNow) &&
                // deeper/riskier wilderness spots need genuine nerve, not just a
                // combat level (pvp.boldness).
                (!s.minBold || bold >= s.minBold) &&
                // don't return to a spot it was recently killed at (memory.js)
                !botMemory.avoidsArea(here, s.x, s.y) &&
                (s.type === 'gather' || combat >= (s.minCombat || 1))
        );
        if (!far.length) {
            return null;
        }
        // weight the pick by remembered site profitability, learned danger, and how well a site
        // serves the bot's current goal/dream.
        const goal = goals.current(here);
        // prefer nearby work (soft distance decay); a strong goal, a productive haunt, or curiosity still wins the trek.
        const roam = 150 + p.curiosity * 350; // homebody ~150, wanderer ~500 tile "comfort range"
        const weights = far.map((s) => {
            let w = 1 + botMemory.siteScore(here, s.name) / 500;
            let danger = 0;
            for (const id of s.targetIds || []) {
                danger += learning.dangerOf(here, id);
            }
            w = Math.max(0.05, w - Math.min(0.9, danger * 0.15));
            w *= goalSiteMultiplier(goal, s);
            w *= tierFit(here, s); // progression: pull a leveled bot toward higher-tier content
            // gravitate toward ground where valuable loot has turned up (a soft pull).
            const home = siteHome(s);
            w *= 1 + Math.min(1.5, botMemory.richAreaScore(here, home.x, home.y) / 40);
            // down-weight ground where danger was recently seen or warned (a soft steer).
            w *= 1 - Math.min(0.8, botMemory.dangerAreaScore(here, home.x, home.y) / 50);
            const dist = Math.abs(s.x - here.x) + Math.abs(s.y - here.y);
            w *= 1 / (1 + dist / roam); // closer sites weigh more, curiosity widens the range
            return w;
        });
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < far.length; i += 1) {
            r -= weights[i];
            if (r <= 0) {
                return far[i];
            }
        }
        return far[far.length - 1];
    }

    // when near the boss lair, point combat at the boss so it fights it in place.
    lockBossIfNear() {
        const t = goals.bossTarget(this.bot);
        if (!t) {
            return;
        }
        const d = Math.abs(this.bot.x - t.x) + Math.abs(this.bot.y - t.y);
        if (d <= 14) {
            this.tasks.combat.home = { x: t.x, y: t.y };
            this.tasks.combat.targetIds = new Set([t.id]);
        }
    }

    // a boss goal far from the lair -> a synthetic combat site to travel to; null when near.
    bossRelocateSite() {
        const t = goals.bossTarget(this.bot);
        if (!t) {
            return null;
        }
        const d = Math.abs(this.bot.x - t.x) + Math.abs(this.bot.y - t.y);
        if (d <= 14) {
            return null;
        }
        return {
            x: t.x, y: t.y,
            targetIds: [t.id],
            type: 'combat',
            name: 'boss:' + t.name
        };
    }

    startRelocate(site) {
        this.bot._relocateSite = site;
        travel.begin(this.bot, siteHome(site)); // walk to the real spawn cluster, not a stale anchor tile
    }

    relocateArrived() {
        if (!travel.isTraveling(this.bot)) {
            return true;
        }
        travel.step(this.bot);
        return false;
    }

    // point combat + wander at the new site and switch the gather task to the site's skill.
    applySite(site) {
        const home = siteHome(site); // the snapped spawn cluster (== anchor for gather / unspawned sites)
        this.tasks.combat.home = { x: home.x, y: home.y };
        this.tasks.wander.home = { x: home.x, y: home.y };
        if (site.targetIds) {
            this.tasks.combat.targetIds = new Set(site.targetIds);
        }
        // load the site's loot whitelist so its drops (cowhide, raw meat, ...) are picked up.
        this.tasks.combat.lootIds = new Set(site.loot || []);
        this.setGatherSkill(site.gatherSkill);
    }

    // swap the gather task to the brain for skill (default woodcutting), cached per skill.
    setGatherSkill(skill) {
        const s = skill === 'mining' || skill === 'fishing' ? skill : 'woodcutting';
        if (!this._gatherers[s]) {
            this._gatherers[s] =
                s === 'woodcutting'
                    ? new SpikeWoodcutterBrain(this.bot)
                    : new ResourceGatherer(this.bot, s);
        }
        this.tasks.gather = this._gatherers[s];
    }
}

module.exports = CareerBrain;
