import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['.'];
const offenders = [];
for (const root of roots) {
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.next' || name === '.git') continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|mts|cts)$/.test(name) || name === 'tsconfig.json') offenders.push(full);
    }
  })(path.resolve(root));
}
if (offenders.length) {
  console.error(`TypeScript artefacts found:\n${offenders.join('\n')}`);
  process.exit(1);
}
console.log('no TypeScript files or tsconfig.json found');
