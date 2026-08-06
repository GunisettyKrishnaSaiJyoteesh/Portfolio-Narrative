# Signal from Noise

The narrative portfolio of **Gunisetty Krishna Sai Jyoteesh** — an aspiring data scientist
in love with AI & machine learning. Ten scroll-driven chapters, no framework, no dependencies.

Design rationale lives in [DESIGN.md](DESIGN.md).

---

## Run it

```bash
node serve.mjs
```

Then open <http://localhost:5173>. Any static server works (`npx serve`, `python -m http.server`);
`serve.mjs` is bundled so the project needs zero setup.

> **Why a server?** The source uses real ES modules, and browsers refuse to load modules over
> `file://`. Opening `index.html` directly shows the page but no animation. To get one
> double-clickable file, build it — see below.

## Test

```bash
node --test
```

Covers the scroll engine's offset → progress mapping, culling, and the reduced-motion path,
against a stubbed DOM — no browser, no dependencies. Everything else is verified visually.

## Build

```bash
node build.mjs
```

Produces `dist/index.html`: every stylesheet and module inlined into one self-contained file
that runs from a USB stick, an email attachment, or any static host. Deploy `dist/`, or deploy
the source tree as-is — both work over http.

## Layout

```
index.html              semantic markup — all copy and links live here
build.mjs               source → dist/index.html (zero dependencies)
serve.mjs               local static server (zero dependencies)
test/                   node --test, stubbed DOM, no browser
assets/                 images
styles/
  tokens.css            palette, type stacks — change the look here first
  base.css              reset, page texture, focus rings
  typography.css        the three voices: serif / sans / mono
  layout.css            .chapter, .frame, .split
  components/           topbar · progress-bar · chapter-rail · button · chip · reveal · scene
  chapters/             one file per chapter of the story
scripts/
  main.js               entry: wires behaviour to markup, starts the loop
  config/palette.js     canvas colours (deliberately separate from CSS tokens)
  core/
    math.js             clamp · lerp · easeInOut · range · pad
    random.js           seeded PRNG — scenes look the same on every visit
    canvas.js           DPR-aware drawing surface + grid
    motion.js           prefers-reduced-motion gate
    scroll-director.js  the single rAF loop; scrub tracks + frame listeners
  ui/                   reveal · chapter-rail · counters · progress-bar
  scenes/               one module per scroll-scrubbed visual
```

### How the scroll engine works

`ScrollDirector` owns the only `requestAnimationFrame` loop on the page. A tall section
registers as a **scrub track** and receives its own `0 → 1` progress each frame; anything else
that just needs `scrollY` registers as a **frame listener**. Sections far from the viewport are
skipped, so the case-study canvases idle while you read the timeline. When the visitor prefers
reduced motion, every track is pinned to progress `1` and the scenes become static illustrations.

A scene module is a factory: it takes its `<section>`, grabs what it needs, and returns
`render(progress, time)`. It owns no scroll logic and no globals.

## Common edits

| Task | Where |
| --- | --- |
| Change the palette | `styles/tokens.css` (page) · `scripts/config/palette.js` (canvas scenes) |
| Add or edit a project | `index.html` — copy a `<article class="note">` in chapter 06 |
| Promote a project to a case study | add a `<section class="chapter case">`, then one line in `SCENES` in `scripts/main.js` |
| Update experience | `index.html`, chapter 07 |
| Update the Proof numbers | `index.html`, chapter 08 — `data-count`, `data-dec`, `data-suffix` |
| Retune a scene | the matching file in `scripts/scenes/` — thresholds are named constants at the top |

Content stays in `index.html` on purpose: it is the SEO-visible, no-JavaScript-required layer.
The scripts are pure enhancement — if `main.js` never loads, the portfolio still reads.

## Deploy

Static hosting, no build config needed.

- **Netlify** — drag the folder in, or set publish directory to `dist` with build command `node build.mjs`
- **GitHub Pages** — push and serve from the repo root (source tree works over http)

## Notes on the bundler

`build.mjs` is ~120 lines and deliberately narrow. It wraps each module in its own scope and
registers it by path, so two modules may reuse a top-level name. It asserts, rather than assumes:

- relative, named-brace imports only — `import { a } from "./x.js"`
- `export` on declarations only — no `export {…}`, no `export default`
- no circular imports, no dynamic `import()`, no top-level `await`

Anything outside that fails the build with a named file and reason. If the project ever outgrows
these rules, swap in esbuild or Vite — nothing in `styles/` or `scripts/` would need to change.
