import path from 'node:path';
import { parse } from '@babel/parser';
import traversePackage from '@babel/traverse';
import { ev, stableId } from './manifest.mjs';
import { logicalTable } from './sql.mjs';

const traverse = traversePackage.default ?? traversePackage;
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all']);
export const text = n => n?.type === 'StringLiteral' || n?.type === 'Literal' ? (typeof n.value === 'string' ? n.value : null) : n?.type === 'TemplateLiteral' && n.expressions.length === 0 ? n.quasis[0].value.cooked : null;
export const member = n => n?.type === 'Identifier' ? n.name : n?.type === 'ThisExpression' ? 'this' : n?.type === 'MemberExpression' || n?.type === 'OptionalMemberExpression' ? [member(n.object), n.computed ? text(n.property) : member(n.property)].filter(Boolean).join('.') : null;
const lineOf = n => n?.loc?.start?.line ?? 1;
const safeRoute = value => typeof value === 'string' && value.startsWith('/') && !/[\s?#]/.test(value) && value.length < 300 ? value : null;
const key = n => n?.name ?? text(n);
const isFunction = n => ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod'].includes(n?.type);
const namedType = name => /^use[A-Z]/.test(name) ? 'hook' : /Provider$/.test(name) ? 'state provider' : /^[A-Z]/.test(name) ? 'component' : 'function';
const authPattern = /^(?:requireAuth|requireAccount|requirePermission|authenticate|assertOwn|ensureAdmin|verifyToken|verifyUser|verifyLogged|tokenAuth|currentAccount)/i;
const validationPattern = /validat|schema|safeParse|checkRules/i;

export function classify(file) {
  const layer = /(?:^|\/)(tests?|__tests__)(?:\/|$)|\.(?:test|spec)\./.test(file) ? 'tests' : file.includes('nextjs-frontend/') || /(?:^|\/)(?:app|pages|components|hooks)\//.test(file) ? 'frontend' : file.includes('express-backend/') || /(?:^|\/)(?:controllers|services|repositories|middleware|routes)\//.test(file) ? 'backend' : 'infrastructure';
  const type = /\/middleware\//.test(file) ? 'middleware' : /\/controllers\//.test(file) ? 'controller' : /\/repositories\//.test(file) ? 'repository' : /\/validators?\//.test(file) ? 'validator' : /\/services\//.test(file) ? 'service' : /\/routes\//.test(file) ? 'router module' : /\/config\/|\.config\.|Dockerfile|package\.json|\.ya?ml$/.test(file) ? 'configuration' : /\/hooks\//.test(file) ? 'hook' : /\/components\//.test(file) ? 'component' : 'module';
  return { layer, type };
}

function routeFromFile(file) {
  const appIndex = file.indexOf('/app/');
  if (appIndex < 0 || !/(?:page|layout|route)\.[cm]?[jt]sx?$/.test(file)) return null;
  const pieces = file.slice(appIndex + 5).split('/');
  const kind = pieces.pop().split('.')[0];
  const route = '/' + pieces.filter(p => !/^\(.*\)$/.test(p) && !p.startsWith('@')).join('/');
  return { kind, route, segments: pieces, appRoot: file.slice(0, appIndex + 5) };
}

export function parseModule(file, source, graph) {
  const { layer, type } = classify(file);
  const id = graph.add(`file:${file}`, path.posix.basename(file), type, layer, file, ev(file), {});
  let ast;
  try { ast = parse(source, { sourceType: 'unambiguous', plugins: ['jsx', ...(file.endsWith('.ts') || file.endsWith('.tsx') ? ['typescript'] : []), 'decorators-legacy'], createImportExpressions: true }); }
  catch (error) {
    graph.diagnostic('parse-error', `Source parsing failed (${/^[A-Za-z]+$/.test(error.reasonCode) ? error.reasonCode : 'syntax error'}). File omitted from deeper analysis.`, ev(file, error.loc?.line ?? 1), [id], 'error');
    return { file, id, layer, imports: [], symbols: new Map(), exports: new Map(), broken: true };
  }
  const expressFactories = new Map();
  const knexFactories = new Set();
  for (const statement of ast.program.body) if (statement.type === 'ImportDeclaration' && statement.source.value === 'knex') {
    for (const specifier of statement.specifiers) if (specifier.type === 'ImportDefaultSpecifier' || key(specifier.imported) === 'knex') knexFactories.add(specifier.local.name);
  }
  for (const statement of ast.program.body) if (statement.type === 'ImportDeclaration' && statement.source.value === 'express') {
    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportDefaultSpecifier') { expressFactories.set(specifier.local.name, 'Express application'); expressFactories.set(`${specifier.local.name}.Router`, 'Express router'); }
      if (specifier.type === 'ImportNamespaceSpecifier') expressFactories.set(`${specifier.local.name}.Router`, 'Express router');
      if (specifier.type === 'ImportSpecifier' && key(specifier.imported) === 'Router') expressFactories.set(specifier.local.name, 'Express router');
    }
  }
  const info = { file, id, layer, ast, imports: [], symbols: new Map(), exports: new Map(), locals: new Map(), routers: new Map(), registrations: [], calls: [], renders: [], queryPaths: [], sourceRoutes: [], reexports: [], directives: ast.program.directives.map(d => d.value.value).filter(d => ['use client', 'use server'].includes(d)), next: routeFromFile(file), functions: new Map(), valueOwners: new Map(), fingerprints: [] };
  graph.nodes.get(id).metadata = { directives: info.directives, rendering: layer === 'frontend' ? info.directives.includes('use client') ? 'Client boundary' : info.next ? 'Server by default; runtime rendering strategy UNKNOWN' : 'Depends on importing boundary' : undefined };

  function addSymbol(name, n, symbolType = namedType(name)) {
    if (!name || info.symbols.has(name)) return info.symbols.get(name);
    const symbolId = graph.add(`symbol:${file}#${name}`, name, symbolType, layer, file, ev(file, lineOf(n), 'Named source symbol'), { requestFields: [], responseFields: [], authSignals: [], validationSignals: [] });
    info.symbols.set(name, symbolId);
    graph.link(id, symbolId, 'contains', ev(file, lineOf(n)));
    if (isFunction(n)) info.functions.set(n, symbolId);
    return symbolId;
  }
  for (const statement of ast.program.body) {
    const declaration = statement.declaration ?? statement;
    if (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') {
      const name = declaration.id?.name ?? 'default';
      addSymbol(name, declaration, declaration.type === 'ClassDeclaration' ? 'class' : namedType(name));
      info.locals.set(name, declaration);
      if (statement.type.startsWith('Export')) info.exports.set(statement.type === 'ExportDefaultDeclaration' ? 'default' : name, name);
    }
    if (declaration.type === 'VariableDeclaration') for (const item of declaration.declarations) {
      if (item.id.type !== 'Identifier') continue;
      const name = item.id.name;
      info.locals.set(name, item.init);
      if (item.init?.type === 'CallExpression' && knexFactories.has(member(item.init.callee))) {
        const clientId = addSymbol(name, item.init, 'SQL client');
        const driver = text(item.init.arguments[0]?.properties?.find(p => key(p.key) === 'client')?.value);
        graph.nodes.get(clientId).metadata.driver = ['mysql2', 'mysql', 'pg', 'sqlite3', 'mssql'].includes(driver) ? driver : 'UNKNOWN';
        info.valueOwners.set(item.init, clientId);
      }
      if (isFunction(item.init) || item.init?.type === 'CallExpression' && item.init.arguments.some(isFunction)) {
        const symbolId = addSymbol(name, item.init, namedType(name));
        if (item.init.type === 'CallExpression') for (const arg of item.init.arguments.filter(isFunction)) info.functions.set(arg, symbolId);
      }
      if (item.init?.type === 'ObjectExpression') for (const property of item.init.properties) {
        const propertyName = key(property.key);
        const fn = property.type === 'ObjectMethod' ? property : property.value;
        if (propertyName && isFunction(fn)) addSymbol(`${name}.${propertyName}`, fn);
      }
      if (item.init?.type === 'CallExpression' && expressFactories.has(member(item.init.callee))) {
        const routerId = addSymbol(name, item, expressFactories.get(member(item.init.callee)));
        info.routers.set(name, routerId);
      }
      if (statement.type === 'ExportNamedDeclaration') info.exports.set(name, name);
    }
    if (statement.type === 'ImportDeclaration') {
      info.imports.push({ specifier: statement.source.value, line: lineOf(statement), bindings: statement.specifiers.map(s => ({ local: s.local.name, imported: s.type === 'ImportNamespaceSpecifier' ? '*' : s.type === 'ImportDefaultSpecifier' ? 'default' : key(s.imported) })) });
    }
    if (statement.type === 'ExportNamedDeclaration') for (const spec of statement.specifiers) {
      if (statement.source) info.reexports.push({ exported: key(spec.exported), imported: key(spec.local), specifier: statement.source.value, line: lineOf(spec) });
      else info.exports.set(key(spec.exported), key(spec.local));
    }
    if (statement.type === 'ExportAllDeclaration') info.reexports.push({ exported: '*', imported: '*', specifier: statement.source.value, line: lineOf(statement) });
    if (statement.type === 'ExportDefaultDeclaration' && statement.declaration.type === 'Identifier') info.exports.set('default', statement.declaration.name);
  }
  const owner = p => {
    let current = p;
    while (current) { if (info.functions.has(current.node)) return info.functions.get(current.node); if (info.valueOwners.has(current.node)) return info.valueOwners.get(current.node); current = current.parentPath; }
    return id;
  };
  info.owner = owner;
  traverse(ast, {
    Function(p) {
      const directives = p.node.body?.directives ?? [];
      if (directives.some(d => d.value.value === 'use server')) {
        const symbolId = owner(p);
        graph.nodes.get(symbolId).metadata.serverAction = true;
      }
    },
    VariableDeclarator(p) {
      const call = p.node.init;
      if (p.node.id.type === 'Identifier' && call?.type === 'CallExpression' && expressFactories.has(member(call.callee))) {
        const name = p.node.id.name;
        if (!info.routers.has(name)) info.routers.set(name, addSymbol(name, p.node, expressFactories.get(member(call.callee))));
      }
      if (/(?:password|secret|api_?key|credential|access_?token)$/i.test(p.node.id?.name ?? '') && (text(call)?.length ?? 0) >= 8) graph.diagnostic('sensitive-literal', 'Potential embedded credential literal. Value intentionally omitted; check whether this is a fixture or a placeholder.', ev(file, lineOf(p.node)), [owner(p)], layer === 'tests' ? 'info' : 'warning');
    },
    ObjectProperty(p) {
      if (/(?:password|secret|api_?key|credential|access_?token)$/i.test(key(p.node.key) ?? '') && (text(p.node.value)?.length ?? 0) >= 8) graph.diagnostic('sensitive-literal', 'Potential credential-shaped literal; value omitted.', ev(file, lineOf(p.node)), [owner(p)], layer === 'tests' ? 'info' : 'warning');
    },
    ImportExpression(p) {
      const specifier = text(p.node.source);
      if (specifier) info.imports.push({ specifier, line: lineOf(p.node), bindings: [], dynamic: true });
      else graph.diagnostic('dynamic-import', 'Dynamic import target is UNKNOWN.', ev(file, lineOf(p.node)), [owner(p)]);
    },
    CallExpression(p) {
      const name = member(p.node.callee), args = p.node.arguments;
      const caller = owner(p);
      info.calls.push({ name, args, line: lineOf(p.node), caller, path: p });
      if (name === 'require' && text(args[0])) info.imports.push({ specifier: text(args[0]), line: lineOf(p.node), bindings: [], dynamic: true });
      const method = name?.split('.').at(-1);
      if (methods.has(method) || method === 'use') info.registrations.push({ object: member(p.node.callee.object), method, args, line: lineOf(p.node) });
      if (authPattern.test(name?.split('.').at(-1) ?? '')) graph.nodes.get(caller).metadata.authSignals?.push(name);
      if (validationPattern.test(name ?? '')) graph.nodes.get(caller).metadata.validationSignals?.push(name);
      if (method === 'json' || name === 'ok' || name === 'success') {
        const fields = args.find(a => a.type === 'ObjectExpression')?.properties.map(p => key(p.key)).filter(Boolean) ?? [];
        const meta = graph.nodes.get(caller).metadata;
        if (meta.responseFields) meta.responseFields = [...new Set([...meta.responseFields, ...fields])];
      }
      if (method === 'raw') {
        info.queryPaths.push({ raw: true, args, line: lineOf(p.node), caller });
        if (args[0]?.type === 'BinaryExpression' || args[0]?.type === 'TemplateLiteral' && args[0].expressions.length) graph.diagnostic('raw-sql-interpolation', 'Potential unparameterized raw SQL construction. Static signal only; inspect bindings and input provenance.', ev(file, lineOf(p.node)), [caller]);
      }
      if (/^(?:setInterval|setTimeout|cron\.schedule|scheduleJob)$/.test(name ?? '')) graph.nodes.get(caller).metadata.scheduling = 'Timer/scheduling call detected; worker deployment UNKNOWN';
      if (/^(?:createContext|React\.createContext|useQuery|useMutation|QueryClient|createStore|configureStore)$/.test(name ?? '')) graph.nodes.get(caller).metadata.stateManagement = name;
    },
    MemberExpression(p) {
      const name = member(p.node);
      const caller = owner(p);
      const envName = name?.match(/^(?:process\.env|env|import\.meta\.env)\.([A-Z][A-Z0-9_]+)$/)?.[1];
      if (envName) {
        const target = graph.add(`config:${envName}`, envName, 'environment key', 'infrastructure', file, ev(file, lineOf(p.node), 'Environment key reference; value never read'), { value: '[NOT READ]' });
        graph.link(caller, target, 'configured by', ev(file, lineOf(p.node)));
      }
      const field = name?.match(/^(?:req\.(?:body|query|params)|input|data)\.([A-Za-z_$][\w$]*)$/)?.[1];
      const meta = graph.nodes.get(caller).metadata;
      if (field && meta.requestFields && !meta.requestFields.includes(field)) meta.requestFields.push(field);
    },
    JSXOpeningElement(p) {
      const jsxName = n => n.type === 'JSXIdentifier' ? n.name : n.type === 'JSXMemberExpression' ? `${jsxName(n.object)}.${jsxName(n.property)}` : '';
      const name = jsxName(p.node.name);
      if (/^[A-Z]/.test(name)) info.renders.push({ name, caller: owner(p), line: lineOf(p.node) });
    },
    ReturnStatement(p) {
      if (p.node.argument?.type === 'ObjectExpression') {
        const meta = graph.nodes.get(owner(p)).metadata;
        if (meta.responseFields) meta.responseFields = [...new Set([...meta.responseFields, ...p.node.argument.properties.map(x => key(x.key)).filter(Boolean)])];
      }
    },
  });
  return info;
}

