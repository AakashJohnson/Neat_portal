import { existsSync, readdirSync, readFileSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { projectPath } from '../src/config/paths.js';

const forbidden = new RegExp(['NEAT portal' + ' old', 'migration' + '-docs', 'LARAVEL' + '_REFERENCE_URL'].join('|'), 'i');
const failures = [];
let count = 0;
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'public', 'vendor', 'storage', 'evidence'].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (lstatSync(file).isSymbolicLink()) { failures.push(`${file}: source symlink`); continue; }
    if (entry.isDirectory()) scan(file);
    else if (/\.(?:[cm]?jsx?|json|md|ya?ml)$/.test(entry.name) || entry.name === 'Dockerfile') {
      count++;
      if (forbidden.test(readFileSync(file, 'utf8'))) failures.push(file);
    }
  }
}
for (const name of ['express-backend', 'nextjs-frontend', 'docs']) scan(projectPath('..', name));
for (const name of ['.env', '.env.example']) {
  const file = projectPath(name);
  if (name === '.env' && !existsSync(file)) continue;
  const source = readFileSync(file, 'utf8');
  if (forbidden.test(source)) failures.push(`${name}: obsolete external-project configuration`);
}
if (failures.length) {
  console.error('Standalone check failed:\n' + failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Standalone check passed: ${count} project files; no previous-project paths or reference-server configuration.`);
