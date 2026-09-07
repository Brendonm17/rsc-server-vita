// phase-1 spike brain: chop the nearest reachable normal tree until inventory is full, then bank the logs, repeat
// one decision per tick; proves a socketless bot can log in, gather, pathfind and bank headlessly

const woodcutting = require('../../../skills/woodcutting');
const { findPathAdjacent } = require('../pathfind');

const TREE_ID = 0; // normal tree
const LOG_ID = 14; // logs
// search box side = range, so radius = range/2; 48 => ~24-tile radius
const SCAN_RANGE = 48;

class SpikeWoodcutterBrain {
    constructor(bot) {
        this.bot = bot;
        this.state = 'GATHER'; // 'GATHER' | 'BANK'
        this.targetTree = null; // committed tree until it's a stump
        // trees we couldn't reach this pass; nearestTree skips them
        this.unreachable = new Set();
    }

    treeKey(tree) {
        return `${tree.x},${tree.y}`;
    }

    // nearest standing, not-known-unreachable tree in scan range
    nearestTree() {
        const bot = this.bot;
        let best = null;
        let bestDist = Infinity;

        for (const obj of bot.getNearbyEntities('gameObjects', SCAN_RANGE)) {
            if (obj.id !== TREE_ID || this.unreachable.has(this.treeKey(obj))) {
                continue;
            }

            const dist = bot.getDistance(obj);

            if (dist < bestDist) {
                bestDist = dist;
                best = obj;
            }
        }

        return best;
    }

    // is this tree still standing (not a stump)?
    treeStillThere(tree) {
        if (!tree) {
            return false;
        }

        for (const obj of this.bot.world.gameObjects.getAtPoint(tree.x, tree.y)) {
            if (obj === tree && obj.id === TREE_ID) {
                return true;
            }
        }

        return false;
    }

    // orthogonally adjacent (distance <= 1); diagonals don't count for the gather path
    isAdjacent(o) {
        return Math.abs(o.x - this.bot.x) + Math.abs(o.y - this.bot.y) <= 1;
    }

    // called once per tick; do nothing while locked, walking, gathering, or in combat
    tick() {
        const bot = this.bot;

        if (
            bot.locked ||
            bot.opponent ||
            bot.walkQueue.length ||
            bot.gatheringSkill
        ) {
            return;
        }

        if (this.state === 'BANK') {
            this.doBank();
            this.state = 'GATHER';
            return;
        }

        // gather
        if (bot.inventory.isFull()) {
            this.state = 'BANK';
            return;
        }

        // commit to one tree until it's chopped down, then re-pick
        if (!this.treeStillThere(this.targetTree)) {
            this.targetTree = this.nearestTree();
        }

        const tree = this.targetTree;

        if (!tree) {
            // no standing tree in range; wait for respawn and clear the unreachable set
            this.unreachable.clear();
            return;
        }

        if (this.isAdjacent(tree)) {
            bot.faceEntity(tree);
            bot.lock(); // busy-gate holds while the async batch runs
            woodcutting
                .onGameObjectCommandOne(bot, tree)
                .catch(() => {
                    // a throwing batch must not strand the gather flag / lock
                    bot.gatheringSkill = false;
                })
                .then(() => {
                    if (bot.locked) {
                        bot.unlock();
                    }
                });
            return;
        }

        // not adjacent: pathfind to a tile beside the tree and walk it; if unreachable, mark it and pick another
        const steps = findPathAdjacent(
            bot.world,
            bot.x,
            bot.y,
            tree.x,
            tree.y
        );

        if (steps && steps.length) {
            bot.walkQueue = steps;
        } else {
            this.unreachable.add(this.treeKey(tree));
            this.targetTree = null; // re-pick next-nearest next tick
        }
    }

    // bank in place: the model bank methods have no proximity check
    doBank() {
        const bot = this.bot;

        try {
            bot.bank.open(); // sets interfaceOpen.bank + lock()

            const snapshot = bot.inventory.items.map((item) => ({
                id: item.id,
                amount: item.amount
            }));

            for (const item of snapshot) {
                if (item.id === LOG_ID) {
                    try {
                        bot.bank.deposit(item.id, item.amount);
                    } catch (e) {
                        // deposit throws if the item vanished mid-loop; ignore
                    }
                }
            }
        } finally {
            if (bot.interfaceOpen.bank) {
                bot.bank.close(); // clears interface + unlock()
            } else if (bot.locked) {
                bot.unlock();
            }
        }
    }
}

module.exports = SpikeWoodcutterBrain;
