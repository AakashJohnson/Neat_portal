import { createHash } from 'node:crypto';
import { ev } from './manifest.mjs';

export function diagnostics(graph, modules, endpoints) {
  const imports = new Map(), incoming = new Map(), outgoing = new Map();
  for (const edge of graph.edges.values()) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
    if (edge.type === 'imports' && edge.target.startsWith('file:')) imports.set(edge.source, [...(imports.get(edge.source) ?? []), edge.target]);
  }
  const visited = new Set(), active = new Set(), reported = new Set();
  function visit(id, stack) {
    if (active.has(id)) {
      const cycle = stack.slice(stack.indexOf(id));
      const signature = [...cycle].sort().join('|');
      if (!reported.has(signature)) { reported.add(signature); graph.diagnostic('import-cycle', `Static import cycle involving ${cycle.length} modules. A cycle is not necessarily a runtime failure.`, graph.nodes.get(id).evidence[0], cycle, 'warning', 'verified'); }
      return;
    }
    if (visited.has(id)) return;
    active.add(id);
    for (const target of imports.get(id) ?? []) visit(target, [...stack, id]);
    active.delete(id); visited.add(id);
  }
  for (const id of imports.keys()) visit(id, []);
  const fingerprints = new Map();
  for (const info of modules.values()) {
    if (info.broken) continue;
    const edges = incoming.get(info.id) ?? [];
    if (!edges.length && !info.next && !['tests', 'infrastructure'].includes(info.layer) && !/(?:server|app|index)\.[cm]?[jt]sx?$/.test(info.file)) graph.diagnostic('potentially-unreferenced', 'No incoming module reference was detected. This is not proof the module is unused; entrypoints, dynamic loading and external consumers may exist.', ev(info.file), [info.id], 'info');
    const fanout = imports.get(info.id)?.length ?? 0;
    if (fanout >= 15) graph.diagnostic('coupling', `Module imports ${fanout} local modules. Review whether this coupling is intentional.`, ev(info.file), [info.id], 'info', 'verified');
    if (graph.nodes.get(info.id).type === 'service' && !edges.some(e => graph.nodes.get(e.source)?.layer === 'tests')) graph.diagnostic('test-visibility', 'No direct test import detected for this service. Integration coverage and indirect tests are UNKNOWN.', ev(info.file), [info.id], 'info');
    for (const [fn, id] of info.functions) {
      const structural = JSON.stringify(fn.body, (key, value) => ['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments'].includes(key) ? undefined : value);
      if (structural.length < 1500) continue;
      const hash = createHash('sha256').update(structural).digest('hex');
      const prior = fingerprints.get(hash);
      if (prior && prior !== id) graph.diagnostic('potential-duplication', 'Two substantial function bodies have identical parsed structure. Review whether shared business logic is appropriate.', graph.nodes.get(id).evidence[0], [prior, id], 'info', 'inferred');
      else fingerprints.set(hash, id);
    }
  }
  for (const endpoint of endpoints) {
    const reachable = new Set(), signals = new Set(), validators = new Set(), requestFields = new Set(), responseFields = new Set(), tables = new Set();
    const queue = [endpoint.id];
    while (queue.length && reachable.size < 500) {
      const id = queue.shift();
      if (reachable.has(id)) continue;
      reachable.add(id);
      const node = graph.nodes.get(id);
      if (!node) continue;
      for (const signal of node.metadata.authSignals ?? []) signals.add(signal);
      for (const signal of node.metadata.validationSignals ?? []) validators.add(signal);
      for (const field of node.metadata.requestFields ?? []) requestFields.add(field);
      for (const field of node.metadata.responseFields ?? []) responseFields.add(field);
      for (const edge of outgoing.get(id) ?? []) {
        if (edge.type === 'authenticates') signals.add(graph.nodes.get(edge.target)?.label);
        if (['reads data', 'writes data', 'joins table'].includes(edge.type)) tables.add(edge.target);
        if (['routes to', 'invokes', 'authenticates'].includes(edge.type) && !edge.target.startsWith('api:')) queue.push(edge.target);
      }
    }
    const node = graph.nodes.get(endpoint.id);
    Object.assign(node.metadata, {
      auth: signals.size ? 'Guard/authentication signals detected; enforcement not proven' : 'UNKNOWN',
      authSignals: [...signals].filter(Boolean), validation: validators.size ? 'Validation signals detected; completeness UNKNOWN' : 'UNKNOWN',
      validationSignals: [...validators], requestFields: [...requestFields].sort(), responseFields: [...responseFields].sort(),
      modelCompleteness: 'Partial field observations, not a contract/schema', accessedTables: [...tables], traceTruncated: queue.length > 0,
    });
    if (!(incoming.get(endpoint.id) ?? []).some(e => graph.nodes.get(e.source)?.type === 'API request')) graph.diagnostic('no-detected-caller', 'No frontend caller detected for this endpoint. External clients or dynamic calls may exist.', node.evidence[0], [endpoint.id], 'info');
    if (!signals.size && !['GET', 'HEAD', 'OPTIONS'].includes(endpoint.method)) graph.diagnostic('auth-visibility', 'Mutating endpoint has no statically detected authentication signal in the bounded handler trace. Public routes can be intentional; this is not a confirmed vulnerability.', node.evidence[0], [endpoint.id]);
    if (!validators.size && !['GET', 'HEAD', 'OPTIONS'].includes(endpoint.method)) graph.diagnostic('validation-visibility', 'No recognized validation helper in the handler trace. Inline validation may exist; request validation is UNKNOWN.', node.evidence[0], [endpoint.id], 'info');
  }
  const packages = [...graph.nodes.values()].filter(n => n.type === 'package');
  if (!packages.some(p => /pino|winston|opentelemetry|sentry/.test(p.label))) graph.diagnostic('observability-visibility', 'No recognized logging/tracing package import detected. Observability is UNKNOWN.', ev('package.json', 1, 'Static package-import analysis'), [], 'info');
}
