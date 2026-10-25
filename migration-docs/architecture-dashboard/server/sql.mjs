import sql from 'node-sql-parser';
import { ev } from './manifest.mjs';

const parser = new sql.Parser();
const identifier = value => typeof value === 'string' && /^[\w$ .-]{1,128}$/.test(value) ? value : null;
export const logicalTable = value => identifier(value?.split(/\s+(?:as\s+)?/i)[0]?.replaceAll('`', ''))?.split('.').at(-1);
const columnType = value => /^(?:enum|set)\(/i.test(value) ? `${value.match(/^\w+/)[0]} (values omitted)` : /^[a-z]+(?:\(\d+(?:,\d+)?\))?(?:\s+(?:unsigned|zerofill))*$/i.test(value) ? value : 'UNKNOWN';

export class SqlModel {
  constructor(graph) { this.graph = graph; this.tables = new Map(); this.pending = []; this.snapshot = null; }
  table(name, file, line = 1, certainty = 'unknown') {
    name = logicalTable(name);
    if (!name) return null;
    if (!this.tables.has(name)) {
      const id = `table:${name}`;
      this.graph.add(id, name, 'table', 'sql', file, ev(file, line, 'Logical SQL table reference; runtime database/prefix not resolved'), { columns: [], indexes: [], constraints: [], foreignKeys: [], definition: 'UNKNOWN' }, certainty);
      this.tables.set(name, id);
    }
    return this.tables.get(name);
  }
  define(name, file, metadata, line = 1) {
    const id = this.table(name, file, line);
    if (!id) return;
    const node = this.graph.nodes.get(id);
    Object.assign(node, { path: file, confidence: 'verified', evidence: [ev(file, line, metadata.snapshot ? 'Checked-in schema snapshot; not live' : 'MySQL DDL declaration', metadata.snapshot ? 'snapshot' : 'ast')], metadata: { ...node.metadata, ...metadata, definition: 'declared' } });
    return id;
  }
  loadSnapshot(snapshot, file) {
    if (!snapshot?.structure?.tables || !Array.isArray(snapshot.structure.columns)) throw new Error('Invalid schema snapshot');
    const structure = snapshot.structure;
    this.snapshot = { path: file, schema: identifier(snapshot.schema) ?? 'UNKNOWN', capturedAt: /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(snapshot.capturedAt) ? snapshot.capturedAt : 'UNKNOWN', serverVersion: String(snapshot.serverVersion).match(/^\d+\.\d+\.\d+/)?.[0] ?? 'UNKNOWN' };
    const schemaId = this.graph.add('schema:snapshot', this.snapshot.schema, 'schema', 'sql', file, ev(file, 1, 'File-based MySQL schema snapshot', 'snapshot'), this.snapshot);
    for (const row of structure.tables) {
      const name = identifier(row.TABLE_NAME);
      if (!name) continue;
      const columns = structure.columns.filter(c => c.TABLE_NAME === name).map(c => ({
        name: identifier(c.COLUMN_NAME), type: columnType(String(c.COLUMN_TYPE)),
        nullable: c.IS_NULLABLE === 'YES', primary: c.COLUMN_KEY === 'PRI',
        defaultPresent: c.COLUMN_DEFAULT !== null, generated: Boolean(c.GENERATION_EXPRESSION), ordinal: Number(c.ORDINAL_POSITION),
      })).filter(c => c.name).sort((a, b) => a.ordinal - b.ordinal);
      const indexes = [];
      for (const i of (structure.indexes ?? []).filter(i => i.TABLE_NAME === name)) {
        let index = indexes.find(x => x.name === i.INDEX_NAME);
        if (!index) { index = { name: identifier(i.INDEX_NAME), unique: i.NON_UNIQUE === 0, type: identifier(i.INDEX_TYPE), columns: [] }; indexes.push(index); }
        if (identifier(i.COLUMN_NAME)) index.columns.push(i.COLUMN_NAME);
      }
      const constraints = (structure.constraints ?? []).filter(c => c.TABLE_NAME === name).map(c => ({ name: identifier(c.CONSTRAINT_NAME), type: c.CONSTRAINT_TYPE })).filter(c => c.name);
      const foreignKeys = (structure.foreignKeys ?? []).filter(f => f.TABLE_NAME === name).map(f => ({
        name: identifier(f.CONSTRAINT_NAME), targetTable: identifier(f.REFERENCED_TABLE_NAME),
        columns: (structure.keyUsage ?? []).filter(k => k.TABLE_NAME === name && k.CONSTRAINT_NAME === f.CONSTRAINT_NAME).map(k => ({ source: identifier(k.COLUMN_NAME), target: identifier(k.REFERENCED_COLUMN_NAME) })),
        onUpdate: f.UPDATE_RULE, onDelete: f.DELETE_RULE,
      })).filter(f => f.name && f.targetTable);
      const id = this.define(name, file, { columns, indexes, constraints, foreignKeys, snapshot: this.snapshot, engine: identifier(row.ENGINE) });
      this.graph.link(schemaId, id, 'contains', ev(file, 1, 'Snapshot table membership', 'snapshot'));
      for (const fk of foreignKeys) this.pending.push({ source: id, target: fk.targetTable, file, detail: `FK ${fk.name}: ${fk.columns.map(c => `${c.source} -> ${c.target}`).join(', ')}; DELETE ${fk.onDelete}` });
    }
  }
  ddl(text, file) {
    let statements;
    try { statements = parser.astify(text, { database: 'MySQL' }); }
    catch { this.graph.diagnostic('sql-parse', 'MySQL DDL could not be fully parsed; no statement text retained.', ev(file), [], 'error'); return; }
    for (const statement of Array.isArray(statements) ? statements : [statements]) {
      if (statement?.type !== 'create' || statement.keyword !== 'table') {
        if (['alter', 'drop', 'rename'].includes(statement?.type)) this.graph.diagnostic('migration-history', 'Migration operation detected; effective post-migration schema is UNKNOWN. Migrations are never executed.', ev(file), [], 'info');
        continue;
      }
      const name = logicalTable(statement.table?.[0]?.table);
      if (!name) continue;
      const definitions = statement.create_definitions ?? [];
      const primary = definitions.filter(d => d.constraint_type === 'primary key' || d.constraint_type === 'PRIMARY KEY').flatMap(d => d.definition?.map(c => c.column) ?? []);
      const columns = definitions.filter(d => d.resource === 'column').map(d => ({
        name: identifier(d.column?.column), type: [d.definition?.dataType, d.definition?.length ? `(${d.definition.length})` : ''].join(''),
        nullable: d.nullable?.value !== 'not null', primary: Boolean(d.primary_key) || primary.includes(d.column?.column),
        defaultPresent: Boolean(d.default_val), generated: Boolean(d.generated),
      })).filter(c => c.name);
      const indexes = definitions.filter(d => d.resource === 'index' || /unique|primary key/i.test(d.constraint_type ?? '')).map(d => ({ name: identifier(d.index ?? d.constraint ?? 'PRIMARY'), unique: /unique|primary/i.test(d.constraint_type ?? ''), columns: d.definition?.map(c => identifier(c.column)).filter(Boolean) ?? [] }));
      const foreignKeys = definitions.filter(d => d.reference_definition).map((d, index) => ({
        name: identifier(d.constraint) ?? `fk_${index}`, targetTable: logicalTable(d.reference_definition.table?.[0]?.table),
        columns: d.definition.map((c, i) => ({ source: identifier(c.column), target: identifier(d.reference_definition.definition?.[i]?.column) })),
      }));
      const id = this.define(name, file, { columns, indexes, foreignKeys, constraints: definitions.filter(d => d.resource === 'constraint').map(d => ({ name: identifier(d.constraint), type: d.constraint_type })) });
      for (const fk of foreignKeys) if (fk.targetTable) this.pending.push({ source: id, target: fk.targetTable, file, detail: `Declared FK ${fk.name}: ${fk.columns.map(c => `${c.source} -> ${c.target}`).join(', ')}` });
    }
  }
  raw(text, file, line, caller) {
    try {
      for (const item of parser.tableList(text, { database: 'MySQL' })) {
        const [operation, , name] = item.split('::');
        const target = this.table(name, file, line);
        if (target) this.graph.link(caller, target, ['insert', 'update', 'delete', 'replace'].includes(operation) ? 'writes data' : 'reads data', ev(file, line, 'Table extracted from static MySQL query; SQL text omitted'));
      }
    } catch { this.graph.diagnostic('sql-unresolved', 'Raw SQL could not be resolved statically; query text omitted.', ev(file, line), [caller]); }
  }
  finish() {
    for (const item of this.pending) {
      const target = this.table(item.target, item.file);
      this.graph.link(item.source, target, 'foreign key', ev(item.file, 1, item.detail, 'schema'));
    }
  }
}
