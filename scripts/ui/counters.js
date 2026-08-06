import { clamp, easeInOut } from "../core/math.js";

/**
 * Counts the Proof figures up when they scroll into view.
 *
 * Markup contract:
 *   <span class="n" data-count="9.26" data-dec="2" data-suffix="+">
 * The suffix is withheld until the animation lands, so the reader never sees
 * a half-counted "312+" claiming to be a finished number.
 */
const DURATION = 1400;
const THRESHOLD = 0.6;

export function initCounters({ reducedMotion = false } = {}, root = document) {
  const targets = root.querySelectorAll("[data-count]");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        animate(entry.target, reducedMotion);
      }
    },
    { threshold: THRESHOLD }
  );

  targets.forEach((el) => observer.observe(el));
}

function animate(el, reducedMotion) {
  const target = parseFloat(el.dataset.count);
  const decimals = Number(el.dataset.dec || 0);
  const suffix = el.dataset.suffix || "";

  if (reducedMotion || !Number.isFinite(target)) {
    el.textContent = target.toFixed(decimals) + suffix;
    return;
  }

  const start = performance.now();
  const step = (now) => {
    const progress = easeInOut(clamp((now - start) / DURATION, 0, 1));
    const done = progress === 1;
    el.textContent = (target * progress).toFixed(decimals) + (done ? suffix : "");
    if (!done) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
