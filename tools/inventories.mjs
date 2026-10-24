// Generates FRONTEND_INVENTORY.md, BACKEND_INVENTORY.md and API_INVENTORY.md
// from the original trees (read-only), Laravel's `route:list --json`
// (generated/laravel-route-list.json) and the migrated trees.
//   node tools/inventories.mjs
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DOCS = path.resolve(import.meta.dirname, '..');
const ROOT = path.resolve(DOCS, '..');
const OLD = path.resolve(ROOT, '..', 'NEAT portal old');
const ANGULAR = path.join(OLD, 'frontend', 'frontend', 'src', 'app');
const LARAVEL = path.join(OLD, 'backend', 'backend');
const NEXT = path.join(ROOT, 'nextjs-frontend', 'src');
const EXPRESS = path.join(ROOT, 'express-backend', 'src');

const walk = (dir, pred) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        const p = path.join(dir, d.name);
        if (d.isDirectory()) return d.name === 'node_modules' ? [] : walk(p, pred);
        return pred(p) ? [p] : [];
      })
    : [];
const lines = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').length : 0);
const rel = (base, f) => path.relative(base, f).replaceAll('\\', '/');
const code = (s) => `\`${s}\``;
const row = (cells) => `| ${cells.map((c) => String(c ?? '').replaceAll('|', '\\|')).join(' | ')} |`;
const table = (head, rows) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');

const nextFiles = walk(NEXT, (f) => /\.(js|jsx|mjs)$/.test(f)).map((f) => [f, readFileSync(f, 'utf8')]);
const expressFiles = walk(EXPRESS, (f) => f.endsWith('.js')).map((f) => [f, readFileSync(f, 'utf8')]);
const mentions = (files, base, needle, limit = 3) =>
  files
    .filter(([, src]) => src.includes(needle))
    .slice(0, limit)
    .map(([f]) => code(rel(base, f)))
    .join(', ');

// ------------------------------------------------------------- frontend

/** Next.js App Router: route pattern → page/route file (route groups removed). */
const nextRoutes = new Map();
for (const [f] of nextFiles) {
  const name = path.basename(f);
  if (!/^(page|route)\.js$/.test(name)) continue;
  const r = rel(path.join(NEXT, 'app'), path.dirname(f))
    .split('/')
    .filter((s) => s && s !== '.' && !/^\(.*\)$/.test(s))
    .join('/');
  nextRoutes.set(`/${r}`.replace(/\/$/, '') || '/', rel(NEXT, f));
}
const nextPageFor = (urlPattern) => nextRoutes.get(urlPattern) ?? null;

// Flat dump of app-routing.module.ts: a "{children}" line opens a parent whose
// children follow (unindented) until the next parent; "" is the default child.
let parent = null;
const angularRoutes = readFileSync(path.join(DOCS, 'generated', 'angular-routes-effective.txt'), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => {
    const m = /^(\S*)\s+(\S+)(?:\s+\[([^\]]*)\])?/.exec(l.startsWith(' ') ? `''${l}` : l);
    const own = m[1] === "''" ? '' : m[1];
    if (l.includes('{children}')) {
      parent = own;
      return { path: own, component: m[2], guards: m[3] ?? '' };
    }
    return { path: parent === null ? own : [parent, own].filter(Boolean).join('/'), component: m[2], guards: m[3] ?? '' };
  });

const routeRows = angularRoutes.map((r, i) => {
  const pattern = `/${r.path.replace(/:(\w+)/g, '[$1]')}`.replace(/\/$/, '') || '/';
  const page = r.path === '**' ? nextRoutes.get('/[...notFound]') : nextPageFor(pattern);
  return [`FE-R${String(i + 1).padStart(3, '0')}`, code(`/${r.path}`), r.component, r.guards || '—', page ? code(page) : '**MISSING**', page ? 'IMPLEMENTED' : 'MISSING'];
});

