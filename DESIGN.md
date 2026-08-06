# Signal from Noise — Design Notes

A narrative, scroll-driven portfolio for **Gunisetty Krishna Sai Jyoteesh** — an aspiring
data scientist in love with AI & machine learning — rebuilt from the materials in
`Portfolio/Main` (the previous React/Vite site). Zero dependencies.

This file covers *why the site looks and reads the way it does*. For the file layout, the
scroll engine and how to run or build it, see [README.md](README.md).

---

## Concept

**"Signal from noise"** — the one sentence that describes what a data scientist actually does,
used as the literal visual metaphor of the site. The prologue opens on a field of drifting
noise particles; as the visitor scrolls, the particles align into a waveform. Every chapter
after that repeats the motif at a different scale: a crowd resolving into a density map, an
X-ray resolving into a diagnosis, a scatter of customers resolving into four segments.

The site reads as a book: ten numbered chapters, each one full viewport, with a fixed chapter
rail (right edge) acting as the table of contents and a hairline progress bar as the bookmark.

## The ten pages

| # | Chapter | Role in the narrative |
|---|---------|----------------------|
| 00 | Prologue | Hook — a 3D point cloud resolves from noise onto a wave surface as you scroll |
| 01 | The Analyst | The protagonist: bio, education, portrait |
| 02 | The Instruments | Toolkit grid — no skill bars, no percentages (they read as noise) |
| 03 | DeepVision | Case study, scroll-scrubbed scene: heatmap forms, count rises, alert fires |
| 04 | CliniScan | Case study, scroll-scrubbed scene: scanline sweep → flagged region → Grad-CAM |
| 05 | Segments | Case study, scroll-scrubbed 3D scene: 150 points converge into k=4 clusters as the camera orbits |
| 06 | Field Notes | The four smaller projects — honest, one paragraph each |
| 07 | The Road | Experience timeline, newest first, "now" marker glowing |
| 08 | Proof | Verifiable numbers + certifications |
| 09 | Epilogue | Value proposition and a single, large contact action |

## Design system

- **Palette** — warm paper `#f6f1e7`, soft ink text `#20242e`, one accent: amber `#a87b2d`.
  The three case-study scenes deliberately stay dark (`#10141b`) — instrument panels set
  into the bright editorial page, which keeps the heatmap/X-ray/cluster visuals legible.
  Each case study carries a restrained tint on the page side (heat `#b8502c`, clinical teal
  `#1f7d74`, EV green `#5d8636`) so the chapters feel distinct without breaking cohesion.
- **Type** — Fraunces (editorial serif, display), Space Grotesk (body/UI),
  JetBrains Mono (data labels, HUDs, chapter numbers). The mono voice is the "instrument"
  voice; the serif is the "narrator" voice.
- **Texture** — SVG film grain at 4.5% + soft vignette, both fixed overlays.

## Why these choices (UX rationale)

- **Scroll-scrub instead of autoplay video**: the visitor controls the pace, so the payoff of
  each scene (alert fires, region flagged, clusters resolve) lands exactly when they earn it.
- **Generative scenes instead of stock photos**: the old site used Unsplash hotlinks — off-topic
  imagery, external dependency, variable resolution. Canvas/SVG scenes are resolution-independent,
  on-message, and demonstrate the work itself.
- **No skill-percentage bars**: "Pandas 95%" is unverifiable decoration. Tools are grouped by
  discipline; the ones actually used in the case studies are highlighted in amber.
- **Illustrative HUD numbers**: the counts in the DeepVision/CliniScan scenes are staged
  visual demonstrations of the product behaviour, not claimed benchmark metrics. No accuracy
  or performance figures appear anywhere unless they exist in the source material.
- **Reduced-motion support**: `prefers-reduced-motion` renders every scene in its final state
  and disables scroll effects.
- **Content in HTML, behaviour in modules**: every word and link lives in `index.html`, so the
  portfolio is fully readable with JavaScript disabled and fully visible to crawlers. The
  scripts are enhancement only — they add motion, never meaning.
- **Two palettes, kept apart**: the page tints are darkened for legibility on paper; the canvas
  scenes keep their luminous originals because they sit on dark panels. Merging them into one
  set would mean tuning one context at the other's expense, so `styles/tokens.css` and
  `scripts/config/palette.js` are deliberately separate (documented in both).
- **3D only where depth means something.** The prologue is 3D because the metaphor is a cloud
  resolving into a surface, and that is a volume. The EV scatter is 3D because segmentation runs
  over many variables at once — a flat plot quietly implies there were two — and because from a
  single angle two clusters can overlap into one blob, so the orbit does real work.
  DeepVision stays flat on purpose: it depicts a camera feed, and tilting a video frame into
  space would be a lie about what CSRNet returns. CliniScan stays flat for the same reason —
  an X-ray is a projection already.
- **The tilt is 5°.** Enough for the toolkit cards and the portrait to read as objects with
  thickness; not enough to look like a template. Skipped entirely for reduced motion and for
  coarse pointers, where a tilt firing on tap reads as a rendering bug.

## Evidence mapping (every fact → its source in `Main/`)

- Name, role, socials — `src/components/Hero.tsx`, `Footer.tsx`
- Bio, LeetCode 500+, education — `src/components/About.tsx`
- CGPA 9.26, four internships, certifications — `src/pages/Resume.tsx`
- All seven projects, links and stacks — `src/pages/ViewAllProjects.tsx`
- Email, location — `src/components/Contact.tsx`
- Portrait — `public/pp.jpg` → `assets/pp.jpg` (monochrome treatment via CSS filter)

## Future enhancements (speculative — not yet built)

- Real measured metrics (MAE for DeepVision, mAP for CliniScan) once benchmarked, replacing
  the illustrative HUD readouts.
- A WebGL upgrade of the prologue scene with pointer interaction.
- Per-case-study deep pages (the current links go to live demos and repos).
- A dark theme keyed to `prefers-color-scheme` (the site shipped dark first, then moved to
  the current bright paper palette; the dark tokens live in git-less history — re-derive if wanted).
- Replacing the mailto action with a serverless form endpoint.
