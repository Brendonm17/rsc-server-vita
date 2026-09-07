// tracks how much ambient chatter has happened near a bot lately, so a crowd of bots
// doesn't flood one spot; only flavour chatter is throttled, real events are not

const CELL = 12; // cell size in tiles
const WINDOW = 10; // ticks that still count toward the din
const PLANE = 944;

const recent = new Map(); // "cx,cy,plane" -> [tick, tick, ...]

function nowTick(bot) {
    return (bot && bot.world && bot.world.ticks) | 0;
}
function cellKey(x, y) {
    return Math.floor(x / CELL) + ',' + Math.floor(y / CELL) + ',' + Math.floor(y / PLANE);
}

// ambient utterances near the bot in the last WINDOW ticks (cell + 8 neighbours)
function din(bot) {
    const t = nowTick(bot);
    const cx = Math.floor(bot.x / CELL);
    const cy = Math.floor(bot.y / CELL);
    const pl = Math.floor(bot.y / PLANE);
    let n = 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const arr = recent.get((cx + dx) + ',' + (cy + dy) + ',' + pl);
            if (arr) {
                for (let i = 0; i < arr.length; i++) {
                    if (t - arr[i] <= WINDOW) n++;
                }
            }
        }
    }
    return n;
}

// should the bot voice an ambient line now? less likely the busier the air is
function mayChatter(bot) {
    if (!bot || !bot.world) return true;
    const d = din(bot);
    if (d <= 0) return true;
    return Math.random() < 1 / (1 + d);
}

// record that the bot just spoke an ambient line here
function noteChatter(bot) {
    if (!bot || !bot.world) return;
    const t = nowTick(bot);
    const k = cellKey(bot.x, bot.y);
    let arr = recent.get(k);
    if (!arr) { arr = []; recent.set(k, arr); }
    arr.push(t);
    while (arr.length && t - arr[0] > WINDOW) arr.shift();
    // keep the map from growing unbounded
    if (recent.size > 600) {
        for (const [key, a] of recent) {
            while (a.length && t - a[0] > WINDOW) a.shift();
            if (!a.length) recent.delete(key);
        }
    }
}

// other bots physically near this one
function nearbyBots(bot, range) {
    if (!bot || typeof bot.getNearbyEntities !== 'function') return [];
    try {
        return bot.getNearbyEntities('players', range || 5)
            .filter((o) => o && o !== bot && o.isBot && o.id !== bot.id);
    } catch (e) {
        return [];
    }
}

// nearby peers: every player around this one, bots and the human
function nearbyPeers(bot, range) {
    if (!bot || typeof bot.getNearbyEntities !== 'function') return [];
    try {
        return bot.getNearbyEntities('players', range || 5)
            .filter((o) => o && o !== bot && o.username && o.id !== bot.id);
    } catch (e) {
        return [];
    }
}

module.exports = { mayChatter, noteChatter, din, nearbyBots, nearbyPeers };