// Checked by hand (no port file names them): why there is nothing to port.
const UNREACHABLE = 'UNREACHABLE (not ported)';
const COMPONENT_NOTES = {
  'free-seat-applications': [UNREACHABLE, 'imported in app-routing.module.ts but in no effective route; only its spec references it'],
  'video-preview': [UNREACHABLE, 'opened by CourseDetailsComponent.showPreview(), which no template calls'],
  'custom-pagination': [UNREACHABLE, 'selector used nowhere; only its spec references it'],
  'download-gallery': [UNREACHABLE, 'route import commented out; only its spec references it'],
  'owl-carousel': [UNREACHABLE, '<app-owl-carousel> is commented out in landing-page.component.html'],
  'login-dialog': [UNREACHABLE, 'the navbar open() call is commented out; only RegisterDialog (itself unreachable) opens it'],
  'register-dialog': [UNREACHABLE, 'opened only by LoginDialog (unreachable); the navbar open() call is commented out'],
  'resend-email-verification-mail': [UNREACHABLE, 'opened by NavbarComponent.resendVerificationEmailPassword(), which no template calls'],
  'company-add-product': [UNREACHABLE, 'imported in app-routing.module.ts but in no effective route'],
  'student-applied-courses': [UNREACHABLE, 'imported in app-routing.module.ts but in no effective route'],
  'transaction-id-dialog': [UNREACHABLE, 'opened only by StudentAppliedCoursesComponent (unreachable)'],
  'student-courses': [UNREACHABLE, 'imported in app-routing.module.ts but in no effective route'],
};
const PANEL = 'app/(panel)/panel';
const VIEW_NOTES = {
  'auth/token.blade.php': ['BLOCKED', 'Authy 2FA token form (R-45)'],
  'auth/tos.blade.php': ['PORTED', `\`${PANEL}/(auth)/register/page.js\` (TosModal)`],
  'user/partials/two-factor.blade.php': ['BLOCKED', 'Authy 2FA (R-45)'],
  'user/two-factor-verification.blade.php': ['BLOCKED', 'Authy 2FA (R-45)'],
  'user/partials/auth.blade.php': ['PORTED', '`components/panel/userForms.jsx` (AuthFields)'],
  'user/partials/avatar.blade.php': ['PORTED', '`components/panel/userForms.jsx` (AvatarCard)'],
  'user/partials/details.blade.php': ['PORTED', '`components/panel/userForms.jsx` (DetailsFields)'],
  'user/partials/row.blade.php': ['PORTED', `\`${PANEL}/(app)/users/page.js\` (Row)`],
  'partials/sidebar/items.blade.php': ['PORTED', '`components/panel/PanelShell.jsx`'],
  'partials/sidebar/main.blade.php': ['PORTED', '`components/panel/PanelShell.jsx`'],
  'announcements::partials/navbar/item.blade.php': ['PORTED', '`components/panel/PanelShell.jsx` (AnnouncementsNavbar)'],
  'announcements::partials/scripts.blade.php': ['PORTED', '`components/panel/PanelShell.jsx` (announcements.js: mark read)'],
  'announcements::partials/styles.blade.php': ['PORTED', `\`${PANEL}/(app)/layout.js\` (announcements.css)`],
  'vendor/pagination/bootstrap-4.blade.php': ['PORTED', '`components/panel/Pagination.jsx`'],
  'vendor/pagination/default.blade.php': [UNREACHABLE, 'Laravel default view; the app renders bootstrap-4'],
  'vendor/pagination/simple-bootstrap-4.blade.php': [UNREACHABLE, 'simplePaginate() is not used'],
  'vendor/pagination/simple-default.blade.php': [UNREACHABLE, 'simplePaginate() is not used'],
  'mail/check-emai-status.blade.php': [UNREACHABLE, 'CheckEmailVerification mailable is never sent'],
  'mail/free-seat-allocation.blade.php': ['UNRESOLVED', 'sent only by the free-seat engine behind ProductController@allocateseat, which does not exist (R-03)'],
  'mail/grievance-raised.blade.php': [UNREACHABLE, 'every GrievanceRaised send is commented out in GrievanceController'],
  'mail/productemail.blade.php': [UNREACHABLE, 'no mailable renders it'],
  'mail/institute-payment.blade.php': ['PORTED', '`express-backend/src/integrations/mail/templates/paymentMails.js`'],
  'mail/learner-payment.blade.php': ['PORTED', '`express-backend/src/integrations/mail/templates/paymentMails.js`'],
};
for (const v of ['html/promotion', 'html/subcopy', 'text/promotion', 'text/subcopy']) VIEW_NOTES[`vendor/mail/${v}.blade.php`] = ['PORTED', '`express-backend/src/integrations/mail/markdownMail.js` (Laravel mail theme)'];
for (const v of ['email', 'email-plain']) VIEW_NOTES[`vendor/notifications/${v}.blade.php`] = [UNREACHABLE, 'notifications are not used; every mail is a Mailable'];
for (const w of ['banned-users', 'latest-registrations', 'new-users', 'registration-history-scripts', 'registration-history', 'total-users', 'unconfirmed-users', 'user-actions']) VIEW_NOTES[`plugins/dashboard/widgets/${w}.blade.php`] = ['PORTED', `\`${PANEL}/(app)/page.js\` (dashboard widgets)`];
for (const s of ['auth', 'recaptcha', 'registration', 'throttling', 'two-factor']) VIEW_NOTES[`settings/partials/${s}.blade.php`] = ['PORTED', `\`${PANEL}/(app)/settings/auth/page.js\``];
const INSTALLER = ['NOT PORTED', 'Vanguard installer (runs migrations; spec forbids DDL)'];

