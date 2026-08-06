import { clamp } from "./math.js";

const MAX_DPR = 2; // beyond 2x the extra pixels cost more than they show

/**
 * Wraps a <canvas> in a device-pixel-ratio-aware drawing surface.
 *
 * Scenes draw in CSS pixels and never think about DPR: `ensureSized()` at the
 * top of a render pass re-scales the backing store only when the element's box
 * has actually changed, which covers resizes, orientation changes, and the
 * first paint of a canvas that started life inside a hidden section.
 */
export function createCanvasSurface(canvas) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;

  function resize() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, MAX_DPR);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  return {
    ctx,
    resize,
    get width() { return width; },
    get height() { return height; },
    /** @returns {boolean} false when the canvas has no box to draw into yet */
    ensureSized() {
      if (canvas.clientWidth !== width || canvas.clientHeight !== height) resize();
      return width > 0 && height > 0;
    },
    clear() { ctx.clearRect(0, 0, width, height); },
  };
}

/** The faint measurement grid every instrument panel sits on. */
export function drawGrid(ctx, width, height, { step = 40, stroke } = {}) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}
