// backs onto vitaStorage when present, else an in-memory map

const mem = new Map();

function host() {
    return (typeof globalThis !== 'undefined' && globalThis.__vitaStorage) || null;
}

async function get(key) {
    const h = host();
    if (h) {
        return h.get(key);
    }
    return mem.has(key) ? mem.get(key) : undefined;
}

async function set(key, value) {
    const h = host();
    if (h) {
        h.set(key, value);
        return;
    }
    mem.set(key, value);
}

async function del(key) {
    const h = host();
    if (h) {
        h.del(key);
        return;
    }
    mem.delete(key);
}

async function keys() {
    const h = host();
    if (h) {
        return h.keys();
    }
    return Array.from(mem.keys());
}

async function clear() {
    const h = host();
    if (h) {
        h.clear();
        return;
    }
    mem.clear();
}

module.exports = { get, set, del, keys, clear };