const components = walk(ANGULAR, (f) => f.endsWith('.component.ts')).map((f) => {
  const base = f.replace(/\.ts$/, '');
  const kebab = path.basename(base).replace(/\.component$/, '');
  const total = lines(f) + lines(`${base}.html`) + lines(`${base}.css`) + lines(`${base}.scss`);
  const cls = /export class (\w+)/.exec(readFileSync(f, 'utf8'))?.[1];
  const port = mentions(nextFiles, NEXT, `${kebab}.component`) || (cls && mentions(nextFiles, NEXT, cls, 2)) || mentions(nextFiles, NEXT, kebab, 2);
  const note = !port && COMPONENT_NOTES[kebab];
  if (note) return [code(rel(ANGULAR, path.dirname(f)) || '.'), `${kebab}.component`, total, note[1], note[0]];
  return [code(rel(ANGULAR, path.dirname(f)) || '.'), `${kebab}.component`, total, port || '—', port ? 'PORTED' : 'REVIEW'];
});

const services = walk(ANGULAR, (f) => f.endsWith('.service.ts')).map((f) => {
  const src = readFileSync(f, 'utf8');
  const http = (src.match(/this\.http\.(get|post|put|patch|delete)/g) ?? []).length;
  const name = path.basename(f, '.ts');
  return [code(rel(ANGULAR, f)), http, mentions(nextFiles, NEXT, name, 3) || '—'];
});

const VIEWS_DIR = path.join(LARAVEL, 'resources', 'views');
const PLUGIN_VIEWS = path.join(LARAVEL, 'vendor', 'neatapp', 'announcements', 'resources', 'views');
const views = [
  ...walk(VIEWS_DIR, (f) => f.endsWith('.blade.php')).map((f) => rel(VIEWS_DIR, f)),
  ...walk(PLUGIN_VIEWS, (f) => f.endsWith('.blade.php')).map((f) => `announcements::${rel(PLUGIN_VIEWS, f)}`),
];
const viewNeedles = (v) => {
  const plain = v.replace(/^announcements::/, '');
  const dotted = plain.replace(/\.blade\.php$/, '').replaceAll('/', '.');
  return v.startsWith('announcements::') ? [`announcements::${dotted}`, `announcements::${plain.replace(/\.blade\.php$/, '')}`] : [plain, dotted];
};
const viewRows = views.map((v) => {
  const found = viewNeedles(v).map((n) => mentions(nextFiles, NEXT, n, 2)).find(Boolean);
  const isMail = /(^|\/)(mail|emails?)\//.test(v) || v.includes('::mail/');
  const ported = found || (isMail && (mentions(expressFiles, EXPRESS, path.basename(v, '.blade.php'), 1) ? '(mail template, Express)' : ''));
  const note = !ported && (VIEW_NOTES[v] ?? (/^(install\/|layouts\/install)/.test(v) ? INSTALLER : null));
  if (note) return [code(v), note[1], note[0]];
  return [code(v), ported || '—', ported ? 'PORTED' : 'REVIEW'];
});

