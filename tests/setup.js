import 'dotenv/config';

// Tests must never run against anything but the isolated test copy.
if (process.env.DB_DATABASE !== 'neat_portal_test') {
  throw new Error(`Refusing to run tests against database "${process.env.DB_DATABASE}". Use neat_portal_test.`);
}
process.env.NODE_ENV = 'test';
process.env.MAIL_TRANSPORT = 'json';

// Contract suites compare against Laravel's original (public) behaviour;
// hardened behaviour is asserted in tests/security/*.
process.env.LEGACY_PUBLIC_ENDPOINTS = 'true';

// Node writes uploads into a throw-away directory, never into the Laravel repo.
import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
const testPublic = path.join(os.tmpdir(), 'neat-test-public');
mkdirSync(path.join(testPublic, 'files', 'mou_file'), { recursive: true });
process.env.PUBLIC_STORAGE_PATH = testPublic;
// The external EoI API is replaced by a local stub in tests (never production).
process.env.EOI_API_URL = process.env.EOI_API_URL_TEST ?? 'http://127.0.0.1:59999/api/saveDocument';

// Settings writes go to a temp copy of Laravel's storage/settings.json (the
// configured SETTINGS_PATH, else the Laravel original); CI without either
// starts from {} so every setting() falls back to its default.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
const testSettings = path.join(os.tmpdir(), 'neat-test-settings.json');
const settingsSource = [process.env.SETTINGS_PATH, '../../NEAT portal old/backend/backend/storage/settings.json']
  .filter(Boolean)
  .map((p) => path.resolve(p))
  .find((p) => existsSync(p));
if (settingsSource) copyFileSync(settingsSource, testSettings);
else writeFileSync(testSettings, '{}');
process.env.SETTINGS_PATH = testSettings;
