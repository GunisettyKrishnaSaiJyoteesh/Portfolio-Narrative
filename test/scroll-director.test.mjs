/**
 * ScrollDirector — scroll offset → scene progress.
 *
 *   node --test
 *
 * The director is the one piece of shared logic every scene depends on, so it
 * gets the one test. A stubbed window and section stand in for the DOM; nothing
 * here needs a browser, which is the practical payoff of keeping the scroll
 * math in its own module instead of inside a page script.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { ScrollDirector } from "../scripts/core/scroll-director.js";

const VIEWPORT = 800;
const TOP = 3624;   // document offset of the section under test
const HEIGHT = 2090; // .case is 260vh; 100vh of it is the sticky child
const RANGE = HEIGHT - VIEWPORT;

/** Installs a fake window and returns a harness for driving the director. */
function harness({ reducedMotion = false } = {}) {
  let scrollY = 0;

  globalThis.window = {
    get scrollY() { return scrollY; },
    innerHeight: VIEWPORT,
    addEventListener() {},
  };
  globalThis.requestAnimationFrame = () => {}; // tick() is called explicitly

  const section = {
    offsetHeight: HEIGHT,
    getBoundingClientRect: () => ({
      top: TOP - scrollY,
      bottom: TOP + HEIGHT - scrollY,
    }),
  };

  const rendered = [];
  const director = new ScrollDirector({ reducedMotion });
  director.addScrub(section, (progress) => rendered.push(progress));

  return {
    /** @returns {number|undefined} progress, or undefined if the section was culled */
    at(y) {
      scrollY = y;
      rendered.length = 0;
      director.tick(0);
      return rendered[0];
    },
  };
}

test("progress maps linearly across the scrubbable range", () => {
  const { at } = harness();

  assert.equal(at(TOP), 0, "section top is progress 0");
  assert.equal(at(TOP + RANGE * 0.25), 0.25);
  assert.equal(at(TOP + RANGE * 0.5), 0.5);
  assert.equal(at(TOP + RANGE), 1, "end of range is progress 1");
});

test("progress is clamped past the end of the section", () => {
  const { at } = harness();
  assert.equal(at(TOP + RANGE + 900), 1);
});

test("sections far from the viewport are not rendered at all", () => {
  const { at } = harness();

  assert.equal(at(TOP - 2000), undefined, "well above the viewport");
  assert.equal(at(TOP + 9000), undefined, "well below the viewport");
});

test("scenes near the viewport are still rendered", () => {
  const { at } = harness();
  assert.notEqual(at(TOP - VIEWPORT * 0.5), undefined);
});

test("reduced motion pins every scene to its finished state", () => {
  const { at } = harness({ reducedMotion: true });

  assert.equal(at(TOP), 1, "no animation: show the resolved scene immediately");
  assert.equal(at(TOP + RANGE * 0.5), 1);
});
