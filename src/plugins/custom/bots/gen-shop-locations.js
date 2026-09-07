// generates shop-locations.json: each shop's map tile from its shopkeeper npc spawn
// run: node src/plugins/custom/bots/gen-shop-locations.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const npcDefs = require('@2003scape/rsc-data/config/npcs.json');
const npcSpawns = require('@2003scape/rsc-data/locations/npcs.json');
const shops = require('@2003scape/rsc-data/shops.json');

// npc id -> its spawn tiles
const spawnsById = new Map();
for (const s of npcSpawns) {
    if (s.id == null) { continue; }
    let a = spawnsById.get(s.id); if (!a) { a = []; spawnsById.set(s.id, a); }
    a.push({ x: s.x, y: s.y });
}
const validNpc = (id) => id >= 0 && id < Object.keys(npcDefs).length && spawnsById.has(id);

// walk every npc plugin file
function walk(dir, out) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { walk(p, out); }
        else if (e.name.endsWith('.js')) { out.push(p); }
    }
    return out;
}
// every plugin can open a shop
const files = walk(path.join(ROOT, 'src', 'plugins'), []).filter((f) => !/[\\/]custom[\\/]bots[\\/]/.test(f));
files.push(path.join(ROOT, 'src', 'sp', 'entry.js'));
const NPC_PLUGIN_DIR = path.join(ROOT, 'src', 'plugins', 'npcs');

