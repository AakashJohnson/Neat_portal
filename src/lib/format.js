import DOMPurify from 'dompurify';
import { FILES_ORIGIN } from '@/lib/config';
import { ngSanitizeHtml } from '@/lib/ngSanitize';


export function sanitize(html) {
  if (html == null) return '';
  if (typeof window === 'undefined') return '';


  let safe;
  try {
    safe = ngSanitizeHtml(html);
  } catch (e) {
    console.error(e);
    return '';
  }


  return DOMPurify.sanitize(safe, { ADD_ATTR: ['target'], ALLOW_UNKNOWN_PROTOCOLS: true });
}

/** `{{ imageUrl }}/files/...` — public URL of an uploaded file. */
export const fileUrl = (subPath) => `${FILES_ORIGIN}/${String(subPath).replace(/^\/+/, '')}`;


export function fmtDate(value, format = 'mediumDate') {
  if (!value) return '';
  const d = new Date(String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  switch (format) {
    case 'dd/MM/yyyy':
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    case 'yyyy-MM-dd':
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    case 'shortDate':
      return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
    default:
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
}

export const titleCase = (s) => String(s ?? '').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());


export const fmtCurrency = (v, code = 'INR') => (v == null || v === '' ? '' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: code }).format(Number(v)));

export const fmtNumber = (v) => (v == null || v === '' ? '' : new Intl.NumberFormat('en-US').format(Number(v)));

/** ngClass object/array/string → className. */
export function cx(...args) {
  const out = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === 'string') out.push(a);
    else if (Array.isArray(a)) out.push(cx(...a));
    else if (typeof a === 'object') for (const [k, v] of Object.entries(a)) if (v) out.push(k);
  }
  return out.join(' ');
}

export const scrollToTop = () => window.scroll(0, 0);
