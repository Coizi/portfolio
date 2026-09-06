/**
 * Generates the WebP derivatives the pages actually reference.
 *
 * Every source PNG here was many times larger than its largest display size —
 * Ford-Logo.png was 3840x2160 rendered into a 28x28 box. Widths below are 2x
 * the CSS size the image is laid out at, so they stay crisp on retina.
 *
 * Run from tools/: node images.mjs   (sources stay put; they are not deployed)
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");

const JOBS = [
  // src,               out,                    width, quality, why
  ["Chip3D.png",      "Chip3D.webp",             1600, 82, "systolic-mac hero, ~800px CSS"],
  ["Chip3D.png",      "Chip3D-card.webp",         400, 82, "index card, 200px CSS"],
  ["autoreflex.png",  "autoreflex.webp",         1100, 82, "aim-assist full width"],
  ["autoreflex.png",  "autoreflex-card.webp",     400, 82, "index card, 200px CSS"],
  ["riscv-logo.png",  "riscv-logo.webp",          400, 82, "index card, 200px CSS"],
  ["Ford-Logo.png",   "Ford-Logo.webp",            96, 90, "exp logo, 28px CSS"],
  ["bwxt-logo.png",   "bwxt-logo.webp",            96, 90, "exp logo, 28px CSS"],
  ["aademo1.png",     "aademo1.webp",             800, 82, "aim-assist, native width"],
  ["aademo2.png",     "aademo2.webp",            1200, 82, "aim-assist, 24MP source"],
];

let before = 0, after = 0;
const dims = {};

for (const [src, out, width, quality, why] of JOBS) {
  const srcPath = path.join(ROOT, src);
  const outPath = path.join(ROOT, out);
  const meta = await sharp(srcPath).metadata();
  const w = Math.min(width, meta.width);

  const buf = await sharp(srcPath)
    .resize({ width: w, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toBuffer();
  writeFileSync(outPath, buf);

  const outMeta = await sharp(buf).metadata();
  dims[out] = [outMeta.width, outMeta.height];

  const srcKb = readFileSync(srcPath).length / 1024;
  console.log(
    `${out.padEnd(22)} ${String(outMeta.width).padStart(4)}x${String(outMeta.height).padEnd(4)} ` +
    `${(buf.length / 1024).toFixed(1).padStart(7)} KB   (from ${meta.width}x${meta.height}, ${srcKb.toFixed(0)} KB)  ${why}`,
  );
  after += buf.length;
}

// Total of the sources that the pages used to ship.
for (const src of new Set(JOBS.map((j) => j[0]))) {
  before += readFileSync(path.join(ROOT, src)).length;
}
console.log(`\nshipped bytes: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB  ` +
  `(${(100 - (after / before) * 100).toFixed(1)}% smaller)`);
writeFileSync(path.join(import.meta.dirname, "image-dims.json"), JSON.stringify(dims, null, 2));
