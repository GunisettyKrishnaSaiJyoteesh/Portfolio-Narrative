import { easeInOut, pad, range } from "../core/math.js";

/**
 * 04 — CliniScan: sweep, detect, explain.
 *
 * The only SVG scene. The chest plate is authored markup (see index.html) and
 * this module animates four attributes across the scrub, in the order the
 * clinical story happens:
 *
 *   0.00 – 0.70   scanline travels the plate
 *   0.55 – 0.80   the finding and its Grad-CAM heat emerge
 *   0.68 – 0.88   the detection box and its labels resolve
 *
 * Deliberately overlapping: detection should feel like it happens during the
 * sweep, not politely after it.
 */

const SWEEP_ENDS = 0.7;
const PLATE_HEIGHT = 600;   // viewBox units the scanline travels
const LINE_HEIGHT = 80;
const CAM_MIN_RADIUS = 40;
const CAM_GROWTH = 34;

export function createCliniScanScene(section) {
  const scanline = section.querySelector("#cs-line");
  if (!scanline) return null;

  const cam = section.querySelector("#cs-cam");
  const nodule = section.querySelector("#cs-nodule");
  const box = section.querySelector("#cs-box");
  const readout = section.querySelector("#cs-read");
  const grid = section.querySelector("#cs-grid");

  if (grid) grid.innerHTML = buildGrid();

  return function render(progress) {
    const eased = easeInOut(progress);
    const sweep = range(eased, 0, SWEEP_ENDS);
    const found = range(eased, 0.55, 0.8);
    const boxed = range(eased, 0.68, 0.88);

    scanline.setAttribute("y", -LINE_HEIGHT + sweep * PLATE_HEIGHT);
    if (readout) readout.textContent = `SCAN — ${pad(Math.round(sweep * 100))}%`;

    if (nodule) nodule.setAttribute("opacity", found * 0.9);
    if (cam) {
      cam.setAttribute("opacity", found * 0.95);
      cam.setAttribute("r", CAM_MIN_RADIUS + CAM_GROWTH * found);
    }
    if (box) box.setAttribute("opacity", boxed);
  };
}

/** Measurement grid, generated rather than hand-written into the SVG. */
function buildGrid({ width = 600, height = 520, step = 40 } = {}) {
  const lines = [];
  for (let x = 0; x <= width; x += step) lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}"/>`);
  for (let y = 0; y <= height; y += step) lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}"/>`);
  return lines.join("");
}
