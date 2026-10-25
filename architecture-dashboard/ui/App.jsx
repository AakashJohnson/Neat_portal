import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, useNodesState, useEdgesState, useReactFlow } from '@xyflow/react';
import { bucket, colors, layers, views, selectGraph, layoutGraph, matchesSearch } from './graph.mjs';

function ArchitectureNode({ data, selected }) {
  const color = colors[bucket(data)] ?? '#a0b4ce';
  const foreignColumns = new Set(data.metadata.foreignKeys?.flatMap(f => f.columns.map(c => c.source)));
  return <article className={`graph-card ${selected ? 'selected' : ''} ${data.type === 'table' ? 'table-card' : ''}`} style={{ '--accent': color }}>
    <Handle type="target" position={Position.Left} />
    <div className="node-kind">{data.type}<span className={`certainty ${data.confidence}`}>{data.confidence}</span></div>
    <strong title={data.label}>{data.label}</strong>
    {data.type === 'table' ? <div className="table-columns nodrag nowheel">{data.metadata.columns.length ? data.metadata.columns.map(column => <div className="column" key={column.name}><span className="key">{column.primary ? 'PK' : foreignColumns.has(column.name) ? 'FK' : ''}</span><span title={column.name}>{column.name}</span><small>{column.type}</small></div>) : <p>Definition UNKNOWN</p>}</div>
      : data.type === 'layer summary' ? <><div className="big-count">{data.metadata.count}<small>discovered nodes</small></div><div className="summary-types">{Object.entries(data.metadata.types).slice(0, 3).map(([type, count]) => `${count} ${type}`).join(' / ')}</div></>
        : <div className="node-path" title={data.path}>{data.path ?? data.responsibility}</div>}
    <Handle type="source" position={Position.Right} />
  </article>;
}
const nodeTypes = { architecture: ArchitectureNode };
const time = value => value ? new Date(value).toLocaleTimeString() : 'Not yet';

function Inspector({ selected, manifest, onSelect, onClose, openSource, editor }) {
  if (!selected) return <aside className="inspector empty"><div className="eyebrow">SOURCE INSPECTOR</div><h2>Follow the evidence.</h2><p>Select a node to inspect its source, dependencies, API fields, SQL access and analysis confidence.</p><div className="callout">Solid connections are statically verified. Dashed connections are inferred. UNKNOWN means the scanner cannot establish the relationship.</div></aside>;
  const incoming = manifest.edges.filter(e => e.target === selected.id), outgoing = manifest.edges.filter(e => e.source === selected.id);
  const nodeMap = new Map(manifest.nodes.map(n => [n.id, n]));
  const warnings = manifest.diagnostics.filter(d => d.nodeIds.includes(selected.id));
  const associated = [...incoming, ...outgoing].map(e => nodeMap.get(e.source === selected.id ? e.target : e.source)).filter(Boolean);
  return <aside className="inspector">
    <div className="inspector-top"><span className="eyebrow">SOURCE INSPECTOR</span><button onClick={onClose} aria-label="Close inspector">Close</button></div>
    <h2>{selected.label}</h2><div className="chips"><span>{selected.type}</span><span className={selected.confidence}>{selected.confidence}</span></div>
    <p>{selected.responsibility}</p>
    {selected.path && <><code className="source-path">{selected.path}</code><button className="source-button" onClick={() => openSource(selected)}>{editor === 'none' ? 'Copy source reference' : `Open in ${editor}`}</button></>}
    <section><h3>Evidence</h3>{selected.evidence.map((e, i) => <div className="evidence" key={i}><code>{e.path}:{e.line || 1}</code><p>{e.detail}</p></div>)}</section>
    {selected.metadata.route && <section><h3>API / routing</h3><code>{selected.metadata.method} {selected.metadata.route}</code></section>}
    {selected.metadata.auth && <section><h3>Authentication & validation</h3><p>{selected.metadata.auth}</p><p>{selected.metadata.validation}</p><code>{selected.metadata.authSignals?.join(', ') || 'No detectable guard signal'}</code></section>}
    {['requestFields', 'responseFields'].map(field => selected.metadata[field]?.length > 0 && <section key={field}><h3>{field === 'requestFields' ? 'Observed request fields' : 'Observed response fields'}</h3><p className="muted">Partial observations, not a validated contract.</p><div className="field-list">{selected.metadata[field].map(value => <code key={value}>{value}</code>)}</div></section>)}
    {selected.type === 'table' && <section><h3>Schema details</h3><p>{selected.metadata.columns.length} columns / {selected.metadata.indexes.length} indexes / {selected.metadata.foreignKeys.length} foreign keys</p>
      {selected.metadata.snapshot && <p className="muted">Snapshot: {selected.metadata.snapshot.capturedAt}. Not a live database.</p>}
      {selected.metadata.indexes.map((index, i) => <div className="evidence" key={i}><strong>{index.name}</strong><p>{index.unique ? 'Unique' : 'Index'}: {index.columns.join(', ')}</p></div>)}
      {selected.metadata.foreignKeys.map((fk, i) => <div className="evidence" key={i}><strong>{fk.name}</strong><p>{fk.columns.map(c => `${c.source} -> ${fk.targetTable}.${c.target}`).join(', ')}</p></div>)}
    </section>}
    {associated.some(n => n.type === 'endpoint' || n.type === 'table') && <section><h3>Associated routes / tables</h3>{[...new Map(associated.filter(n => n.type === 'endpoint' || n.type === 'table').map(n => [n.id, n])).values()].map(n => <button className="dependency" key={n.id} onClick={() => onSelect(n.id)}>{n.label}</button>)}</section>}
    {selected.metadata.accessedTables?.length > 0 && <section><h3>Tables in handler trace</h3>{selected.metadata.accessedTables.map(id => <button className="dependency" key={id} onClick={() => onSelect(id)}>{nodeMap.get(id)?.label}</button>)}</section>}
    {[['Incoming', incoming], ['Outgoing', outgoing]].map(([label, edges]) => <section key={label}><h3>{label} dependencies ({edges.length})</h3>{edges.slice(0, 70).map(edge => { const target = nodeMap.get(edge.source === selected.id ? edge.target : edge.source); return <button className="dependency" key={edge.id} onClick={() => onSelect(target.id)}><span>{target.label}</span><small>{edge.type} / {edge.confidence}</small></button>; })}{edges.length > 70 && <p>First 70 shown. Use search to explore the remaining references.</p>}</section>)}
    {warnings.length > 0 && <section><h3>Analysis notes ({warnings.length})</h3>{warnings.map(warning => <div className={`finding ${warning.level}`} key={warning.id}><strong>{warning.kind}</strong><p>{warning.message}</p></div>)}</section>}
    <details><summary>Structural metadata</summary><pre>{JSON.stringify(selected.metadata, null, 2)}</pre></details>
  </aside>;
}

