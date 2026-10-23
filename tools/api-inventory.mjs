// Builds the mechanical part of API_INVENTORY.md from the Laravel route file:
// method, path, controller@action, whether the action exists, and which Angular
// service methods call the endpoint. Read-only over both source trees.
//
//   node tools/api-inventory.mjs > generated/api-routes.md
//   node tools/api-inventory.mjs --json > generated/api-routes.json
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const LARAVEL = path.join(ROOT, 'backend', 'backend');
const ANGULAR_SERVICES = path.join(ROOT, 'frontend', 'frontend', 'src', 'app', 'Services');
const API_CTRL_DIR = path.join(LARAVEL, 'app', 'Http', 'Controllers', 'Api');

const routesSrc = readFileSync(path.join(LARAVEL, 'routes', 'api.php'), 'utf8')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

const routes = [];

// Route::verb('path', 'Controller@method')
for (const m of routesSrc.matchAll(/Route::(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"@]+)@([^'"]+)['"]/g)) {
  routes.push({ method: m[1].toUpperCase(), path: m[2], controller: m[3], action: m[4] });
}
// Route::verb('path', [Controller::class, 'method'])
for (const m of routesSrc.matchAll(/Route::(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]\s*,\s*\[\s*(\w+)::class\s*,\s*['"](\w+)['"]\s*\]/g)) {
  const ctrl = m[3] === 'MobileUserAuthController' ? 'Auth\\MobileUserAuthController' : m[3];
  routes.push({ method: m[1].toUpperCase(), path: m[2], controller: ctrl, action: m[4] });
}
// Route::resource('name', 'Controller', ['except' => 'create'])
for (const m of routesSrc.matchAll(/Route::resource\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*(?:,\s*\[([^\]]*)\])?/g)) {
  const [, name, controller, opts = ''] = m;
  const except = [...opts.matchAll(/['"](\w+)['"]/g)].map((x) => x[1]).filter((x) => x !== 'except');
  const param = `{${name.replace(/s$/, '')}}`;
  const actions = [
    ['GET', name, 'index'],
    ['GET', `${name}/create`, 'create'],
    ['POST', name, 'store'],
    ['GET', `${name}/${param}`, 'show'],
    ['GET', `${name}/${param}/edit`, 'edit'],
    ['PUT', `${name}/${param}`, 'update'],
    ['PATCH', `${name}/${param}`, 'update'],
    ['DELETE', `${name}/${param}`, 'destroy'],
  ].filter(([, , a]) => !except.includes(a));
  for (const [method, p, action] of actions) routes.push({ method, path: p, controller, action, resource: true });
}

const normPath = (p) => '/' + p.replace(/^\/+/, '');

// Controller method existence (an uncommented `function name(`).
const ctrlCache = new Map();
function actionExists(controller, action) {
  const file = path.join(API_CTRL_DIR, ...controller.split('\\')) + '.php';
  if (!existsSync(file)) return { file: null, exists: false };
  if (!ctrlCache.has(file)) {
    const src = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    ctrlCache.set(file, src);
  }
  const src = ctrlCache.get(file);
  return { file: path.relative(LARAVEL, file).replace(/\\/g, '/'), exists: new RegExp(`function\\s+${action}\\s*\\(`).test(src) };
}

// Angular callers: `${baseUrl}/endpoint` (or + '/endpoint') inside service methods.
const callers = new Map();
for (const f of readdirSync(ANGULAR_SERVICES).filter((x) => x.endsWith('.service.ts'))) {
  const src = readFileSync(path.join(ANGULAR_SERVICES, f), 'utf8');
  let currentMethod = null;
  for (const line of src.split('\n')) {
    const md = line.match(/^\s{2}(?:public\s+|private\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[\w<>[\]]+\s*)?\{/);
    if (md && !['constructor', 'if', 'for', 'while', 'switch'].includes(md[1])) currentMethod = md[1];
    if (line.trim().startsWith('//')) continue;
    // `${baseUrl}/x`, baseUrl + '/x', and multi-line concatenations where the
    // path literal '/x' sits on its own line.
    for (const u of line.matchAll(/(?:baseUrl\s*\}?\s*(?:\+\s*['"`])?|^\s*['"`])\/([A-Za-z][A-Za-z0-9\-_.]+)/g)) {
      const ep = '/' + u[1];
      if (!callers.has(ep)) callers.set(ep, []);
      callers.get(ep).push(`${f.replace('.service.ts', '')}.${currentMethod ?? '?'}`);
    }
  }
}

const rows = routes.map((r, i) => {
  const p = normPath(r.path);
  const { file, exists } = actionExists(r.controller, r.action);
  const firstSegment = '/' + p.split('/')[1];
  const calledBy = [...new Set([...(callers.get(p) ?? []), ...(p !== firstSegment ? [] : [])])];
  return {
    id: `API-${String(i + 1).padStart(3, '0')}`,
    method: r.method,
    path: `/api${p}`,
    handler: `${r.controller}@${r.action}`,
    file,
    actionExists: exists,
    angularCallers: calledBy,
  };
});

const routedPaths = new Set(rows.map((r) => r.path.replace(/^\/api/, '')));
const unroutedCalls = [...callers.entries()]
  .filter(([ep]) => !routedPaths.has(ep))
  .map(([ep, by]) => ({ endpoint: ep, callers: [...new Set(by)] }));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ routes: rows, unroutedFrontendCalls: unroutedCalls }, null, 2));
} else {
  const missing = rows.filter((r) => !r.actionExists);
  console.log('<!-- generated by tools/api-inventory.mjs — do not hand-edit -->');
  console.log(`Routes parsed from \`routes/api.php\`: **${rows.length}** (resources expanded). Handler missing: **${missing.length}**. Called by Angular: **${rows.filter((r) => r.angularCallers.length).length}**.`);
  console.log('');
  console.log('| ID | Method | Path | Laravel handler | Handler exists | Angular caller(s) |');
  console.log('|---|---|---|---|---|---|');
  for (const r of rows) {
    console.log(`| ${r.id} | ${r.method} | \`${r.path}\` | \`${r.handler}\` | ${r.actionExists ? 'yes' : '**NO**'} | ${r.angularCallers.join(', ') || '—'} |`);
  }
  console.log('');
  console.log('### Angular calls with no Laravel route');
  console.log('');
  console.log('| Endpoint | Caller(s) |');
  console.log('|---|---|');
  for (const u of unroutedCalls) console.log(`| \`${u.endpoint}\` | ${u.callers.join(', ')} |`);
}
