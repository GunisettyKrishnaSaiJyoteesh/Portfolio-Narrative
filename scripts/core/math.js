/** Small numeric helpers shared by every scene. */

export const TAU = Math.PI * 2;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const lerp = (from, to, t) => from + (to - from) * t;

/** Quadratic ease-in-out. Every scrub runs through this so the scenes
 *  settle at their extremes instead of snapping. */
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Progress of `value` across [start, end], clamped to 0..1. */
export const range = (value, start, end) => clamp((value - start) / (end - start), 0, 1);

export const pad = (value, width = 3) => String(value).padStart(width, "0");
