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

function boot() {
  const reducedMotion = prefersReducedMotion();

  initReveals();
  initChapterRail();
  initCounters({ reducedMotion });

  const director = new ScrollDirector({ reducedMotion });

  const progressBar = createProgressBar(document.getElementById("progress"));
  if (progressBar) director.addFrameListener(progressBar);

  for (const [id, createScene] of SCENES) {
    const section = document.getElementById(id);
    if (!section) continue;

    const render = createScene(section);
    if (render) director.addScrub(section, render);
  }

  director.start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
