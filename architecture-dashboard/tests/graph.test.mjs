import { expect, it } from 'vitest';
import { selectGraph, matchesSearch, layoutGraph, layers } from '../ui/graph.mjs';

const node = (id, layer, label = id) => ({ id, label, layer, type: layer === 'sql' ? 'table' : 'module', path: `${layer}/${id}.js`, confidence: 'verified', evidence: [{ path: `${layer}/${id}.js`, line: 1 }], metadata: { columns: layer === 'sql' ? [{ name: 'Legacy Name', type: 'varchar' }] : [] } });
const manifest = { nodes: [node('page', 'frontend'), node('service', 'backend'), node('users', 'sql'), node('unit', 'tests')], edges: [{ id: 'a', source: 'page', target: 'service', type: 'invokes', confidence: 'verified' }, { id: 'b', source: 'service', target: 'users', type: 'reads data', confidence: 'verified' }] };
it('filters layers and dedicated views without dangling graph edges', () => {
  const sql = selectGraph(manifest, { view: 'sql' });
  expect(sql.nodes.map(n => n.id)).toEqual(['users']);
  expect(sql.edges).toEqual([]);
  const graph = selectGraph(manifest, { view: 'dependencies', enabled: ['frontend', 'sql'] });
  expect(graph.nodes.map(n => n.id)).toEqual(expect.arrayContaining(['page', 'users']));
  expect(graph.edges).toEqual([]);
});
it('searches paths, symbols and SQL columns and includes a bounded context neighborhood', () => {
  expect(matchesSearch(manifest.nodes[2], 'legacy name')).toBe(true);
  expect(matchesSearch(manifest.nodes[0], 'frontend/page')).toBe(true);
  const graph = selectGraph(manifest, { view: 'dependencies', search: 'users', limit: 1 });
  expect(graph.nodes[0].id).toBe('users'); expect(graph.omitted).toBe(1);
});
it('builds an accurate readable overview and finite layout positions', () => {
  const graph = selectGraph(manifest, { enabled: layers.filter(l => l !== 'tests') });
  expect(graph.nodes).toHaveLength(3);
  expect(graph.nodes.find(n => n.layer === 'sql').metadata.count).toBe(1);
  expect(graph.edges).toHaveLength(2);
  const layout = layoutGraph(graph);
  expect(layout.nodes.every(n => Number.isFinite(n.position.x) && Number.isFinite(n.position.y))).toBe(true);
  expect(layout.edges.every(e => e.markerEnd.type === 'arrowclosed')).toBe(true);
});
it('filters inferred connections while retaining their verified endpoint nodes', () => {
  const mixed = { ...manifest, edges: [...manifest.edges, { id: 'c', source: 'unit', target: 'page', type: 'imports', confidence: 'inferred' }] };
  const filtered = selectGraph(mixed, { view: 'dependencies', certainty: 'inferred' });
  expect(filtered.nodes.map(n => n.id)).toEqual(expect.arrayContaining(['unit', 'page']));
  expect(filtered.edges.map(e => e.id)).toEqual(['c']);
  expect(() => selectGraph(mixed, { enabled: ['frontend'], certainty: 'all' })).not.toThrow();
});
