/**
 * Just enough 3D to project a few hundred points.
 *
 * Hand-rolled rather than pulling in a WebGL library: the scenes need an
 * orbit, a perspective divide and a depth sort — not a renderer, a scene
 * graph or a material system. Three.js would add roughly ten times the
 * weight of this entire page to do less than this file does.
 *
 * Conventions: world units are roughly -1..1, the camera sits on +z looking
 * back at the origin, +y is down (matching canvas screen space, so nothing
 * has to be flipped at draw time).
 */
import { clamp } from "./math.js";

export const DEFAULT_DISTANCE = 2.8;

/**
 * Rotate a point about the Y axis (yaw) then the X axis (pitch).
 * Writes into `out` so a scene can reuse one scratch object per point
 * instead of allocating a few hundred every frame.
 */
export function orbit(x, y, z, yaw, pitch, out = {}) {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const xr = x * cosYaw - z * sinYaw;
  const zr = x * sinYaw + z * cosYaw;

  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  out.x = xr;
  out.y = y * cosPitch - zr * sinPitch;
  out.z = y * sinPitch + zr * cosPitch;
  return out;
}

/**
 * Perspective camera for a given canvas box.
 *
 * `project` returns null for points behind the lens, so callers must
 * null-check — that is the cull, and it keeps divide-by-near-zero blowups
 * out of the draw loop.
 */
export function createCamera({
  width,
  height,
  distance = DEFAULT_DISTANCE,
  focalRatio = 0.9,
  /** Principal point, as a fraction of the box. Moving it lets a scene sit
   *  beside the page's type instead of underneath it. */
  centre = 0.5,
  centreYRatio = 0.5,
}) {
  const focal = Math.min(width, height) * focalRatio;
  const centreX = width * centre;
  const centreY = height * centreYRatio;

  return {
    focal,
    distance,
    project(x, y, z, out = {}) {
      const depth = distance + z;
      if (depth <= 0.1) return null;

      const k = focal / depth;
      out.x = centreX + x * k;
      out.y = centreY + y * k;
      out.depth = depth;
      out.k = k;
      return out;
    },
  };
}

/**
 * 1 for the nearest plane, 0 for the farthest — the single number scenes use
 * to fade and shrink distant points. Without it a projected cloud reads as a
 * flat scatter no matter how correct the maths is.
 */
export function depthCue(depth, { near = DEFAULT_DISTANCE - 1.1, far = DEFAULT_DISTANCE + 1.1 } = {}) {
  return clamp(1 - (depth - near) / (far - near), 0, 1);
}

/** Far-to-near, so nearer marks paint over farther ones. */
export function sortFarToNear(points) {
  return points.sort((a, b) => b.depth - a.depth);
}
