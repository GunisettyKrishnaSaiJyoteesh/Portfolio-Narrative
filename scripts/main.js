/**
 * Entry point. Wires page behaviour to markup and starts the single rAF loop.
 *
 * Everything here is progressive enhancement: the content, the links and the
 * layout are all in index.html and stand on their own. If this file never
 * loads, the visitor loses the animations and keeps the portfolio.
 */
import { prefersReducedMotion } from "./core/motion.js";
import { ScrollDirector } from "./core/scroll-director.js";
import { initReveals } from "./ui/reveal.js";
import { initChapterRail } from "./ui/chapter-rail.js";
import { initCounters } from "./ui/counters.js";
import { initTilt } from "./ui/tilt.js";
import { createCursorGlow } from "./ui/cursor-glow.js";
import { createProgressBar } from "./ui/progress-bar.js";
import { createHeroScene } from "./scenes/hero-signal.js";
import { createDeepVisionScene } from "./scenes/deepvision-heatmap.js";
import { createCliniScanScene } from "./scenes/cliniscan-scan.js";
import { createSegmentsScene } from "./scenes/segments-cluster.js";

/** Section id → scene factory. Adding a scrubbed chapter is one line here. */
const SCENES = [
  ["ch0", createHeroScene],
  ["dv", createDeepVisionScene],
  ["cs", createCliniScanScene],
  ["ev", createSegmentsScene],
];

/** Viewports where case studies lay out as flowing articles instead of pinned
 *  frames, so there is nothing to scrub. Must match the breakpoint at the
 *  bottom of styles/chapters/case-study.css. */
const UNPINNED = "(max-width: 900px), (max-height: 600px)";

function boot() {
  const reducedMotion = prefersReducedMotion();
  const unpinned = window.matchMedia(UNPINNED).matches;

  initReveals();
  initChapterRail();
  initCounters({ reducedMotion });
  initTilt({ reducedMotion });

  // reduced motion asks us not to scrub; the article layout has nothing to
  // scrub against. Either way, scenes render resolved.
  const director = new ScrollDirector({ pinned: reducedMotion || unpinned });

  const progressBar = createProgressBar(document.getElementById("progress"));
  if (progressBar) director.addFrameListener(progressBar);

  const cursorGlow = createCursorGlow({ reducedMotion });
  if (cursorGlow) director.addFrameListener(cursorGlow);

  for (const [id, createScene] of SCENES) {
    const section = document.getElementById(id);
    if (!section) continue;

    // scenes need reducedMotion too: pinning progress stops the scrub, but
    // the 3D cameras also drift over time, and that has to stop as well
    const render = createScene(section, { reducedMotion });
    if (render) director.addScrub(section, render);
  }

  director.start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
