/**
 * Renders one Open Graph image per page with vgpu's headless Dawn backend.
 *
 * Run locally (`npm run build:og` in tools/), then commit the PNGs under og/.
 * Vercel never runs this — the deployed site stays zero-config static.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { effect, frame, init, target } from "vgpu/node";
import { encodePng } from "./png.mjs";
import { BACKGROUND_WGSL, PAGE_PRESETS, presetParams } from "./shader.mjs";

const WIDTH = 1200;
const HEIGHT = 630;
const ROOT = path.resolve(import.meta.dirname, "..");

const gpu = await init();
console.log(`adapter: ${gpu.adapter.name}`);

try {
  const colorTarget = target(gpu, { size: [WIDTH, HEIGHT], format: "rgba8unorm" });
  const background = effect(gpu, BACKGROUND_WGSL, { label: "og-background" });

  for (const preset of PAGE_PRESETS) {
    background.set({ p: presetParams(preset, { aspect: WIDTH / HEIGHT }) });
    frame(gpu, (f) => f.pass(colorTarget, background));

    const pixels = await colorTarget.read();
    const out = path.join(ROOT, preset.og);
    const png = encodePng(pixels, WIDTH, HEIGHT);
    writeFileSync(out, png);
    console.log(`${preset.og.padEnd(28)} ${(png.length / 1024).toFixed(1)} KB  <- ${preset.page}`);
  }
} finally {
  gpu.dispose();
}
