// gear up from what the bot owns: loot wieldable upgrades and wield the best piece per slot
// a magic/ranged weapon is never swapped for melee; only armour is upgraded

const wield = require('@2003scape/rsc-data/wieldable');
const itemDefs = require('@2003scape/rsc-data/config/items');
const { weapons: rangedWeapons } = require('@2003scape/rsc-data/ranged');

// managed armour slots; replace-* variants share the head/body/legs bonus
const ARMOR_SLOTS = [
    'left-hand', 'head', 'replace-head', 'body', 'chest', 'replace-body',
    'legs', 'replace-legs', 'feet', 'hands', 'cape'
];

// raw stat scores, weapon-type-agnostic
function scoreArmor(id) {
    const w = wield[id];
    return w ? w.armour || 0 : -1;
}

function scoreWeapon(id) {
    const w = wield[id];
    return w ? (w.weaponPower || 0) + (w.weaponAim || 0) : -1;
}

function botFocus(bot) {
    return (bot.cache && bot.cache.bot && bot.cache.bot.focus) || 'auto';
}

// does this bot fight with magic?
function isMageStyle(bot) {
    if (botFocus(bot) === 'magic') {
        return true;
    }
    const idx = bot.inventory.equipmentSlots['right-hand'];
    const item = idx >= 0 ? bot.inventory.items[idx] : null;
    return !!(item && wield[item.id] && (wield[item.id].magic || 0) > 0);
}

// armour value for this bot: a mage weights magic bonus, everyone else weights armour + prayer
function armorScoreFor(bot, id) {
    const w = wield[id];
    if (!w) {
        return -1;
    }
    const armour = w.armour || 0;
    const magic = w.magic || 0;
    const prayer = w.prayer || 0;
    if (isMageStyle(bot)) {
        return magic * 10 + armour + prayer;
    }
    return armour + prayer * 0.5;
}

// weapon value for this bot, weighted by combatStyle (power vs aim)
function weaponScoreFor(bot, id) {
    const w = wield[id];
    if (!w) {
        return -1;
    }
    const power = w.weaponPower || 0;
    const aim = w.weaponAim || 0;
    switch (bot.combatStyle) {
        case 1: // aggressive -> hit harder
            return power * 2 + aim;
        case 2: // accurate -> hit more often
            return aim * 2 + power;
        default: // controlled / defensive -> balanced
            return power + aim;
    }
}

function meetsReq(bot, id) {
    const w = wield[id];
    if (!w) {
        return false;
    }
    if (w.requirements) {
        for (const [skill, level] of Object.entries(w.requirements)) {
            if (!bot.skills[skill] || bot.skills[skill].base < level) {
                return false;
            }
        }
    }
    if (w.female && bot.isMale && bot.isMale()) {
        return false;
    }
    return true;
}

function equippedIn(bot, slot) {
    const idx = bot.inventory.equipmentSlots[slot];
    return typeof idx === 'number' && idx >= 0 ? bot.inventory.items[idx] : null;
}

// is the bot's weapon a bow/staff to preserve (not overwrite with a sword)?
function weaponIsSpecial(bot) {
    const item = equippedIn(bot, 'right-hand');
    if (!item) {
        return false;
    }
    if (rangedWeapons[item.id]) {
        return true; // a bow / crossbow
    }
    const w = wield[item.id];
    return !!(w && (w.magic || 0) > 0); // a staff / magic weapon
}

function isEquipableMeleeWeapon(id) {
    const def = itemDefs[id];
    const w = wield[id];
    return (
        def &&
        def.equip &&
        def.equip.includes('right-hand') &&
        w &&
        !rangedWeapons[id] &&
        (w.magic || 0) === 0
    );
}

// how this bot scores an equipable item (weapon vs armour), or null if it shouldn't manage it
function scorerFor(bot, id) {
    const def = itemDefs[id];
    if (!def || !def.equip || !wield[id]) {
        return null;
    }
    const slots = def.equip;
    if (slots.includes('right-hand') || slots.includes('2-handed')) {
        if (weaponIsSpecial(bot) || !isEquipableMeleeWeapon(id)) {
            return null; // keep a mage's staff / archer's bow
        }
        return (x) => weaponScoreFor(bot, x);
    }
    if (slots.some((s) => ARMOR_SLOTS.includes(s))) {
        return (x) => armorScoreFor(bot, x);
    }
    return null;
}

