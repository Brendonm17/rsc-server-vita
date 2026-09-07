// wander near home with pauses, occasionally trek to a far point-of-interest

const travel = require('../travel');
const personality = require('../personality');
const boats = require('../boats');

class WanderBrain {
    constructor(bot, opts = {}) {
        this.bot = bot;
        this.home = opts.home || { x: bot.x, y: bot.y };
        this.leash = opts.leash || 10;
        this.pauseLeft = 0;
    }

    // pick a point-of-interest: usually a facility, sometimes a random map node
    pickPOI() {
        if (Math.random() < 0.4 && travel.NODES && travel.NODES.length) {
            const n = travel.NODES[Math.floor(Math.random() * travel.NODES.length)];
            return { x: n[0], y: n[1] };
        }
        const names = Object.keys(travel.FACILITIES || {});
        if (!names.length) {
            return null;
        }
        const f = travel.FACILITIES[names[Math.floor(Math.random() * names.length)]];
        return f ? f.target : null;
    }

    tick() {
        const bot = this.bot;

        // mid trek: keep travelling, on arrival make here the new roam centre
        if (bot._wanderTrek) {
            if (travel.isTraveling(bot)) {
                travel.step(bot);
                return;
            }
            bot._wanderTrek = false;
            this.home = { x: bot.x, y: bot.y };
        }

        if (
            bot.locked ||
            bot.walkQueue.length ||
            bot.opponent ||
            bot.gatheringSkill
        ) {
            return;
        }

        if (this.pauseLeft > 0) {
            this.pauseLeft -= 1;
            return;
        }

        const curiosity = personality.of(bot).curiosity || 0;

        // boats: on karamja, catch the ferry home after a while
        // at the port sarim dock with the fare, a curious bot sails to the island
        if (boats.onKaramja(bot)) {
            bot._karamjaTicks = (bot._karamjaTicks || 0) + 1;
            if (bot._karamjaTicks > 250 && Math.random() < 0.05) {
                boats.sailToPortSarim(bot);
                this.home = { x: bot.x, y: bot.y };
                return;
            }
        } else if (
            boats.atPortSarimDock(bot) &&
            bot.inventory.has(10, 30) &&
            Math.random() < 0.03 * (0.3 + curiosity)
        ) {
            if (boats.sailToKaramja(bot)) {
                this.home = { x: bot.x, y: bot.y }; // roam karamja from here
                return;
            }
        }

        // curious bots occasionally set off to somewhere new on the map
        if (Math.random() < 0.0015 * curiosity) {
            const poi = this.pickPOI();
            if (poi && travel.begin(bot, { x: poi.x, y: poi.y })) {
                bot._wanderTrek = true;
                return;
            }
        }

        // sometimes stand idle for a few ticks
        if (Math.random() < 0.25) {
            this.pauseLeft = 2 + Math.floor(Math.random() * 5);
            return;
        }

        // the engine already moved the bot this tick; a second walk in one tick is refused
        if (bot.isWalking || (bot.world && bot.moveTick === (bot.world.ticks | 0))) {
            return;
        }

        // drifted too far: step back toward home, else a random free step
        const dist =
            Math.abs(bot.x - this.home.x) + Math.abs(bot.y - this.home.y);

        if (dist > this.leash) {
            const dx = Math.sign(this.home.x - bot.x);
            const dy = Math.sign(this.home.y - bot.y);

            for (const [a, b] of [[dx, 0], [0, dy], [dx, dy]]) {
                if ((a !== 0 || b !== 0) && bot.canWalk(a, b)) {
                    bot.walkTo(a, b);
                    return;
                }
            }
        }

        const step = bot.getFreeDirection(new Set(), true);

        if (step) {
            bot.walkTo(step.deltaX, step.deltaY);
        }
    }
}

module.exports = WanderBrain;
