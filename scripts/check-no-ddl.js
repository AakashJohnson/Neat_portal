// Gate C: the database structure must not change — no DDL, no Knex schema
// builder or migrations anywhere in the backend code. Reads (SHOW CREATE TABLE,
// information_schema) are allowed.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['src', 'scripts'];
const RULES = [
  [/(?<!SHOW\s|['"])\bCREATE\s+(TEMPORARY\s+)?(TABLE|INDEX|UNIQUE\s+INDEX|VIEW|TRIGGER|PROCEDURE|FUNCTION|DATABASE|SCHEMA)\b/i, 'CREATE'],
  [/\bALTER\s+(TABLE|VIEW|DATABASE|SCHEMA)\b/i, 'ALTER'],
  [/\bDROP\s+(TABLE|INDEX|VIEW|TRIGGER|PROCEDURE|FUNCTION|DATABASE|SCHEMA)\b/i, 'DROP'],
  [/\b(TRUNCATE|RENAME)\s+TABLE\b/i, 'TRUNCATE/RENAME'],
  [/\.schema\s*\.\s*(createTable|alterTable|dropTable|table|renameTable|raw|createSchema|dropSchema)\b/, 'knex.schema'],
  [/\.migrate\s*\.\s*\w+/, 'knex.migrate'],
];
const SELF = path.resolve(import.meta.filename);
const offenders = [];
for (const root of roots) {
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git') continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(js|mjs|cjs|sql)$/.test(name) && full !== SELF) {
        readFileSync(full, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments
            for (const [re, what] of RULES) if (re.test(line)) offenders.push(`${full}:${i + 1} ${what}: ${line.trim()}`);
          });
      }
    }
  })(path.resolve(root));
}
if (offenders.length) {
  console.error(`DDL found (the schema must not change):\n${offenders.join('\n')}`);
  process.exit(1);
}
console.log('no DDL, schema builder or migrations found');
