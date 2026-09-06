/** Rasterises the same chip glyph as favicon.svg into favicon.png (180x180). */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { encodePng } from "./png.mjs";

const N = 180;
const SS = 4; // supersampling factor for antialiasing
const PURPLE = [0x6c, 0x4f, 0xd4];
const DIE = [0xfa, 0xfa, 0xf8];

const rects = [
  // pins
  [52, 2, 11, 20, 3.5], [84.5, 2, 11, 20, 3.5], [117, 2, 11, 20, 3.5],
  [52, 158, 11, 20, 3.5], [84.5, 158, 11, 20, 3.5], [117, 158, 11, 20, 3.5],
  [2, 52, 20, 11, 3.5], [2, 84.5, 20, 11, 3.5], [2, 117, 20, 11, 3.5],
  [158, 52, 20, 11, 3.5], [158, 84.5, 20, 11, 3.5], [158, 117, 20, 11, 3.5],
  // package
  [18, 18, 144, 144, 30],
];
const die = [57, 57, 66, 66, 13];

/** Point-in-rounded-rect test. */
function inside(px, py, [x, y, w, h, r]) {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r || (px >= x + r && px <= x + w - r) || (py >= y + r && py <= y + h - r);
}

const out = new Uint8Array(N * N * 4);
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS;
        const py = y + (sy + 0.5) / SS;
        let col = null;
        if (inside(px, py, die)) col = DIE;
        else if (rects.some((r) => inside(px, py, r))) col = PURPLE;
        if (col) { rSum += col[0]; gSum += col[1]; bSum += col[2]; aSum += 255; }
      }
    }
    const n = SS * SS, i = (y * N + x) * 4;
    if (aSum > 0) {
      const hits = aSum / 255;
      out[i] = rSum / hits; out[i + 1] = gSum / hits; out[i + 2] = bSum / hits;
      out[i + 3] = Math.round(aSum / n);
    }
  }
}

const dest = path.join(path.resolve(import.meta.dirname, ".."), "favicon.png");
const png = encodePng(out, N, N);
writeFileSync(dest, png);
console.log(`favicon.png ${N}x${N}  ${(png.length / 1024).toFixed(1)} KB`);
