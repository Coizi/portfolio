/**
 * Shader background for the site.
 *
 * Loaded only after the page has already decided WebGPU is wanted (see the inline
 * guard in each HTML file), so this module never runs on a browser without
 * `navigator.gpu`, on a small screen, or under prefers-reduced-motion. If init
 * throws for any other reason the caller leaves the CSS `.bg-orbs` in place.
 */
import { clock, effect, frameLoop, init, surface } from "vgpu";
import { BACKGROUND_WGSL, SITE_PALETTE, SITE_PALETTE_DARK } from "../shader.mjs";

const PALETTES = { light: SITE_PALETTE, dark: SITE_PALETTE_DARK };

/**
 * Boots the background onto `canvas`. Resolves once the first frame has actually
 * been drawn, so the caller can fade the canvas in without flashing an empty one.
 *
 * @returns {Promise<{ stop(): void }>}
 */
export async function start(canvas, paletteName = canvas?.dataset?.palette ?? "light") {
  const palette = PALETTES[paletteName] ?? SITE_PALETTE;
  const gpu = await init();

  try {
    const output = surface(gpu, canvas, { dpr: [1, 1.5] });
    const background = effect(gpu, BACKGROUND_WGSL, { label: "site-background" });
    const time = clock(gpu);

    // Reused across frames: set() writes land immediately, so only time/aspect move.
    const params = { ...palette, time: 0, aspect: 1 };

    let markReady;
    const ready = new Promise((resolve) => {
      markReady = resolve;
    });

    // 30fps: the field drifts at 0.06 rad/s, so a display-rate loop would burn
    // GPU redrawing a near-identical frame.
    const loop = frameLoop(
      gpu,
      (frame) => {
        const [width, height] = output.size;
        params.time = time.time;
        params.aspect = width / Math.max(height, 1);
        background.set({ p: params });
        frame.pass(output, background);

        if (markReady) {
          const resolve = markReady;
          markReady = null;
          frame.done.then(resolve);
        }
      },
      { fps: 30 },
    );

    await ready;

    return {
      stop() {
        loop.stop();
        gpu.dispose();
      },
    };
  } catch (error) {
    gpu.dispose();
    throw error;
  }
}
