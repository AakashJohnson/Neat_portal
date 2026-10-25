import { createHash } from 'node:crypto';
import { z } from 'zod';

export const confidence = z.enum(['verified', 'inferred', 'unknown']);
const evidence = z.object({ path: z.string(), line: z.number().int().nonnegative().optional(), kind: z.string(), detail: z.string() });
const node = z.object({
  id: z.string().min(1), label: z.string(), type: z.string(), layer: z.string(),
  path: z.string().nullable(), responsibility: z.string(), confidence,
  dependencies: z.array(z.string()), evidence: z.array(evidence).min(1), metadata: z.record(z.string(), z.unknown()),
});
const edge = z.object({ id: z.string(), source: z.string(), target: z.string(), type: z.string(), confidence, evidence: z.array(evidence).min(1) });
export const manifestSchema = z.object({
  version: z.literal('1.0'), generatedAt: z.string(), project: z.record(z.string(), z.unknown()),
  stats: z.record(z.string(), z.unknown()), nodes: z.array(node), edges: z.array(edge),
  diagnostics: z.array(z.object({ id: z.string(), kind: z.string(), level: z.enum(['info', 'warning', 'error']), confidence, message: z.string(), nodeIds: z.array(z.string()), evidence: z.array(evidence) })),
  limitations: z.array(z.string()),
});
export const stableId = (...values) => createHash('sha256').update(values.join('\0')).digest('hex').slice(0, 20);
export const ev = (file, line = 1, detail = 'Source declaration', kind = 'ast') => ({ path: file, line, detail, kind });
export function validateManifest(value) {
  manifestSchema.parse(value);
  const ids = new Set(value.nodes.map(n => n.id));
  if (ids.size !== value.nodes.length) throw new Error('Duplicate node IDs');
  const edges = new Set();
  for (const e of value.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) throw new Error('Dangling edge');
    if (edges.has(e.id)) throw new Error('Duplicate edge IDs');
    edges.add(e.id);
  }
  for (const n of value.nodes) if (n.dependencies.some(id => !ids.has(id))) throw new Error('Dangling dependency');
  return value;
}

export class Graph {
  nodes = new Map();
  edges = new Map();
  diagnostics = [];
  add(id, label, type, layer, file, evidence, metadata = {}, certainty = 'verified') {
    if (!this.nodes.has(id)) this.nodes.set(id, { id, label, type, layer, path: file, responsibility: `${type}: ${label}`, confidence: certainty, dependencies: [], evidence: Array.isArray(evidence) ? evidence : [evidence], metadata });
    return id;
  }
  link(source, target, type, evidence, certainty = 'verified') {
    if (!source || !target || source === target) return;
    const id = stableId(source, target, type);
    if (!this.edges.has(id)) this.edges.set(id, { id, source, target, type, confidence: certainty, evidence: [evidence] });
    else {
      const list = this.edges.get(id).evidence;
      if (list.length < 20 && !list.some(e => e.path === evidence.path && e.line === evidence.line && e.detail === evidence.detail)) list.push(evidence);
    }
  }
  diagnostic(kind, message, evidence, nodeIds = [], level = 'warning', certainty = 'unknown') {
    const id = stableId(kind, evidence.path, String(evidence.line), message);
    if (!this.diagnostics.some(d => d.id === id)) this.diagnostics.push({ id, kind, message, evidence: [evidence], nodeIds, level, confidence: certainty });
  }
  finish(project, stats, limitations) {
    for (const n of this.nodes.values()) n.dependencies = [];
    for (const edge of this.edges.values()) {
      const source = this.nodes.get(edge.source);
      if (source && this.nodes.has(edge.target) && !source.dependencies.includes(edge.target)) source.dependencies.push(edge.target);
    }
    return validateManifest({
      version: '1.0', generatedAt: new Date().toISOString(), project, stats,
      nodes: [...this.nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
      edges: [...this.edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
      diagnostics: this.diagnostics, limitations,
    });
  }
}
