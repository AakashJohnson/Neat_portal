import 'dotenv/config';
import { z } from 'zod';

// Environment contract. Key names mirror the Laravel .env so the same
// deployment secrets can be reused without renaming.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().default('http://localhost:4000'),
  APP_TIMEZONE: z.string().default('UTC'),

  // Base URL the JWT "iss" claim is built from (Laravel used request()->url(),
  // i.e. "<api base>/login"). The Angular client checks iss === baseUrl + '/login'.
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

  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:4200'),

  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().optional(),
  MAIL_USERNAME: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),
  MAIL_ENCRYPTION: z.string().optional(),
  MAIL_FROM_ADDRESS: z.string().optional(),
  MAIL_FROM_NAME: z.string().optional(),
  // "smtp" sends real mail; "json" only logs/captures it (used in tests).
  MAIL_TRANSPORT: z.enum(['smtp', 'json']).default('json'),

  // Security deviations (SECURITY_REVIEW). false = hardened (default): endpoints
  // that were public in Laravel but expose personal data require a JWT whose
  // application_number matches the request. true = original behaviour, only for
  // the transition period while the unchanged Angular app is the client.
  LEGACY_PUBLIC_ENDPOINTS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Directory that holds files/ and upload/ (Laravel's public/). Shared with
  // Laravel during the transition so existing uploads keep their URLs.
  PUBLIC_STORAGE_PATH: z.string().default('../../NEAT portal old/backend/backend/public'),
  // External NEAT EoI system that receives uploaded MoU documents.
  EOI_API_URL: z.string().default('https://neatphase2eoiapi.aicte-india.org/api/saveDocument'),
  SETTINGS_PATH: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Print only the names of the invalid keys, never their values.
  const keys = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Invalid environment configuration: ${keys}`);
}

export const env = Object.freeze(parsed.data);