export function resolveImports(modules, files, aliases, graph) {
  const fileSet = new Set(files);
  function resolveFile(from, specifier) {
    let candidate;
    if (specifier.startsWith('.')) candidate = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
    else {
      const alias = aliases.filter(a => from.startsWith(a.base)).sort((a, b) => b.base.length - a.base.length).find(a => specifier.startsWith(a.prefix));
      if (alias) candidate = path.posix.normalize(path.posix.join(alias.base, alias.target, specifier.slice(alias.prefix.length)));
    }
    if (!candidate || candidate.startsWith('../') || path.posix.isAbsolute(candidate)) return null;
    return [candidate, ...['.js', '.jsx', '.mjs', '.ts', '.tsx', '.json', '/index.js', '/index.jsx', '/index.ts'].map(e => candidate + e)].find(f => fileSet.has(f)) ?? null;
  }
  const external = (info, specifier, line) => {
    const packageName = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.startsWith('node:') ? specifier : specifier.split('/')[0];
    if (!/^(@[\w.-]+\/)?[\w.:-]+$/.test(packageName)) return null;
    return graph.add(`package:${info.file.split('/')[0]}:${packageName}`, packageName, 'package', 'infrastructure', info.file, ev(info.file, line, 'Imported package; deployment/usage beyond this reference UNKNOWN'), {});
  };
  for (const info of modules.values()) {
    info.bindings = new Map();
    for (const imp of info.imports) {
      const targetFile = resolveFile(info.file, imp.specifier);
      const isLocal = imp.specifier.startsWith('.') || aliases.some(a => info.file.startsWith(a.base) && imp.specifier.startsWith(a.prefix));
      if (targetFile) {
        const targetId = `file:${targetFile}`;
        if (!graph.nodes.has(targetId)) graph.add(targetId, path.posix.basename(targetFile), 'module', classify(targetFile).layer, targetFile, ev(targetFile), {});
        graph.link(info.id, targetId, 'imports', ev(info.file, imp.line, imp.dynamic ? 'Literal dynamic import' : 'Static import'));
        for (const binding of imp.bindings) info.bindings.set(binding.local, { ...binding, targetFile, targetId });
      } else if (isLocal) graph.diagnostic('unresolved-import', 'Local import could not be resolved within the allowed source set.', ev(info.file, imp.line), [info.id]);
      else {
        const targetId = external(info, imp.specifier, imp.line);
        if (targetId) {
          graph.link(info.id, targetId, 'imports', ev(info.file, imp.line));
          for (const binding of imp.bindings) info.bindings.set(binding.local, { ...binding, targetId });
        }
      }
    }
  }
  function exported(info, name, depth = 0) {
    if (!info || depth > 12) return null;
    const local = info.exports.get(name) ?? name;
    if (info.symbols.has(local)) return info.symbols.get(local);
    for (const reexport of info.reexports) if (reexport.exported === name || reexport.exported === '*') {
      const target = modules.get(resolveFile(info.file, reexport.specifier));
      const found = exported(target, reexport.exported === '*' ? name : reexport.imported, depth + 1);
      if (found) return found;
    }
    return null;
  }
  function resolveName(info, name, depth = 0) {
    if (!name || depth > 12) return null;
    if (info.symbols.has(name)) return info.symbols.get(name);
    const alias = info.locals?.get(name);
    if (alias?.type === 'Identifier' && alias.name !== name) return resolveName(info, alias.name, depth + 1);
    const [head, ...tail] = name.split('.');
    const binding = info.bindings.get(head);
    if (!binding) return null;
    if (!binding.targetFile) return binding.targetId;
    const target = modules.get(binding.targetFile);
    const exportName = binding.imported === '*' ? tail.join('.') : [target?.exports.get(binding.imported) ?? binding.imported, ...tail].join('.');
    return exported(target, exportName) ?? binding.targetId;
  }
  for (const info of modules.values()) {
    if (info.broken) continue;
    for (const call of info.calls) {
      const target = resolveName(info, call.name);
      if (target) {
        const moduleOnly = target.startsWith('file:');
        graph.link(call.caller, target, authPattern.test(call.name?.split('.').at(-1) ?? '') ? 'authenticates' : 'invokes', ev(info.file, call.line, moduleOnly ? 'Imported module resolved; exact callable export UNKNOWN' : 'Resolved source binding'), moduleOnly ? 'inferred' : 'verified');
        if (moduleOnly) graph.diagnostic('unresolved-symbol', 'Imported module resolved, but the exact callable export is UNKNOWN.', ev(info.file, call.line), [call.caller], 'info');
      }
    }
    for (const render of info.renders) {
      const target = resolveName(info, render.name);
      if (target) graph.link(render.caller, target, 'renders', ev(info.file, render.line, target.startsWith('file:') ? 'Imported component module resolved; exact export UNKNOWN' : 'Resolved JSX binding'), target.startsWith('file:') ? 'inferred' : 'verified');
      else graph.diagnostic('unresolved-render', 'JSX component binding is not statically resolved.', ev(info.file, render.line), [render.caller], 'info');
    }
  }
  return { resolveName, resolveFile };
}

