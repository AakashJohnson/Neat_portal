// Mechanical first pass of Angular template → JSX conversion (developer tool).
//   node scripts/ng2jsx.mjs <component.html> [> out.jsx]
//   node scripts/ng2jsx.mjs <component.html> --page [> src/app/<route>/page.js]
// Output is a JSX fragment to paste into a component and finish by hand:
// state, services, forms and Angular Material widgets are marked with TODO(ng).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'htmlparser2';

const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'area', 'col', 'embed', 'param', 'track', 'wbr']);
const ATTR_MAP = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', colspan: 'colSpan', rowspan: 'rowSpan', maxlength: 'maxLength',
  minlength: 'minLength', readonly: 'readOnly', frameborder: 'frameBorder', allowfullscreen: 'allowFullScreen', autocomplete: 'autoComplete',
  cellpadding: 'cellPadding', cellspacing: 'cellSpacing', enctype: 'encType', novalidate: 'noValidate', autofocus: 'autoFocus',
  'accept-charset': 'acceptCharset', crossorigin: 'crossOrigin', srcset: 'srcSet', usemap: 'useMap', datetime: 'dateTime',
  marginwidth: 'marginWidth', marginheight: 'marginHeight', scrolling: 'scrolling', allow: 'allow',
};
const EVENTS = { click: 'onClick', change: 'onChange', keyup: 'onKeyUp', keydown: 'onKeyDown', input: 'onInput', submit: 'onSubmit', ngSubmit: 'onSubmit', blur: 'onBlur', focus: 'onFocus', mouseenter: 'onMouseEnter', mouseleave: 'onMouseLeave', selectionChange: 'onChange' };

const camel = (s) => s.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const esc = (s) => s.replace(/[{}]/g, (c) => `{'${c}'}`);

/** Angular expression → JS: pipes, `this.` implicit context. */
function expr(src) {
  let e = src.trim();
  // Pipes: translate → t(), date/titlecase/uppercase/… → helpers.
  const parts = e.split(/\s\|\s(?!\|)/);
  e = parts[0];
  for (const p of parts.slice(1)) {
    const [name, ...args] = p.split(':').map((x) => x.trim());
    if (name === 'translate') e = `t(${e})`;
    else if (name === 'date') e = `fmtDate(${e}${args.length ? `, ${args.join(', ')}` : ''})`;
    else if (name === 'uppercase') e = `String(${e} ?? '').toUpperCase()`;
    else if (name === 'lowercase') e = `String(${e} ?? '').toLowerCase()`;
    else if (name === 'titlecase') e = `titleCase(${e})`;
    else if (name === 'currency') e = `fmtCurrency(${e})`;
    else if (name === 'number') e = `fmtNumber(${e})`;
    else if (name === 'slice') e = `String(${e} ?? '').slice(${args.join(', ')})`;
    else if (name === 'json') e = `JSON.stringify(${e})`;
    else if (name === 'safe' || name === 'safeHtml') e = `${e}`;
    else e = `/* TODO(ng): pipe ${name} */ ${e}`;
  }
  // Angular safe-navigation `a?.b` is valid JS; `===` etc unchanged.
  return e;
}

function interpolate(text) {
  return text.replace(/\{\{([\s\S]+?)\}\}/g, (_, x) => `\u0000${expr(x)}\u0001`);
}
function textToJsx(text) {
  const withMarks = interpolate(text);
  return esc(withMarks).replace(/\u0000/g, '{').replace(/\u0001/g, '}').replace(/ /g, "{'\\u00a0'}");
}

function styleObj(css) {
  const pairs = css.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const i = d.indexOf(':');
    const k = camel(d.slice(0, i));
    const v = d.slice(i + 1).trim();
    return `${k}: ${JSON.stringify(v)}`;
  });
  return `{{ ${pairs.join(', ')} }}`;
}

function routerHref(value, bound) {
  if (!bound) return JSON.stringify(value);
  const m = value.trim().match(/^\[\s*'([^']*)'\s*(?:,\s*([^\]]+))?\]$/);
  if (m) return m[2] ? `{\`${m[1]}/\${${m[2].trim()}}\`}` : JSON.stringify(m[1]);
  return `{${expr(value)}}`;
}

