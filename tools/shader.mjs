/**
 * Shared background shader.
 *
 * The same WGSL renders the live canvas on the site (browser, via tools/src/bg.js)
 * and the per-page Open Graph images (headless Node, via tools/og-render.mjs), so
 * link previews always match what a visitor actually lands on.
 *
 * Colors are written in sRGB space: every target here is a non-srgb *8unorm format,
 * so the values below map straight through and match the CSS hexes in index.html.
 */

export const BACKGROUND_WGSL = /* wgsl */ `
struct Params {
  time: f32,
  aspect: f32,
  intensity: f32,
  grain: f32,
  base: vec4f,
  colA: vec4f,
  colB: vec4f,
  colC: vec4f,
  // x: seed, y: speed, z: blob scale, w: vignette strength
  motion: vec4f,
  // x: strength, y: cells across, z: line width, w: unused
  grid: vec4f,
}

@group(0) @binding(0) var<uniform> p: Params;

fn blobWeight(q: vec2f, c: vec2f, r: f32) -> f32 {
  let d = distance(q, c) / max(r, 1e-4);
  return exp(-d * d * 2.0);
}

// Distance to the nearest gridline, in cell units.
fn latticeMask(q: vec2f, cells: f32, width: f32) -> f32 {
  let g = abs(fract(q * cells - 0.5) - 0.5);
  return 1.0 - smoothstep(0.0, width, min(g.x, g.y));
}

fn hash21(v: vec2f) -> f32 {
  var q = fract(v * vec2f(123.34, 456.21));
  q = q + vec2f(dot(q, q + 45.32));
  return fract(q.x * q.y);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let seed  = p.motion.x;
  let speed = p.motion.y;
  let scale = p.motion.z;
  let vig   = p.motion.w;

  // Aspect-corrected so the blobs stay round on any viewport.
  let q = vec2f(uv.x * p.aspect, uv.y);
  let t = p.time * speed + seed;

  // Three slow-drifting centers, seeded off the three CSS orbs they replace.
  let c1 = vec2f((0.08 + 0.10 * sin(t * 0.53 + seed)) * p.aspect,        0.02 + 0.10 * cos(t * 0.41));
  let c2 = vec2f((0.95 + 0.08 * cos(t * 0.37 + seed * 1.7)) * p.aspect,  0.45 + 0.12 * sin(t * 0.47));
  let c3 = vec2f((0.40 + 0.13 * sin(t * 0.29 + seed * 2.3)) * p.aspect,  1.02 + 0.09 * cos(t * 0.61));

  let r = scale * max(p.aspect, 1.0);
  let w1 = blobWeight(q, c1, 0.52 * r);
  let w2 = blobWeight(q, c2, 0.40 * r);
  let w3 = blobWeight(q, c3, 0.36 * r);

  var col = p.base.rgb;
  col = mix(col, p.colA.rgb, clamp(w1 * p.intensity, 0.0, 1.0));
  col = mix(col, p.colB.rgb, clamp(w2 * p.intensity, 0.0, 1.0));
  col = mix(col, p.colC.rgb, clamp(w3 * p.intensity, 0.0, 1.0));

  // Technical lattice, brightest where the blobs are so it reads as lit
  // structure rather than a flat overlay. Strength 0 disables it entirely.
  if (p.grid.x > 0.0) {
    let lit = clamp((w1 + w2 + w3) * 1.2, 0.0, 1.0);
    let mask = latticeMask(q, p.grid.y, p.grid.z) * p.grid.x * (0.25 + 0.75 * lit);
    col = mix(col, col + vec3f(0.16, 0.13, 0.24), mask);
  }

  if (vig > 0.0) {
    col = col * (1.0 - vig * smoothstep(0.35, 0.95, distance(uv, vec2f(0.5))));
  }

  // Ordered-ish dither. Large soft gradients band badly at 8 bits; a sub-LSB
  // grain is the whole reason this beats three stacked blur(90px) divs.
  let g = (hash21(uv * 2048.0 + vec2f(seed)) - 0.5) * p.grain;
  col = col + vec3f(g);

  return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

/** #rrggbb -> [r, g, b, 1] in 0..1 */
export function rgba(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
    1,
  ];
}

const BASE = "#fafaf8";

/** Live site background — the exact palette of the .orb divs it replaces. */
export const SITE_PALETTE = {
  base: rgba(BASE),
  colA: rgba("#c4b5f4"),
  colB: rgba("#9b82e8"),
  colC: rgba("#ddd6fe"),
  intensity: 0.52,
  grain: 0.012,
  // scale 0.68: tighter than the OG presets, so the three blobs stay as
  // readable as the .orb divs they replace instead of blurring into one wash.
  motion: [0.0, 0.06, 0.68, 0.0],
  grid: [0.0, 0.0, 0.0, 0.0],
};

/** Dark project pages (systolic-mac.html) — matches its #0a0a11 orb palette. */
export const SITE_PALETTE_DARK = {
  base: rgba("#0a0a11"),
  colA: rgba("#6c4fd4"),
  colB: rgba("#9b82e8"),
  colC: rgba("#4b30a8"),
  intensity: 0.38,
  grain: 0.010,
  motion: [7.0, 0.06, 0.68, 0.0],
  grid: [0.0, 0.0, 0.0, 0.0],
};

/**
 * One entry per page. The OG tuning is deliberately darker and higher-contrast
 * than the live background: a link preview is judged as a thumbnail, where the
 * site's pale wash reads as an empty smudge. Seeds, accents and lattice density
 * differ enough that the five are distinguishable side by side.
 */
const OG_BASE = "#14111f";

export const PAGE_PRESETS = [
  {
    page: "index.html",
    og: "og/og-home.png",
    palette: { colA: "#c4b5f4", colB: "#9b82e8", colC: "#6c4fd4", seed: 0.0,  scale: 1.00, cells: 22 },
  },
  {
    page: "systolic-mac.html",
    og: "og/og-systolic-mac.png",
    palette: { colA: "#9b82e8", colB: "#6c4fd4", colC: "#c4b5f4", seed: 11.3, scale: 0.88, cells: 32 },
  },
  {
    page: "aim-assist.html",
    og: "og/og-aim-assist.png",
    palette: { colA: "#b9a7f0", colB: "#8f7ae6", colC: "#e0d8ff", seed: 23.7, scale: 1.12, cells: 16 },
  },
  {
    page: "nn-accelerator.html",
    og: "og/og-nn-accelerator.png",
    palette: { colA: "#a58ef0", colB: "#7b5fdd", colC: "#d6ccfb", seed: 37.1, scale: 0.95, cells: 26 },
  },
  {
    page: "riscv.html",
    og: "og/og-riscv.png",
    palette: { colA: "#c9bcf6", colB: "#8a6fe0", colC: "#e4dcfb", seed: 52.9, scale: 1.05, cells: 19 },
  },
];

/** Builds the uniform bag for a page preset at a fixed time. */
export function presetParams(preset, { aspect, time = 6.0 }) {
  const { colA, colB, colC, seed, scale, cells } = preset.palette;
  return {
    time,
    aspect,
    intensity: 0.85,
    // Off: on a dark field with no text, dither buys nothing a platform's own
    // re-encode won't undo — and noise does not compress, so it doubled the PNG
    // (~270 KB -> ~540 KB). The live background keeps its grain, where the
    // gradients are pale, full-screen, and actually band.
    grain: 0.0,
    base: rgba(OG_BASE),
    colA: rgba(colA),
    colB: rgba(colB),
    colC: rgba(colC),
    motion: [seed, 0.06, scale, 0.35],
    grid: [0.55, cells, 0.028, 0.0],
  };
}
