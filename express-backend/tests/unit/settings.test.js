import { afterAll, beforeEach, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { projectPath, projectRoot } from '../../src/config/paths.js';

const config = vi.hoisted(() => ({ SETTINGS_PATH: '' }));
vi.mock('../../src/config/env.js', () => ({ env: config }));
import { loadSettings, settingEnabled } from '../../src/config/settings.js';

const scratch = mkdtempSync(path.join(os.tmpdir(), 'neat-settings-unit-'));
let sequence = 0;
beforeEach(() => { config.SETTINGS_PATH = path.join(scratch, String(sequence++), 'settings.json'); });
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

it('creates writable local defaults once, without overwriting saved settings', () => {
  expect(loadSettings()).toMatchObject({ app_name: 'Neat', reg_enabled: '1' });
  const saved = { app_name: 'Standalone test', reg_enabled: '0', notifications: { signup: false } };
  writeFileSync(config.SETTINGS_PATH, JSON.stringify(saved));
  expect(loadSettings()).toEqual(saved);
  expect(JSON.parse(readFileSync(config.SETTINGS_PATH, 'utf8'))).toEqual(saved);
  expect(settingEnabled('reg_enabled')).toBe(false);
});

it('reports corrupt settings explicitly and never silently resets them', () => {
  loadSettings();
  writeFileSync(config.SETTINGS_PATH, '{ invalid config');
  expect(() => loadSettings()).toThrow('invalid JSON');
  expect(readFileSync(config.SETTINGS_PATH, 'utf8')).toBe('{ invalid config');
  writeFileSync(config.SETTINGS_PATH, '[]');
  expect(() => loadSettings()).toThrow('JSON object');
});

it('resolves relative runtime paths against the backend even from a different working directory', () => {
  const code = `const {env}=await import(${JSON.stringify(pathToFileURL(projectPath('src', 'config', 'env.js')).href)}); console.log(JSON.stringify([env.PUBLIC_STORAGE_PATH, env.SETTINGS_PATH]));`;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: scratch,
    env: { ...process.env, PUBLIC_STORAGE_PATH: 'storage/public', SETTINGS_PATH: 'storage/settings.json' },
    encoding: 'utf8',
  });
  expect(JSON.parse(output)).toEqual([path.join(projectRoot, 'storage', 'public'), path.join(projectRoot, 'storage', 'settings.json')]);
});
