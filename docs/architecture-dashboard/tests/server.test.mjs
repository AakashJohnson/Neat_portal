import http from 'node:http';
import { afterEach, expect, it } from 'vitest';
import { createLocalApp } from '../server/server.mjs';
import { ScanCoordinator } from '../server/watcher.mjs';

const cleanup = [];
afterEach(async () => { for (const fn of cleanup.splice(0)) await fn(); });
async function local() {
  const coordinator = new ScanCoordinator(async () => ({ manifest: { generatedAt: new Date().toISOString(), nodes: [] } }), { debounceMs: 20 });
  await coordinator.run();
  const server = http.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const token = 'test-session-token';
  server.on('request', createLocalApp({ coordinator, root: process.cwd(), token, port }));
  cleanup.push(() => { coordinator.close(); server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  return { url: `http://127.0.0.1:${port}`, token, coordinator };
}
it('serves same-origin metadata while rejecting cross-origin requests, rebinding hosts and missing tokens', async () => {
  const { url, token } = await local();
  expect((await fetch(`${url}/api/session`)).status).toBe(200);
  expect((await fetch(`${url}/api/manifest`)).status).toBe(403);
  expect((await fetch(`${url}/api/manifest`, { headers: { 'x-architecture-token': token } })).status).toBe(200);
  expect((await fetch(`${url}/api/session`, { headers: { Origin: 'https://untrusted.example' } })).status).toBe(403);
  const reboundStatus = await new Promise((resolve, reject) => {
    const request = http.get(`${url}/api/session`, { headers: { Host: 'rebound.example' } }, response => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject);
  });
  expect(reboundStatus).toBe(403);
});
it('does not accept a scan root over HTTP or an arbitrary editor path', async () => {
  const { url, token } = await local();
  const headers = { 'x-architecture-token': token, 'Content-Type': 'application/json' };
  expect((await fetch(`${url}/api/rescan`, { method: 'POST', headers, body: JSON.stringify({ root: 'C:\\' }) })).status).toBe(400);
  expect((await fetch(`${url}/api/rescan`, { method: 'POST', headers, body: '{}' })).status).toBe(202);
  expect((await fetch(`${url}/api/editor-link`, { method: 'POST', headers, body: JSON.stringify({ path: '..\\secret' }) })).status).toBe(409);
  expect((await fetch(`${url}/api/rescan`, { method: 'POST', headers, body: '{invalid' })).status).toBe(400);
});
