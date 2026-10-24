// Copies what the Angular app actually uses into the Next.js app (read-only
// over ../frontend/frontend):
//   1. every asset file referenced from templates/TS/index.html/CSS → public/<same path>
//   2. the global stylesheet cascade from angular.json, @imports expanded in order,
//      url()s rewritten to /legacy/<path> and their targets copied → public/legacy/legacy.css
// Run: node scripts/sync-legacy-assets.mjs   (writes a report to scripts/legacy-assets-report.json)
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const APP = path.resolve(import.meta.dirname, '..');
const NG = path.resolve(APP, '..', '..', 'NEAT portal old', 'frontend', 'frontend');
const NG_SRC = path.join(NG, 'src');
const PUBLIC = path.join(APP, 'public');

const report = { copied: [], missing: [], cssFiles: [], cssAssets: [] };

/** The path as spelled on disk (Windows resolves `12.JPG` to the file `12.jpg`). */
function trueCase(abs) {
  const dir = path.dirname(abs);
  const real = readdirSync(dir).find((n) => n.toLowerCase() === path.basename(abs).toLowerCase());
  return path.join(dir, real ?? path.basename(abs));
}

// Destination names follow the source's real spelling: the Next.js static
// server is case-sensitive (like production), so `12.JPG` must not shadow `12.jpg`.
function copy(fromAbs, toAbs) {
  mkdirSync(path.dirname(toAbs), { recursive: true });
  const src = trueCase(fromAbs);
  const dest = path.join(path.dirname(toAbs), path.basename(src));
  if (existsSync(dest) && trueCase(dest) !== dest) unlinkSync(trueCase(dest)); // wrong-case leftover
  copyFileSync(src, dest);
}

