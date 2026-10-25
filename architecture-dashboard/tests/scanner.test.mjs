import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { discover, safeFile, readSource } from '../server/files.mjs';
import { scanRepository } from '../server/scanner.mjs';
import { validateManifest } from '../server/manifest.mjs';

const temporary = [];
async function fixture(files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'neat-architecture-test-'));
  temporary.push(root);
  for (const [name, text] of Object.entries(files)) {
    const file = path.join(root, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof text === 'string' ? text : JSON.stringify(text));
  }
  return root;
}
afterEach(async () => { for (const root of temporary.splice(0)) await fs.rm(root, { recursive: true, force: true }); });

const app = {
  'express-backend/package.json': { type: 'module', dependencies: { express: '5.3.0', knex: '3.3.0', mysql2: '3.24.6' } },
  'express-backend/src/app.js': "import express from 'express'; import { router } from './routes.js'; export function createApp(){ const app = express(); app.use('/api', router); return app; }",
  'express-backend/src/routes.js': "import { Router } from 'express'; import * as controller from './controller.js'; import { requireAuth } from './auth.js'; export const router=Router(); const guard=[requireAuth]; router.get('/users', ...guard, controller.list); router.post('/users', ...guard, controller.save);",
  'express-backend/src/controller.js': "import * as service from './service.js'; const handle=fn=>fn; export const list=handle(req=>service.list(req)); export const save=handle(req=>service.save(req.body));",
  'express-backend/src/service.js': "import { db, table } from './db.js'; export function list(){ return db(table('users')).leftJoin(table('teams'), 'users.team_id','teams.id').select('*'); } export function save(input){ return db(table('users')).insert({name:input.name}); }",
  'express-backend/src/db.js': "import knex from 'knex'; export const db=knex({client:'mysql2'}); export const table=name=>name;",
  'express-backend/src/auth.js': "export function requireAuth(req,res,next){ if(req.user)next(); }",
  'nextjs-frontend/package.json': { type: 'module', dependencies: { next: '16.4.3', react: '19.3.1' } },
  'nextjs-frontend/jsconfig.json': { compilerOptions: { paths: { '@/*': ['./src/*'] } } },
  'nextjs-frontend/src/app/(site)/layout.jsx': "export default function Layout({children}){ return <html><body>{children}</body></html>; }",
  'nextjs-frontend/src/app/(site)/users/[id]/page.jsx': "'use client'; import { Users } from '@/components/Users'; export default function Page(){ return <Users/>; }",
  'nextjs-frontend/src/components/Users.jsx': "import { people } from '@/services'; export function Users(){ people.list(); return <div>Users</div>; }",
  'nextjs-frontend/src/services/index.js': "import { api } from '@/lib/api'; export const people={list:()=>api.get('/users'), save:input=>api.post('/users',input)};",
  'nextjs-frontend/src/lib/api.js': "function bffUrl(path){return new URL(`/bff${path}`, window.location.origin);} function request(method,path){return fetch(bffUrl(path),{method});} export const api={get:path=>request('GET',path),post:path=>request('POST',path)};",
  'nextjs-frontend/src/app/bff/[...path]/route.js': "const ORIGIN=process.env.API_ORIGIN; async function proxy(request,{params}){return fetch(`${ORIGIN}/api/${params.path.join('/')}`,{method:request.method});} export const GET=proxy;export const POST=proxy;",
  'schema.sql': "CREATE TABLE teams (id INT PRIMARY KEY); CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(50), team_id INT, CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES teams(id), INDEX ix_name (name));",
};

