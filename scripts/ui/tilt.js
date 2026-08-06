import { clamp } from "../core/math.js";

/**
 * Pointer-driven 3D tilt for elements marked [data-tilt].
 *
 * Kept deliberately shallow — a few degrees. The effect should register as
 * the card having thickness, not as the card performing. Anything steeper
 * turns an editorial page into a demo reel.
 *
 * Skipped entirely for reduced motion and for coarse pointers: on a phone
 * there is no hover to respond to, and a tilt that fires on tap reads as a
 * rendering bug.
 */

const MAX_DEGREES = 5;
const LIFT_PX = 6;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

export function initTilt({ reducedMotion = false } = {}, root = document) {
  if (reducedMotion) return;
  if (!window.matchMedia(FINE_POINTER).matches) return;

  const targets = root.querySelectorAll("[data-tilt]");
  if (!targets.length) return;

  for (const el of targets) {
    let frame = 0;

    const apply = (event) => {
      if (frame) return; // one write per frame, whatever the pointer rate
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = el.getBoundingClientRect();
        const px = clamp((event.clientX - box.left) / box.width, 0, 1) - 0.5;
        const py = clamp((event.clientY - box.top) / box.height, 0, 1) - 0.5;

        el.style.transform =
          `perspective(900px) ` +
          `rotateX(${(-py * MAX_DEGREES * 2).toFixed(2)}deg) ` +
          `rotateY(${(px * MAX_DEGREES * 2).toFixed(2)}deg) ` +
          `translateZ(${LIFT_PX}px)`;
      });
    };

    el.addEventListener("pointerenter", () => el.classList.add("tilting"));
    el.addEventListener("pointermove", apply);
    el.addEventListener("pointerleave", () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.classList.remove("tilting"); // restores the CSS transition for the settle
      el.style.transform = "";
    });
  }
}
