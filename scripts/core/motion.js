/** Accessibility gate for every animation on the page. */

const QUERY = "(prefers-reduced-motion: reduce)";

export const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
