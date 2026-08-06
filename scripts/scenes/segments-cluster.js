import { createCanvasSurface } from "../core/canvas.js";
import { easeInOut, lerp, range } from "../core/math.js";
import { mulberry32 } from "../core/random.js";
import { createCamera, orbit, depthCue, sortFarToNear } from "../core/three-d.js";
import { SCENE_COLORS } from "../config/palette.js";

/**
 * 05 — Segments: one market resolving into four, in three dimensions.
 *
 * Points start scattered and grey — an undifferentiated market — then migrate
 * to their true cluster and take on its colour, while the camera orbits the
 * space. Centroid rings arrive last, so the structure is legible before it is
 * labelled.
 *
 * 3D is the honest projection here: segmentation runs over many variables at
 * once, and a flat scatter quietly implies there were only two. The orbit also
 * does real work — from a single angle two clusters can overlap into one blob,
 * and rotation is what separates them.
 */

const SEED = 11;
const DOT_COUNT = 150;
const COLOUR_AT = 0.25;   // below this the field stays undifferentiated grey
const RINGS_AT = 0.72;
const RESOLVED_AT = 0.7;
const FIXED_TIME = 5200;  // a composed frame for reduced-motion visitors

const GROUND_Y = 0.82;
const GROUND_HALF = 1.15;
const GROUND_DIVISIONS = 8;
const RING_RADIUS = 0.32;
const RING_SEGMENTS = 40;

/** Spread through the volume, not around a plane — the orbit has to reveal
 *  something for it to be worth doing. */
const CENTROIDS = [
  { x: -0.62, y: -0.28, z: -0.44, color: SCENE_COLORS.green },
  { x: 0.58, y: -0.40, z: 0.42, color: SCENE_COLORS.amber },
  { x: -0.52, y: 0.34, z: 0.50, color: SCENE_COLORS.clinic },
  { x: 0.56, y: 0.30, z: -0.48, color: SCENE_COLORS.heat },
];

