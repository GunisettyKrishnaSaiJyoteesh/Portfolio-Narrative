#!/usr/bin/env node
/**
 * Zero-dependency build: modular source → dist/index.html, one self-contained file.
 *
 *   node build.mjs
 *
 * Why this exists
 * ---------------
 * The source tree is the thing you edit: real ES modules, one stylesheet per
 * concern. Browsers refuse to load ES modules over file://, so a double-clicked
 * index.html would render but stay still. This inlines every stylesheet and
 * flattens the module graph into one classic <script>, producing a file that
 * runs from a USB stick, an email attachment, or any static host.
 *
 * How the module graph is flattened
 * ---------------------------------
 * Each module is wrapped in its own IIFE and registered by path, so two modules
 * are free to declare the same top-level name — exactly as real ES modules are.
 * (An earlier version concatenated module bodies into one scope; two files each
 * declaring `const THRESHOLD` was enough to break it.)
 *
 * Constraints on the source, asserted below rather than assumed:
 *   - relative imports only, no bare specifiers
 *   - named-brace imports only: import { a, b } from "./x.js"
 *   - `export` on declarations only — no `export {…}`, no `export default`
 *   - no circular imports, no top-level await, no dynamic import()
 */
import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(ROOT, "dist");

const IMPORT_LINE_RE = /^[ \t]*import\b.*$/gm;
const NAMED_IMPORT_RE = /^[ \t]*import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?[ \t]*$/;
const EXPORT_NAME_RE = /^[ \t]*export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_KEYWORD_RE = /^([ \t]*)export\s+(?=(?:const|let|var|function|class|async)\b)/gm;
const STYLE_RE = /^[ \t]*<link rel="stylesheet" href="((?!https?:)[^"]+)"\s*\/?>[ \t]*\r?\n/gm;
const SCRIPT_RE = /^[ \t]*<script type="module" src="([^"]+)"><\/script>[ \t]*\r?\n/m;

const id = (file) => relative(ROOT, file).split("\\").join("/");

async function main() {
  let html = await readFile(resolve(ROOT, "index.html"), "utf8");

  // 1 — inline local stylesheets, preserving <link> order (order is the cascade)
  const sheets = [...html.matchAll(STYLE_RE)].map(([, href]) => href);
  if (!sheets.length) throw new Error("no local stylesheets found in index.html");

  const css = [];
  for (const href of sheets) {
    css.push(`/* ${href} */\n${(await readFile(resolve(ROOT, href), "utf8")).trim()}`);
  }

  let stylesInlined = false;
  html = html.replace(STYLE_RE, () => {
    if (stylesInlined) return "";
    stylesInlined = true;
    return `<style>\n${css.join("\n\n")}\n</style>\n`;
  });

  // 2 — flatten the module graph behind the entry script
  const entry = html.match(SCRIPT_RE);
  if (!entry) throw new Error('no <script type="module" src="…"> entry found');

  const entryFile = resolve(ROOT, entry[1]);
  const modules = [];
  await collect(entryFile, modules, new Set(), []);

  const bundle = [
    "(() => {",
    '"use strict";',
    "const __modules = {};",
    "const __require = (path) => __modules[path];",
    ...modules,
    `__require(${JSON.stringify(id(entryFile))});`,
    "})();",
  ].join("\n");

  html = html.replace(SCRIPT_RE, `<script>\n${bundle}\n</script>\n`);

  // 3 — emit. Overwrite in place rather than wiping the directory: a browser
  //     or editor holding dist/ open must not be able to fail the build.
  await mkdir(DIST, { recursive: true });
  await writeFile(resolve(DIST, "index.html"), html, "utf8");
  await cp(resolve(ROOT, "assets"), resolve(DIST, "assets"), { recursive: true });

  const kb = (Buffer.byteLength(html, "utf8") / 1024).toFixed(1);
  console.log(`dist/index.html  ${kb} kB  (${sheets.length} stylesheets, ${modules.length} modules)`);
}

/** Post-order DFS: a module is registered only after everything it imports. */
async function collect(file, out, done, stack) {
  if (done.has(file)) return;
  if (stack.includes(file)) {
    throw new Error(`circular import: ${[...stack, file].map(id).join(" → ")}`);
  }

  let source = await readFile(file, "utf8");
  assertSupported(file, source);

  // resolve dependencies first
  const rewrites = [];
  for (const line of source.match(IMPORT_LINE_RE) || []) {
    const match = line.match(NAMED_IMPORT_RE);
    if (!match) {
      throw new Error(`${id(file)}: unsupported import form — use "import { a } from './x.js'"\n    ${line.trim()}`);
    }

    const [, bindings, specifier] = match;
    if (!specifier.startsWith(".")) {
      throw new Error(`${id(file)}: bare import "${specifier}" cannot be bundled`);
    }

    const dep = resolve(dirname(file), specifier);
    await collect(dep, out, done, [...stack, file]);
    rewrites.push([line, `const {${bindings}} = __require(${JSON.stringify(id(dep))});`]);
  }

  done.add(file);

  const exported = [...source.matchAll(EXPORT_NAME_RE)].map(([, name]) => name);
  for (const [from, to] of rewrites) source = source.replace(from, to);
  source = source.replace(EXPORT_KEYWORD_RE, "$1").trim();

  out.push(
    `// ── ${id(file)}\n` +
      `__modules[${JSON.stringify(id(file))}] = (() => {\n` +
      `${source}\n` +
      `return { ${exported.join(", ")} };\n` +
      `})();`
  );
}

function assertSupported(file, source) {
  if (/^\s*export\s+default\b/m.test(source)) {
    throw new Error(`${id(file)}: export default is not supported by this bundler`);
  }
  if (/^\s*export\s*\{/m.test(source)) {
    throw new Error(`${id(file)}: export lists are not supported — put export on the declaration`);
  }
  if (/\bimport\s*\(/.test(source)) {
    throw new Error(`${id(file)}: dynamic import() cannot be bundled`);
  }
}

main().catch((error) => {
  console.error(`build failed: ${error.message}`);
  process.exitCode = 1;
});