// ---------------------------------------------------------------- 1. assets
const ASSET_RE = /(assets_new|assets)\/[A-Za-z0-9_./ \-()&]+?\.(png|jpe?g|gif|svg|webp|ico|pdf|xlsx|mp4|json|woff2?|ttf|eot|otf)/g;
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|html)$/.test(name)) out.push(full);
  }
  return out;
}
const sources = [...walk(path.join(NG_SRC, 'app')), path.join(NG_SRC, 'index.html')];
const refs = new Set();
for (const f of sources) for (const m of readFileSync(f, 'utf8').matchAll(ASSET_RE)) refs.add(m[0]);
// Loaded dynamically by ngx-translate (prefix + lang + suffix).
['assets/i18n/en.json', 'assets/i18n/fr.json'].forEach((r) => refs.add(r));
// Gallery components: `import ImageName from '…/ImageName.json'` lists file
// names that the template renders as src=".../assets/<dir>/{{image}}".
for (const ts of sources.filter((f) => f.endsWith('.component.ts'))) {
  const imp = readFileSync(ts, 'utf8').match(/import\s+ImageName\s+from\s+'([^']+ImageName\.json)'/);
  const html = ts.replace(/\.ts$/, '.html');
  if (!imp || !existsSync(html)) continue;
  const names = Object.keys(JSON.parse(readFileSync(path.resolve(path.dirname(ts), imp[1]), 'utf8')).Images ?? {});
  for (const m of readFileSync(html, 'utf8').replace(/<!--[\s\S]*?-->/g, '').matchAll(/((?:assets_new|assets)\/[^"{]*\/)\{\{\s*image\s*\}\}/g)) {
    for (const n of names) refs.add(m[1] + n);
  }
}

for (const rel of [...refs].sort()) {
  const from = path.join(NG_SRC, rel);
  if (existsSync(from)) {
    copy(from, path.join(PUBLIC, rel));
    report.copied.push(rel);
  } else {
    report.missing.push(rel);
  }
}

// ------------------------------------------------------------------ 2. CSS
const angular = JSON.parse(readFileSync(path.join(NG, 'angular.json'), 'utf8'));
const project = Object.values(angular.projects)[0];
const styles = project.architect.build.options.styles.map((s) => (typeof s === 'string' ? s : s.input));

function resolveImport(spec, fromDir) {
  if (spec.startsWith('~') || spec.startsWith('@')) return path.join(NG, 'node_modules', spec.replace(/^~/, ''));
  const rel = path.resolve(fromDir, spec);
  if (existsSync(rel)) return rel;
  return path.join(NG_SRC, spec); // Angular resolves bare paths from src/
}

function processCss(file, seen) {
  if (seen.has(file) || !existsSync(file)) {
    if (!existsSync(file)) report.missing.push(path.relative(NG, file));
    return '';
  }
  seen.add(file);
  report.cssFiles.push(path.relative(NG, file).replace(/\\/g, '/'));
  const dir = path.dirname(file);
  let css = readFileSync(file, 'utf8').replace(/^﻿/, '');

  // Expand @import "x"; in place (keeps cascade order). Remote imports are kept.
  css = css.replace(/@import\s+(?:url\()?["']([^"')]+)["']\)?\s*;/g, (all, spec) => {
    if (/^https?:/.test(spec)) return all;
    return processCss(resolveImport(spec, dir), seen);
  });

  // Empty url() never loads anything in a browser; the bundler rejects it.
  css = css.replace(/url\(\s*(['"]?)\s*\1\s*\)/g, 'none /* url() empty in original */');

  // Rewrite url(...) to /legacy/<path relative to the Angular project> and copy the target.
  css = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (all, q, raw) => {
    // /legacy/… was already rewritten while expanding an @import of this file.
    if (/^(data:|https?:|\/\/|#|\/legacy\/)/.test(raw)) return all;
    const clean = raw.split(/[?#]/)[0];
    const suffix = raw.slice(clean.length);
    const target = path.resolve(dir, clean);
    if (!existsSync(target)) {
      // File missing in the original repository too (the browser 404'd on it).
      report.missing.push(`${path.relative(NG, file)} → ${raw}`);
      return `none /* missing in original: ${raw.replace(/\*\//g, '')} */`;
    }
    const rel = path.relative(NG, target).replace(/\\/g, '/');
    copy(target, path.join(PUBLIC, 'legacy', rel));
    report.cssAssets.push(rel);
    return `url("/legacy/${rel}${suffix}")`;
  });
  return `\n/* ---- ${path.relative(NG, file).replace(/\\/g, '/')} ---- */\n${css}\n`;
}

let bundle = '/* generated by scripts/sync-legacy-assets.mjs from angular.json "styles" (order preserved) — do not edit */\n';
// The Angular CLI compiles each "styles" entry separately (postcss-import skips
// duplicates only within one entry), so a file imported by two entries appears
// twice and its second copy wins the cascade again. Reproduce that.
for (const s of styles) bundle += processCss(path.join(NG, s), new Set());

// Remote @imports must come first in a stylesheet.
const remote = [...bundle.matchAll(/@import\s+url\([^)]*\)\s*;|@import\s+["']https?:[^"']+["']\s*;/g)].map((m) => m[0]);
for (const r of remote) bundle = bundle.replace(r, '');
// Served as a static file (public/legacy/legacy.css) rather than bundled: the
// original stylesheets contain syntax errors that browsers skip but the Next.js
// CSS compiler rejects. A plain <link> gives browsers the same lenient parsing
// the Angular build relied on.
mkdirSync(path.join(PUBLIC, 'legacy'), { recursive: true });
writeFileSync(path.join(PUBLIC, 'legacy', 'legacy.css'), [...new Set(remote), bundle].join('\n'));

report.cssAssets = [...new Set(report.cssAssets)];
report.missing = [...new Set(report.missing)];
writeFileSync(path.join(APP, 'scripts', 'legacy-assets-report.json'), JSON.stringify(report, null, 2));
console.log(`assets copied: ${report.copied.length}, css files: ${report.cssFiles.length}, css assets: ${report.cssAssets.length}, missing: ${report.missing.length}`);
