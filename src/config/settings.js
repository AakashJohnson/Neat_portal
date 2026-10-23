// akaunting/setting with the json driver: storage/settings.json, shared with
// Laravel during the transition (SETTINGS_PATH). Read on every call so admin
// changes made through either backend take effect immediately.
import { readFileSync } from 'node:fs';
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

function load() {
  if (!env.SETTINGS_PATH) return {};
  try {
    return JSON.parse(readFileSync(path.resolve(env.SETTINGS_PATH), 'utf8'));
  } catch {
    return {};
  }
}

/** setting('a.b'): dotted access like Laravel's Arr::get(). */
export function setting(key, fallback = DEFAULTS[key]) {
  let value = load();
  for (const part of key.split('.')) {
    if (value === null || typeof value !== 'object' || !(part in value)) return fallback;
    value = value[part];
  }
  return value;
}

/** PHP truthiness of a setting ("0", "", null, false → false). */
export const settingEnabled = (key) => !phpEmpty(setting(key));