describe('safe source discovery', () => {
  it('respects exclusions, nested gitignore overrides, generated outputs and private environment files', async () => {
    const root = await fixture({ '.gitignore': '*.skip.js\n', 'src/.gitignore': '!keep.skip.js\n', 'src/keep.skip.js': 'export const x=1;', 'src/no.skip.js': 'ignored', '.env': 'SECRET=NEVER_READ', '.env.example': 'SECRET=EXAMPLE_VALUE', 'node_modules/foo.js': 'ignored', '.next/out.js': 'ignored', '.cache/architecture.json': '{}', 'generated/x.js': 'ignored', 'src/app.tsx': 'export const App=()=> <div/>;' });
    const result = await discover(root);
    expect(result.files.map(f => f.path)).toContain('src/keep.skip.js');
    expect(result.files.map(f => f.path)).toContain('src/app.tsx');
    expect(result.files.map(f => f.path)).not.toContain('src/no.skip.js');
    expect(result.files.map(f => f.path)).not.toContain('.env');
    await fs.writeFile(path.join(root, '.ENV.private.json'), '{"password":"never-read"}');
    expect((await discover(root)).files.map(f => f.path)).not.toContain('.ENV.private.json');
    expect(result.files.some(f => /node_modules|\.next|generated|\.cache/.test(f.path))).toBe(false);
    await expect(readSource(root, '.env')).rejects.toThrow();
  });
  it('blocks traversal, absolute paths, symlink directories and hardlinks', async () => {
    const root = await fixture({ 'src/a.js': 'export const a=1;' });
    await expect(safeFile(root, '../outside.js')).rejects.toThrow();
    await expect(safeFile(root, '..\\outside.js')).rejects.toThrow();
    await expect(safeFile(root, path.resolve(root, 'src/a.js'))).rejects.toThrow();
    await fs.symlink(path.join(root, 'src'), path.join(root, 'linked'), 'junction');
    await expect(safeFile(root, 'linked/a.js')).rejects.toThrow();
    await fs.link(path.join(root, 'src/a.js'), path.join(root, 'copy.js'));
    await expect(safeFile(root, 'copy.js')).rejects.toThrow();
    const result = await discover(root);
    expect(result.skips.some(s => s.reason === 'symlink')).toBe(true);
  });
  it('reports file and byte budgets', async () => {
    const root = await fixture({ 'a.js': 'export const x=1;', 'b.js': 'export const y=2;' });
    expect((await discover(root, { maxFiles: 1 })).skips.some(s => s.reason === 'file budget')).toBe(true);
    expect((await discover(root, { maxFileBytes: 2 })).files).toHaveLength(0);
  });
});

