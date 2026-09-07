// mentoring: a strong helpful bot encourages a much weaker one, warms to them,
// and shares gear when they trade. repeated encouragement forms a persistent bond
// (cache.bot.mentees / the mentee's cache.bot.mentor). at graduation the graduate
// later pays it forward, mentoring beginners of its own.

const personality = require('./personality');
// resolved once on first use
let _mod_chatgen = null;
function mod_chatgen() { return _mod_chatgen || (_mod_chatgen = require('./chatgen')); }
let _mod_gear = null;
function mod_gear() { return _mod_gear || (_mod_gear = require('./gear')); }
let _mod_lore = null;
function mod_lore() { return _mod_lore || (_mod_lore = require('./lore')); }
let _mod_pacing = null;
function mod_pacing() { return _mod_pacing || (_mod_pacing = require('./pacing')); }
let _mod_reputation = null;
function mod_reputation() { return _mod_reputation || (_mod_reputation = require('./reputation')); }
let _mod_socialEmergent = null;
function mod_socialEmergent() { return _mod_socialEmergent || (_mod_socialEmergent = require('./social-emergent')); }
let _mod_trades = null;
function mod_trades() { return _mod_trades || (_mod_trades = require('./trades')); }
let _mod_voice = null;
function mod_voice() { return _mod_voice || (_mod_voice = require('./voice')); }
const items = require('@2003scape/rsc-data/config/items');

const BOND_AT = 4;      // encouragements before an informal bond becomes a real one
const GRAD_LEVEL = 40;  // a protege this strong has outgrown the nest

function combatLevel(c) {
    return c.getCombatLevel ? c.getCombatLevel() : c.combatLevel || 3;
}

function say(bot, situation, name) {
    try {
        const line = mod_chatgen().generate(situation, { name }, bot);
        if (line) bot.broadcastChat(line);
    } catch (e) {}
}

// plain-spoken line, not in the chatgen table
function speak(bot, line) {
    try {
        let out = line; try { out = mod_voice().apply(bot, line); } catch (e) {}
        bot._reactionSpeak = true;
        try { bot.broadcastChat(out); } finally { bot._reactionSpeak = false; }
    } catch (e) {}
}

function mentees(bot) {
    const cb = bot.cache && bot.cache.bot;
    if (!cb) return null;
    if (!cb.mentees) cb.mentees = {};
    return cb.mentees;
}

// deepen the persistent bond, returns the record
function tally(mentor, mentee) {
    const m = mentees(mentor);
    if (!m) return null;
    const key = mentee.username;
    if (!m[key]) m[key] = { count: 0, bonded: false, graduated: false };
    const rec = m[key];
    rec.count += 1;

    // an informal habit becomes a real bond, remembered on both sides
    if (!rec.bonded && rec.count >= BOND_AT) {
        rec.bonded = true;
        const name = (mentee.getFormattedUsername && mentee.getFormattedUsername()) || mentee.username;
        speak(mentor, 'you\'ve come far, ' + name + '. i\'ll show you the ropes.');
        try { mod_socialEmergent().noteInteraction(mentor, mentee.username, 2); } catch (e) {}
        // the protege (if a bot) remembers who took a chance on it
        if (mentee.isBot && mentee.cache && mentee.cache.bot && !mentee.cache.bot.mentor) {
            mentee.cache.bot.mentor = mentor.username;
            try { mod_socialEmergent().noteInteraction(mentee, mentor.username, 2); } catch (e) {}
        }
    }

    // the protege has grown strong, a proud graduation, once
    if (rec.bonded && !rec.graduated && combatLevel(mentee) >= GRAD_LEVEL) {
        rec.graduated = true;
        const name = (mentee.getFormattedUsername && mentee.getFormattedUsername()) || mentee.username;
        speak(mentor, 'look at you now, ' + name + ' - all grown up. i\'m proud.');
        try { mod_lore().record(mentor, 'find', { subj: 'a protégé who made good', num: combatLevel(mentee) }); } catch (e) {}
        try { mod_reputation().note(mentor, 'help'); } catch (e) {}
        // the graduate carries the lesson forward
        if (mentee.isBot && mentee.cache && mentee.cache.bot) {
            mentee.cache.bot.graduatedFrom = mentor.username; // pays it forward
        }
    }
    return rec;
}

