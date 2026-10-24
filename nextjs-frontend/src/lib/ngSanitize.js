// Angular 8.2 HTML sanitizer (what `[innerHTML]="html"` applied), ported from
// @angular/core/fesm2015/core.js (_sanitizeHtml, SanitizingHtmlSerializer,
// _sanitizeUrl, sanitizeSrcset, encodeEntities). Same allow-lists, so the
// ported pages render exactly the markup the Angular app rendered: e.g.
// `style` attributes, <form>/<button>/<input>, SVG and comments are removed;
// unsafe URLs become "unsafe:…". Browser only (uses DOMParser).

const tagSet = (tags) => Object.fromEntries(tags.split(',').map((t) => [t, true]));
const merge = (...sets) => Object.assign({}, ...sets);

const VOID_ELEMENTS = tagSet('area,br,col,hr,img,wbr');
const OPTIONAL_END_TAG_BLOCK_ELEMENTS = tagSet('colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr');
const OPTIONAL_END_TAG_INLINE_ELEMENTS = tagSet('rp,rt');
const OPTIONAL_END_TAG_ELEMENTS = merge(OPTIONAL_END_TAG_INLINE_ELEMENTS, OPTIONAL_END_TAG_BLOCK_ELEMENTS);
const BLOCK_ELEMENTS = merge(
  OPTIONAL_END_TAG_BLOCK_ELEMENTS,
  tagSet(
    'address,article,aside,blockquote,caption,center,del,details,dialog,dir,div,dl,figure,figcaption,footer,h1,h2,h3,h4,h5,' +
      'h6,header,hgroup,hr,ins,main,map,menu,nav,ol,pre,section,summary,table,ul',
  ),
);
const INLINE_ELEMENTS = merge(
  OPTIONAL_END_TAG_INLINE_ELEMENTS,
  tagSet(
    'a,abbr,acronym,audio,b,bdi,bdo,big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,mark,picture,q,ruby,rp,rt,s,' +
      'samp,small,source,span,strike,strong,sub,sup,time,track,tt,u,var,video',
  ),
);
const VALID_ELEMENTS = merge(VOID_ELEMENTS, BLOCK_ELEMENTS, INLINE_ELEMENTS, OPTIONAL_END_TAG_ELEMENTS);
const URI_ATTRS = tagSet('background,cite,href,itemtype,longdesc,poster,src,xlink:href');
const SRCSET_ATTRS = tagSet('srcset');
const HTML_ATTRS = tagSet(
  'abbr,accesskey,align,alt,autoplay,axis,bgcolor,border,cellpadding,cellspacing,class,clear,color,cols,colspan,' +
    'compact,controls,coords,datetime,default,dir,download,face,headers,height,hidden,hreflang,hspace,' +
    'ismap,itemscope,itemprop,kind,label,lang,language,loop,media,muted,nohref,nowrap,open,preload,rel,rev,role,rows,rowspan,rules,' +
    'scope,scrolling,shape,size,sizes,span,srclang,start,summary,tabindex,target,title,translate,type,usemap,' +
    'valign,value,vspace,width',
);
const ARIA_ATTRS = tagSet(
  'aria-activedescendant,aria-atomic,aria-autocomplete,aria-busy,aria-checked,aria-colcount,aria-colindex,' +
    'aria-colspan,aria-controls,aria-current,aria-describedby,aria-details,aria-disabled,aria-dropeffect,' +
    'aria-errormessage,aria-expanded,aria-flowto,aria-grabbed,aria-haspopup,aria-hidden,aria-invalid,' +
    'aria-keyshortcuts,aria-label,aria-labelledby,aria-level,aria-live,aria-modal,aria-multiline,' +
    'aria-multiselectable,aria-orientation,aria-owns,aria-placeholder,aria-posinset,aria-pressed,aria-readonly,' +
    'aria-relevant,aria-required,aria-roledescription,aria-rowcount,aria-rowindex,aria-rowspan,aria-selected,' +
    'aria-setsize,aria-sort,aria-valuemax,aria-valuemin,aria-valuenow,aria-valuetext',
);
const VALID_ATTRS = merge(URI_ATTRS, SRCSET_ATTRS, HTML_ATTRS, ARIA_ATTRS);
const SKIP_TRAVERSING_CONTENT_IF_INVALID_ELEMENTS = tagSet('script,style,template');
const has = (set, key) => Object.prototype.hasOwnProperty.call(set, key);

