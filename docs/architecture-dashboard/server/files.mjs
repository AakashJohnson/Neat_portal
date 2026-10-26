import fs from 'node:fs/promises';
import path from 'node:path';
import ignore from 'ignore';

export const slash = value => value.replaceAll('\\', '/');
const blockedDirs = new Set(['.git', '.playwright-mcp', 'node_modules', '.next', 'dist', 'build', 'out', 'coverage', '.cache', '.scratch', '.vercel', 'vendor', 'public', 'assets', 'generated', 'final-run', 'test-results', 'playwright-report']);
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.sql', '.prisma', '.css', '.json', '.yml', '.yaml']);
export const isSecretFile = name => /^\.env(?:$|\.)/i.test(name) && name.toLowerCase() !== '.env.example' || /\.(?:pem|key|p12|pfx|crt|sqlite|db|log)$/i.test(name);
export function hardIgnored(relative) {
  const parts = slash(relative).split('/');
  return parts.some(p => blockedDirs.has(p.toLowerCase())) || isSecretFile(parts.at(-1)) || parts.some(p => p.toLowerCase() === 'architecture-dashboard');
}
export function relevant(relative) {
  const name = path.basename(relative);
  return !hardIgnored(relative) && (sourceExtensions.has(path.extname(name)) || ['Dockerfile', '.gitignore', '.env.example'].includes(name));
}
export function inside(root, file) {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

export async function safeFile(root, relative) {
  if (typeof relative !== 'string' || relative.includes('\0') || path.isAbsolute(relative) || /^[A-Za-z]:/.test(relative) || slash(relative).split('/').some(p => p === '..' || p === '')) throw new Error('Invalid relative path');
  const base = await fs.realpath(root);
  const file = path.resolve(base, relative);
  if (!inside(base, file)) throw new Error('Path outside repository');
  let current = base;
  for (const segment of path.relative(base, file).split(path.sep)) {
    current = path.join(current, segment);
    if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symbolic links are excluded');
  }
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.nlink > 1 || !inside(base, await fs.realpath(file))) throw new Error('Not an isolated regular file');
  return { file, stat };
}

export async function discover(root, { maxFiles = 6000, maxBytes = 48 * 1024 * 1024, maxFileBytes = 4 * 1024 * 1024 } = {}) {
  root = await fs.realpath(root);
  const files = [], skips = [], errors = [], policies = [];
  let bytes = 0;
  const ignoredBy = (relative, rules) => {
    let ignored = false;
    for (const { base, matcher } of rules) {
      const local = base ? relative.slice(base.length + 1) : relative;
      if ((!base || relative.startsWith(`${base}/`)) && local) {
        const result = matcher.test(local);
        if (result.ignored) ignored = true;
        if (result.unignored) ignored = false;
      }
    }
    return ignored;
  };
  async function walk(dir, rules) {
    const base = slash(path.relative(root, dir));
    let next = rules;
    try {
      const gitignore = await safeFile(root, path.join(base, '.gitignore'));
      if (gitignore.stat.size <= maxFileBytes) {
        const matcher = ignore().add(await fs.readFile(gitignore.file, 'utf8'));
        const policy = { base, matcher };
        policies.push(policy);
        next = [...rules, policy];
      }
    } catch (error) {
      if (error.code !== 'ENOENT') errors.push({ path: slash(path.join(base, '.gitignore')), reason: 'Cannot read ignore rules' });
    }
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { errors.push({ path: base, reason: 'Cannot enumerate directory' }); return; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = slash(path.join(base, entry.name));
      if (entry.isSymbolicLink()) { skips.push({ path: relative, reason: 'symlink' }); continue; }
      if (hardIgnored(relative) || ignoredBy(relative + (entry.isDirectory() ? '/' : ''), next)) { skips.push({ path: relative, reason: 'excluded' }); continue; }
      if (entry.isDirectory()) { await walk(path.join(dir, entry.name), next); continue; }
      if (!entry.isFile() || !relevant(relative)) { skips.push({ path: relative, reason: 'unsupported' }); continue; }
      if (files.length >= maxFiles) { skips.push({ path: relative, reason: 'file budget' }); continue; }
      try {
        const checked = await safeFile(root, relative);
        if (checked.stat.size > maxFileBytes || bytes + checked.stat.size > maxBytes) { skips.push({ path: relative, reason: 'byte budget' }); continue; }
        bytes += checked.stat.size;
        files.push({ path: relative, size: checked.stat.size });
      } catch { errors.push({ path: relative, reason: 'File disappeared or is unsafe to read' }); }
    }
  }
  await walk(root, []);
  return { root, files, skips, errors, bytes, isIgnored: relative => hardIgnored(relative) || ignoredBy(slash(relative), policies) };
}

export async function readSource(root, relative, maxBytes = 4 * 1024 * 1024) {
  const { file, stat } = await safeFile(root, relative);
  if (stat.size > maxBytes || isSecretFile(path.basename(file))) throw new Error('Excluded source');
  return fs.readFile(file, 'utf8');
}