function joinRoute(prefix, route) { return ('/' + [prefix, route].join('/').split('/').filter(Boolean).join('/')) || '/'; }
function expand(info, arg, depth = 0) {
  if (!arg || depth > 8) return [];
  if (arg.type === 'SpreadElement') return expand(info, arg.argument, depth + 1);
  if (arg.type === 'ArrayExpression') return arg.elements.flatMap(a => expand(info, a, depth + 1));
  if (arg.type === 'Identifier' && info.locals.get(arg.name)?.type === 'ArrayExpression') return expand(info, info.locals.get(arg.name), depth + 1);
  return [arg];
}

export function extractRoutes(modules, graph, resolveName) {
  const routerIds = new Set([...modules.values()].flatMap(m => [...(m.routers?.values() ?? [])]));
  const mounts = [], registrations = [], roots = new Set(), endpoints = [];
  for (const info of modules.values()) {
    if (info.broken) continue;
    for (const id of info.routers.values()) if (graph.nodes.get(id).type === 'Express application') roots.add(id);
    for (const registration of info.registrations) {
      const router = resolveName(info, registration.object);
      if (!routerIds.has(router)) continue;
      const first = text(registration.args[0]);
      if (registration.method === 'use') {
        const prefix = first === null ? '' : safeRoute(first);
        if (prefix === null) { graph.diagnostic('dynamic-route', 'Express mount prefix is UNKNOWN.', ev(info.file, registration.line), [router]); continue; }
        const handlers = registration.args.slice(first === null ? 0 : 1).flatMap(a => expand(info, a));
        const targets = handlers.map(a => resolveName(info, member(a.type === 'CallExpression' ? a.callee : a))).filter(Boolean);
        if (handlers.length && !targets.length) graph.diagnostic('unresolved-middleware', 'Express use() arguments could not be resolved to middleware or routers.', ev(info.file, registration.line), [router], 'info');
        const guards = targets.filter(t => !routerIds.has(t));
        for (const target of targets) {
          if (routerIds.has(target)) mounts.push({ router, target, prefix, guards, info, line: registration.line });
          else graph.link(router, target, 'invokes', ev(info.file, registration.line, 'Router-level middleware registration'));
        }
      } else {
        const paths = registration.args[0]?.type === 'ArrayExpression' ? registration.args[0].elements.map(text) : [first];
        for (const route of paths) {
          if (!safeRoute(route)) { graph.diagnostic('dynamic-route', 'Express endpoint path is UNKNOWN.', ev(info.file, registration.line), [router]); continue; }
          registrations.push({ ...registration, info, router, route });
        }
      }
    }
  }
  for (const mount of mounts) graph.link(mount.router, mount.target, 'routes to', ev(mount.info.file, mount.line, `Express mount prefix: ${mount.prefix || '(none)'}`));
  const prefixes = new Map();
  function follow(router, prefix, guards, visited) {
    if (visited.has(router)) { graph.diagnostic('router-cycle', 'Router mount cycle; repeated expansion stopped.', graph.nodes.get(router).evidence[0], [router]); return; }
    const entries = prefixes.get(router) ?? [];
    if (entries.some(p => p.prefix === prefix)) return;
    entries.push({ prefix, guards }); prefixes.set(router, entries);
    for (const mount of mounts.filter(m => m.router === router)) follow(mount.target, joinRoute(prefix, mount.prefix), [...guards, ...mount.guards], new Set([...visited, router]));
  }
  for (const root of roots) follow(root, '', [], new Set());
  for (const registration of registrations) {
    const { info, router, method, route, args, line } = registration;
    const prefixesForRouter = prefixes.get(router);
    if (!prefixesForRouter) graph.diagnostic('unmounted-router', 'Route declaration found but its application mount is UNKNOWN.', ev(info.file, line), [router]);
    for (const mount of prefixesForRouter ?? [{ prefix: '', guards: [], unmounted: true }]) {
      const fullPath = joinRoute(mount.prefix, route);
      const id = `api:express:${method.toUpperCase()}:${fullPath}${mount.unmounted ? ':' + router : ''}`;
      const routeNode = graph.add(id, `${method.toUpperCase()} ${fullPath}`, 'endpoint', 'api', info.file, ev(info.file, line, 'Express method and composed mount path'), { framework: 'Express', method: method.toUpperCase(), route: fullPath, mountResolved: !mount.unmounted, auth: 'UNKNOWN', validation: 'UNKNOWN', requestFields: [], responseFields: [] }, mount.unmounted ? 'unknown' : 'verified');
      graph.link(router, routeNode, 'routes to', ev(info.file, line));
      const handlers = args.slice(1).flatMap(a => expand(info, a));
      const targets = [...mount.guards];
      for (const handler of handlers) {
        const target = resolveName(info, member(handler.type === 'CallExpression' ? handler.callee : handler));
        if (target) targets.push(target);
        if (isFunction(handler) || handler.type === 'CallExpression') {
          const inline = graph.add(`handler:${stableId(id, String(handlers.indexOf(handler)))}`, `${method.toUpperCase()} ${fullPath} handler`, 'inline handler', 'backend', info.file, ev(info.file, lineOf(handler)), {});
          graph.link(id, inline, 'routes to', ev(info.file, line));
          for (const call of info.calls.filter(c => c.line >= lineOf(handler) && c.line <= (handler.loc?.end?.line ?? lineOf(handler)))) {
            const called = resolveName(info, call.name);
            if (called) graph.link(inline, called, authPattern.test(call.name?.split('.').at(-1) ?? '') ? 'authenticates' : 'invokes', ev(info.file, call.line));
          }
        }
      }
      for (const target of targets) graph.link(id, target, authPattern.test(graph.nodes.get(target)?.label ?? '') ? 'authenticates' : 'routes to', ev(info.file, line, 'Registered handler/middleware, including mount middleware'));
      endpoints.push({ id, method: method.toUpperCase(), path: fullPath, framework: 'Express', mounted: !mount.unmounted });
    }
  }
  const nextModules = [...modules.values()].filter(m => m.next && !m.broken);
  for (const info of nextModules) {
    graph.nodes.get(info.id).type = `Next ${info.next.kind}`;
    graph.nodes.get(info.id).metadata.route = info.next.route;
    if (info.next.segments.some(s => s.startsWith('@') || /^\(\.\.?\)/.test(s))) graph.diagnostic('next-parallel-route', 'Parallel/intercepting route convention detected; exact navigation context is not modeled.', ev(info.file), [info.id], 'info');
    if (info.next.kind === 'route') for (const [method, local] of info.exports) if (methods.has(method.toLowerCase())) {
      const id = graph.add(`api:next:${method}:${info.next.route}`, `${method} ${info.next.route}`, 'endpoint', 'api', info.file, ev(info.file), { framework: 'Next', method, route: info.next.route, auth: 'UNKNOWN' });
      graph.link(info.id, id, 'routes to', ev(info.file));
      graph.link(id, resolveName(info, local) ?? info.id, 'routes to', ev(info.file));
      endpoints.push({ id, method, path: info.next.route, framework: 'Next', mounted: true });
    }
    if (info.next.kind !== 'layout') {
      const layouts = nextModules.filter(m => m.next.kind === 'layout' && info.file.startsWith(path.posix.dirname(m.file) + '/')).sort((a, b) => b.file.length - a.file.length);
      if (layouts[0]) graph.link(layouts[0].id, info.id, 'renders', ev(layouts[0].file, 1, 'Next App Router layout convention'), 'inferred');
    }
  }
  return endpoints;
}

