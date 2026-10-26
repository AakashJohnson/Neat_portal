// Read on each call so saved admin settings take effect immediately.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from './env.js';
import { phpEmpty } from '../utils/str.js';

const DEFAULTS = Object.freeze({
  app_name: 'Neat',
  reg_enabled: '1',
  reg_email_confirmation: '1',
  forgot_password: true,
  remember_me: true,
  throttle_enabled: '1',
  throttle_attempts: '3',
  throttle_lockout_time: '2',
  login_reset_token_lifetime: '30',
});

export function loadSettings() {
  let source;
  try {
    source = readFileSync(env.SETTINGS_PATH, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    mkdirSync(path.dirname(env.SETTINGS_PATH), { recursive: true });
    try {
      writeFileSync(env.SETTINGS_PATH, JSON.stringify(DEFAULTS), { flag: 'wx', mode: 0o600 });
    } catch (writeError) {
      if (writeError.code !== 'EEXIST') throw writeError;
    }
    source = readFileSync(env.SETTINGS_PATH, 'utf8');
  }
  let data;
  try { data = JSON.parse(source); }
  catch { throw new Error('The settings file contains invalid JSON. Restore a valid settings file before starting the API.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The settings file must contain a JSON object.');
  return data;
}


export function setting(key, fallback = DEFAULTS[key]) {
  let value = loadSettings();
  for (const part of key.split('.')) {
    if (value === null || typeof value !== 'object' || !(part in value)) return fallback;
    value = value[part];
  }
  return value;
}

/** PHP truthiness of a setting ("0", "", null, false → false). */
export const settingEnabled = (key) => !phpEmpty(setting(key));