const SAFE_URL_PATTERN = /^(?:(?:https?|mailto|ftp|tel|file):|[^&:/?#]*(?:[/?#]|$))/gi;
const DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[a-z0-9+/]+=*$/i;

export function sanitizeUrl(url) {
  url = String(url);
  if (url.match(SAFE_URL_PATTERN) || url.match(DATA_URL_PATTERN)) return url;
  return `unsafe:${url}`;
}

const sanitizeSrcset = (srcset) => String(srcset).split(',').map((s) => sanitizeUrl(s.trim())).join(', ');

const SURROGATE_PAIR_REGEXP = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
const NON_ALPHANUMERIC_REGEXP = /([^#-~ |!])/g;
function encodeEntities(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(SURROGATE_PAIR_REGEXP, (m) => `&#${(m.charCodeAt(0) - 0xd800) * 0x400 + (m.charCodeAt(1) - 0xdc00) + 0x10000};`)
    .replace(NON_ALPHANUMERIC_REGEXP, (m) => `&#${m.charCodeAt(0)};`)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function checkClobberedElement(node, nextNode) {
  if (nextNode && (node.compareDocumentPosition(nextNode) & Node.DOCUMENT_POSITION_CONTAINED_BY) === Node.DOCUMENT_POSITION_CONTAINED_BY) {
    throw new Error(`Failed to sanitize html because the element is clobbered: ${node.outerHTML}`);
  }
  return nextNode;
}

function serialize(el) {
  const buf = [];
  const startElement = (element) => {
    const tagName = element.nodeName.toLowerCase();
    if (!has(VALID_ELEMENTS, tagName)) return !has(SKIP_TRAVERSING_CONTENT_IF_INVALID_ELEMENTS, tagName);
    buf.push('<', tagName);
    for (const attr of element.attributes) {
      const lower = attr.name.toLowerCase();
      if (!has(VALID_ATTRS, lower)) continue;
      let value = attr.value;
      if (URI_ATTRS[lower]) value = sanitizeUrl(value);
      if (SRCSET_ATTRS[lower]) value = sanitizeSrcset(value);
      buf.push(' ', attr.name, '="', encodeEntities(value), '"');
    }
    buf.push('>');
    return true;
  };
  const endElement = (element) => {
    const tagName = element.nodeName.toLowerCase();
    if (has(VALID_ELEMENTS, tagName) && !has(VOID_ELEMENTS, tagName)) buf.push('</', tagName, '>');
  };

  let current = el.firstChild;
  let traverseContent = true;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) traverseContent = startElement(current);
    else if (current.nodeType === Node.TEXT_NODE) buf.push(encodeEntities(current.nodeValue));
    if (traverseContent && current.firstChild) {
      current = current.firstChild;
      continue;
    }
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE) endElement(current);
      const next = checkClobberedElement(current, current.nextSibling);
      if (next) {
        current = next;
        break;
      }
      current = checkClobberedElement(current, current.parentNode);
    }
  }
  return buf.join('');
}

// InertBodyHelper (DOMParser variant, used by every supported browser).
function inertBody(html) {
  const body = new DOMParser().parseFromString(`<body><remove></remove>${html}`, 'text/html').body;
  body.removeChild(body.firstChild);
  return body;
}

/** Angular's _sanitizeHtml(document, value). */
export function ngSanitizeHtml(unsafeHtmlInput) {
  let unsafeHtml = unsafeHtmlInput ? String(unsafeHtmlInput) : '';
  let body = inertBody(unsafeHtml);
  // mXSS protection: re-parse until the markup is stable.
  let attempts = 5;
  let parsedHtml = unsafeHtml;
  do {
    if (attempts === 0) throw new Error('Failed to sanitize html because the input is unstable');
    attempts--;
    unsafeHtml = parsedHtml;
    parsedHtml = body.innerHTML;
    body = inertBody(unsafeHtml);
  } while (unsafeHtml !== parsedHtml);
  const root = body.nodeName === 'TEMPLATE' ? body.content : body;
  return serialize(root);
}
