import { createCanvasSurface } from "../core/canvas.js";
import { easeInOut, lerp } from "../core/math.js";
import { mulberry32 } from "../core/random.js";
import { createCamera, orbit, depthCue } from "../core/three-d.js";
import { PAGE_COLORS } from "../config/palette.js";

/**
 * 00 — Prologue: noise becomes signal, in three dimensions.
 *
 * A cloud of points scattered through a 3D box resolves onto a rippling
 * surface as you scroll, while the camera orbits it. Nothing fades in or
 * out: the same points that scattered as noise are the points that form the
 * signal, which is the argument the page opens with. The wireframe rows are
 * drawn only once the surface exists, so structure appears as a consequence
 * of the points settling rather than as decoration laid over them.
 *
 * The grid is COLS x ROWS points, so every point has a home to travel to.
 */

const SEED = 7;
const COLS = 30;
const ROWS = 14;
const LOCK_AT = 0.55;   // progress where the cloud reads as "signal"
const TRACE_AT = 0.45;  // progress where the wireframe starts drawing
const FIXED_TIME = 4200; // a composed frame for reduced-motion visitors

const SPAN_X = 2.8;
const SPAN_Z = 1.9;

/** Height of the surface at a point, gently animated. */
const surfaceY = (x, z, time) =>
  Math.sin(x * 1.9 + time * 0.00090) * 0.15 +
  Math.sin(z * 2.4 - time * 0.00062) * 0.08 +
  Math.sin((x + z) * 1.2 + time * 0.00037) * 0.05;

export function createHeroScene(section, { reducedMotion = false } = {}) {
  const canvas = section.querySelector("#hero-canvas");
  if (!canvas) return null;

  const stateEl = section.querySelector("#hero-state");
  const surface = createCanvasSurface(canvas);
  const random = mulberry32(SEED);

  // One point per grid cell: a random home in the box, and a home on the sheet.
  const points = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      points.push({
        row,
        col,
        noiseX: (random() - 0.5) * 3.2,
        noiseY: (random() - 0.5) * 1.9,
        noiseZ: (random() - 0.5) * 2.2,
        gridX: (col / (COLS - 1) - 0.5) * SPAN_X,
        gridZ: (row / (ROWS - 1) - 0.5) * SPAN_Z,
        drift: random() * Math.PI * 2,
        opacity: 0.25 + random() * 0.75,
      });
    }
  }

  const rotated = {};
  const screen = {};

  return function render(progress, time) {
    if (!surface.ensureSized()) return;

    const { ctx, width, height } = surface;
    const t = reducedMotion ? FIXED_TIME : time;
    const eased = easeInOut(progress);
    const locked = eased > LOCK_AT;

    // the camera swings round as the cloud resolves, then keeps drifting
    const yaw = -0.55 + eased * 0.62 + (reducedMotion ? 0 : t * 0.00004);
    const pitch = 0.16 + eased * 0.30;

    // On a wide screen the copy owns the left half, so the surface is pushed
    // right to sit beside it rather than run underneath the headline.
    const wide = width > 900;
    const camera = createCamera({
      width,
      height,
      focalRatio: 1.05,
      centre: wide ? 0.66 : 0.5,
      centreYRatio: wide ? 0.54 : 0.5,
    });

    surface.clear();

    // ---- points -------------------------------------------------------
    // Also cache each projected position for the wireframe pass below.
    const projected = new Array(points.length);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];

      // a little idle motion in the noise state, none once it has settled
      const wobble = reducedMotion ? 0 : Math.sin(t * 0.0004 + p.drift) * 0.05 * (1 - eased);

      const x = lerp(p.noiseX + wobble, p.gridX, eased);
      const z = lerp(p.noiseZ, p.gridZ, eased);
      const y = lerp(p.noiseY, surfaceY(p.gridX, p.gridZ, t), eased);

      orbit(x, y, z, yaw, pitch, rotated);
      const point = camera.project(rotated.x, rotated.y, rotated.z, screen);
      if (!point) {
        projected[i] = null;
        continue;
      }

      const cue = depthCue(point.depth);
      projected[i] = { x: point.x, y: point.y, cue };

      const alpha = locked
        ? (0.18 + p.opacity * 0.5) * (0.35 + cue * 0.65)
        : (0.06 + p.opacity * 0.2) * (0.4 + cue * 0.6);

      ctx.fillStyle = locked
        ? `rgba(${PAGE_COLORS.amber},${alpha})`
        : `rgba(${PAGE_COLORS.ink},${alpha})`;

      const size = (locked ? 1.7 : 1.2) * (0.55 + cue * 0.75);
      ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    }

    // ---- wireframe ----------------------------------------------------
    // Contour rows only. Adding columns as well turns an elegant surface
    // into a fishing net and swallows the headline sitting on top of it.
    if (eased > TRACE_AT) {
      const strength = (eased - TRACE_AT) / (1 - TRACE_AT);
      ctx.lineWidth = 1;

      for (let row = 0; row < ROWS; row++) {
        ctx.beginPath();
        let drawing = false;
        let cueSum = 0;
        let cueCount = 0;

        for (let col = 0; col < COLS; col++) {
          const point = projected[row * COLS + col];
          if (!point) {
            drawing = false;
            continue;
          }
          cueSum += point.cue;
          cueCount++;

          if (drawing) ctx.lineTo(point.x, point.y);
          else {
            ctx.moveTo(point.x, point.y);
            drawing = true;
          }
        }

        const cue = cueCount ? cueSum / cueCount : 0;
        ctx.strokeStyle = `rgba(${PAGE_COLORS.amber},${strength * (0.05 + cue * 0.22)})`;
        ctx.stroke();
      }
    }

    // ---- keep the type clean ------------------------------------------
    // Erase back toward the left so nothing crosses the headline, the
    // sentence or the buttons. Cheaper and softer than clipping, and it
    // leaves the surface looking like it emerges out of the page.
    const fadeWidth = width * (wide ? 0.5 : 0.28);
    const fade = ctx.createLinearGradient(0, 0, fadeWidth, 0);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(0.62, "rgba(0,0,0,.72)");
    fade.addColorStop(1, "rgba(0,0,0,0)");

    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, fadeWidth, height);
    ctx.globalCompositeOperation = "source-over";

    if (stateEl) stateEl.classList.toggle("signal", locked);
  };
}
