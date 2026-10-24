// Loads every module under src/ with Node's native ESM loader. Vitest's
// transform tolerates missing named exports; Node does not — this catches them.
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve('src');
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.js') && name !== 'server.js') files.push(full);
  }
})(root);

let failed = 0;
for (const f of files) {
  try {
    await import(pathToFileURL(f).href);
  } catch (err) {
    failed++;
    console.error(`FAIL ${path.relative(root, f)}: ${err.message}`);
  }
}
console.log(`${files.length - failed}/${files.length} modules import cleanly`);
process.exit(failed ? 1 : 0);
