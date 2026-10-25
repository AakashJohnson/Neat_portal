'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from './api';

export function searchResponse(response) {
  if (!response.ok || response.data?.message === 'Error') throw new Error(apiErrorMessage(response));
  return response.data;
}

export function searchCollection(response, key) {
  const data = searchResponse(response);
  if (!Array.isArray(data?.[key])) throw new Error('Unable to load search results. Please try again.');
  return data[key];
}

export function filterProducts(products, query) {
  const term = query.trim().toLowerCase();
  return term ? products.filter(p => [p.course_name, p.company_name].some(value => String(value ?? '').toLowerCase().includes(term))) : products;
}

export function useAsyncSearch(load, { delay = 250 } = {}) {
  const [result, setResult] = useState({ load: null, revision: -1, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await load();
        if (active) setResult({ load, revision, data: result, error: '' });
      } catch (failure) {
        if (active) {
          setResult({ load, revision, data: null, error: failure instanceof Error ? failure.message : 'Unable to load search results. Please try again.' });
        }
      }
    }, delay);
    return () => { active = false; clearTimeout(timer); };
  }, [load, delay, revision]);
  const loading = result.load !== load || result.revision !== revision;
  return { data: result.data, loading, error: loading ? '' : result.error, refresh };
}

// Next's native History integration updates useSearchParams without a server
// navigation per keystroke. Keep unrelated filters and reset only pagination.
export function updateSearchParams(base, changes) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  params.delete('page');
  window.history.replaceState(null, '', `${base}${params.size ? `?${params}` : ''}`);
}
