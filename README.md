# Signal from Noise

The portfolio of Gunisetty Krishna Sai Jyoteesh — an aspiring data scientist working
with AI and machine learning. One scrolling page, ten chapters, no frameworks.

Design notes are in [DESIGN.md](DESIGN.md).

## Run

```bash
node serve.mjs
```

Then open <http://localhost:5173>. A server is needed because the source uses ES modules.

## Build

```bash
node build.mjs
```

Writes `dist/index.html` — one self-contained file you can open directly or host anywhere.
