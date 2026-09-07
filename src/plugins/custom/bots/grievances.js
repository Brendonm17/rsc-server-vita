// records the specific wrong a bot suffered from someone, replayed back later.
// capped log per person in cache.bot.grievances, kept across sessions

const CAP = 4; // grievances remembered per person

function store(bot) {
    const cb = bot && bot.cache && bot.cache.bot;
    if (!cb) return null;
    if (!cb.grievances) cb.grievances = {};
    return cb.grievances;
}

// record a wrong done to bot by username
function record(bot, username, reason) {
    const s = store(bot);
    if (!s || !username || !reason) return;
    if (!Array.isArray(s[username])) s[username] = [];
    // don't repeat the same grievance back-to-back
    if (s[username][s[username].length - 1] === reason) return;
    s[username].push(reason);
    if (s[username].length > CAP) s[username].shift();
}

// freshest grievance the bot holds against username, or null
function grievanceOf(bot, username) {
    const s = store(bot);
    if (!s || !s[username] || !s[username].length) return null;
    return s[username][s[username].length - 1];
}

// a random grievance against username, or null
function anyGrievance(bot, username) {
    const s = store(bot);
    if (!s || !s[username] || !s[username].length) return null;
    return s[username][Math.floor(Math.random() * s[username].length)];
}

module.exports = { record, grievanceOf, anyGrievance };
