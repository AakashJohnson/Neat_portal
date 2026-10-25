import path from 'node:path';
import { discover, readSource } from './files.mjs';
import { Graph, ev } from './manifest.mjs';
import { SqlModel } from './sql.mjs';
import { parseModule, resolveImports, extractRoutes, extractQueries, extractApiCalls, extractMigrations } from './analyze.mjs';
import { diagnostics } from './diagnostics.mjs';

export const limitations = [
  'Static source evidence only. Scanned JavaScript is parsed, never imported or executed. No database connection, migration or network introspection is performed.',
  'Runtime deployment provider, active database name/prefix, origin values, conditional routing and authorization effectiveness are UNKNOWN.',
  'BFF URL rewriting is labeled inferred. Method/path matching does not prove that the configured runtime origin serves this repository.',
  'Request/response fields are partial observations, not validated API contracts. Dynamic URLs, computed exports, complex factories and re-export chains beyond 12 hops may remain unresolved.',
  'SQL relationships come from explicit file declarations. Knex accesses refer to logical table names; dynamic prefixes and schemas are not evaluated. Joins do not imply foreign keys.',
  'The selected schema snapshot is historical, not live. Defaults, comments, row data, raw SQL and credential values are not included. Migration execution history is UNKNOWN.',
  'Potential unused code, missing callers/guards/tests, duplicated code and raw SQL signals are review hints, not proof of defects or exploitable vulnerabilities.',
  'Asset/generated/vendor directories, private environment files, symlinks and hardlinks are excluded. File/byte budgets and unsupported syntax are reported.',
  'Analysis does not model arbitrary JavaScript execution, runtime reflection, dependency injection, all ORM DSLs, or full TypeScript type inference.',
];

