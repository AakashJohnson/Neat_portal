import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { scanRepository } from './scanner.mjs';
import { safeFile } from './files.mjs';
import { ScanCoordinator, watchRepository } from './watcher.mjs';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function createLocalApp({ coordinator, root, token, port, editor = 'none' }) {
  const app = express();
  app.disable('x-powered-by');
  const origins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
  app.use((req, res, next) => {
    if (!origins.has(`http://${req.headers.host}`) || req.headers.origin && !origins.has(req.headers.origin) || req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ error: 'Local same-origin access required' });
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" });
    next();
  });
  app.get('/api/session', (_req, res) => res.json({ token, editor, rootLabel: path.basename(root) }));
  app.use('/api', (req, res, next) => {
    const supplied = req.get('x-architecture-token') ?? (req.path === '/events' ? req.query.token : '');
    if (typeof supplied !== 'string' || Buffer.byteLength(supplied) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) return res.status(403).json({ error: 'Local session token required' });
    next();
  });
  app.use('/api', express.json({ limit: '4kb' }));
  app.get('/api/status', (_req, res) => res.json(coordinator.state));
  app.get('/api/manifest', (_req, res) => coordinator.manifest ? res.json(coordinator.manifest) : res.status(503).json({ error: 'No successful scan available yet' }));
  app.post('/api/rescan', (req, res) => {
    if (!req.is('application/json') || !req.body || Object.keys(req.body).length) return res.status(400).json({ error: 'Send an empty JSON object; scan root cannot be changed by HTTP' });
    coordinator.schedule('manual scan');
    return res.status(202).json({ accepted: true });
  });
  app.post('/api/editor-link', async (req, res) => {
    if (editor === 'none') return res.status(409).json({ error: 'Editor integration is disabled. Restart with --editor vscode or --editor cursor.' });
    const node = coordinator.manifest?.nodes.find(n => n.id === req.body?.nodeId);
    if (!node?.path) return res.status(400).json({ error: 'A known source node is required' });
    try {
      const { file } = await safeFile(root, node.path);
      const line = Math.max(1, node.evidence.find(e => e.path === node.path)?.line ?? 1);
      return res.json({ url: `${editor}://file/${encodeURI(file.replaceAll('\\', '/'))}:${line}` });
    } catch { return res.status(400).json({ error: 'Source no longer exists or is outside the allowed root' }); }
  });
  app.get('/api/events', (req, res) => {
    res.status(200).set({ 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
    res.flushHeaders();
    const send = state => res.write(`data: ${JSON.stringify(state)}\n\n`);
    send(coordinator.state);
    coordinator.on('status', send);
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
    req.on('close', () => { clearInterval(heartbeat); coordinator.off('status', send); });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown tool endpoint' }));
  app.use((error, _req, res, _next) => res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Invalid local-tool request' }));
  return app;
}

export async function startServer({ root = path.resolve(toolRoot, '..', '..'), port = 4310, editor = 'none', watch = true, developmentUi = false } = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('Architecture dashboard is development-only');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a local port between 1024 and 65535');
  if (!['none', 'vscode', 'cursor'].includes(editor)) throw new Error('Supported editors: none, vscode, cursor');
  root = await fs.realpath(root);
  const coordinator = new ScanCoordinator(() => scanRepository(root));
  const token = randomBytes(24).toString('hex');
  const app = createLocalApp({ coordinator, root, token, port, editor });
  let vite;
  if (developmentUi) {
    const { createServer } = await import('vite');
    vite = await createServer({ root: toolRoot, configFile: false, server: { middlewareMode: true, hmr: false, fs: { strict: true, allow: [toolRoot] } }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    await fs.access(path.join(toolRoot, 'dist', 'index.html'));
    app.use(express.static(path.join(toolRoot, 'dist'), { dotfiles: 'deny' }));
    app.get('/{*path}', (_req, res) => res.sendFile(path.join(toolRoot, 'dist', 'index.html')));
  }
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(port, '127.0.0.1', () => resolve(instance));
    instance.once('error', reject);
  });
  let watcher;
  try {
    if (watch) watcher = await watchRepository(root, coordinator);
    await coordinator.run();
  } catch (error) {
    await watcher?.close(); coordinator.close(); await vite?.close();
    await new Promise(resolve => server.close(resolve)); throw error;
  }
  return {
    server, coordinator, url: `http://127.0.0.1:${port}`,
    async close() { coordinator.close(); await watcher?.close(); await vite?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => { const index = args.indexOf(name); if (index < 0) return fallback; if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${name} requires a value`); return args[index + 1]; };
  try {
    const running = await startServer({ root: path.resolve(option('--root', path.resolve(toolRoot, '..', '..'))), port: Number(option('--port', 4310)), editor: option('--editor', 'none'), watch: !args.includes('--no-watch'), developmentUi: args.includes('--ui-dev') });
    console.log(`Architecture dashboard: ${running.url} (loopback only; no database access)`);
    console.log(`Scan: ${running.coordinator.state.status}; ${running.coordinator.manifest?.stats.nodes ?? 0} nodes`);
    const close = async () => { await running.close(); process.exit(0); };
    process.once('SIGINT', close); process.once('SIGTERM', close);
  } catch {
    console.error('Dashboard startup failed. Check that the build exists, the root is readable, and the port is free. Run npm run build, then retry.');
    process.exitCode = 1;
  }
}