// -------------------------------------------------------------- backend

const CONTROLLER_NOTES = {
  'Api\\EvaluatorController': 'UNREACHABLE: no route points to it (not ported)',
  'Api\\sendSms': 'UNREACHABLE: SMS helper whose only call (RegistrationController::sendOTPSMS) is commented out ("service not in use", 29 May 2025); not ported',
  'Api\\Auth\\Password\\ResetController': 'UNREACHABLE: its route is commented out in routes/api.php (not ported)',
};
// Called at output time: unnamed ports are traced through the routes that
// point at the controller (API → Express endpoint file, web → Next.js page).
const controllerRows = () =>
  walk(path.join(LARAVEL, 'app', 'Http', 'Controllers'), (f) => f.endsWith('.php')).map((f) => {
    const src = readFileSync(f, 'utf8');
    const cls = /class\s+(\w+)/.exec(src)?.[1] ?? path.basename(f, '.php');
    const methods = [...src.matchAll(/public function (\w+)/g)].map((m) => m[1]).filter((m) => m !== '__construct');
    const relPath = rel(path.join(LARAVEL, 'app', 'Http', 'Controllers'), f);
    const ns = relPath.replace(/\.php$/, '').replaceAll('/', '\\');
    const named = mentions(expressFiles, EXPRESS, `${cls}@`, 3) || mentions(expressFiles, EXPRESS, `${cls}::`, 3) || mentions(expressFiles, EXPRESS, cls, 3);
    if (named) return [code(ns), lines(f), methods.length, named];
    const own = routeList.filter((r) => r.action.split('Controllers\\').pop().split('@')[0] === ns);
    const apiFiles = new Set(
      own
        .filter((r) => r.uri.startsWith('api/'))
        .flatMap((r) => r.method.replace('|HEAD', '').split('|').map((m) => norm(`${m} /${r.uri.replace(/\{(\w+)\??\}/g, ':$1')}`)))
        .map((k) => expressEndpoints.find((e) => norm(`${e.method} ${e.path}`) === k)?.file)
        .filter(Boolean),
    );
    const pages = new Set(webRows.filter((w) => w[3].split('@')[0] === ns && w[5] !== '—').map((w) => w[5]));
    const traced = [...[...apiFiles].map(code), ...pages].join(', ');
    const status = webRows.find((w) => w[3].split('@')[0] === ns && w[7] !== 'IMPLEMENTED');
    return [code(ns), lines(f), methods.length, traced || CONTROLLER_NOTES[ns] || (status ? `${status[7]}: ${status[8]}` : '—')];
  });

const routeList = JSON.parse(readFileSync(path.join(DOCS, 'generated', 'laravel-route-list.json'), 'utf8'));
const webRoutes = routeList.filter((r) => !r.uri.startsWith('api/'));