export async function scanRepository(root, options = {}) {
  const started = performance.now();
  const discovery = await discover(root, options);
  const graph = new Graph(), sql = new SqlModel(graph), modules = new Map(), aliases = [], snapshots = [], packages = [], jsonFiles = new Map();
  const filePaths = discovery.files.map(f => f.path);
  for (const item of discovery.errors) graph.diagnostic('discovery-error', item.reason, ev(item.path, 1, 'Filesystem discovery'), [], 'error');
  for (const item of discovery.skips.filter(s => s.reason.endsWith('budget'))) graph.diagnostic('scan-budget', `Source excluded by ${item.reason}.`, ev(item.path, 1, 'Discovery budget'), [], 'warning');
  for (const file of filePaths) {
    try {
      if (/\.[cm]?[jt]sx?$/.test(file)) {
        modules.set(file, parseModule(file, await readSource(discovery.root, file), graph));
      } else if (file.endsWith('.json')) {
        let parsed;
        try { parsed = JSON.parse(await readSource(discovery.root, file)); }
        catch { graph.diagnostic('json-parse', 'JSON metadata could not be parsed; contents omitted.', ev(file), [], 'error'); continue; }
        if (file.endsWith('/package.json') || file === 'package.json') { packages.push({ file, parsed }); jsonFiles.set(file, parsed); }
        else if (file.endsWith('package-lock.json')) jsonFiles.set(file, parsed);
        else if (/(?:jsconfig|tsconfig)\.json$/.test(file)) {
          const base = path.posix.dirname(file);
          for (const [pattern, targets] of Object.entries(parsed.compilerOptions?.paths ?? {})) {
            if (pattern.endsWith('*') && Array.isArray(targets) && typeof targets[0] === 'string') aliases.push({ base: base === '.' ? '' : base + '/', prefix: pattern.slice(0, -1), target: path.posix.join(parsed.compilerOptions?.baseUrl ?? '.', targets[0].replace(/\*$/, '')) });
          }
        } else if (/schema-baseline.*\.json$/.test(file) && parsed.structure?.tables) snapshots.push({ file, parsed });
      } else if (file.endsWith('.sql')) {
        graph.add(`file:${file}`, path.posix.basename(file), /migrat/i.test(file) ? 'migration' : 'SQL file', 'sql', file, ev(file), {});
        sql.ddl(await readSource(discovery.root, file), file);
      } else if (/Dockerfile$|\.ya?ml$|\.prisma$|\.env\.example$/.test(file)) {
        const kind = file.endsWith('Dockerfile') ? 'Docker definition' : file.endsWith('.env.example') ? 'environment template' : file.endsWith('.prisma') ? 'ORM schema' : 'configuration';
        const id = graph.add(`file:${file}`, path.posix.basename(file), kind, 'infrastructure', file, ev(file, 1, 'Configuration file presence; deployment UNKNOWN', 'configuration'), {});
        if (file.endsWith('.env.example')) {
          const source = await readSource(discovery.root, file);
          graph.nodes.get(id).metadata.environmentKeys = [...source.matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)].map(m => m[1]);
        }
        if (file.endsWith('.prisma')) graph.diagnostic('unsupported-schema', 'Prisma schema found; this MySQL/Knex adapter does not parse Prisma model relationships.', ev(file), [id]);
      }
    } catch {
      graph.diagnostic('file-read', 'File changed, exceeded a limit, or could not be read safely. Contents and filesystem error text omitted.', ev(file), [], 'error');
    }
  }
  const dependencyVersions = {};
  for (const { file, parsed } of packages) {
    const directory = path.posix.dirname(file);
    const nodeId = graph.add(`file:${file}`, `${directory} package`, 'application package', 'infrastructure', file, ev(file, 1, 'Dependency manifest', 'configuration'), {});
    const lock = jsonFiles.get(path.posix.join(directory, 'package-lock.json'));
    const versions = {};
    for (const [name, range] of Object.entries({ ...parsed.dependencies, ...parsed.devDependencies })) {
      const version = lock?.packages?.[`node_modules/${name}`]?.version ?? range;
      if (typeof version === 'string' && /^[~^<>=*\d.a-zA-Z| -]+$/.test(version)) versions[name] = version;
    }
    dependencyVersions[directory] = versions;
    graph.nodes.get(nodeId).metadata.versions = versions;
    for (const candidate of graph.nodes.values()) if (candidate.path?.startsWith(directory + '/') && candidate.type === 'Docker definition') graph.link(nodeId, candidate.id, 'deployed with', ev(candidate.path, 1, 'Dockerfile accompanies package; actual deployment UNKNOWN', 'configuration'));
  }
  const { resolveName } = resolveImports(modules, filePaths, aliases, graph);
  extractMigrations(modules, sql, graph);
  snapshots.sort((a, b) => Number(/test/i.test(a.parsed.schema)) - Number(/test/i.test(b.parsed.schema)) || String(b.parsed.capturedAt).localeCompare(String(a.parsed.capturedAt)));
  const snapshot = options.schemaName ? snapshots.find(s => s.parsed.schema === options.schemaName) : snapshots[0];
  if (options.schemaName && !snapshot) graph.diagnostic('schema-selection', 'Requested schema snapshot was not found.', ev('', 0, 'Startup schema selection'), [], 'error');
  if (snapshot) {
    try { sql.loadSnapshot(snapshot.parsed, snapshot.file); }
    catch { graph.diagnostic('schema-parse', 'Schema snapshot shape is unsupported or invalid.', ev(snapshot.file), [], 'error'); }
  }
  const endpoints = extractRoutes(modules, graph, resolveName);
  extractQueries(modules, sql, graph);
  extractApiCalls(modules, endpoints, graph, resolveName);
  sql.finish();
  diagnostics(graph, modules, endpoints);
  const nodes = [...graph.nodes.values()];
  const tables = nodes.filter(n => n.type === 'table');
  const usedPackages = nodes.filter(n => n.type === 'package').map(n => n.label);
  const manifest = graph.finish({
    name: path.basename(discovery.root),
    stack: { next: usedPackages.includes('next') || nodes.some(n => n.type.startsWith('Next ')), express: usedPackages.includes('express'), sqlEngine: nodes.some(n => n.type === 'SQL client' && n.metadata.driver === 'mysql2') ? 'MySQL (mysql2 configured; server version from snapshot only)' : sql.snapshot ? 'MySQL snapshot' : 'UNKNOWN', dataAccess: usedPackages.includes('knex') ? 'Knex' : 'UNKNOWN', deployment: 'UNKNOWN', workers: 'UNKNOWN' },
    versions: dependencyVersions, schemaSnapshot: sql.snapshot, availableSnapshots: snapshots.map(s => ({ path: s.file, selected: s === snapshot })),
  }, {
    analyzedFiles: filePaths.length, parsedModules: [...modules.values()].filter(m => !m.broken).length,
    skippedFiles: discovery.skips.length, skipReasons: discovery.skips.reduce((a, s) => ({ ...a, [s.reason]: (a[s.reason] ?? 0) + 1 }), {}),
    nodes: graph.nodes.size, edges: graph.edges.size, endpoints: endpoints.length, tables: tables.length,
    declaredTables: tables.filter(n => n.metadata.definition === 'declared').length,
    columns: tables.reduce((sum, n) => sum + n.metadata.columns.length, 0),
    foreignKeys: tables.reduce((sum, n) => sum + n.metadata.foreignKeys.length, 0),
    unresolvedReferences: graph.diagnostics.filter(d => /unresolved|dynamic|unmatched|unmounted/.test(d.kind)).length,
    scanErrors: graph.diagnostics.filter(d => d.level === 'error').length, durationMs: Math.round(performance.now() - started), bytesReadBudget: discovery.bytes,
  }, limitations);
  return { manifest, discovery };
}