function tableArgument(n) { return logicalTable(text(n) ?? (n?.type === 'CallExpression' && /(?:^|\.)table$/.test(member(n.callee) ?? '') ? text(n.arguments[0]) : null)); }
function queryTable(p, node, seen = new Set()) {
  if (!node || seen.size > 12) return null;
  if (node.type === 'CallExpression') {
    const name = member(node.callee);
    if (/^(?:db|trx|knex)$/.test(name ?? '')) return tableArgument(node.arguments[0]);
    if (node.callee.type === 'MemberExpression') {
      if (key(node.callee.property) === 'from') return tableArgument(node.arguments[0]) ?? queryTable(p, node.callee.object, seen);
      return queryTable(p, node.callee.object, seen);
    }
    if (node.callee.type === 'Identifier' && !seen.has(name)) {
      seen.add(name);
      const binding = p.scope.getBinding(name)?.path.node;
      const init = binding?.init ?? binding;
      if (isFunction(init)) {
        const body = init.body.type === 'BlockStatement' ? init.body.body.find(n => n.type === 'ReturnStatement')?.argument : init.body;
        return queryTable(p, body, seen);
      }
    }
  }
  if (node.type === 'Identifier' && !seen.has(node.name)) {
    seen.add(node.name);
    return queryTable(p, p.scope.getBinding(node.name)?.path.node?.init, seen);
  }
  return null;
}

