import { createCanvasSurface } from "../core/canvas.js";
import { easeInOut, lerp } from "../core/math.js";
import { mulberry32 } from "../core/random.js";
import { PAGE_COLORS } from "../config/palette.js";

/**
 * 00 — Prologue: noise becomes signal.
 *
 * A field of drifting particles is interpolated, one scroll at a time, onto a
 * two-harmonic sine wave. Nothing is faded in or out: the same points that
 * scattered as noise are the points that form the signal, which is the whole
 * argument the page opens with.
 */

const SEED = 7;
const COUNT = 420;
const LOCK_AT = 0.55;   // progress where particles read as "signal"
const TRACE_AT = 0.4;   // progress where the connecting line starts drawing
const SPREAD = 1.06;    // wave runs slightly past both edges
const OFFSET = -0.03;

const wave = (u, time) =>
  0.5 +
  Math.sin(u * 9.5 + time * 0.0011) * 0.11 +
  Math.sin(u * 23 + time * 0.0007) * 0.028;

export function createHeroScene(section) {
  const canvas = section.querySelector("#hero-canvas");
  if (!canvas) return null;

  const stateEl = section.querySelector("#hero-state");
  const surface = createCanvasSurface(canvas);
  const random = mulberry32(SEED);

  const particles = Array.from({ length: COUNT }, () => ({
    x: random(),
    y: random(),
    driftX: (random() - 0.5) * 0.00025,
    driftY: (random() - 0.5) * 0.00035,
    opacity: 0.25 + random() * 0.75,
  }));

  return function render(progress, time) {
    if (!surface.ensureSized()) return;

    const { ctx, width, height } = surface;
    const eased = easeInOut(progress);
    const locked = eased > LOCK_AT;

    surface.clear();

    particles.forEach((p, i) => {
      p.x = (p.x + p.driftX + 1) % 1;
      p.y = (p.y + p.driftY + 1) % 1;

      const u = (i / COUNT) * SPREAD + OFFSET;
      const x = lerp(p.x, u, eased) * width;
      const y = lerp(p.y, wave(u, time), eased) * height;

      ctx.fillStyle = locked
        ? `rgba(${PAGE_COLORS.amber},${0.35 + p.opacity * 0.55})`
        : `rgba(${PAGE_COLORS.ink},${0.1 + p.opacity * 0.22})`;

      const size = locked ? 1.5 : 1.1;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    });

    if (eased > TRACE_AT) {
      ctx.strokeStyle = `rgba(${PAGE_COLORS.amber},${(eased - TRACE_AT) * 0.55})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const y = wave(x / width, time) * height;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (stateEl) stateEl.classList.toggle("signal", locked);
  };
}
