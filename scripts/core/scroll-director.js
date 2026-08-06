import { clamp } from "./math.js";

/**
 * One requestAnimationFrame loop for the whole page.
 *
 * Two kinds of subscriber:
 *   - scrub tracks  — a tall section whose 0..1 progress drives a scene
 *   - frame listeners — anything that just wants scrollY each frame
 *
 * Rendering is culled to sections near the viewport, so the three case-study
 * scenes never burn cycles while you are reading the timeline.
 *
 * `pinned` holds every scrub at its finished state (progress 1), turning the
 * scenes into static illustrations. Two callers want that: a visitor who asked
 * for reduced motion, and phones, where the case studies are laid out as
 * flowing articles rather than pinned frames.
 */
export class ScrollDirector {
  constructor({ pinned = false, cullMargin = 0.2 } = {}) {
    this.pinned = pinned;
    this.cullMargin = cullMargin;
    this.tracks = [];
    this.listeners = [];
    this.running = false;

    this.measure = this.measure.bind(this);
    this.tick = this.tick.bind(this);
  }

  /** @param {HTMLElement} section @param {(progress:number, time:number)=>void} render */
  addScrub(section, render) {
    const track = { section, render, top: 0, range: 1 };
    this.#measureTrack(track);
    this.tracks.push(track);
    return this;
  }

  /** @param {(scrollY:number, time:number)=>void} fn */
  addFrameListener(fn) {
    this.listeners.push(fn);
    return this;
  }

  #measureTrack(track) {
    const rect = track.section.getBoundingClientRect();
    track.top = rect.top + window.scrollY;
    // the sticky child is 100vh tall, so the scrubbable distance is what's left
    track.range = Math.max(1, track.section.offsetHeight - window.innerHeight);
  }

  measure() {
    this.tracks.forEach((track) => this.#measureTrack(track));
  }

  start() {
    if (this.running) return this;
    this.running = true;

    window.addEventListener("resize", this.measure);
    window.addEventListener("load", this.measure);

    requestAnimationFrame(this.tick);
    return this;
  }

  tick(time) {
    const scrollY = window.scrollY;
    const viewport = window.innerHeight;

    for (const listener of this.listeners) listener(scrollY, time);

    for (const track of this.tracks) {
      const rect = track.section.getBoundingClientRect();
      const near =
        rect.bottom > -viewport * this.cullMargin &&
        rect.top < viewport * (1 + this.cullMargin);
      if (!near) continue;

      const progress = this.pinned
        ? 1
        : clamp((scrollY - track.top) / track.range, 0, 1);
      track.render(progress, time);
    }

    requestAnimationFrame(this.tick);
  }
}