// wield the best gear the bot owns: equip an item only if it beats the best score across all its slots
function equipBestOwned(bot) {
    // no-weapons duel rule: nothing gets re-equipped
    if (bot.duel && bot.duel.isDuelActive() && bot.duel.getDuelSetting(3)) {
        return false;
    }
    const inv = bot.inventory;
    let changed = false;
    let moved = true;
    let pass = 0;

    while (moved && pass++ < 4) {
        moved = false;
        for (const it of inv.items) {
            if (it.equipped || !meetsReq(bot, it.id)) {
                continue;
            }
            const score = scorerFor(bot, it.id);
            if (!score) {
                continue;
            }
            const mine = score(it.id);

            // best score currently occupying any slot this item would take
            let displaced = -1;
            for (const slot of itemDefs[it.id].equip) {
                const cur = equippedIn(bot, slot);
                if (cur && cur !== it) {
                    displaced = Math.max(displaced, score(cur.id));
                }
            }

            if (mine > displaced) {
                const idx = inv.items.indexOf(it);
                if (idx >= 0) {
                    inv.equip(idx);
                    changed = true;
                    moved = true;
                }
            }
        }
    }

    return changed;
}

// should the bot pick up this dropped item? a usable wieldable that upgrades a slot
function wantsGearDrop(bot, id) {
    const def = itemDefs[id];
    // sp is always a members world, so members gear is normal gear
    if (!def || !def.equip || !wield[id] || !meetsReq(bot, id)) {
        return false;
    }
    for (const slot of def.equip) {
        if (slot === 'right-hand' || slot === '2-handed') {
            if (weaponIsSpecial(bot) || !isEquipableMeleeWeapon(id)) {
                continue;
            }
            const cur = equippedIn(bot, 'right-hand');
            if (!cur || weaponScoreFor(bot, cur.id) < weaponScoreFor(bot, id)) {
                return true;
            }
        } else if (ARMOR_SLOTS.includes(slot)) {
            const cur = equippedIn(bot, slot);
            if (!cur || armorScoreFor(bot, cur.id) < armorScoreFor(bot, id)) {
                return true;
            }
        }
    }
    return false;
}

// periodically wear the best gear the bot owns; show off a notable new piece to an audience, throttled
const SHOWOFF = [
    'decked out in my finest now.', 'how do i look?', 'not a bad bit of kit, eh?',
    'all kitted out.', 'been upgrading my gear.', 'suits me, this does.'
];
function gearName(id) { const d = itemDefs[id]; return d && d.name ? d.name.toLowerCase() : 'gear'; }
function notableGear(id) { const d = itemDefs[id]; return !!(d && (d.price || 0) >= 400); } // worth remarking on
function equippedIdSet(bot) { const s = new Set(); try { for (const it of bot.inventory.items) { if (it && it.equipped) { s.add(it.id); } } } catch (e) {} return s; }
let _pacing, _personality;
function onTick(bot) {
    if (bot._gearCd && bot._gearCd > 0) { bot._gearCd -= 1; return false; }
    bot._gearCd = 25 + Math.floor(Math.random() * 45);
    if (bot.opponent) { return false; }
    try { if ((_pacing || (_pacing = require('./pacing'))).isBusy(bot)) { return false; } } catch (e) {}
    const before = equippedIdSet(bot);
    if (!equipBestOwned(bot)) { return false; } // already wearing the best it owns
    // a notable newly-worn piece to maybe show off
    let shown = -1;
    for (const it of bot.inventory.items) { if (it && it.equipped && !before.has(it.id) && notableGear(it.id)) { shown = it.id; break; } }
    if (shown < 0) { return true; }
    let audience = 0;
    try { audience = (bot.getNearbyEntities('players', 5) || []).length; } catch (e) {}
    let soc = 0.3; try { soc = (_personality || (_personality = require('./personality'))).of(bot).sociability; } catch (e) {}
    if (audience > 0 && Math.random() < 0.25 + soc * 0.4) {
        let line = SHOWOFF[Math.floor(Math.random() * SHOWOFF.length)];
        if (Math.random() < 0.5) { line = 'new ' + gearName(shown) + ' - ' + line; }
        bot._reactionSpeak = true;
        try { bot.broadcastChat(line); } catch (e) {} finally { bot._reactionSpeak = false; }
    }
    return true;
}

module.exports = {
    equipBestOwned,
    onTick,
    wantsGearDrop,
    weaponIsSpecial,
    isMageStyle,
    armorScoreFor,
    weaponScoreFor,
    scoreWeapon,
    scoreArmor,
    meetsReq
};