export function extractQueries(modules, sqlModel, graph) {
  const knexModules = new Set([...modules.values()].filter(m => m.imports.some(i => i.specifier === 'knex')).map(m => m.file));
  for (const info of modules.values()) {
    if (info.broken || info.layer === 'frontend') continue;
    const knexBacked = knexModules.has(info.file) || [...info.bindings.values()].some(binding => knexModules.has(binding.targetFile));
    if (!knexBacked) continue;
    for (const call of info.calls) {
      if (!call.name) continue;
      if (/\.raw$/.test(call.name)) {
        const raw = text(call.args[0]);
        if (raw) sqlModel.raw(raw, info.file, call.line, call.caller);
        continue;
      }
      if (/(?:^|\.)(?:leftJoin|rightJoin|innerJoin|join|crossJoin)$/.test(call.name)) {
        const target = sqlModel.table(tableArgument(call.args[0]), info.file, call.line);
        if (target) graph.link(call.caller, target, 'joins table', ev(info.file, call.line, 'Static join target; this is not a declared foreign key'));
      }
      if (call.path.parentPath?.isMemberExpression() && call.path.parentPath.parentPath?.isCallExpression()) continue;
      const table = queryTable(call.path, call.path.node);
      if (table) {
        const target = sqlModel.table(table, info.file, call.line);
        const chain = [];
        let current = call.path.node;
        while (current?.type === 'CallExpression' && current.callee.type === 'MemberExpression') { chain.push(key(current.callee.property)); current = current.callee.object; }
        const write = chain.some(n => ['insert', 'update', 'delete', 'del', 'increment', 'decrement', 'truncate'].includes(n));
        graph.link(call.caller, target, write ? 'writes data' : 'reads data', ev(info.file, call.line, `Static Knex logical table; operations: ${chain.join(', ') || 'query builder'}`));
      }
      if (/^(?:db|trx|knex)$/.test(call.name) && !tableArgument(call.args[0]) && call.args.length) graph.diagnostic('dynamic-table', 'Knex table expression is UNKNOWN; no guessed table relationship was emitted.', ev(info.file, call.line), [call.caller]);
    }

  }
}

