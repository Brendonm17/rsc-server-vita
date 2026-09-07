// maps a bot-module name to a static require so browserify can bundle it
// every mod() in the bot code delegates here; requires are thunks (run on first use)

const THUNKS = {
    agility: () => require('./agility'),
    'boss-kill': () => require('./boss-kill'),
    chatgen: () => require('./chatgen'),
    cleanup: () => require('./cleanup'),
    'combat-potions': () => require('./combat-potions'),
    'combat-prayers': () => require('./combat-prayers'),
    contention: () => require('./contention'),
    conversation: () => require('./conversation'),
    coop: () => require('./coop'),
    crowd: () => require('./crowd'),
    dreams: () => require('./dreams'),
    duels: () => require('./duels'),
    events: () => require('./events'),
    hub: () => require('./hub'),
    evolve: () => require('./evolve'),
    factions: () => require('./factions'),
    familiarity: () => require('./familiarity'),
    finds: () => require('./finds'),
    fortunes: () => require('./fortunes'),
    goals: () => require('./goals'),
    gear: () => require('./gear'),
    gossip: () => require('./gossip'),
    guilds: () => require('./guilds'),
    hearing: () => require('./hearing'),
    intent: () => require('./intent'),
    learning: () => require('./learning'),
    legends: () => require('./legends'),
    lore: () => require('./lore'),
    market: () => require('./market'),
    maturity: () => require('./maturity'),
    memory: () => require('./memory'),
    mentoring: () => require('./mentoring'),
    milestone: () => require('./milestone'),
    mood: () => require('./mood'),
    panic: () => require('./panic'),
    'party-consensus': () => require('./party-consensus'),
    'party-coord': () => require('./party-coord'),
    presence: () => require('./presence'),
    processing: () => require('./processing'),
    prosperity: () => require('./prosperity'),
    reflect: () => require('./reflect'),
    'region-react': () => require('./region-react'),
    reputation: () => require('./reputation'),
    rivalry: () => require('./rivalry'),
    role: () => require('./role'),
    scavenge: () => require('./scavenge'),
    'spawn-run': () => require('./spawn-run'),
    'social-emergent': () => require('./social-emergent'),
    thieving: () => require('./thieving'),
    threat: () => require('./threat'),
    titles: () => require('./titles'),
    voice: () => require('./voice')
};

// resolve a module by name, throws for an unknown name
function get(name) {
    const thunk = THUNKS[name];
    if (!thunk) {
        throw new Error("poller-registry: unknown module '" + name + "'");
    }
    return thunk();
}

// best-effort resolve: null for an unknown or un-loadable name
function tryGet(name) {
    const thunk = THUNKS[name];
    if (!thunk) {
        return null;
    }
    try {
        return thunk();
    } catch (e) {
        return null;
    }
}

module.exports = { get, tryGet, THUNKS };
