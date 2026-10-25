import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { scanRepository } from './scanner.mjs';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const rootIndex = args.indexOf('--root');
if (rootIndex >= 0 && !args[rootIndex + 1]) throw new Error('--root requires a directory');
const root = path.resolve(rootIndex >= 0 ? args[rootIndex + 1] : path.join(toolRoot, '..', '..'));
const { manifest } = await scanRepository(root);
await fs.mkdir(path.join(toolRoot, '.cache'), { recursive: true });
await fs.writeFile(path.join(toolRoot, '.cache', 'architecture.json.tmp'), JSON.stringify(manifest, null, 2));
await fs.rename(path.join(toolRoot, '.cache', 'architecture.json.tmp'), path.join(toolRoot, '.cache', 'architecture.json'));
console.log(JSON.stringify({ version: manifest.version, ...manifest.stats, snapshot: manifest.project.schemaSnapshot, output: '.cache/architecture.json' }, null, 2));
if (manifest.stats.scanErrors) process.exitCode = 1;
