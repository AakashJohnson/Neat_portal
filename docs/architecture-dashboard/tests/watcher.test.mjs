import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, expect, it, vi } from 'vitest';
import { ScanCoordinator, watchRepository } from '../server/watcher.mjs';
import { scanRepository } from '../server/scanner.mjs';

const cleanups = [];
afterEach(async () => { vi.useRealTimers(); for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
  const deadline = Date.now() + 10000;
  while (!check()) { if (Date.now() > deadline) throw new Error('Timed out waiting for watcher state'); await delay(40); }
}
it('debounces bursts, never overlaps scans, and queues one follow-up for changes during a scan', async () => {
  let running = 0, maximum = 0, calls = 0;
  const coordinator = new ScanCoordinator(async () => {
    calls++; running++; maximum = Math.max(maximum, running);
    await delay(80); running--;
    return { manifest: { generatedAt: new Date().toISOString() } };
  }, { debounceMs: 20 });
  cleanups.push(() => coordinator.close());
  coordinator.schedule(); coordinator.schedule(); coordinator.schedule();
  await until(() => running === 1);
  coordinator.schedule(); coordinator.schedule();
  await until(() => calls === 2 && !coordinator.running);
  expect(maximum).toBe(1); expect(calls).toBe(2);
  expect(coordinator.state.revision).toBe(2);
});
it('retains the last successful manifest with an explicit stale/error state after a failed scan', async () => {
  let fail = false;
  const coordinator = new ScanCoordinator(async () => { if (fail) throw new Error('sensitive error text'); return { manifest: { generatedAt: '2026-01-01' } }; });
  cleanups.push(() => coordinator.close());
  await coordinator.run(); const before = coordinator.manifest;
  fail = true; await coordinator.run();
  expect(coordinator.manifest).toBe(before);
  expect(coordinator.state.status).toBe('error'); expect(coordinator.state.stale).toBe(true);
  expect(coordinator.state.error).not.toContain('sensitive');
});
it('refreshes after creation, modification, rename and deletion, but ignores generated output', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'neat-architecture-watch-'));
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
  const coordinator = new ScanCoordinator(() => scanRepository(root), { debounceMs: 40 });
  cleanups.push(() => coordinator.close());
  const watcher = await watchRepository(root, coordinator);
  cleanups.push(() => watcher.close());
  await coordinator.run();
  await fs.writeFile(path.join(root, 'source.js'), 'export const a=()=>1;');
  await until(() => coordinator.manifest.nodes.some(n => n.label === 'a'));
  await fs.writeFile(path.join(root, 'source.js'), 'export const b=()=>2;');
  await until(() => coordinator.manifest.nodes.some(n => n.label === 'b'));
  await fs.rename(path.join(root, 'source.js'), path.join(root, 'renamed.js'));
  await until(() => coordinator.manifest.nodes.some(n => n.path === 'renamed.js') && !coordinator.manifest.nodes.some(n => n.path === 'source.js'));
  await fs.unlink(path.join(root, 'renamed.js'));
  await until(() => coordinator.manifest.nodes.length === 0);
  const revision = coordinator.state.revision;
  await fs.mkdir(path.join(root, '.cache'));
  await fs.writeFile(path.join(root, '.cache/result.json'), '{}');
  await fs.writeFile(path.join(root, '.env'), 'SECRET=hidden');
  await delay(500);
  expect(coordinator.state.revision).toBe(revision);
  await fs.writeFile(path.join(root, '.gitignore'), 'ignored-output/\n');
  await until(() => coordinator.state.revision > revision && !coordinator.running);
  const ignoredRevision = coordinator.state.revision;
  await fs.mkdir(path.join(root, 'ignored-output'));
  await fs.writeFile(path.join(root, 'ignored-output/source.js'), 'export const ignored=1;');
  await delay(500);
  expect(coordinator.state.revision).toBe(ignoredRevision);
});
