'use client';
// ngx-translate equivalent: assets/i18n/{en,fr}.json ("fr" holds the Hindi
// strings). Language choice copied from the navbar: browser language if it
// matches en|fr, otherwise en.
import { createContext, useContext, useEffect, useState } from 'react';

const I18nContext = createContext({ lang: 'en', t: (k) => k });

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [dict, setDict] = useState({});
  const [fallback, setFallback] = useState({});

  // Runs once after mount (navigator is browser-only; the server renders 'en').
  useEffect(() => {
    let alive = true;
    const browser = (navigator.language || 'en').split('-')[0];
    const chosen = /en|fr/.test(browser) ? browser : 'en';
    const load = (l) => fetch(`/assets/i18n/${l}.json`).then((r) => r.json());
    load('en').then((d) => alive && setFallback(d)).catch(() => {});
    load(chosen)
      .then((d) => {
        if (!alive) return;
        setLang(chosen);
        setDict(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // translate pipe: missing keys render the key itself (ngx-translate default).
  const t = (key) => lookup(dict, key) ?? lookup(fallback, key) ?? key;
  return <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