// Non-GET web routes: the panel page that submits them and the API call it makes.
const WEB_ACTIONS = {
  'POST login': ['/panel/login', 'POST /api/panel/login (via /api/panel/session)'],
  'GET logout': ['/panel/logout', 'POST /api/logout (via DELETE /api/panel/session)'],
  'POST register': ['/panel/register', 'POST /api/panel/register'],
  'POST password/email': ['/panel/password/reset', 'POST /api/panel/password/remind'],
  'POST password/reset': ['/panel/password/reset/[token]', 'POST /api/panel/password/reset'],
  'POST email/resend': ['/panel/email/verify', 'POST /api/panel/email/resend'],
  'POST announcements': ['/panel/announcements/create', 'POST /api/panel/announcements'],
  'PUT|PATCH announcements/{announcement}': ['/panel/announcements/[id]/edit', 'PUT /api/panel/announcements/:id'],
  'DELETE announcements/{announcement}': ['/panel/announcements', 'DELETE /api/panel/announcements/:id'],
  'POST announcements/read': ['(navbar)', 'POST /api/announcements/read'],
  'POST permissions': ['/panel/permissions/create', 'POST /api/permissions'],
  'POST permissions/save': ['/panel/permissions', 'POST /api/panel/permissions/save'],
  'PUT|PATCH permissions/{permission}': ['/panel/permissions/[id]/edit', 'PUT /api/permissions/:id'],
  'DELETE permissions/{permission}': ['/panel/permissions', 'DELETE /api/permissions/:id'],
  'POST roles': ['/panel/roles/create', 'POST /api/roles'],
  'PUT|PATCH roles/{role}': ['/panel/roles/[id]/edit', 'PUT /api/roles/:id'],
  'DELETE roles/{role}': ['/panel/roles', 'DELETE /api/roles/:id'],
  'POST settings/general': ['/panel/settings', 'POST /api/panel/settings/general'],
  'POST settings/auth': ['/panel/settings/auth', 'POST /api/panel/settings/auth'],
  'POST settings/notifications': ['/panel/settings/notifications', 'POST /api/panel/settings/notifications'],
  'POST settings/auth/registration/captcha/enable': ['/panel/settings/auth', 'POST /api/panel/settings/auth {registration.captcha.enabled}'],
  'POST settings/auth/registration/captcha/disable': ['/panel/settings/auth', 'POST /api/panel/settings/auth {registration.captcha.enabled}'],
  'POST users': ['/panel/users/create', 'POST /api/users'],
  'DELETE users/{user}': ['/panel/users', 'DELETE /api/users/:id'],
  'PUT users/{user}/update/details': ['/panel/users/[id]/edit', 'PUT /api/users/:id'],
  'PUT users/{user}/update/login-details': ['/panel/users/[id]/edit', 'PUT /api/users/:id'],
  'POST users/{user}/update/avatar': ['/panel/users/[id]/edit', 'PUT /api/users/:id/avatar'],
  'POST users/{user}/update/avatar/external': ['/panel/users/[id]/edit', 'PUT /api/users/:id/avatar/external'],
  'DELETE users/{user}/sessions/{session}/invalidate': ['/panel/users/[id]/sessions', 'DELETE /api/sessions/:id'],
  'PUT profile/details': ['/panel/profile', 'PATCH /api/me/details'],
  'PUT profile/login-details': ['/panel/profile', 'PATCH /api/me/details/auth'],
  'POST profile/avatar': ['/panel/profile', 'PUT /api/me/avatar'],
  'POST profile/avatar/external': ['/panel/profile', 'PUT /api/me/avatar/external'],
  'DELETE profile/sessions/{session}/invalidate': ['/panel/profile/sessions', 'DELETE /api/sessions/:id'],
  'POST create-company-profile': ['/panel/create-company-profile', 'POST /api/panel/company-profile'],
  'POST fetch-neat-id': ['/panel/create-company-profile', 'POST /api/panel/company-profile/fetch-neat-id'],
  'POST get-all-product': ['/panel/product', 'POST /api/panel/company-profile/products'],
  'POST get-product-details': ['/panel/product', 'POST /api/panel/company-profile/product-details'],
  'POST create-product': ['/panel/product', 'POST /api/panel/company-profile/create-product'],
  'GET impersonate/take/{id}/{guardName?}': ['/panel/users (actions)', 'POST /api/panel/impersonate/:user (via /api/panel/impersonate)'],
  'GET impersonate/leave': ['(navbar)', 'POST /api/panel/impersonate/leave (via /api/panel/impersonate)'],
};
const NOT_PORTED = [
  [/^_ignition|^_debugbar/, 'NOT PORTED', 'Development tooling (Ignition / Debugbar), not an application feature'],
  [/^install/, 'NOT PORTED', 'Vanguard installer: runs migrations and seeds (would change the database; spec forbids DDL)'],
  [/two-factor|auth\/two-factor-authentication/, 'BLOCKED', 'Authy 2FA: no AUTHY_KEY (R-45)'],
  [/^auth\/\{provider\}\/callback/, 'BLOCKED', 'Social login: no provider keys (R-45, DEV-F12)'],
  [/^permissions\/\{permission\}$/, 'UNRESOLVED', 'Resource route to PermissionsController@show, which does not exist (500 in the original); Next.js answers 404'],
];