export function createSegmentsScene(section, { reducedMotion = false } = {}) {
  const canvas = section.querySelector("#ev-canvas");
  if (!canvas) return null;

  const readout = section.querySelector("#ev-read");
  const surface = createCanvasSurface(canvas);
  const random = mulberry32(SEED);

  const dots = Array.from({ length: DOT_COUNT }, (_, i) => {
    const cluster = i % CENTROIDS.length;
    const centroid = CENTROIDS[cluster];

    // spherical offset, biased toward the centre so clusters read as dense
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const spread = Math.pow(random(), 0.6) * 0.3;

    return {
      cluster,
      startX: (random() - 0.5) * 2.1,
      startY: (random() - 0.5) * 1.5,
      startZ: (random() - 0.5) * 2.1,
      targetX: centroid.x + Math.sin(phi) * Math.cos(theta) * spread,
      targetY: centroid.y + Math.cos(phi) * spread * 0.85,
      targetZ: centroid.z + Math.sin(phi) * Math.sin(theta) * spread,
      radius: 1.5 + random() * 2.1,
      drift: random() * Math.PI * 2,
    };
  });

  const rotated = {};
  const screen = {};

  /** Rotate + project in one step; returns null when behind the lens. */
  const place = (camera, yaw, pitch, x, y, z, out = {}) => {
    orbit(x, y, z, yaw, pitch, rotated);
    const point = camera.project(rotated.x, rotated.y, rotated.z, screen);
    if (!point) return null;
    out.x = point.x;
    out.y = point.y;
    out.depth = point.depth;
    return out;
  };

  return function render(progress, time) {
    if (!surface.ensureSized()) return;

    const { ctx, width, height } = surface;
    const t = reducedMotion ? FIXED_TIME : time;
    const eased = easeInOut(progress);

    const yaw = -0.65 + eased * 0.8 + (reducedMotion ? 0 : t * 0.00006);
    const pitch = 0.26 + eased * 0.12;
    const camera = createCamera({ width, height, distance: 3.1, focalRatio: 1.15 });

    surface.clear();

    // ---- ground plane -------------------------------------------------
    // The grid used to be flat 2D lines. In perspective it is what tells the
    // eye this is a volume rather than a scatter plot with fancy dots.
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${SCENE_COLORS.ivory},.07)`;
    const a = {};
    const b = {};

    for (let i = 0; i <= GROUND_DIVISIONS; i++) {
      const offset = lerp(-GROUND_HALF, GROUND_HALF, i / GROUND_DIVISIONS);

      const rowStart = place(camera, yaw, pitch, -GROUND_HALF, GROUND_Y, offset, a);
      const rowEnd = place(camera, yaw, pitch, GROUND_HALF, GROUND_Y, offset, b);
      if (rowStart && rowEnd) {
        ctx.beginPath();
        ctx.moveTo(rowStart.x, rowStart.y);
        ctx.lineTo(rowEnd.x, rowEnd.y);
        ctx.stroke();
      }

      const colStart = place(camera, yaw, pitch, offset, GROUND_Y, -GROUND_HALF, a);
      const colEnd = place(camera, yaw, pitch, offset, GROUND_Y, GROUND_HALF, b);
      if (colStart && colEnd) {
        ctx.beginPath();
        ctx.moveTo(colStart.x, colStart.y);
        ctx.lineTo(colEnd.x, colEnd.y);
        ctx.stroke();
      }
    }

    // ---- points -------------------------------------------------------
    const marks = [];
    for (const dot of dots) {
      const wander = reducedMotion ? 0 : Math.sin(t * 0.0006 + dot.drift) * 0.03 * (1 - eased);

      const x = lerp(dot.startX + wander, dot.targetX, eased);
      const y = lerp(dot.startY, dot.targetY, eased);
      const z = lerp(dot.startZ, dot.targetZ, eased);

      const point = place(camera, yaw, pitch, x, y, z, {});
      if (!point) continue;

      point.cluster = dot.cluster;
      point.radius = dot.radius;
      marks.push(point);
    }

    for (const mark of sortFarToNear(marks)) {
      const cue = depthCue(mark.depth, { near: 2.0, far: 4.2 });
      const colour = eased < COLOUR_AT ? SCENE_COLORS.ivory : CENTROIDS[mark.cluster].color;
      const alpha = (eased < COLOUR_AT ? 0.26 : 0.28 + eased * 0.55) * (0.3 + cue * 0.7);

      ctx.fillStyle = `rgba(${colour},${alpha})`;
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, mark.radius * (0.5 + cue * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- centroid rings -----------------------------------------------
    // Circles drawn in the ground plane, so perspective turns them into
    // ellipses that lie flat in the space rather than facing the viewer.
    const ringProgress = range(eased, RINGS_AT, 1);
    if (ringProgress > 0) {
      for (const centroid of CENTROIDS) {
        const radius = RING_RADIUS * (0.5 + ringProgress * 0.5);

        ctx.strokeStyle = `rgba(${centroid.color},${0.55 * ringProgress})`;
        ctx.beginPath();
        let started = false;

        for (let i = 0; i <= RING_SEGMENTS; i++) {
          const angle = (i / RING_SEGMENTS) * Math.PI * 2;
          const point = place(
            camera, yaw, pitch,
            centroid.x + Math.cos(angle) * radius,
            centroid.y,
            centroid.z + Math.sin(angle) * radius,
            a
          );
          if (!point) { started = false; continue; }
          if (started) ctx.lineTo(point.x, point.y);
          else { ctx.moveTo(point.x, point.y); started = true; }
        }
        ctx.stroke();

        const core = place(camera, yaw, pitch, centroid.x, centroid.y, centroid.z, a);
        if (core) {
          ctx.fillStyle = `rgba(${centroid.color},${0.95 * ringProgress})`;
          ctx.beginPath();
          ctx.arc(core.x, core.y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (readout) {
      readout.textContent = eased < RESOLVED_AT
        ? `CLUSTERING — k = ${CENTROIDS.length}`
        : `${CENTROIDS.length} SEGMENTS RESOLVED`;
    }
  };
}
