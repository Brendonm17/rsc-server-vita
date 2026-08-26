// binary (de)serializer for the landscape cache: deterministic sector data serialized once at build time

const T_NULL = 0;
const T_UNDEF = 1;
const T_FALSE = 2;
const T_TRUE = 3;
const T_INT = 4; // int32
const T_FLOAT = 5; // float64
const T_STRING = 6; // utf8
const T_ARRAY = 7;
const T_OBJECT = 8; // plain object (own enumerable keys)
const T_TYPED = 9; // typed array

// tag byte per typed-array kind; append-only
const TYPED_CTORS = [
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array
];

// writer (node, build-time)

function serialize(value) {
    const chunks = [];
    let len = 0;
    const push = (buf) => {
        chunks.push(buf);
        len += buf.length;
    };
    const u8 = (v) => {
        const b = Buffer.allocUnsafe(1);
        b.writeUInt8(v & 0xff, 0);
        push(b);
    };
    const u32 = (v) => {
        const b = Buffer.allocUnsafe(4);
        b.writeUInt32LE(v >>> 0, 0);
        push(b);
    };
    const i32 = (v) => {
        const b = Buffer.allocUnsafe(4);
        b.writeInt32LE(v | 0, 0);
        push(b);
    };
    const f64 = (v) => {
        const b = Buffer.allocUnsafe(8);
        b.writeDoubleLE(v, 0);
        push(b);
    };
    const str = (s) => {
        const b = Buffer.from(s, 'utf8');
        u32(b.length);
        push(b);
    };

    const write = (v) => {
        if (v === null) return u8(T_NULL);
        if (v === undefined) return u8(T_UNDEF);
        if (v === true) return u8(T_TRUE);
        if (v === false) return u8(T_FALSE);

        const t = typeof v;

        if (t === 'number') {
            if (Number.isInteger(v) && v >= -2147483648 && v <= 2147483647) {
                u8(T_INT);
                return i32(v);
            }
            u8(T_FLOAT);
            return f64(v);
        }

        if (t === 'string') {
            u8(T_STRING);
            return str(v);
        }

        const ctorIndex = v.constructor ? TYPED_CTORS.indexOf(v.constructor) : -1;
        if (ctorIndex >= 0) {
            u8(T_TYPED);
            u8(ctorIndex);
            u32(v.length);
            push(Buffer.from(v.buffer, v.byteOffset, v.byteLength));
            return;
        }

        if (Array.isArray(v)) {
            u8(T_ARRAY);
            u32(v.length);
            for (let i = 0; i < v.length; i += 1) write(v[i]);
            return;
        }

        if (t === 'object') {
            u8(T_OBJECT);
            const keys = Object.keys(v);
            u32(keys.length);
            for (const k of keys) {
                str(k);
                write(v[k]);
            }
            return;
        }

        throw new Error('world-cache: cannot serialize value of type ' + t);
    };

    write(value);
    return Buffer.concat(chunks, len);
}

// reader (quickjs, runtime)

function deserialize(input) {
    // Accept a Uint8Array or Node Buffer; view it without copying.
    const bytes =
        input instanceof Uint8Array
            ? input
            : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let off = 0;

    const u8 = () => bytes[off++];
    const u32 = () => {
        const v = view.getUint32(off, true);
        off += 4;
        return v;
    };
    const i32 = () => {
        const v = view.getInt32(off, true);
        off += 4;
        return v;
    };
    const f64 = () => {
        const v = view.getFloat64(off, true);
        off += 8;
        return v;
    };
    const str = () => {
        const n = u32();
        let s = '';
        // utf8 decode (keys/strings here are ASCII, so byte === code point)
        for (let i = 0; i < n; i += 1) s += String.fromCharCode(bytes[off + i]);
        off += n;
        return s;
    };

    const read = () => {
        const tag = u8();

        switch (tag) {
            case T_NULL:
                return null;
            case T_UNDEF:
                return undefined;
            case T_TRUE:
                return true;
            case T_FALSE:
                return false;
            case T_INT:
                return i32();
            case T_FLOAT:
                return f64();
            case T_STRING:
                return str();
            case T_TYPED: {
                const ctorIndex = u8();
                const Ctor = TYPED_CTORS[ctorIndex];
                const length = u32();
                const byteLength = length * Ctor.BYTES_PER_ELEMENT;
                const out = new Ctor(length);
                // copy the raw bytes (native memcpy via Uint8Array.set)
                new Uint8Array(out.buffer).set(
                    bytes.subarray(off, off + byteLength)
                );
                off += byteLength;
                return out;
            }
            case T_ARRAY: {
                const n = u32();
                const arr = new Array(n);
                for (let i = 0; i < n; i += 1) arr[i] = read();
                return arr;
            }
            case T_OBJECT: {
                const n = u32();
                const obj = {};
                for (let i = 0; i < n; i += 1) {
                    const key = str();
                    obj[key] = read();
                }
                return obj;
            }
            default:
                throw new Error('world-cache: bad tag ' + tag + ' at ' + off);
        }
    };

    return read();
}

module.exports = { serialize, deserialize };
