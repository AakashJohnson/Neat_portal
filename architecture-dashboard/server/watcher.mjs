import { EventEmitter } from 'node:events';
import path from 'node:path';
import chokidar from 'chokidar';
import { hardIgnored, relevant, slash } from './files.mjs';

export class ScanCoordinator extends EventEmitter {
  constructor(scan, { debounceMs = 250 } = {}) {
    super();
    this.scan = scan;
    this.debounceMs = debounceMs;
    this.manifest = null;
    this.discovery = null;
    this.state = { status: 'idle', revision: 0, lastSuccessfulScan: null, error: null, stale: false, reason: 'startup' };
    this.running = false;
    this.pending = false;
    this.closed = false;
  }
  publish() { this.emit('status', { ...this.state }); }
  schedule(reason = 'source change') {
    if (this.closed) return;
    this.pending = true;
    this.state = { ...this.state, stale: Boolean(this.manifest), status: this.running ? 'scanning' : this.manifest ? 'stale' : 'idle', reason };
    this.publish();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), this.debounceMs);
  }
  async run() {
    if (this.closed || this.running) return;
    clearTimeout(this.timer);
    this.running = true; this.pending = false;
    this.state = { ...this.state, status: 'scanning', error: null };
    this.publish();
    try {
      const result = await this.scan();
      if (this.closed) return;
      this.manifest = result.manifest;
      this.discovery = result.discovery;
      this.state = { ...this.state, revision: this.state.revision + 1, lastSuccessfulScan: result.manifest.generatedAt, stale: this.pending, status: this.pending ? 'stale' : 'ready', error: null };
      this.emit('manifest', this.manifest);
    } catch {
      this.state = { ...this.state, status: 'error', stale: Boolean(this.manifest), error: 'Scan failed. Previous successful graph retained. Check root access and scanner tests; raw filesystem/source errors are not exposed.' };
    } finally {
      this.running = false;
      if (!this.closed) {
        this.publish();
        if (this.pending) { clearTimeout(this.timer); this.timer = setTimeout(() => this.run(), this.debounceMs); }
      }
    }
  }
  close() { this.closed = true; clearTimeout(this.timer); this.removeAllListeners(); }
}

export async function watchRepository(root, coordinator) {
  const watcher = chokidar.watch(root, {
    ignoreInitial: true, followSymlinks: false,
    ignored: file => { const relative = slash(path.relative(root, file)); return relative !== '' && hardIgnored(relative); },
    awaitWriteFinish: { stabilityThreshold: 120, pollInterval: 40 },
  });
  watcher.on('all', (event, file) => {
    const relative = slash(path.relative(root, file));
    if (!['add', 'change', 'unlink', 'addDir', 'unlinkDir'].includes(event)) return;
    const ignoreChange = path.basename(file) === '.gitignore';
    const directoryChange = event.endsWith('Dir');
    const ignored = coordinator.discovery?.isIgnored(relative + (directoryChange ? '/' : ''));
    if (ignoreChange || !ignored && (relevant(relative) || directoryChange && !hardIgnored(relative))) coordinator.schedule(ignoreChange ? 'ignore rules changed' : `source ${event}`);
  });
  watcher.on('error', () => {
    coordinator.state = { ...coordinator.state, status: 'error', stale: Boolean(coordinator.manifest), error: 'File watcher failed. Automatic refresh is unavailable; use manual scan and restart the tool.' };
    coordinator.publish();
  });
  await new Promise((resolve, reject) => { watcher.once('ready', resolve); watcher.once('error', reject); });
  return watcher;
}
