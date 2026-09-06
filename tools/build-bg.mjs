/** Bundles src/bg.js (+ vgpu) into the committed, dependency-free ../assets/bg.js. */
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const ROOT = path.resolve(import.meta.dirname, "..");
const outfile = path.join(ROOT, "assets", "bg.js");

await build({
  entryPoints: [path.join(import.meta.dirname, "src", "bg.js")],
  outfile,
  bundle: true,
  format: "esm",
  target: ["es2022"],
  minify: true,
  legalComments: "none",
});

const raw = readFileSync(outfile);
console.log(
  `assets/bg.js  ${(raw.length / 1024).toFixed(1)} KB raw  ${(gzipSync(raw).length / 1024).toFixed(1)} KB gzip`,
);
