import dagre from '@dagrejs/dagre';

export const layers = ['frontend', 'backend', 'api', 'sql', 'authentication', 'infrastructure', 'tests'];
export const views = [
  ['overview', 'System overview'], ['frontend', 'Next.js frontend'], ['backend', 'Express backend'], ['api', 'API request flows'],
  ['sql', 'SQL schema'], ['authentication', 'Authentication'], ['infrastructure', 'Infrastructure'], ['dependencies', 'Dependencies & diagnostics'],
];
export const colors = { frontend: '#65bbff', backend: '#a497ff', api: '#f4c66b', sql: '#64d8ba', authentication: '#f69bc2', infrastructure: '#a0b4ce', tests: '#cfb1ef' };
export function bucket(node) {
  return node.layer !== 'tests' && /(?:\/auth\/|SessionProvider|session\/route|tokenEndpoints|middleware\/auth|jwtService|permissions\.js)/.test(node.path ?? '') ? 'authentication' : node.layer;
}
export function matchesSearch(node, search) {
  const term = search.trim().toLowerCase();
  return !term || [node.label, node.path, node.type, node.metadata?.route, ...(node.metadata?.columns ?? []).map(c => c.name)].filter(Boolean).some(value => value.toLowerCase().includes(term));
}
export function overview(manifest, enabled) {
  const groups = new Map();
  for (const node of manifest.nodes) {
    const group = bucket(node);
    if (!enabled.includes(group)) continue;
    const item = groups.get(group) ?? { id: `group:${group}`, label: group === 'sql' ? 'SQL / MySQL' : group === 'api' ? 'API & BFF' : group[0].toUpperCase() + group.slice(1), type: 'layer summary', layer: group, path: null, confidence: 'verified', responsibility: `Source-derived ${group} layer`, dependencies: [], evidence: [], metadata: { count: 0, types: {} } };
    item.metadata.count++;
    item.metadata.types[node.type] = (item.metadata.types[node.type] ?? 0) + 1;
    if (item.evidence.length < 5) item.evidence.push(node.evidence[0]);
    groups.set(group, item);
  }
  const nodeMap = new Map(manifest.nodes.map(n => [n.id, n]));
  const connections = new Map();
  for (const edge of manifest.edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;
    const from = bucket(nodeMap.get(edge.source)), to = bucket(nodeMap.get(edge.target));
    if (from === to || !groups.has(from) || !groups.has(to)) continue;
    const key = `${from}:${to}`;
    const item = connections.get(key) ?? { id: `summary:${key}`, source: `group:${from}`, target: `group:${to}`, type: 'dependencies', confidence: 'verified', evidence: [], count: 0 };
    item.count++;
    if (edge.confidence !== 'verified') item.confidence = 'inferred';
    connections.set(key, item);
  }
  return { nodes: [...groups.values()], edges: [...connections.values()].map(e => ({ ...e, type: `${e.count} relationships` })), total: groups.size, omitted: 0 };
}
export function selectGraph(manifest, { view = 'overview', search = '', enabled = layers, certainty = 'all', limit = 160, focus = null } = {}) {
  const evidenceNodes = new Set(manifest.edges.filter(e => e.confidence === certainty).flatMap(e => [e.source, e.target]));
  const allowed = n => enabled.includes(bucket(n)) && (certainty === 'all' || n.confidence === certainty || evidenceNodes.has(n.id));
  if (view === 'overview' && !search && !focus) return overview({ ...manifest, nodes: manifest.nodes.filter(allowed), edges: manifest.edges.filter(e => certainty === 'all' || e.confidence === certainty) }, enabled);
  const nodeMap = new Map(manifest.nodes.map(n => [n.id, n]));
  let candidates = manifest.nodes.filter(allowed);
  if (view !== 'dependencies' && view !== 'overview') {
    if (view === 'api') {
      const ids = new Set(candidates.filter(n => n.layer === 'api').map(n => n.id));
      for (const e of manifest.edges) if (ids.has(e.source) || ids.has(e.target)) { if (['routes to', 'calls API', 'invokes'].includes(e.type)) { ids.add(e.source); ids.add(e.target); } }
      candidates = candidates.filter(n => ids.has(n.id));
    } else candidates = candidates.filter(n => view === 'sql' ? n.type === 'table' || n.type === 'schema' : bucket(n) === view);
  }
  if (search || focus) {
    const matches = new Set(candidates.filter(n => focus ? n.id === focus : matchesSearch(n, search)).map(n => n.id));
    const adjacent = new Set(matches);
    for (const edge of manifest.edges) if (matches.has(edge.source) || matches.has(edge.target)) { adjacent.add(edge.source); adjacent.add(edge.target); }
    candidates = manifest.nodes.filter(n => adjacent.has(n.id) && allowed(n));
    candidates.sort((a, b) => Number(matches.has(b.id)) - Number(matches.has(a.id)) || a.label.localeCompare(b.label));
  } else {
    candidates.sort((a, b) => Number(b.type === 'endpoint' || b.type === 'table') - Number(a.type === 'endpoint' || a.type === 'table') || a.id.localeCompare(b.id));
  }
  const chosen = candidates.slice(0, limit);
  const ids = new Set(chosen.map(n => n.id));
  return { nodes: chosen, edges: manifest.edges.filter(e => ids.has(e.source) && ids.has(e.target) && nodeMap.has(e.source) && (certainty === 'all' || e.confidence === certainty)), total: candidates.length, omitted: Math.max(0, candidates.length - chosen.length) };
}
export function layoutGraph(graph, { overviewColumns = 3 } = {}) {
  const layout = new dagre.graphlib.Graph();
  layout.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 170, marginx: 35, marginy: 35 });
  layout.setDefaultEdgeLabel(() => ({}));
  for (const node of graph.nodes) layout.setNode(node.id, { width: node.type === 'table' ? 290 : 240, height: node.type === 'table' ? Math.min(340, 105 + (node.metadata.columns?.length ?? 0) * 25) : node.type === 'layer summary' ? 170 : 105 });
  for (const edge of graph.edges) layout.setEdge(edge.source, edge.target);
  dagre.layout(layout);
  const summary = graph.nodes.length > 0 && graph.nodes.every(n => n.type === 'layer summary');
  const order = ['frontend', 'api', 'backend', 'authentication', 'infrastructure', 'sql', 'tests'].filter(layer => graph.nodes.some(n => n.layer === layer));
  return {
    nodes: graph.nodes.map(node => {
      const pos = layout.node(node.id), index = order.indexOf(node.layer);
      return { id: node.id, type: 'architecture', position: summary ? { x: (index % overviewColumns) * 320, y: Math.floor(index / overviewColumns) * 255 } : { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 }, data: node };
    }),
    edges: graph.edges.map(edge => ({ ...edge, type: 'smoothstep', label: edge.type, animated: false, markerEnd: { type: 'arrowclosed', color: '#8093b1' }, style: { stroke: '#7485a5', strokeWidth: 1.5, strokeDasharray: edge.confidence === 'inferred' ? '6 4' : edge.confidence === 'unknown' ? '2 5' : undefined }, labelStyle: { fill: '#dce5f5', fontSize: 11 }, labelBgStyle: { fill: '#192438' }, labelBgPadding: [6, 3] })),
  };
}
