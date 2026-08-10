// scripts/gen-test-images.mjs — genera 2 PNG di test (stessa scena, pesi
// diversi) per verificare l'upload immagini: img-2mb.png (~2MB) e
// img-5mb.png (~5.5MB, sopra il vecchio limite 5MiB ma sotto il nuovo 12MB).
// Nessuna dipendenza: PNG encoded a mano con zlib (node builtin).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'test-images');

// ── CRC32 (checksum chunk PNG) ─────────────────────────────────────────────
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// ── Pixel "foto-test": gradiente colorato + rumore moderato deterministico ─
// La stessa funzione normalizzata → le due immagini mostrano la stessa scena.
function pixelFn(x, y, w, h) {
  const u = x / w,
    v = y / h;
  const r = 120 + 80 * Math.sin(u * 6.28 + v * 3.14);
  const g = 90 + 70 * Math.cos(v * 5.2);
  const b = 170 + 70 * Math.sin(u * 4.4 + v * 2.6);
  // hash per-pixel deterministico (rumore LIEVE = dettaglio tipo foto reale;
  // amp alta → immagine quasi incomprimibile, irrealistica)
  let s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  const n = (s - Math.floor(s)) * 2 - 1;
  const amp = 10;
  return [
    Math.min(255, Math.max(0, Math.round(r + n * amp))),
    Math.min(255, Math.max(0, Math.round(g + n * amp))),
    Math.min(255, Math.max(0, Math.round(b + n * amp))),
    255,
  ];
}

function makePng(w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const px = pixelFn(x, y, w, h);
      raw[o++] = px[0];
      raw[o++] = px[1];
      raw[o++] = px[2];
      raw[o++] = px[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Auto-tuning: trova w×h (4:3) che dà ≈ targetBytes ─────────────────────
function gen(targetBytes, outFile) {
  let w = Math.round(Math.sqrt(targetBytes / 3)); // raw ≈ 3w² (ratio 4:3)
  let best = null;
  for (let i = 0; i < 10; i++) {
    const png = makePng(w, Math.round((w * 3) / 4));
    const size = png.length;
    const err = size / targetBytes;
    if (Math.abs(err - 1) < 0.03) {
      best = png;
      break;
    }
    w = Math.max(32, Math.round(w * Math.sqrt(1 / err)));
  }
  if (!best) best = makePng(w, Math.round((w * 3) / 4));
  writeFileSync(outFile, best);
  const real = statSync(outFile).size;
  console.log(
    `${outFile} → ${Math.round((real / 1024 / 1024) * 100) / 100} MB (target ${Math.round((targetBytes / 1024 / 1024) * 100) / 100} MB)`
  );
}

mkdirSync(OUT_DIR, { recursive: true });
gen(2 * 1024 * 1024, join(OUT_DIR, 'img-2mb.png'));
gen(5.6 * 1024 * 1024, join(OUT_DIR, 'img-5mb.png'));
