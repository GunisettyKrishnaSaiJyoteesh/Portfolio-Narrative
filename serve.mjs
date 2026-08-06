#!/usr/bin/env node
/**
 * Minimal static server for local development — no dependencies.
 *
 *   node serve.mjs          → http://localhost:5173
 *   node serve.mjs 8080     → http://localhost:8080
 *   node serve.mjs 8080 dist
 *
 * Needed because browsers block ES modules over file://. Any static server
 * works (`npx serve`, `python -m http.server`); this one is here so the project
 * has zero setup steps.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

const port = Number(process.argv[2]) || 5173;
const base = resolve(ROOT, process.argv[3] || ".");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const relPath = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";

  // contain every request inside base — no traversal out of the project
  const target = resolve(base, normalize(relPath));
  if (!target.startsWith(base)) {
    res.writeHead(403).end("forbidden");
    return;
  }

  try {
    const body = await readFile(target);
    res.writeHead(200, {
      "content-type": TYPES[extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store", // always serve what is on disk
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use.\n` +
        `  Something is already serving there — try http://localhost:${port} first.\n` +
        `  To use a different port:  node serve.mjs ${port + 1}`
    );
    process.exitCode = 1;
    return;
  }
  throw error;
});

server.listen(port, () => {
  console.log(`serving ${base}\n  → http://localhost:${port}`);
});