const SHOP_KEYS = new Set(Object.keys(shops));
// shops the single-player entry file injects at runtime (rscShops['key'] = {...})
{
    const entry = fs.readFileSync(path.join(ROOT, 'src', 'sp', 'entry.js'), 'utf8');
    for (const m of entry.matchAll(/rscShops\['([a-z0-9-]+)'\] = \{/g)) { SHOP_KEYS.add(m[1]); shops[m[1]] = shops[m[1]] || { injected: true }; }
}

// from one file: each openShop call's shop key and the npc id(s) guarding that call
const WINDOW = 20000; // guard search window in chars
function parseFile(full) {
    const keyConst = new Map(); // NAME -> shop key
    for (const m of full.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"]([a-z0-9-]+)['"]/g)) {
        if (SHOP_KEYS.has(m[2])) { keyConst.set(m[1], m[2]); }
    }
    const declInts = (name) => {
        const out = [];
        let m = new RegExp('\\b' + name + '\\s*=\\s*(\\d+)').exec(full);
        if (m) { out.push(parseInt(m[1], 10)); return out; }
        m = new RegExp('\\b' + name + '\\s*=\\s*(?:new Set\\(\\s*)?\\[([^\\]]*)\\]').exec(full);
        if (m) {
            for (const rawTok of m[1].split(',')) {
                const t = rawTok.trim();
                const n = parseInt(t, 10);
                if (Number.isFinite(n)) { out.push(n); continue; }
                if (/^[A-Za-z_$][\w$]*$/.test(t)) { const d = new RegExp('\\b' + t + '\\s*=\\s*(\\d+)').exec(full); if (d) { out.push(parseInt(d[1], 10)); } }
            }
        }
        return out;
    };
    const out = [];
    // match openShop(KEY) or helper(player, npc, KEY)
    const CALL = /(?:openShop\s*\(\s*|\b[A-Za-z_$][\w$]*\s*\(\s*player\s*,\s*npc\s*,\s*)(?:['"]([a-z0-9-]+)['"]|([A-Za-z_$][\w$]*))\s*\)/g;
    for (const call of full.matchAll(CALL)) {
        const key = call[1] || keyConst.get(call[2]);
        if (!key || !SHOP_KEYS.has(key)) { continue; }
        const lo = Math.max(0, call.index - WINDOW);
        const src = full.slice(lo, Math.min(full.length, call.index + WINDOW));
        const at = call.index - lo;
        // each guard with its distance, nearest names the keeper
        const guards = [];
        const push = (pos, list) => { const ids = list.filter((n) => Number.isFinite(n) && validNpc(n)); if (ids.length) { guards.push({ d: Math.abs(pos - at), ids }); } };
        for (const m of src.matchAll(/npc\.id\s*[!=]==?\s*([A-Za-z_$][\w$]*|\d+)/g)) {
            const t = m[1]; push(m.index, /^\d+$/.test(t) ? [parseInt(t, 10)] : declInts(t));
        }
        for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\.(?:has|includes)\(\s*npc\.id/g)) { push(m.index, declInts(m[1])); }
        for (const m of src.matchAll(/\[([^\]]*)\]\.includes\(\s*npc\.id/g)) {
            const list = []; for (const t of m[1].split(',')) { const n = parseInt(t, 10); if (Number.isFinite(n)) { list.push(n); } else { list.push(...declInts(t.trim())); } }
            push(m.index, list);
        }
        const sw = /switch\s*\(\s*npc\.id\s*\)/.exec(src);
        if (sw) {
            const list = [];
            for (const m of src.matchAll(/\bcase\s+([A-Za-z_$][\w$]*|\d+)\s*:/g)) { const t = m[1]; if (/^\d+$/.test(t)) { list.push(parseInt(t, 10)); } else { list.push(...declInts(t)); } }
            push(sw.index, list);
        }
        guards.sort((a, b) => a.d - b.d);
        const ids = guards.length ? guards[0].ids : [];
        out.push({ key, ids: [...new Set(ids)] });
    }
    return out.length ? out : null;
}
// shop key -> candidate npc ids and the files that open it
const cand = new Map();
const openers = new Map();
for (const f of files) {
    const rs = parseFile(fs.readFileSync(f, 'utf8'));
    if (!rs) { continue; }
    const rel = path.relative(ROOT, f);
    for (const r of rs) {
        let o = openers.get(r.key); if (!o) { o = []; openers.set(r.key, o); }
        if (!o.includes(rel)) { o.push(rel); }
        let c = cand.get(r.key); if (!c) { c = new Set(); cand.set(r.key, c); }
        for (const id of r.ids) { c.add(id); }
        if (process.env.GEN_DEBUG) { console.error('[gen] ' + rel + ' opens ' + r.key + ' ids ' + r.ids.join(',')); }
    }
}
// shop tile: the real spawn nearest the centroid of candidate spawns
function locate(ids) {
    const pts = [];
    for (const id of ids) { for (const p of (spawnsById.get(id) || [])) { pts.push(p); } }
    if (!pts.length) { return null; }
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    cx /= pts.length; cy /= pts.length;
    let best = null, bd = Infinity;
    for (const p of pts) { const d = Math.abs(p.x - cx) + Math.abs(p.y - cy); if (d < bd) { bd = d; best = p; } }
    return { x: best.x, y: best.y };
}

const outLoc = {};
const report = [];
for (const key of Object.keys(shops)) {
    const ids = cand.get(key);
    const opened = openers.has(key);
    if (!ids || !ids.size) {
        // opened but npc unidentified -> openable/unlocated, opened nowhere -> not for bots
        outLoc[key] = opened ? { openable: true } : null;
        report.push([key, opened ? 'openable, npc not identified (buy in place)' : 'NO NPC OPENS IT (not for bots)', opened ? openers.get(key).join(' ') : '']);
        continue;
    }
    const loc = locate(ids);
    if (!loc) { outLoc[key] = { openable: true }; report.push([key, 'npc has no spawn (buy in place)', [...ids].join(',')]); continue; }
    outLoc[key] = { x: loc.x, y: loc.y, npc: [...ids][0] };
    report.push([key, loc.x + ',' + loc.y, [...ids].join(',')]);
}

const dest = path.join(__dirname, 'shop-locations.json');
fs.writeFileSync(dest, JSON.stringify(outLoc, null, 0) + '\n');

const located = Object.values(outLoc).filter((v) => v && v.x != null).length;
let txt = 'SHOP LOCATIONS (data-driven from shopkeeper npc spawns)\n\n';
for (const [k, v, ids] of report.sort()) { txt += '  ' + k.padEnd(34) + v.padEnd(28) + (ids ? 'npc ' + ids : '') + '\n'; }
txt += '\n' + located + '/' + Object.keys(shops).length + ' shops located; ' + (Object.keys(shops).length - located) + ' buy-in-place.\n';
fs.writeFileSync(1, txt);
