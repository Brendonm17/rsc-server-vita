// pure-js sleep-word captcha for when there's no canvas
// draws glyphs into a 1-bit bitmap and emits the rsc-captcha wire format
'use strict';

const Captcha = require('@2003scape/rsc-captcha');
const glyphData = require('./captcha-glyphs.json');

const CAPTCHA_WIDTH = 255;
const CHAR_HEIGHT = 40;

function hasCanvas() {
    if (typeof OffscreenCanvas !== 'undefined') {
        return true;
    }

    try {
        return typeof require('canvas').createCanvas === 'function';
    } catch (e) {
        return false;
    }
}

const HEX = {};
for (let i = 0; i < 16; i++) {
    HEX['0123456789abcdef'[i]] = i;
}

// decode a glyph's packed hex rows into a 0/1-per-pixel array, cached per glyph
function glyphBits(glyph) {
    if (glyph.bits) {
        return glyph.bits;
    }

    const rowBytes = Math.ceil(glyph.w / 8);
    const bits = new Uint8Array(glyph.w * glyph.h);

    for (let y = 0; y < glyph.h; y++) {
        for (let x = 0; x < glyph.w; x++) {
            const byteIndex = y * rowBytes + (x >> 3);
            const value = (HEX[glyph.d[byteIndex * 2]] << 4) | HEX[glyph.d[byteIndex * 2 + 1]];

            if (value & (0x80 >> (x & 7))) {
                bits[y * glyph.w + x] = 1;
            }
        }
    }

    glyph.bits = bits;
    return bits;
}

function install() {
    Captcha.prototype.loadFonts = async function loadFontsNoCanvas() {
        // glyphs come pre-extracted, nothing to rasterise
    };

    Captcha.prototype.getCharImage = function getCharImageNoCanvas(character) {
        const variants = glyphData.glyphs[character.toLowerCase()];

        if (!variants || !variants.length) {
            return;
        }

        return variants[Math.floor(Math.random() * variants.length)];
    };

    Captcha.prototype.generateImage = function generateImageNoCanvas(word) {
        const width = CAPTCHA_WIDTH;
        const height = CHAR_HEIGHT;
        const bits = new Uint8Array(width * height);

        let x = 0;
        let y = 0;

        for (const character of word) {
            const glyph = this.getCharImage(character);

            if (!glyph) {
                break;
            }

            x += Math.floor(Math.random() * 12);
            y = height / 2 - Math.floor(glyph.h / 2) - 6;
            y += Math.floor(Math.random() * 12);

            // copy the glyph rect, clipped to the bitmap
            const src = glyphBits(glyph);

            for (let gy = 0; gy < glyph.h; gy++) {
                const dy = y + gy;

                if (dy < 0 || dy >= height) {
                    continue;
                }

                for (let gx = 0; gx < glyph.w; gx++) {
                    const dx = x + gx;

                    if (dx < 0 || dx >= width) {
                        continue;
                    }

                    bits[dy * width + dx] = src[gy * glyph.w + gx];
                }
            }

            x += glyph.w;
        }

        return { width, height, bits };
    };

    const originalToByteArray = Captcha.toByteArray;

    // rle-encode the 1-bit bitmap into rsc-captcha's wire format
    Captcha.toByteArray = function toByteArrayNoCanvas(canvas) {
        if (!canvas || !canvas.bits) {
            return originalToByteArray.call(Captcha, canvas);
        }

        const { width, height, bits } = canvas;
        const encoded = [];

        let colour = 0;
        let length = 0;

        for (let x = 0; x < width; x++) {
            if (bits[x] === colour) {
                length += 1;
            } else {
                encoded.push(length);
                length = 1;
                colour = 1 - colour;
            }
        }

        encoded.push(length);

        for (let y = 1; y < height; y += 1) {
            length = 0;

            for (let x = 0; x < width; x += 1) {
                if (bits[y * width + x] === bits[(y - 1) * width + x]) {
                    length += 1;
                } else {
                    encoded.push(length);
                    length = 0;
                }
            }

            // skip the trailing run when the last pixel differs from the one above
            if (bits[y * width + width - 1] === bits[(y - 1) * width + width - 1]) {
                encoded.push(length);
            }
        }

        return new Uint8Array(encoded);
    };

    // stash the last bitmap for tests
    const originalGenerate = Captcha.prototype.generate;

    Captcha.prototype.generate = function generateNoCanvas() {
        const result = originalGenerate.call(this);
        Captcha.lastBits = result.image.bits;
        return result;
    };
}

if (!hasCanvas()) {
    install();
}

module.exports = { install, hasCanvas };
