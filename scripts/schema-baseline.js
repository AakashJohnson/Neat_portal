import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const args = process.argv.slice(2);
const schemaName = args.find((a) => !a.startsWith('--'));
const withData = args.includes('--data');
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 ? args[outIdx + 1] : path.resolve(import.meta.dirname, '../../docs/evidence');

if (!schemaName) {
  console.error('usage: node scripts/schema-baseline.js <schema> [--data] [--out <dir>]');
  process.exit(1);
}

const sha256 = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});

async function q(sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

try {
  await conn.query('SET SESSION TRANSACTION READ ONLY');

  const [[{ version }]] = await conn.query('SELECT VERSION() AS version');

  // Volatile columns (TABLE_ROWS, AUTO_INCREMENT, sizes, timestamps) are excluded.
  const tables = await q(
    `SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_COLLATION, CREATE_OPTIONS, TABLE_COMMENT
       FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
    [schemaName],
  );
  const columns = await q(
    `SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_TYPE,
            CHARACTER_SET_NAME, COLLATION_NAME, COLUMN_KEY, EXTRA, GENERATION_EXPRESSION, COLUMN_COMMENT
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [schemaName],
  );
  const indexes = await q(
    `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, SUB_PART, INDEX_TYPE
       FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    [schemaName],
  );
  const constraints = await q(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE
       FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, CONSTRAINT_NAME`,
    [schemaName],
  );
  const keyUsage = await q(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, ORDINAL_POSITION,
            REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
    [schemaName],
  );
  const foreignKeys = await q(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, UPDATE_RULE, DELETE_RULE
       FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ?
      ORDER BY TABLE_NAME, CONSTRAINT_NAME`,
    [schemaName],
  );
  const routines = await q(
    `SELECT ROUTINE_NAME, ROUTINE_TYPE, DTD_IDENTIFIER, ROUTINE_DEFINITION
       FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? ORDER BY ROUTINE_NAME`,
    [schemaName],
  );
  const triggers = await q(
    `SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING, ACTION_STATEMENT
       FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ? ORDER BY TRIGGER_NAME`,
    [schemaName],
  );
  const views = await q(
    `SELECT TABLE_NAME, VIEW_DEFINITION, CHECK_OPTION, IS_UPDATABLE
       FROM information_schema.VIEWS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
    [schemaName],
  );

  const createStatements = {};
  for (const t of tables) {
    const [[row]] = await conn.query(`SHOW CREATE TABLE \`${schemaName}\`.\`${t.TABLE_NAME}\``);
    const ddl = row['Create Table'] ?? row['Create View'];
    createStatements[t.TABLE_NAME] = ddl.replace(/ AUTO_INCREMENT=\d+/, '');
  }

  const structure = { tables, columns, indexes, constraints, keyUsage, foreignKeys, routines, triggers, views };

  const result = {
    schema: schemaName,
    serverVersion: version,
    capturedAt: new Date().toISOString(),
    counts: {
      tables: tables.length,
      columns: columns.length,
      indexEntries: indexes.length,
      constraints: constraints.length,
      foreignKeys: foreignKeys.length,
      routines: routines.length,
      triggers: triggers.length,
      views: views.length,
    },
    hashes: {
      structure: sha256(structure),
      createStatements: sha256(createStatements),
    },
    structure,
    createStatements,
  };

  if (withData) {
    const data = {};
    for (const t of tables.filter((x) => x.TABLE_TYPE === 'BASE TABLE')) {
      const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${schemaName}\`.\`${t.TABLE_NAME}\``);
      const [[cs]] = await conn.query(`CHECKSUM TABLE \`${schemaName}\`.\`${t.TABLE_NAME}\``);
      data[t.TABLE_NAME] = { rows: Number(n), checksum: cs.Checksum === null ? null : String(cs.Checksum) };
    }
    result.data = data;
    result.hashes.data = sha256(data);
  }

  mkdirSync(outDir, { recursive: true });
  const stamp = result.capturedAt.replace(/[:.]/g, '-');
  const file = path.join(outDir, `schema-baseline-${schemaName}-${stamp}.json`);
  writeFileSync(file, JSON.stringify(result, null, 2));

  console.log(JSON.stringify({ file, serverVersion: version, counts: result.counts, hashes: result.hashes }, null, 2));
} finally {
  await conn.end();
}
