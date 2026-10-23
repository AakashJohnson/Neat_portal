import knexFactory from 'knex';
import { env } from '../config/env.js';

// Data-access layer over the EXISTING schema.
// There is deliberately no migrations/seeds configuration: this application
// must never create, alter or drop database objects.
export const db = knexFactory({
  client: 'mysql2',
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    charset: 'utf8mb4',
    // Match Laravel/PDO result shapes (native prepares, ATTR_STRINGIFY_FETCHES
    // off): integers incl. BIGINT are numbers, DECIMAL stays a string, dates
    // are "Y-m-d H:i:s" strings. BIGINTs beyond 2^53 come back as strings.
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    decimalNumbers: false,
    timezone: 'Z',
  },
  pool: { min: 0, max: env.DB_POOL_MAX },
});

/** Prefix-aware table name (Laravel DB_PREFIX, empty in this project). */
export const table = (name) => `${env.DB_PREFIX}${name}`;

export async function closeDb() {
  await db.destroy();
}
