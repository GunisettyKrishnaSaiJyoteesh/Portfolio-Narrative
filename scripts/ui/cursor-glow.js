import { createCanvasSurface } from "../core/canvas.js";
import { clamp, lerp } from "../core/math.js";
import { PAGE_COLORS } from "../config/palette.js";

/**
 * A warm halo that follows the pointer, shedding rings as it travels.
 *
 * It is the page's own metaphor at hand scale: move, and a signal propagates
 * out from you. Rings are emitted by *distance travelled*, not on a timer, so
 * the page stays perfectly still when your hand does — an idle cursor quietly
 * pulsing is the tell of an effect that exists for its own sake.
 *
 * The native cursor is deliberately left alone. Replacing it costs real
 * usability: the I-beam over text, the pointer over links, the platform's
 * own accessibility settings. This draws around it instead.
 *
 * Returns a frame listener for the ScrollDirector — the page keeps one rAF
 * loop — or null when the effect should not exist at all.
 */

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const INTERACTIVE = "a, button, [data-tilt], .note, .chip";

const FOLLOW = 0.18;          // halo easing toward the true pointer
const EMIT_DISTANCE = 30;     // px of travel between rings
const MAX_RINGS = 12;
const RING_LIFE = 1150;       // ms
const RING_MAX_RADIUS = 132;
const HALO_RADIUS = 78;
const HALO_RADIUS_HOT = 116;  // over something interactive

export function createCursorGlow({ reducedMotion = false } = {}) {
  if (reducedMotion) return null;
  if (!window.matchMedia(FINE_POINTER).matches) return null;

  const canvas = document.createElement("canvas");
  canvas.id = "cursor-glow";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const surface = createCanvasSurface(canvas);

  // true pointer, and the eased position the halo actually draws at
  let pointerX = -9999;
  let pointerY = -9999;
  let haloX = -9999;
  let haloY = -9999;

  let emittedX = -9999;
  let emittedY = -9999;

  let presence = 0;         // eased; 0 once the pointer has left the window
  let presenceTarget = 0;
  let hot = 0;              // eased 0..1, 1 over an interactive element
  let hotTarget = 0;
  let seen = false;

  /** Rings are stamped with the render loop's clock, not performance.now().
   *  Two clocks for one animation is how you get an effect that behaves
   *  differently under test than it does on screen. */
  let clock = performance.now();

  let lastWidth = 0;
  let lastHeight = 0;

  const rings = [];

  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    presenceTarget = 1;

    if (!seen) {                     // don't sweep in from the corner
      haloX = pointerX;
      haloY = pointerY;
      emittedX = pointerX;
      emittedY = pointerY;
      seen = true;
    }

    const dx = pointerX - emittedX;
    const dy = pointerY - emittedY;
    if (Math.hypot(dx, dy) >= EMIT_DISTANCE) {
      rings.push({ x: pointerX, y: pointerY, born: clock });
      if (rings.length > MAX_RINGS) rings.shift();
      emittedX = pointerX;
      emittedY = pointerY;
    }
  }, { passive: true });

  // pointerover fires only when the element under the cursor changes, so the
  // closest() lookup costs nothing on a plain sweep across the page
  document.addEventListener("pointerover", (event) => {
    hotTarget = event.target instanceof Element && event.target.closest(INTERACTIVE) ? 1 : 0;
  }, { passive: true });

  document.addEventListener("pointerleave", () => { hotTarget = 0; presenceTarget = 0; });
  window.addEventListener("blur", () => { hotTarget = 0; presenceTarget = 0; });

  return function renderCursorGlow(_scrollY, time) {
    clock = time;
    if (!seen) return;
    if (!surface.ensureSized()) return;

    const { ctx, width, height } = surface;

    // A resize reallocates — and so blanks — the backing store, so it always
    // needs a repaint even if nothing else moved.
    const resized = width !== lastWidth || height !== lastHeight;
    lastWidth = width;
    lastHeight = height;

    // Nothing moving and nothing easing: the frame already on screen is still
    // correct, so leave it there rather than repainting the whole viewport 60
    // times a second for an identical picture. This must be tested *before*
    // clearing — an early return after a clear wipes the resting halo.
    const idle =
      rings.length === 0 &&
      Math.abs(pointerX - haloX) < 0.25 &&
      Math.abs(pointerY - haloY) < 0.25 &&
      Math.abs(hotTarget - hot) < 0.005 &&
      Math.abs(presenceTarget - presence) < 0.005;
    if (idle && !resized) return;

    ctx.clearRect(0, 0, width, height);

    presence = lerp(presence, presenceTarget, 0.08);
    hot = lerp(hot, hotTarget, 0.12);
    haloX = lerp(haloX, pointerX, FOLLOW);
    haloY = lerp(haloY, pointerY, FOLLOW);

    // ---- rings ---------------------------------------------------------
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      const life = (time - ring.born) / RING_LIFE;

      if (life >= 1) {
        rings.splice(i, 1);
        continue;
      }

      const eased = 1 - Math.pow(1 - life, 3);          // fast out, slow settle
      const radius = eased * RING_MAX_RADIUS;
      const alpha = Math.pow(1 - life, 2) * 0.32 * presence;

      ctx.strokeStyle = `rgba(${PAGE_COLORS.amber},${alpha})`;
      ctx.lineWidth = lerp(1.4, 0.4, eased);
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ---- halo ----------------------------------------------------------
    const radius = lerp(HALO_RADIUS, HALO_RADIUS_HOT, hot);
    const glow = ctx.createRadialGradient(haloX, haloY, 0, haloX, haloY, radius);
    const core = clamp(0.16 + hot * 0.1, 0, 1) * presence;

    glow.addColorStop(0, `rgba(${PAGE_COLORS.amber},${core})`);
    glow.addColorStop(0.45, `rgba(${PAGE_COLORS.amber},${core * 0.35})`);
    glow.addColorStop(1, `rgba(${PAGE_COLORS.amber},0)`);

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(haloX, haloY, radius, 0, Math.PI * 2);
    ctx.fill();

    // a hairline that tightens over anything clickable
    if (hot > 0.01) {
      ctx.strokeStyle = `rgba(${PAGE_COLORS.amber},${hot * 0.5 * presence})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(haloX, haloY, lerp(26, 19, hot), 0, Math.PI * 2);
      ctx.stroke();
    }
  };
}
