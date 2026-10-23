// Renders DATABASE_SCHEMA_REFERENCE.md from a schema-baseline JSON file.
//   node scripts/schema-reference-md.js <baseline.json> <out.md>
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error('usage: node scripts/schema-reference-md.js <baseline.json> <out.md>');
  process.exit(1);
}

const b = JSON.parse(readFileSync(inFile, 'utf8'));
const { tables, columns, indexes, foreignKeys, keyUsage } = b.structure;

const byTable = (rows) =>
  rows.reduce((acc, r) => {
    (acc[r.TABLE_NAME] ??= []).push(r);
    return acc;
  }, {});

const colsBy = byTable(columns);
const idxBy = byTable(indexes);
const fkCols = byTable(keyUsage.filter((k) => k.REFERENCED_TABLE_NAME));

const esc = (v) => (v === null || v === undefined ? '' : String(v).replace(/\|/g, '\\|').replace(/\n/g, ' '));

const noPk = tables.filter((t) => !(idxBy[t.TABLE_NAME] ?? []).some((i) => i.INDEX_NAME === 'PRIMARY'));

const lines = [];
lines.push('# DATABASE_SCHEMA_REFERENCE');
lines.push('');
lines.push('Generated from a **read-only** baseline. No data values or credentials are included.');
lines.push('');
lines.push('| Item | Value |');
lines.push('|---|---|');
lines.push(`| Schema | \`${b.schema}\` |`);
lines.push(`| Local server | MySQL ${b.serverVersion} (dump origin: MariaDB 10.4.27, see BASELINE_REPORT) |`);
lines.push(`| Captured | ${b.capturedAt} |`);
for (const [k, v] of Object.entries(b.counts)) lines.push(`| ${k} | ${v} |`);
for (const [k, v] of Object.entries(b.hashes)) lines.push(`| hash.${k} | \`${v}\` |`);
lines.push('');
lines.push('## Engine-level objects');
lines.push('');
lines.push(`- Views: ${b.counts.views}, triggers: ${b.counts.triggers}, stored routines: ${b.counts.routines}.`);
lines.push(`- Foreign keys: ${b.counts.foreignKeys}.`);
lines.push('');
lines.push('## Tables without a PRIMARY KEY');
lines.push('');
lines.push(
  noPk.length
    ? noPk.map((t) => `- \`${t.TABLE_NAME}\``).join('\n')
    : '- none',
);
lines.push('');
lines.push('Data access for these tables must use explicit WHERE clauses on business columns; no ORM identity map.');
lines.push('');
lines.push('## Foreign keys');
lines.push('');
lines.push('| Table | Constraint | Column | References | On update | On delete |');
lines.push('|---|---|---|---|---|---|');
for (const fk of foreignKeys) {
  const cols = (fkCols[fk.TABLE_NAME] ?? []).filter((k) => k.CONSTRAINT_NAME === fk.CONSTRAINT_NAME);
  for (const c of cols) {
    lines.push(
      `| ${fk.TABLE_NAME} | ${fk.CONSTRAINT_NAME} | ${c.COLUMN_NAME} | ${c.REFERENCED_TABLE_NAME}.${c.REFERENCED_COLUMN_NAME} | ${fk.UPDATE_RULE} | ${fk.DELETE_RULE} |`,
    );
  }
}
lines.push('');
lines.push('## Tables');
for (const t of tables) {
  lines.push('');
  lines.push(`### \`${t.TABLE_NAME}\``);
  lines.push('');
  lines.push(`Engine ${t.ENGINE ?? '-'}, collation ${t.TABLE_COLLATION ?? '-'}${t.TABLE_TYPE !== 'BASE TABLE' ? `, type ${t.TABLE_TYPE}` : ''}`);
  lines.push('');
  lines.push('| # | Column | Type | Null | Default | Key | Extra |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const c of colsBy[t.TABLE_NAME] ?? []) {
    lines.push(
      `| ${c.ORDINAL_POSITION} | ${c.COLUMN_NAME} | ${esc(c.COLUMN_TYPE)} | ${c.IS_NULLABLE} | ${esc(c.COLUMN_DEFAULT)} | ${c.COLUMN_KEY} | ${esc(c.EXTRA)} |`,
    );
  }
  const idx = idxBy[t.TABLE_NAME] ?? [];
  if (idx.length) {
    const grouped = idx.reduce((acc, i) => {
      (acc[i.INDEX_NAME] ??= { unique: i.NON_UNIQUE === 0 || i.NON_UNIQUE === '0', cols: [] }).cols.push(i.COLUMN_NAME);
      return acc;
    }, {});
    lines.push('');
    lines.push(
      'Indexes: ' +
        Object.entries(grouped)
          .map(([n, g]) => `\`${n}\`(${g.cols.join(', ')})${g.unique ? ' unique' : ''}`)
          .join('; '),
    );
  }
}
lines.push('');

writeFileSync(outFile, lines.join('\n'));
console.log(`wrote ${outFile}: ${tables.length} tables, ${noPk.length} without primary key`);
console.log('no-PK tables:', noPk.map((t) => t.TABLE_NAME).join(', ') || 'none');