export function extractMigrations(modules, sqlModel, graph) {
      const types = new Map([['increments', 'integer'], ['bigIncrements', 'bigint'], ['integer', 'integer'], ['bigInteger', 'bigint'], ['string', 'varchar'], ['text', 'text'], ['boolean', 'boolean'], ['timestamp', 'timestamp'], ['date', 'date'], ['decimal', 'decimal'], ['json', 'json'], ['uuid', 'uuid']]);
      for (const info of modules.values()) {
        if (info.broken) continue;
        for (const call of info.calls.filter(c => /\.schema\.createTable$|\.createTable$/.test(c.name ?? ''))) {
          const name = logicalTable(text(call.args[0]));
          const callback = call.path.get('arguments')[1];
          if (!name || !callback?.isFunction()) {
            graph.diagnostic('dynamic-migration', 'Migration table definition is UNKNOWN; migration is not executed.', ev(info.file, call.line), [info.id]);
            continue;
          }
          const parameter = callback.node.params[0]?.name;
          const columns = [], indexes = [], foreignKeys = [];
          callback.traverse({ CallExpression(p) {
            if (p.parentPath.isMemberExpression()) return;
            const chain = [];
            let node = p.node;
            while (node?.type === 'CallExpression' && node.callee.type === 'MemberExpression') { chain.unshift({ method: key(node.callee.property), args: node.arguments }); node = node.callee.object; }
            if (member(node) !== parameter || !chain.length) return;
            const first = chain[0], column = text(first.args[0]);
            if (types.has(first.method) && column) {
              columns.push({ name: column, type: types.get(first.method), primary: /Increments$|^increments$/.test(first.method) || chain.some(c => c.method === 'primary'), nullable: !chain.some(c => c.method === 'notNullable'), defaultPresent: chain.some(c => c.method === 'defaultTo') });
              const reference = chain.find(c => c.method === 'references'), table = chain.find(c => c.method === 'inTable');
              if (reference && table && text(reference.args[0]) && text(table.args[0])) foreignKeys.push({ name: `${name}_${column}_foreign`, targetTable: text(table.args[0]), columns: [{ source: column, target: text(reference.args[0]) }] });
            }
            if (['index', 'unique', 'primary'].includes(first.method)) {
              const names = first.args[0]?.type === 'ArrayExpression' ? first.args[0].elements.map(text).filter(Boolean) : [column].filter(Boolean);
              indexes.push({ name: text(first.args[1]) ?? first.method, unique: first.method !== 'index', columns: names });
              if (first.method === 'primary') for (const c of columns) if (names.includes(c.name)) c.primary = true;
            }
          } });
          const id = sqlModel.define(name, info.file, { columns, indexes, foreignKeys, migration: true, effectiveSchema: 'UNKNOWN unless confirmed by snapshot' }, call.line);
          graph.nodes.get(info.id).type = 'migration';
          graph.link(info.id, id, 'declares table', ev(info.file, call.line, 'Migration source only; execution history UNKNOWN'));
          for (const fk of foreignKeys) sqlModel.pending.push({ source: id, target: fk.targetTable, file: info.file, detail: `Migration-declared FK ${fk.name}` });
        }
      }
    }

