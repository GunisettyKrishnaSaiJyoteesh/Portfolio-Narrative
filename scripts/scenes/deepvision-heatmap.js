import { createCanvasSurface, drawGrid } from "../core/canvas.js";
import { easeInOut, pad } from "../core/math.js";
import { mulberry32 } from "../core/random.js";
import { SCENE_COLORS, GRID_STROKE } from "../config/palette.js";

/**
 * 03 — DeepVision: a crowd-density map assembling itself.
 *
 * Additive radial gradients stand in for the CSRNet density output. Blobs
 * arrive progressively and the densest ones tip into thermal orange, so the
 * reader watches the count climb and the alert fire at the same moment the
 * copy explains it.
 *
 * The readout is an illustration of the product's behaviour, not a benchmark.
 */

const SEED = 42;
const BLOB_COUNT = 26;
const PEAK_COUNT = 287;      // illustrative headcount at full scrub
const ALERT_AT = 0.82;
const HOT_SIZE = 0.75;       // blob size above which a region reads as "hot"
const HOT_AT = 0.75;

export function createDeepVisionScene(section) {
  const canvas = section.querySelector("#dv-canvas");
  if (!canvas) return null;

  const countEl = section.querySelector("#dv-count");
  const alertEl = section.querySelector("#dv-alert");
  const surface = createCanvasSurface(canvas);
  const random = mulberry32(SEED);

  const blobs = Array.from({ length: BLOB_COUNT }, () => ({
    x: random(),
    y: 0.18 + random() * 0.72,
    size: 0.35 + random() * 0.65,
    phase: random() * Math.PI * 2,
  }));

  return function render(progress, time) {
    if (!surface.ensureSized()) return;

    const { ctx, width, height } = surface;
    const eased = easeInOut(progress);

    surface.clear();
    drawGrid(ctx, width, height, { stroke: GRID_STROKE });

    ctx.globalCompositeOperation = "lighter";

    const visible = Math.ceil(blobs.length * eased);
    for (let i = 0; i < visible; i++) {
      const blob = blobs[i];
      const wobble = Math.sin(time * 0.001 + blob.phase) * 0.012;
      const x = (blob.x + wobble) * width;
      const y = blob.y * height;
      const radius = (18 + blob.size * 66) * (0.45 + 0.55 * eased);
      const hot = blob.size > HOT_SIZE && eased > HOT_AT;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, hot
        ? `rgba(${SCENE_COLORS.heat},.5)`
        : `rgba(${SCENE_COLORS.amber},.34)`);
      gradient.addColorStop(0.55, `rgba(${SCENE_COLORS.heat},.10)`);
      gradient.addColorStop(1, `rgba(${SCENE_COLORS.heat},0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";

    if (countEl) countEl.textContent = `EST. COUNT — ${pad(Math.round(eased * PEAK_COUNT))}`;
    if (alertEl) alertEl.classList.toggle("on", eased > ALERT_AT);
  };
}
