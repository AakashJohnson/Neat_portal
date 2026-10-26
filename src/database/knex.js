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


    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    decimalNumbers: false,
    timezone: 'Z',
  },
  pool: { min: 0, max: env.DB_POOL_MAX },
});


export const table = (name) => `${env.DB_PREFIX}${name}`;

export async function closeDb() {
  await db.destroy();
}
