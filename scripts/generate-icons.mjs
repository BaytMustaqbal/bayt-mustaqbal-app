// scripts/generate-icons.mjs
// Generator ikon PWA Bayt Mustaqbal — TANPA dependensi (hanya modul bawaan Node).
//
//   npm run icons
//
// Desain (flat, sesuai DESIGN-SYSTEM.md):
//   latar #0F766E (branddark — kontras 5,47:1 terhadap putih)
//   glyph  rumah putih, mengikuti ikon "home" pada UI
//   pintu  tembus ke warna latar
//
// Tiga varian:
//   icon-<n>.png      purpose "any"      → sudut membulat, glyph 60%
//   maskable-<n>.png  purpose "maskable" → penuh tanpa sudut, glyph 52% (aman di safe zone 80%)
//   apple-touch-icon  iOS membulatkan sendiri → penuh tanpa sudut, glyph 60%
//   favicon.ico       16/32/48 px (PNG di dalam ICO)

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const BG = { r: 0x0f, g: 0x76, b: 0x6e }; // #0F766E
const FG = { r: 255, g: 255, b: 255 }; // putih

/* ---------------- geometri (ruang 0..1) ---------------- */

const sign = (p1x, p1y, p2x, p2y, p3x, p3y) =>
  (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

// Rumah di dalam kotak glyph (koordinat 0..1):
//   atap  : segitiga (0.5,0) - (0,0.52) - (1,0.52)
//   badan : 0.14..0.86 x, 0.48..1 y
//   pintu : 0.42..0.58 x, 0.68..1 y  (bukan rumah → jadi warna latar)
function isHouse(gx, gy) {
  if (gx < 0 || gx > 1 || gy < 0 || gy > 1) return false;
  if (gx >= 0.42 && gx <= 0.58 && gy >= 0.68) return false; // pintu
  if (gy >= 0.48 && gx >= 0.14 && gx <= 0.86) return true; // badan
  return pointInTriangle(gx, gy, 0.5, 0, 0, 0.52, 1, 0.52); // atap
}

/* ---------------- rasterizer (supersampling → anti-alias) ---------------- */

function render(size, { glyph = 0.6, radius = 0.22, ss = 4 } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const n = ss * ss;
  const g0 = 0.5 - glyph / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cov = 0; // cakupan luar (sudut membulat)
      let ink = 0; // cakupan rumah

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = (x + (sx + 0.5) / ss) / size;
          const py = (y + (sy + 0.5) / ss) / size;

          if (radius > 0) {
            const cx = Math.min(Math.max(px, radius), 1 - radius);
            const cy = Math.min(Math.max(py, radius), 1 - radius);
            const dx = px - cx;
            const dy = py - cy;
            if (dx * dx + dy * dy > radius * radius) continue; // di luar sudut
          }
          cov++;
          if (isHouse((px - g0) / glyph, (py - g0) / glyph)) ink++;
        }
      }

      const a = cov / n;
      const h = ink / n;
      const i = (y * size + x) * 4;
      buf[i] = Math.round(BG.r * (1 - h) + FG.r * h);
      buf[i + 1] = Math.round(BG.g * (1 - h) + FG.g * h);
      buf[i + 2] = Math.round(BG.b * (1 - h) + FG.b * h);
      buf[i + 3] = Math.round(255 * a);
    }
  }
  return buf;
}

/* ---------------- encoder PNG ---------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // no interlace

  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------- encoder ICO ---------------- */

function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + 16 * entries.length;
  const dir = entries.map((e) => {
    const d = Buffer.alloc(16);
    d[0] = e.size >= 256 ? 0 : e.size;
    d[1] = e.size >= 256 ? 0 : e.size;
    d[2] = 0; // palet
    d[3] = 0; // reserved
    d.writeUInt16LE(1, 4); // planes
    d.writeUInt16LE(32, 6); // bit depth
    d.writeUInt32LE(e.png.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += e.png.length;
    return d;
  });

  return Buffer.concat([header, ...dir, ...entries.map((e) => e.png)]);
}

/* ---------------- tulis semua file ---------------- */

const anySizes = [72, 96, 128, 144, 152, 192, 384, 512];
const written = [];

for (const s of anySizes) {
  const png = encodePng(s, render(s, { glyph: 0.6, radius: 0.22, ss: s <= 96 ? 8 : 4 }));
  writeFileSync(join(OUT, `icon-${s}.png`), png);
  written.push({ name: `icon-${s}.png`, bytes: png.length });
}

for (const s of [192, 512]) {
  const png = encodePng(s, render(s, { glyph: 0.52, radius: 0, ss: 4 }));
  writeFileSync(join(OUT, `maskable-${s}.png`), png);
  written.push({ name: `maskable-${s}.png`, bytes: png.length });
}

const apple = encodePng(180, render(180, { glyph: 0.6, radius: 0, ss: 6 }));
writeFileSync(join(OUT, 'apple-touch-icon.png'), apple);
written.push({ name: 'apple-touch-icon.png', bytes: apple.length });

const icoSizes = [16, 32, 48];
const ico = encodeIco(
  icoSizes.map((s) => ({
    size: s,
    png: encodePng(s, render(s, { glyph: 0.68, radius: 0.2, ss: 12 })),
  }))
);
writeFileSync(join(OUT, 'favicon.ico'), ico);
written.push({ name: 'favicon.ico', bytes: ico.length });

console.log(`Ikon dibuat di ${OUT}`);
for (const f of written) console.log(`  ${f.name.padEnd(24)} ${(f.bytes / 1024).toFixed(1)} kB`);