const webRows = webRoutes.map((r, i) => {
  const method = r.method.replace('|HEAD', '');
  const key = `${method} ${r.uri}`;
  const id = `WEB-${String(i + 1).padStart(3, '0')}`;
  const skip = NOT_PORTED.find(([re]) => re.test(r.uri));
  const mw = r.middleware.replace(/^web,?/, '') || '—';
  if (skip && !(r.uri === 'auth/{provider}/login') && !(skip[1] === 'UNRESOLVED' && method !== 'GET')) return [id, method, code(`/${r.uri}`), r.action.split('Controllers\\').pop(), mw, '—', '—', skip[1], skip[2]];
  if (WEB_ACTIONS[key]) {
    const [page, api] = WEB_ACTIONS[key];
    return [id, method, code(`/${r.uri}`), r.action.split('Controllers\\').pop(), mw, code(page), api, 'IMPLEMENTED', ''];
  }
  const pattern = `/panel/${r.uri.replace(/\{(\w+)\??\}/g, (m, p) => `[${p === 'user' || p === 'role' || p === 'permission' || p === 'announcement' ? 'id' : p}]`)}`.replace(/\/$/, '');
  const page = nextPageFor(pattern === '/panel/' ? '/panel' : pattern) ?? (r.uri === '/' ? nextPageFor('/panel') : null);
  return [id, method, code(`/${r.uri}`), r.action.split('Controllers\\').pop(), mw, page ? code(page) : '**MISSING**', '—', page ? 'IMPLEMENTED' : 'MISSING', ''];
});

// ------------------------------------------------------------------ API

const expressEndpoints = [];
for (const [f, src] of expressFiles.filter(([f]) => f.includes(`${path.sep}routes${path.sep}`))) {
  for (const m of src.matchAll(/\b(\w+Router|router|app)\.(get|post|put|patch|delete|all)\(\s*'([^']+)'/g)) {
    expressEndpoints.push({ method: m[2].toUpperCase(), path: `/api${m[3]}`, file: rel(path.join(EXPRESS, '..'), f) });
  }
}
const laravelApi = new Set(
  routeList
    .filter((r) => r.uri.startsWith('api/'))
    .flatMap((r) => r.method.replace('|HEAD', '').split('|').map((m) => `${m} /${r.uri.replace(/\{(\w+)\??\}/g, ':$1')}`)),
);
const norm = (p) => p.replace(/:\w+/g, ':p');
const laravelNorm = new Set([...laravelApi].map(norm));
const apiRows = expressEndpoints.map((e, i) => {
  const origin = laravelNorm.has(norm(`${e.method} ${e.path}`)) ? 'Laravel API (same contract, see API_MAPPING)' : e.path.startsWith('/api/panel/') ? 'Laravel web route, re-exposed as JSON for the Next.js panel (see BACKEND_INVENTORY)' : 'Express-only (health/ops or unresolved route stub)';
  return [`EX-${String(i + 1).padStart(3, '0')}`, e.method, code(e.path), code(e.file), origin];
});

const controllers = controllerRows();

// --------------------------------------------------------------- output

const count = (rows, col, value) => rows.filter((r) => r[col] === value).length;
const summary = (rows, col) => Object.entries(Object.groupBy(rows, (r) => r[col])).map(([k, v]) => `${k} ${v.length}`).join(' · ');
const stamp = `<!-- generated by migration-docs/tools/inventories.mjs — do not hand-edit -->`;

