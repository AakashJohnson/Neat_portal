import { config } from 'dotenv';
import { z } from 'zod';
import { projectPath } from './paths.js';

config({ path: projectPath('.env'), quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().default('http://localhost:4000'),
  APP_TIMEZONE: z.string().default('UTC'),
  TRUST_PROXY: z.string().default('loopback'),


  API_BASE_URL: z.string().default('http://localhost:4000/api'),

  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_DATABASE: z.string().min(1),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_PREFIX: z.string().default(''),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  JWT_SECRET: z.string().min(1),
  JWT_TTL: z.coerce.number().int().positive().default(60),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(20160),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().optional(),
  MAIL_USERNAME: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),
  MAIL_ENCRYPTION: z.string().optional(),
  MAIL_FROM_ADDRESS: z.string().optional(),
  MAIL_FROM_NAME: z.string().optional(),
  // "smtp" sends real mail; "json" only logs/captures it (used in tests).
  MAIL_TRANSPORT: z.enum(['smtp', 'json']).default('json'),

  // Relative storage paths are resolved from this backend, not the shell's cwd.
  PUBLIC_STORAGE_PATH: z.string().min(1).default('storage/public').transform(value => projectPath(value)),
  // External NEAT EoI system that receives uploaded MoU documents.
  EOI_API_URL: z.string().default('https://neatphase2eoiapi.aicte-india.org/api/saveDocument'),
  SETTINGS_PATH: z.string().min(1).default('storage/settings.json').transform(value => projectPath(value)),
  // Integrations the settings pages only report on (2FA / reCAPTCHA stay BLOCKED until keys exist).
  AUTHY_KEY: z.string().optional(),
  RECAPTCHA_SITEKEY: z.string().optional(),
  RECAPTCHA_SECRETKEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Print only the names of the invalid keys, never their values.
  const keys = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Invalid environment configuration: ${keys}`);
}

export const env = Object.freeze(parsed.data);
