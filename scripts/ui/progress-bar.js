import { clamp } from "../core/math.js";

/**
 * Reading-position bar. Returns a frame listener for the ScrollDirector rather
 * than binding its own scroll handler — one rAF loop drives the whole page.
 */
export function createProgressBar(el) {
  if (!el) return null;

  return function renderProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0;
    el.style.transform = `scaleX(${progress})`;
  };
}