writeFileSync(
  path.join(DOCS, 'FRONTEND_INVENTORY.md'),
  `# FRONTEND_INVENTORY

${stamp}

Original Angular 8 application (\`frontend/frontend/src/app\`) and Laravel Blade panel (\`resources/views\`, announcements plugin), mapped to the Next.js port (\`nextjs-frontend/src\`). "PORTED" means a port file names the original (by file or view name); "REVIEW" means the generator found no reference and the row was checked by hand (see notes at the end).

## 1. Angular routes (${routeRows.length})

IMPLEMENTED ${count(routeRows, 5, 'IMPLEMENTED')} · MISSING ${count(routeRows, 5, 'MISSING')}

${table(['ID', 'Angular path', 'Component', 'Guards', 'Next.js file', 'Status'], routeRows)}

## 2. Angular components (${components.length})

${summary(components, 4)}

${table(['Folder', 'Component', 'Lines (ts+html+css)', 'Port references', 'Status'], components)}

## 3. Angular services (${services.length})

Every HTTP call of these services is mapped endpoint by endpoint in \`API_MAPPING.md\`.

${table(['Service', 'HTTP calls', 'Port references'], services)}

## 4. Blade views (${viewRows.length})

${summary(viewRows, 2)}

${table(['View', 'Port references', 'Status'], viewRows)}

## 5. Next.js routes (${nextRoutes.size})

${table(['Route', 'File'], [...nextRoutes].sort(([a], [b]) => a.localeCompare(b)).map(([r, f]) => [code(r), code(f)]))}
`,
);

writeFileSync(
  path.join(DOCS, 'BACKEND_INVENTORY.md'),
  `# BACKEND_INVENTORY

${stamp}

Original Laravel 6 backend (\`backend/backend\`) mapped to the Express port (\`express-backend/src\`). API routes are mapped one by one in \`API_MAPPING.md\`; this file covers the controllers and the **web** routes (Laravel \`route:list --json\`, saved in \`generated/laravel-route-list.json\`).

## 1. Controllers (${controllers.length})

${table(['Controller', 'Lines', 'Public methods', 'Port (Express file / Next.js page)'], controllers)}

## 2. Web routes (${webRows.length})

${summary(webRows, 7)}

The Blade panel is served by Next.js under \`/panel\` (DEV-F14). Forms post to the Express JSON endpoints listed here instead of Laravel web routes.

${table(['ID', 'Method', 'Laravel URI', 'Action', 'Middleware', 'Next.js page', 'Express endpoint', 'Status', 'Note'], webRows)}
`,
);

writeFileSync(
  path.join(DOCS, 'API_INVENTORY.md'),
  `# API_INVENTORY

${stamp}

Every endpoint the Express backend exposes (${apiRows.length}), with its origin. Laravel API routes keep their contract (method, path, \`?token=\` / Bearer auth, response shape) and are traced to their contract tests in \`API_MAPPING.md\`. The \`/api/panel/*\` endpoints replace Laravel **web** routes (session + Blade) for the Next.js panel.

${table(['ID', 'Method', 'Path', 'Route file', 'Origin'], apiRows)}
`,
);

console.log({ angularRoutes: routeRows.length, components: components.length, services: services.length, views: viewRows.length, nextRoutes: nextRoutes.size, controllers: controllers.length, webRoutes: webRows.length, expressEndpoints: apiRows.length });
console.log('route status', { implemented: count(routeRows, 5, 'IMPLEMENTED'), missing: count(routeRows, 5, 'MISSING') });
console.log('components review', components.filter((c) => c[4] === 'REVIEW').map((c) => c[1]));
console.log('views review', viewRows.filter((v) => v[2] === 'REVIEW').map((v) => v[0]));
console.log('web', { implemented: count(webRows, 7, 'IMPLEMENTED'), blocked: count(webRows, 7, 'BLOCKED'), notPorted: count(webRows, 7, 'NOT PORTED'), missing: webRows.filter((w) => w[7] === 'MISSING').map((w) => `${w[1]} ${w[2]}`) });
console.log('routes missing', routeRows.filter((r) => r[5] === 'MISSING').map((r) => r[1]));
