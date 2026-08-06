import { createCanvasSurface, drawGrid } from "../core/canvas.js";
import { easeInOut, lerp, range } from "../core/math.js";
import { mulberry32 } from "../core/random.js";
import { SCENE_COLORS, GRID_STROKE } from "../config/palette.js";

/**
 * 05 — Segments: one market resolving into four.
 *
 * Points start scattered and grey — an undifferentiated market — then migrate
 * to their true cluster and take on its colour. Centroid rings arrive last, so
 * the structure is legible before it is labelled.
 */

const SEED = 11;
const DOT_COUNT = 150;
const COLOUR_AT = 0.25;     // below this the field stays undifferentiated grey
const RINGS_AT = 0.72;
const RESOLVED_AT = 0.7;

const CENTROIDS = [
  { x: 0.26, y: 0.3,  color: SCENE_COLORS.green  },
  { x: 0.72, y: 0.26, color: SCENE_COLORS.amber  },
  { x: 0.3,  y: 0.74, color: SCENE_COLORS.clinic },
  { x: 0.74, y: 0.7,  color: SCENE_COLORS.heat   },
];

export function createSegmentsScene(section) {
  const canvas = section.querySelector("#ev-canvas");
  if (!canvas) return null;

  const readout = section.querySelector("#ev-read");
  const surface = createCanvasSurface(canvas);
  const random = mulberry32(SEED);

  const dots = Array.from({ length: DOT_COUNT }, (_, i) => {
    const cluster = i % CENTROIDS.length;
    const centroid = CENTROIDS[cluster];
    const angle = random() * Math.PI * 2;
    const spread = Math.pow(random(), 0.6); // bias points toward the centre
    return {
      cluster,
      startX: random(),
      startY: random(),
      targetX: centroid.x + Math.cos(angle) * spread * 0.13,
      targetY: centroid.y + Math.sin(angle) * spread * 0.15,
      radius: 1.4 + random() * 2.2,
    };
  });

  return function render(progress, time) {
    if (!surface.ensureSized()) return;

    const { ctx, width, height } = surface;
    const eased = easeInOut(progress);

    surface.clear();
    drawGrid(ctx, width, height, { stroke: GRID_STROKE });

    for (const dot of dots) {
      const drift = Math.sin(time * 0.0009 + dot.cluster * 2 + dot.radius) * (1 - eased) * 0.01;
      const x = lerp(dot.startX + drift, dot.targetX, eased) * width;
      const y = lerp(dot.startY, dot.targetY, eased) * height;

      ctx.fillStyle = eased < COLOUR_AT
        ? `rgba(${SCENE_COLORS.ivory},.22)`
        : `rgba(${CENTROIDS[dot.cluster].color},${0.18 + eased * 0.6})`;

      ctx.beginPath();
      ctx.arc(x, y, dot.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const ringProgress = range(eased, RINGS_AT, 1);
    if (ringProgress > 0) {
      for (const centroid of CENTROIDS) {
        const cx = centroid.x * width;
        const cy = centroid.y * height;

        ctx.strokeStyle = `rgba(${centroid.color},${0.5 * ringProgress})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 46 * ringProgress + 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(${centroid.color},${0.9 * ringProgress})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (readout) {
      readout.textContent = eased < RESOLVED_AT
        ? `CLUSTERING — k = ${CENTROIDS.length}`
        : `${CENTROIDS.length} SEGMENTS RESOLVED`;
    }
  };
}