function convertAttrs(node, ctx) {
  const out = [];
  let ngIf = null;
  let ngFor = null;
  let isLink = false;
  let href = null;
  for (const [rawName, value] of Object.entries(node.attribs ?? {})) {
    const name = rawName;
    if (name === '*ngIf') { ngIf = value; continue; }
    if (name === '*ngFor') { ngFor = value; continue; }
    if (name === 'routerLink' || name === '[routerLink]') { isLink = true; href = routerHref(value, name.startsWith('[')); continue; }
    if (name === 'routerLinkActive' || name === '[routerLinkActiveOptions]') continue;
    if (name.startsWith('#')) { out.push(`/* TODO(ng): template ref ${name} */`); continue; }
    if (name === 'formControlName') { out.push(`{...register(${JSON.stringify(value)})}`); continue; }
    if (name === '[formGroup]' || name === 'formGroupName' || name === 'ngModelGroup') continue;
    if (name === '[(ngModel)]') { out.push(`value={${value} ?? ''} onChange={(e) => set_${value.replace(/\W/g, '_')}(e.target.value)} /* TODO(ng): ngModel ${value} */`); continue; }
    if (name === '[ngClass]') { out.push(`className={cx(${expr(value)})} /* TODO(ng): ngClass */`); continue; }
    if (name === '[innerHTML]') { out.push(`dangerouslySetInnerHTML={{ __html: sanitize(${expr(value)}) }}`); continue; }
    if (name === '[ngStyle]') { out.push(`style={${expr(value)}}`); continue; }
    if (name === '[hidden]') { out.push(`hidden={${expr(value)}}`); continue; }
    if (name.startsWith('[attr.')) { out.push(`${name.slice(6, -1)}={${expr(value)}}`); continue; }
    if (name.startsWith('[class.')) { out.push(`/* TODO(ng): class binding ${name}="${value}" */`); continue; }
    if (name.startsWith('[style.')) { out.push(`/* TODO(ng): style binding ${name}="${value}" */`); continue; }
    if (name.startsWith('[') && name.endsWith(']')) {
      const prop = name.slice(1, -1);
      out.push(`${ATTR_MAP[prop.toLowerCase()] ?? prop}={${expr(value)}}`);
      continue;
    }
    if (name.startsWith('(') && name.endsWith(')')) {
      const ev = name.slice(1, -1);
      const react = EVENTS[ev] ?? `on${ev[0].toUpperCase()}${ev.slice(1)}`;
      const body = value.replace(/\$event/g, 'e');
      out.push(`${react}={(e) => { ${ev === 'ngSubmit' || ev === 'submit' ? 'e.preventDefault(); ' : ''}${body}; }}`);
      continue;
    }
    if (name.startsWith('mat') || name.startsWith('cdk')) { out.push(`/* TODO(ng): ${name}="${value}" */`); continue; }
    if (name === 'style') { out.push(`style=${styleObj(value)}`); continue; }
    if (/^on[a-z]+$/.test(name)) { out.push(`/* TODO(ng): inline ${name}="${value}" */`); continue; }
    const mapped = ATTR_MAP[name.toLowerCase()] ?? name;
    // Relative asset paths (../../../assets/x, ./assets/x) are served from public/assets.
    if (/^(src|href|poster)$/.test(mapped) && /^(\.\.?\/)*assets(_new)?\//.test(value)) {
      out.push(`${mapped}=${JSON.stringify(value.replace(/^(\.\.?\/)*/, '/'))}`);
      continue;
    }
    if (value === '' && !['value', 'alt', 'placeholder', 'href', 'src'].includes(mapped)) out.push(mapped);
    else if (/\{\{/.test(value)) out.push(`${mapped}={\`${value.replace(/\{\{([\s\S]+?)\}\}/g, (_, x) => `\${${expr(x)}}`)}\`}`);
    else if (mapped === 'href' && value.startsWith('javascript:')) out.push(`href="#"`);
    else out.push(`${mapped}=${JSON.stringify(value)}`);
  }
  return { attrs: out, ngIf, ngFor, isLink, href, ctx };
}

function convertNode(node, depth) {
  const pad = '  '.repeat(depth);
  if (node.type === 'text') {
    // Angular 8 default (preserveWhitespaces: false): whitespace-only text nodes
    // are dropped; other runs of whitespace collapse to one space, edges kept.
    // Only ASCII whitespace — &nbsp; survives, as in Angular.
    const t = node.data.replace(/[ \t\n\r\f]+/g, ' ');
    if (t === ' ') return '';
    const lead = t.startsWith(' ') ? "{' '}" : '';
    const trail = t.endsWith(' ') && t.length > 1 ? "{' '}" : '';
    return pad + lead + textToJsx(t.replace(/^ | $/g, '')) + trail;
  }
  if (node.type === 'comment') return `${pad}{/* ${node.data.trim().replace(/\*\//g, '* /')} */}`;
  if (node.type !== 'tag' && node.type !== 'script' && node.type !== 'style') return '';

  let tag = node.name;
  if (tag === 'ng-container' || tag === 'ng-template') tag = '';
  const { attrs, ngIf, ngFor, isLink, href } = convertAttrs(node, {});
  if (tag.startsWith('app-')) return `${pad}<${tag.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase()).replace(/^App/, '')} ${attrs.join(' ')} /> {/* TODO(ng): <${tag}> */}`;
  if (tag.startsWith('mat-') || tag.startsWith('cdk-')) attrs.unshift(`/* TODO(ng): <${tag}> */`);
  if (isLink) {
    if (tag === 'a') tag = 'Link';
    attrs.unshift(`href=${href}`);
  }
  const children = node.children.map((c) => convertNode(c, depth + 1)).filter((s) => s !== '');
  const open = tag ? `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}` : '<';
  let el;
  if (!tag) el = `${pad}<>\n${children.join('\n')}\n${pad}</>`;
  else if (children.length === 0 && /^(textarea|script|iframe|i|span)$/.test(tag)) el = `${pad}${open}></${tag}>`;
  else if (VOID.has(tag) || children.length === 0) el = `${pad}${open} />`;
  else el = `${pad}${open}>\n${children.join('\n')}\n${pad}</${tag}>`;

  if (ngFor) {
    const m = ngFor.match(/let\s+(\w+)\s+of\s+([^;]+)(?:;\s*let\s+(\w+)\s*=\s*index)?(?:;.*)?/);
    if (m) {
      const [, item, list, idx = 'i'] = m;
      el = `${pad}{(${expr(list)} ?? []).map((${item}, ${idx}) => (\n${el.replace(new RegExp(`^${pad}<(\\w+)`), `${pad}  <$1 key={${idx}}`)}\n${pad}))}`;
    } else el = `${pad}{/* TODO(ng): *ngFor="${ngFor}" */}\n${el}`;
  }
  if (ngIf) {
    const [cond, elsePart] = ngIf.split(/;\s*else\s+/);
    el = `${pad}{(${expr(cond)}) && (\n${el}\n${pad})}${elsePart ? ` {/* TODO(ng): else ${elsePart} */}` : ''}`;
  }
  return el;
}

const args = process.argv.slice(2);
const pageMode = args.includes('--page');
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('usage: node scripts/ng2jsx.mjs <component.html> [--page]');
  process.exit(1);
}
const doc = parseDocument(readFileSync(file, 'utf8'), { lowerCaseAttributeNames: false, lowerCaseTags: false, recognizeSelfClosing: true });

if (!pageMode) {
  const body = doc.children.map((c) => convertNode(c, 2)).filter((s) => s.trim() !== '').join('\n');
  console.log(`    <>\n${body}\n    </>`);
} else {
  // --page: a complete App Router page module. Top-level <app-navbar>/<app-footer>
  // become <SiteChrome>; a non-empty component stylesheet adds <Scope>.
  const isChrome = (n) => n.type === 'tag' && (n.name === 'app-navbar' || n.name === 'app-footer');
  const footer = doc.children.some((n) => n.type === 'tag' && n.name === 'app-footer');
  const chrome = doc.children.some(isChrome);
  const name = path.basename(file, '.component.html');
  const cssFile = file.replace(/\.html$/, '.css');
  const scoped = existsSync(cssFile) && readFileSync(cssFile, 'utf8').trim() !== '';
  const depth = 2 + (chrome ? 1 : 0) + (scoped ? 1 : 0);
  let body = doc.children.filter((n) => !isChrome(n)).map((c) => convertNode(c, depth)).filter((s) => s.trim() !== '').join('\n');
  const pad = (d) => '  '.repeat(d);
  if (scoped) body = `${pad(depth - 1)}<Scope name="${name}">\n${body}\n${pad(depth - 1)}</Scope>`;
  if (chrome) body = `${pad(2)}<SiteChrome${footer ? '' : ' footer={false}'}>\n${body}\n${pad(2)}</SiteChrome>`;
  const usesT = /\bt\(/.test(body);
  const usesLink = /<Link\b/.test(body);
  const comp = name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
  const out = [
    ...(usesT ? ["'use client';"] : []),
    `// Port of ${path.relative(path.resolve(file, '../../../../..'), file).replace(/\\/g, '/').replace(/\.html$/, '.{html,ts}')}`,
    ...(usesLink ? ["import Link from 'next/link';"] : []),
    ...(chrome ? ["import SiteChrome from '@/components/layout/SiteChrome';"] : []),
    ...(scoped ? ["import Scope from '@/components/common/Scope';"] : []),
    ...(usesT ? ["import { useI18n } from '@/components/providers/I18nProvider';"] : []),
    '',
    `export default function ${comp}Page() {`,
    ...(usesT ? ['  const { t } = useI18n();'] : []),
    '  return (',
    body.split('\n').length > 1 && !chrome && !scoped ? `${pad(2)}<>\n${body}\n${pad(2)}</>` : body,
    '  );',
    '}',
    '',
  ];
  console.log(out.join('\n'));
}
