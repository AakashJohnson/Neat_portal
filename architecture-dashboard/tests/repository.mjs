import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanRepository } from '../server/scanner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { manifest } = await scanRepository(root);
assert.equal(manifest.stats.declaredTables, 48, 'All baseline tables must be retained');
assert.equal(manifest.stats.columns, 621, 'Legacy column names containing spaces must not be discarded');
assert.equal(manifest.stats.foreignKeys, 9, 'Only the nine explicitly declared baseline foreign keys are counted');
assert.equal(manifest.stats.scanErrors, 0, 'The current repository must parse without errors');
assert(manifest.nodes.some(n => n.id === 'api:express:POST:/api/login'), 'Login must resolve through the Express mount graph');
assert(manifest.nodes.some(n => n.type === 'SQL client' && n.metadata.driver === 'mysql2'), 'The SQL engine must come from the configured client, not just an installed dependency');
assert(manifest.edges.some(e => e.confidence === 'inferred' && e.evidence.some(v => v.detail.includes('BFF'))), 'BFF rewrites must be traced and explicitly inferred');
assert(!manifest.nodes.some(n => n.path?.includes('.playwright-mcp') || /(?:^|\/)\.env(?:$|\.(?!example$))/.test(n.path ?? '')), 'Generated browser output and private environments must be excluded');
console.log('Repository verification PASS:', JSON.stringify(manifest.stats));