describe('source-derived graph', () => {
  it('traces Next aliases, JSX, service calls, BFF rewriting, Express handlers and SQL', async () => {
    const root = await fixture(app);
    const { manifest: m } = await scanRepository(root);
    expect(m.stats.scanErrors).toBe(0);
    expect(m.nodes.find(n => n.type === 'Next page').metadata.route).toBe('/users/[id]');
    expect(m.nodes.find(n => n.type === 'Next page').metadata.rendering).toBe('Client boundary');
    const endpoint = m.nodes.find(n => n.id === 'api:express:GET:/api/users');
    expect(endpoint).toBeTruthy();
    expect(endpoint.metadata.authSignals).toContain('requireAuth');
    expect(m.edges.some(e => e.source === endpoint.id && e.target.endsWith('controller.js#list') && e.type === 'routes to')).toBe(true);
    expect(m.edges.some(e => e.source.endsWith('controller.js#list') && e.target.endsWith('service.js#list') && e.type === 'invokes')).toBe(true);
    expect(m.edges.some(e => e.source.endsWith('Users.jsx#Users') && e.target.endsWith('services/index.js#people.list'))).toBe(true);
    expect(m.edges.some(e => e.type === 'renders' && e.target.endsWith('Users.jsx#Users'))).toBe(true);
    expect(m.edges.some(e => e.type === 'routes to' && e.target === endpoint.id && e.confidence === 'inferred')).toBe(true);
    expect(m.edges.some(e => e.source === 'api:next:GET:/bff/[...path]' && e.target.endsWith('route.js#proxy'))).toBe(true);
    expect(m.edges.some(e => e.source.endsWith('service.js#save') && e.target === 'table:users' && e.type === 'writes data')).toBe(true);
    expect(m.edges.some(e => e.source.endsWith('service.js#list') && e.target === 'table:teams' && e.type === 'joins table')).toBe(true);
    expect(m.edges.some(e => e.source === 'table:users' && e.target === 'table:teams' && e.type === 'foreign key')).toBe(true);
    expect(m.nodes.find(n => n.id === 'table:users').metadata.indexes[0].columns).toContain('name');
    expect(m.stats.columns).toBe(4);
  });
  it('keeps stable node and edge IDs when only source line numbers change', async () => {
    const root = await fixture(app);
    const first = (await scanRepository(root)).manifest;
    await fs.writeFile(path.join(root, 'express-backend/src/service.js'), '\n\n' + app['express-backend/src/service.js']);
    const second = (await scanRepository(root)).manifest;
    expect(second.nodes.map(n => n.id)).toEqual(first.nodes.map(n => n.id));
    expect(second.edges.map(e => e.id)).toEqual(first.edges.map(e => e.id));
  });
  it('records malformed JS, dynamic imports and unresolved mounts without losing good files', async () => {
    const root = await fixture({ ...app, 'express-backend/src/broken.js': 'export const secret = !!??;', 'nextjs-frontend/src/dynamic.js': 'export const load=name=>import(name);', 'express-backend/src/unknown.js': "import {Router} from 'express';export const other=Router();other.get(computedPath,()=>{}); other.post('/isolated',()=>{});" });
    const { manifest } = await scanRepository(root);
    expect(manifest.diagnostics.map(d => d.kind)).toEqual(expect.arrayContaining(['parse-error', 'dynamic-import', 'dynamic-route', 'unmounted-router']));
    expect(manifest.nodes.some(n => n.id === 'api:express:GET:/api/users')).toBe(true);
  });
  it('resolves renamed Express imports, rejects lookalike factories, and does not guess dynamic HTTP methods', async () => {
    const root = await fixture({
      'express-backend/src/app.js': "import makeApp,{Router as makeRouter} from 'express';const app=makeApp();const routes=makeRouter();routes.get('/real',()=>{});app.use('/api',routes);function Router(){return{};}const fake=Router();fake.get('/not-express',()=>{});",
      'nextjs-frontend/src/request.js': "export const send=method=>fetch('/api/real',{method});",
    });
    const { manifest } = await scanRepository(root);
    expect(manifest.nodes.some(n => n.id === 'api:express:GET:/api/real')).toBe(true);
    expect(manifest.nodes.some(n => n.metadata.route?.includes('not-express'))).toBe(false);
    expect(manifest.nodes.some(n => n.type === 'API request')).toBe(false);
    expect(manifest.diagnostics.some(d => d.kind === 'dynamic-api-method')).toBe(true);
  });
  it('does not execute scanned code or retain secret values, raw SQL, defaults or environment values', async () => {
    const sentinel = 'VERY_PRIVATE_SENTINEL_123456';
    const root = await fixture({
      ...app, '.env': `PASSWORD=${sentinel}`, '.env.example': `PASSWORD=${sentinel}`,
      'express-backend/src/secret.js': `import fs from 'node:fs'; fs.writeFileSync('SCANNED_CODE_EXECUTED','x'); const apiKey='${sentinel}'; const password='${sentinel}'; export const config=process.env.DATABASE_URL;`,
      'express-backend/src/query.js': "import {db} from './db.js';export const unsafe=value=>db.raw(`SELECT * FROM users WHERE name = '${value}'`);",
      'schema-baseline-main.json': { schema: 'main', serverVersion: '8.0.46', capturedAt: '2026-10-23T18:31:53.202Z', structure: { tables: [{ TABLE_NAME: 'users', ENGINE: 'InnoDB' }], columns: [{ TABLE_NAME: 'users', COLUMN_NAME: 'Legacy Name', COLUMN_TYPE: 'varchar(100)', COLUMN_DEFAULT: sentinel, COLUMN_COMMENT: sentinel, COLUMN_KEY: '', ORDINAL_POSITION: 1 }], indexes: [], constraints: [], keyUsage: [], foreignKeys: [] }, createStatements: { users: sentinel }, data: { users: sentinel } },
    });
    const { manifest } = await scanRepository(root);
    expect(JSON.stringify(manifest)).not.toContain(sentinel);
    expect(manifest.nodes.find(n => n.id === 'table:users').metadata.columns[0].name).toBe('Legacy Name');
    expect(manifest.diagnostics.some(d => d.kind === 'sensitive-literal')).toBe(true);
    expect(manifest.diagnostics.some(d => d.kind === 'raw-sql-interpolation')).toBe(true);
    expect(manifest.nodes.find(n => n.id === 'config:DATABASE_URL').metadata.value).toBe('[NOT READ]');
    await expect(fs.access(path.join(root, 'SCANNED_CODE_EXECUTED'))).rejects.toThrow();
  });
  it('extracts Knex migration declarations without executing migration history', async () => {
    const root = await fixture({ 'express-backend/migrations/001.js': "export function up(knex){return knex.schema.createTable('people',t=>{t.increments('id');t.string('name').notNullable();t.integer('team_id').references('id').inTable('teams');t.index(['name'],'ix_people_name');});}" });
    const { manifest } = await scanRepository(root);
    const table = manifest.nodes.find(n => n.id === 'table:people');
    expect(table.metadata.columns).toHaveLength(3);
    expect(table.metadata.columns[0].primary).toBe(true);
    expect(table.metadata.foreignKeys[0].targetTable).toBe('teams');
    expect(table.metadata.effectiveSchema).toContain('UNKNOWN');
  });
  it('rejects duplicate IDs, dangling relationships and incompatible versions', async () => {
    const root = await fixture({ 'a.js': 'export const a=()=>1;' });
    const { manifest } = await scanRepository(root);
    expect(() => validateManifest({ ...manifest, version: '999' })).toThrow();
    expect(() => validateManifest({ ...manifest, nodes: [...manifest.nodes, manifest.nodes[0]] })).toThrow('Duplicate');
    expect(() => validateManifest({ ...manifest, edges: [{ ...manifest.edges[0], target: 'missing' }] })).toThrow('Dangling');
  });
});
