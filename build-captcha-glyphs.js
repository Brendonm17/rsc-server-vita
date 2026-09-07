// extract sleep-word glyph bitmaps from @2003scape/rsc-captcha's fonts.png into
// src/sp/captcha-glyphs.json, so the single-player bundle draws sleep captchas
// without a canvas. pure js png decode, node zlib only. mirrors rsc-captcha
// loadFonts/getCharBounds: a 48x40 cell per (letter row, variant column), a
// pixel is ink when its red channel is non-zero, crop width/height are max-min.
// re-run with: node build-captcha-glyphs.js
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PNG_PATH = require.resolve('@2003scape/rsc-captcha/fonts.png');
const OUT_PATH = path.join(__dirname, 'src', 'sp', 'captcha-glyphs.json');
const CHAR_WIDTH = 48;
const CHAR_HEIGHT = 40;

function decodePng(buf) {
    if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
    let off = 8;
    let width = 0, height = 0, bitDepth = 0, colourType = 0, interlace = 0;
    const idat = [];
    while (off < buf.length) {
        const len = buf.readUInt32BE(off);
        const type = buf.toString('ascii', off + 4, off + 8);
        const data = buf.subarray(off + 8, off + 8 + len);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8];
            colourType = data[9];
            interlace = data[12];
        } else if (type === 'IDAT') {
            idat.push(data);
        } else if (type === 'IEND') {
            break;
        }
        off += 12 + len;
    }
    if (bitDepth !== 8 || interlace !== 0) {
        throw new Error(`unsupported PNG (bit depth ${bitDepth}, interlace ${interlace})`);
    }
    const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colourType];
    if (!channels) throw new Error('unsupported colour type ' + colourType);
    const bpp = channels;
    const stride = width * bpp;
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const out = Buffer.alloc(stride * height);
    let prev = Buffer.alloc(stride);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)];
        const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        const cur = out.subarray(y * stride, (y + 1) * stride);
        for (let i = 0; i < stride; i++) {
            const a = i >= bpp ? cur[i - bpp] : 0;
            const b = prev[i];
            const c = i >= bpp ? prev[i - bpp] : 0;
            let v = line[i];
            switch (filter) {
                case 0: break;
                case 1: v += a; break;
                case 2: v += b; break;
                case 3: v += (a + b) >> 1; break;
                case 4: {
                    const p = a + b - c;
                    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                    v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
                    break;
                }
                default: throw new Error('bad filter ' + filter);
            }
            cur[i] = v & 0xff;
        }
        prev = cur;
    }
    return { width, height, channels, data: out };
}

function red(img, x, y) {
    return img.data[(y * img.width + x) * img.channels];
}

// glyph bounding box from ink pixels
function getCharBounds(img, x, y) {
    let minX = 0, maxX = 0, minY = 0, maxY = 0, empty = true;
    for (let i = y; i < y + CHAR_HEIGHT; i += 1) {
        for (let j = x; j < x + CHAR_WIDTH; j += 1) {
            if (red(img, j, i) !== 0) {
                empty = false;
                if (maxX === 0 || j < minX) minX = j;
                if (j > maxX) maxX = j;
                if (maxY === 0) minY = i;
                if (i > maxY) maxY = i;
            }
        }
    }
    if (empty) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

const img = decodePng(fs.readFileSync(PNG_PATH));
const maxChars = Math.floor(img.width / CHAR_WIDTH);
const glyphs = {};
let total = 0, greys = 0;

for (let i = 0; i < 26; i += 1) {
    const letter = String.fromCharCode(97 + i);
    glyphs[letter] = [];
    for (let j = 0; j < maxChars; j += 1) {
        const b = getCharBounds(img, j * CHAR_WIDTH, i * CHAR_HEIGHT);
        if (!b || b.width <= 0 || b.height <= 0) continue;
        const rowBytes = Math.ceil(b.width / 8);
        const packed = Buffer.alloc(rowBytes * b.height);
        for (let yy = 0; yy < b.height; yy++) {
            for (let xx = 0; xx < b.width; xx++) {
                const r = red(img, b.x + xx, b.y + yy);
                if (r !== 0 && r !== 255) greys++;
                if (r !== 0) packed[yy * rowBytes + (xx >> 3)] |= 0x80 >> (xx & 7);
            }
        }
        glyphs[letter].push({ w: b.width, h: b.height, d: packed.toString('hex') });
        total++;
    }
}

const out = { cellWidth: CHAR_WIDTH, cellHeight: CHAR_HEIGHT, glyphs };
fs.writeFileSync(OUT_PATH, JSON.stringify(out));
console.log(`fonts.png ${img.width}x${img.height}: ${total} glyphs, ${greys} non-binary ink pixels thresholded`);
console.log(`wrote ${OUT_PATH} (${fs.statSync(OUT_PATH).size} bytes)`);