export function App() {
  const [manifest, setManifest] = useState(null), [session, setSession] = useState(null), [status, setStatus] = useState({ status: 'connecting', revision: 0 });
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [view, setView] = useState('overview'), [search, setSearch] = useState('');
  const [enabled, setEnabled] = useState(layers.filter(l => l !== 'tests')), [certainty, setCertainty] = useState('all'), [limit, setLimit] = useState(160);
  const [selectedId, setSelectedId] = useState(null), [focus, setFocus] = useState(null), [showDiagnostics, setShowDiagnostics] = useState(false), [showHelp, setShowHelp] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]), [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const flow = useReactFlow(), revision = useRef(-1), positions = useRef(new Map()), viewRef = useRef(view);
  async function request(url, options = {}, token = session?.token) {
    const response = await fetch(url, { ...options, headers: { 'x-architecture-token': token ?? '', ...options.headers } });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || `Tool request failed (${response.status})`);
    }
    return response.json();
  }
  useEffect(() => {
    let closed = false, events, loading = false;
    const controller = new AbortController();
    async function connect() {
      try {
        const response = await fetch('/api/session', { signal: controller.signal });
        if (!response.ok) throw new Error('Local session could not be established');
        const bootstrap = await response.json();
        if (closed) return;
        setSession(bootstrap);
        events = new EventSource(`/api/events?token=${encodeURIComponent(bootstrap.token)}`);
        events.onmessage = async event => {
          if (closed) return;
          try {
            const next = JSON.parse(event.data);
            setStatus(next);
            if (next.error) setError(next.error);
            if (next.revision !== revision.current && next.revision > 0 && !loading) {
              loading = true;
              const data = await request('/api/manifest', { signal: controller.signal }, bootstrap.token);
              if (!closed) { setManifest(data); revision.current = next.revision; setError(next.error ?? ''); }
            }
          } catch (failure) { if (!closed && failure.name !== 'AbortError') setError(failure.message); }
          finally { loading = false; }
        };
        events.onerror = () => { if (!closed) { setStatus(s => ({ ...s, stale: true })); setError('Live connection interrupted. Retrying automatically; the displayed graph may be stale.'); } };
        events.onopen = () => { if (!closed) setError(''); };
      } catch (failure) { if (!closed && failure.name !== 'AbortError') setError(failure.message); }
    }
    connect();
    return () => { closed = true; controller.abort(); events?.close(); };
  }, []);
  const graph = useMemo(() => manifest ? selectGraph(manifest, { view, search, enabled, certainty, limit, focus }) : { nodes: [], edges: [], total: 0, omitted: 0 }, [manifest, view, search, enabled, certainty, limit, focus]);
  useEffect(() => {
    const layout = layoutGraph(graph, { overviewColumns: window.innerWidth >= 1250 ? 3 : 2 });
    const changedView = viewRef.current !== view;
    viewRef.current = view;
    setNodes(layout.nodes.map(n => ({ ...n, position: !changedView && positions.current.get(`${view}:${n.id}`) || n.position, selected: n.id === selectedId })));
    setEdges(layout.edges);
    const timer = setTimeout(() => flow.fitView({ padding: 0.18, duration: 250, maxZoom: 1 }), 60);
    return () => clearTimeout(timer);
  }, [graph, view]);
  useEffect(() => { setNodes(current => current.map(n => ({ ...n, selected: n.id === selectedId }))); }, [selectedId]);
  const selected = manifest?.nodes.find(n => n.id === selectedId) ?? graph.nodes.find(n => n.id === selectedId);
  function choose(id) {
    if (id.startsWith('group:')) { setView(id.slice(6)); setSelectedId(null); setFocus(null); return; }
    const node = manifest.nodes.find(n => n.id === id);
    if (!node) return;
    if (!enabled.includes(bucket(node))) setEnabled(current => [...current, bucket(node)]);
    setSelectedId(id);
    if (!graph.nodes.some(n => n.id === id)) { setView('dependencies'); setFocus(id); setSearch(''); }
  }
  async function rescan() {
    try { setError(''); await request('/api/rescan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); }
    catch (failure) { setError(failure.message); }
  }
  async function openSource(node) {
    try {
      if (session.editor === 'none') { await navigator.clipboard.writeText(`${node.path}:${node.evidence[0]?.line || 1}`); setNotice('Source reference copied. Enable editor links with --editor cursor or --editor vscode.'); }
      else {
        const result = await request('/api/editor-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodeId: node.id }) });
        window.location.href = result.url;
      }
    } catch (failure) { setError(failure.message); }
  }
  const found = manifest && search ? manifest.nodes.filter(n => matchesSearch(n, search)).slice(0, 12) : [];
  return <div className="app-shell">
    <header className="topbar"><div className="brand-mark">N<span>.</span></div><div className="brand"><strong>Architecture Observatory</strong><span>NEAT / SOURCE-DERIVED DEVELOPMENT TOOL</span></div>
      <div className="local-badge">LOCAL ONLY <i /> NO DATABASE ACCESS</div>
      <button className="quiet" onClick={() => setShowHelp(true)}>Evidence & limits</button>
      <button className="primary" onClick={rescan} disabled={!session || status.status === 'scanning'}>{status.status === 'scanning' ? 'Scanning...' : 'Rescan repository'}</button>
    </header>
    <div className="statusbar"><span className={`status-dot ${status.status}`} /><strong>{status.stale ? 'STALE / ' : ''}{status.status.toUpperCase()}</strong><span>Last successful scan: {time(status.lastSuccessfulScan)}</span><span>Revision {status.revision || 0}</span>{manifest && <><span>{manifest.stats.analyzedFiles} files</span><span>{manifest.stats.nodes.toLocaleString()} nodes</span><span>{manifest.stats.edges.toLocaleString()} connections</span><span>{manifest.stats.scanErrors} scan errors</span></>}</div>
    {error && <div className="alert" role="alert">{error}</div>}{notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}
    <div className="workspace">
      <nav className="sidebar" aria-label="Architecture views"><div className="eyebrow">EXPLORE ARCHITECTURE</div>
        {views.map(([id, label], index) => <button key={id} className={`view-button ${view === id ? 'active' : ''}`} onClick={() => { setView(id); setFocus(null); setSearch(''); setSelectedId(null); }}><span>{String(index + 1).padStart(2, '0')}</span>{label}</button>)}
        <div className="sidebar-section"><div className="eyebrow">VISIBLE LAYERS</div>{layers.map(layer => <label className="layer-filter" key={layer}><input type="checkbox" checked={enabled.includes(layer)} onChange={() => setEnabled(current => current.includes(layer) ? current.filter(l => l !== layer) : [...current, layer])} /><i style={{ background: colors[layer] }} />{layer}</label>)}</div>
        <div className="sidebar-section"><label className="eyebrow" htmlFor="confidence">EVIDENCE CONFIDENCE</label><select id="confidence" value={certainty} onChange={e => setCertainty(e.target.value)}><option value="all">All evidence levels</option><option value="verified">Verified only</option><option value="inferred">Inferred only</option><option value="unknown">Unknown only</option></select></div>
        <div className="sidebar-foot"><span className="eyebrow">STATIC, NOT SPECULATIVE</span><p>Unknown relationships stay unknown. Source files are never executed.</p><button onClick={() => setShowDiagnostics(!showDiagnostics)}>Review {manifest?.diagnostics.length ?? 0} analysis notes</button></div>
      </nav>
      <main className="canvas-area">
        <div className="canvas-toolbar"><div><span className="eyebrow">LIVE ARCHITECTURE MAP</span><h1>{views.find(v => v[0] === view)?.[1]}</h1></div><div className="search-wrap"><input aria-label="Search architecture" placeholder="Search files, APIs, tables, symbols..." value={search} onChange={e => { setSearch(e.target.value); setFocus(null); }} />{search && <button onClick={() => setSearch('')} aria-label="Clear search">Clear</button>}{found.length > 0 && <div className="search-results">{found.map(node => <button key={node.id} onClick={() => { setView('dependencies'); setFocus(node.id); setSearch(''); choose(node.id); }}><strong>{node.label}</strong><small>{node.path}</small></button>)}</div>}</div></div>
        <div className="graph-meta"><span>{graph.nodes.length} of {graph.total} view nodes / {graph.edges.length} visible connections</span>{graph.omitted > 0 && <strong>{graph.omitted} hidden for readability</strong>}<label>Node limit <select aria-label="Node limit" value={limit} onChange={e => setLimit(Number(e.target.value))}><option value={80}>80</option><option value={160}>160</option><option value={320}>320</option><option value={600}>600</option></select></label>{focus && <button onClick={() => setFocus(null)}>Clear focused neighborhood</button>}</div>
        {view === 'sql' && <div className="schema-banner">FILE SNAPSHOT / {manifest?.project.schemaSnapshot?.schema ?? 'UNKNOWN'} / MySQL {manifest?.project.schemaSnapshot?.serverVersion ?? 'UNKNOWN'} / {manifest?.stats.declaredTables} tables, {manifest?.stats.columns} columns, {manifest?.stats.foreignKeys} declared foreign keys. Not live.</div>}
        <div className="flow-container">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} onNodeClick={(_event, node) => choose(node.id)} onNodeDragStop={(_event, node) => positions.current.set(`${view}:${node.id}`, node.position)} minZoom={0.03} maxZoom={2} fitView nodesConnectable={false} colorMode="dark" onlyRenderVisibleElements={nodes.length > 200}>
            <Background color="#26344c" gap={22} size={1} /><Controls showInteractive={false} /><MiniMap nodeColor={node => colors[bucket(node.data)] ?? '#a0b4ce'} pannable zoomable maskColor="#0c1329b8" />
          </ReactFlow>
          {!manifest && <div className="empty-canvas"><h2>Reading the architecture...</h2><p>{error || 'Parsing repository files. No application code or SQL is executed.'}</p></div>}
          {manifest && !nodes.length && <div className="empty-canvas"><h2>No matching nodes</h2><p>Try another view, enable more layers, or clear the search.</p></div>}
        </div>
        <div className="legend"><span><i className="solid" />Verified</span><span><i className="dashed" />Inferred</span><span><i className="dotted" />Unknown</span><span className="legend-tip">Click to inspect / drag to arrange / scroll to zoom</span></div>
        {showDiagnostics && <section className="diagnostics"><div className="inspector-top"><h2>Potential concerns & analysis limitations</h2><button onClick={() => setShowDiagnostics(false)}>Close</button></div><p>Static signals are not confirmed defects, unused-code claims or proof of exploitability.</p>{manifest?.diagnostics.slice(0, 200).map(d => <button className={`finding ${d.level}`} key={d.id} onClick={() => d.nodeIds[0] && choose(d.nodeIds[0])}><strong>{d.kind} <small>{d.confidence}</small></strong><p>{d.message}</p><code>{d.evidence[0]?.path}:{d.evidence[0]?.line}</code></button>)}{manifest?.diagnostics.length > 200 && <p>Showing 200 notes. Select individual nodes for their notes; the full manifest retains all findings.</p>}</section>}
      </main>
      {manifest && <Inspector selected={selected} manifest={manifest} onSelect={choose} onClose={() => setSelectedId(null)} openSource={openSource} editor={session?.editor ?? 'none'} />}
    </div>
    {showHelp && <div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-label="Evidence and limitations" className="modal"><div className="inspector-top"><h2>What this map can establish</h2><button onClick={() => setShowHelp(false)}>Close</button></div><p>Version {manifest?.version ?? '1.0'} / {session?.rootLabel} / last scan {manifest?.generatedAt}</p><ul>{manifest?.limitations.map(item => <li key={item}>{item}</li>)}</ul><h3>Scan coverage</h3><pre>{JSON.stringify(manifest?.stats, null, 2)}</pre><a href="#" onClick={event => { event.preventDefault(); const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'architecture.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Download sanitized manifest</a></section></div>}
  </div>;
}