// a suitable mentor occasionally encourages a nearby beginner.
// gifting as an ask -> accept/decline conversation: the mentor offers a spare
// ware and waits; gifts come only from saleable stock, and the offer times out.
const GIFT_OFFERS = [
    "{name}, want my spare {item}? yours if you like.",
    "{name}! fancy this {item}? i've plenty to spare.",
    "oi {name}, want my spare {item}? you'd use it more than me.",
    "got a spare {item} here, {name} - want it?"
];
function offerGift(mentor, mentee) {
    if (!mentee || !mentee.username) { return false; }
    if (mentor._giftOffer) { return false; } // one open offer at a time
    try { if (mod_pacing().isBusy(mentor)) { return false; } } catch (e) {} // yield to a bank run, errand, or fight
    if (mentee.inventory && mentee.inventory.isFull && mentee.inventory.isFull()) { return false; }
    let wares = [];
    try { wares = mod_trades().stockItems(mentor, 6); } catch (e) { return false; }
    if (!wares.length) { return false; }
    let giftId = -1;
    for (const w of wares) { try { if (mod_gear().wantsGearDrop(mentee, w.id)) { giftId = w.id; break; } } catch (e) {} }
    if (giftId < 0) { giftId = wares[0].id; }
    if (!mentor.inventory.items.some((it) => it.id === giftId && !it.equipped)) { return false; }
    const nm = (items[giftId] && items[giftId].name) ? items[giftId].name.toLowerCase() : 'this';
    const name = (mentee.getFormattedUsername && mentee.getFormattedUsername()) || mentee.username || 'friend';
    mentor._giftOffer = { to: mentee.username, itemId: giftId, ticks: 45 };
    speak(mentor, GIFT_OFFERS[Math.floor(Math.random() * GIFT_OFFERS.length)].replace('{name}', name).replace('{item}', nm));
    return true;
}
// recipient said yes, hand the ware over
function giveOfferedGift(mentor, recipient) {
    const o = mentor && mentor._giftOffer;
    if (!o || !recipient || recipient.username !== o.to) { return false; }
    mentor._giftOffer = null;
    if (recipient.inventory && recipient.inventory.isFull && recipient.inventory.isFull()) { speak(mentor, 'your bag\'s full - grab me when you\'ve room.'); return false; }
    if (!mentor.inventory.items.some((it) => it.id === o.itemId && !it.equipped)) { return false; }
    try { mentor.inventory.remove(o.itemId); recipient.inventory.add(o.itemId, 1); } catch (e) { return false; }
    speak(mentor, 'there you go - enjoy it.');
    try { mod_reputation().note(mentor, 'help'); } catch (e) {}
    try { mod_socialEmergent().noteInteraction(mentor, recipient.username, 0.8); } catch (e) {}
    return true;
}
// recipient said no or the offer timed out, keep it
function cancelOfferedGift(mentor, spoken) {
    if (!mentor || !mentor._giftOffer) { return false; }
    mentor._giftOffer = null;
    if (spoken) { speak(mentor, 'no worries - another time.'); }
    return true;
}

function onTick(bot) {
    // expire a pending gift offer if nobody takes it up
    if (bot._giftOffer) { bot._giftOffer.ticks -= 1; if (bot._giftOffer.ticks <= 0) { cancelOfferedGift(bot, false); } }
    if (bot.opponent || bot.locked) return;
    if (bot._mentorCd > 0) { bot._mentorCd -= 1; return; }

    const p = personality.of(bot);
    const myLevel = combatLevel(bot);
    // must be reasonably established and the helping sort
    let helpful = p.sociability > 0.55;
    try { if (mod_reputation().hasTag(bot, 'helper')) helpful = true; } catch (e) {}
    // pay it forward: a bot mentored to graduation becomes a willing teacher
    if (bot.cache && bot.cache.bot && bot.cache.bot.graduatedFrom) helpful = true;
    if (myLevel < 25 || !helpful) {
        bot._mentorCd = 200 + Math.floor(Math.random() * 300);
        return;
    }

    let mentee = null;
    try {
        for (const other of bot.getNearbyEntities('players', 6)) {
            if (!other || other === bot || other.username === bot.username) continue;
            const lvl = combatLevel(other);
            if (lvl < 15 || lvl < myLevel * 0.5) { mentee = other; break; } // a clear beginner
        }
    } catch (e) {}

    if (!mentee) {
        bot._mentorCd = 120 + Math.floor(Math.random() * 180);
        return;
    }

    if (Math.random() < 0.4 + p.sociability * 0.4) {
        const name = (mentee.getFormattedUsername && mentee.getFormattedUsername()) || mentee.username || 'friend';
        say(bot, 'reactMentor', name);
        try {
            const em = mod_socialEmergent();
            em.noteInteraction(bot, mentee.username, 0.6); // grow fond of the youngster
        } catch (e) {}
        try { mod_reputation().note(bot, 'help'); } catch (e) {}
        // deepen the lasting bond, and in time see them graduate
        try { tally(bot, mentee); } catch (e) {}
        // a generous mentor sometimes offers a spare ware
        if (Math.random() < 0.3 + p.sociability * 0.2) { try { offerGift(bot, mentee); } catch (e) {} }
    }
    bot._mentorCd = 400 + Math.floor(Math.random() * 500);
}

module.exports = { onTick, tally, mentees, offerGift, giveOfferedGift, cancelOfferedGift };