function matches(pattern, request) {
  const a = pattern.split('/').filter(Boolean), b = request.split('/').filter(Boolean);
  for (let i = 0; i < a.length; i++) {
    if (a[i].includes('...') || a[i].includes('*')) return b.length >= i;
    if (!b[i] || !(a[i] === b[i] || a[i].startsWith(':') || a[i].startsWith('['))) return false;
  }
  return a.length === b.length;
}

export function extractApiCalls(modules, endpoints, graph, resolveName) {
  const adapters = new Map();
  const proxies = [...modules.values()].filter(m => m.next?.route.includes('[...') && !m.broken);
  for (const info of modules.values()) {
    if (info.broken || info.layer !== 'frontend') continue;
    const prefixes = [];
    traverse(info.ast, { TemplateLiteral(p) { const prefix = p.node.quasis[0]?.value.cooked; if (prefix?.startsWith('/bff')) prefixes.push('/bff'); } });
    if (prefixes.length && info.calls.some(c => c.name === 'fetch')) adapters.set(info.file, { prefix: '/bff', evidence: ev(info.file, 1, 'API adapter contains /bff URL construction and fetch; path forwarding statically inferred') });
  }
  for (const info of modules.values()) {
    if (info.broken || info.layer !== 'frontend') continue;
    for (const call of info.calls) {
      const methodName = call.name?.split('.').at(-1);
      const binding = info.bindings.get(call.name?.split('.')[0]);
      const adapter = binding?.targetFile && adapters.get(binding.targetFile);
      if (call.name !== 'fetch' && !(adapter && methods.has(methodName))) continue;
      let route = text(call.args[0]), upstream = false;
      let method = adapter ? methodName.toUpperCase() : 'GET';
      const options = call.args[1]?.type === 'ObjectExpression' ? call.args[1].properties : [];
      const methodOption = options.find(p => key(p.key) === 'method');
      const declaredMethod = text(methodOption?.value);
      if (declaredMethod && methods.has(declaredMethod.toLowerCase())) method = declaredMethod.toUpperCase();
      if (!adapter && (methodOption && !declaredMethod || options.some(p => p.type === 'SpreadElement'))) {
        graph.diagnostic('dynamic-api-method', 'Request method is dynamic; no guessed GET endpoint match was emitted.', ev(info.file, call.line), [call.caller], 'info');
        continue;
      }
      if (!route && call.args[0]?.type === 'TemplateLiteral') {
        const parts = call.args[0].quasis.map(q => q.value.cooked);
        if (parts.length === 2 && parts[0] === '' && parts[1].startsWith('/api/')) { route = parts[1]; upstream = true; }
      }
      if (!safeRoute(route)) {
        if (!adapters.has(info.file) && !info.next?.route.includes('[...')) graph.diagnostic('dynamic-api-call', 'Request URL/method forwarding is not statically resolved.', ev(info.file, call.line), [call.caller], 'info');
        continue;
      }
      const clientPath = adapter ? joinRoute(adapter.prefix, route) : route;
      const requestId = graph.add(`request:${stableId(info.file, call.caller, method, clientPath)}`, `${method} ${clientPath}`, 'API request', 'api', info.file, ev(info.file, call.line, 'Literal request path; runtime origin not evaluated'), { method, route: clientPath, upstreamRoute: adapter ? joinRoute('/api', route) : upstream ? route : null });
      graph.link(call.caller, requestId, 'calls API', ev(info.file, call.line), adapter ? 'inferred' : 'verified');
      if (adapter) graph.link(requestId, resolveName(info, call.name), 'invokes', adapter.evidence, 'inferred');
      const framework = upstream ? 'Express' : 'Next';
      const targets = endpoints.filter(e => e.framework === framework && e.mounted && (e.method === method || e.method === 'ALL') && matches(e.path, clientPath));
      for (const endpoint of targets) graph.link(requestId, endpoint.id, 'routes to', ev(info.file, call.line, 'Static method/path match; runtime origin UNKNOWN'), upstream ? 'inferred' : 'verified');
      let matchedBackend = false;
      if (adapter) {
        const proxy = proxies.find(p => targets.some(t => graph.nodes.get(t.id).path === p.file));
        let rewrite = false;
        if (proxy) traverse(proxy.ast, { TemplateLiteral(p) { if (p.node.quasis.some(q => q.value.cooked.includes('/api/'))) rewrite = true; } });
        if (rewrite) for (const endpoint of endpoints.filter(e => e.framework === 'Express' && e.mounted && (e.method === method || e.method === 'ALL') && matches(e.path, joinRoute('/api', route)))) {
          graph.link(requestId, endpoint.id, 'routes to', ev(proxy.file, 1, 'Inferred BFF /bff/* -> configured Express /api/* rewrite; runtime origin UNKNOWN'), 'inferred');
          matchedBackend = true;
        }
      }
      if (!targets.length || adapter && !matchedBackend) graph.diagnostic('unmatched-request', 'No matching endpoint was detected for this statically extracted request. Dynamic/external routing may explain the gap.', ev(info.file, call.line), [requestId]);
    }
  }
}
