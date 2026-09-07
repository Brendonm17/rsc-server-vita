// per-skill preconditions a bot checks before training: quest gate, tool, min level.
// sp world is members:true, so members flags are not gates.

// skill -> quest whose stage must be -1 (complete) before the skill works
const SKILL_QUEST_GATE = { herblaw: 'druidicRitual' };

// skill -> tool ids that enable it (any-of)
const SKILL_TOOL = {
    woodcutting: [12, 87, 88, 203, 204, 405, 428], // any hatchet
    mining: [156, 1258, 1259, 1260, 1261, 1262],   // any pickaxe
    fishing: [376, 377, 378, 379, 375, 548, 589],  // any fishing tool
    firemaking: [166],                              // tinderbox
    smithing: [168],                               // hammer
    crafting: [167, 39],                           // chisel (gems) or needle (leather)
    fletching: [13]                                // knife
    // cooking/prayer/thieving/agility/magic/ranged/combat need no tool
};

// lowest level the skill's easiest action needs
const SKILL_MIN_LEVEL = { herblaw: 3 }; // clean guam needs 3; others start at 1

function skillLevel(bot, skill) {
    const s = bot.skills && bot.skills[skill];
    return s ? (s.current != null ? s.current : s.base) : 1;
}
function questDone(bot, key) { return !key || !!(bot.questStages && bot.questStages[key] === -1); }
function hasTool(bot, skill) {
    const t = SKILL_TOOL[skill];
    if (!t) { return true; }
    if (!bot.inventory || !bot.inventory.has) { return false; }
    return t.some((id) => bot.inventory.has(id));
}

// public gate; returns { ok, reason?, quest?, need? }
function canDoSkill(bot, skill) {
    const gate = SKILL_QUEST_GATE[skill];
    if (gate && !questDone(bot, gate)) { return { ok: false, reason: 'quest', quest: gate }; }
    if (SKILL_TOOL[skill] && !hasTool(bot, skill)) { return { ok: false, reason: 'tool', skill }; }
    const min = SKILL_MIN_LEVEL[skill] || 1;
    if (skillLevel(bot, skill) < min) { return { ok: false, reason: 'level', need: min }; }
    return { ok: true };
}

// can the bot ever do this skill, quest-wise? (a missing tool isn't permanent)
function skillUnlocked(bot, skill) { return questDone(bot, SKILL_QUEST_GATE[skill]); }

// the quest a skill is gated behind, or null
function questGateFor(skill) { return SKILL_QUEST_GATE[skill] || null; }

// is this skill blocked only by an unfinished prerequisite quest?
function questBlocked(bot, skill) { const g = SKILL_QUEST_GATE[skill]; return !!g && !questDone(bot, g); }

module.exports = { canDoSkill, skillUnlocked, questGateFor, questBlocked, SKILL_QUEST_GATE, SKILL_TOOL };
