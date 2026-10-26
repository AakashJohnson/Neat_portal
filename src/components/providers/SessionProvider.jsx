'use client';


import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const SessionContext = createContext({ claims: null, ready: false, refresh: async () => {}, login: async () => ({}), logout: async () => {}, removeToken: async () => {} });

const fetchSession = () =>
  fetch('/api/session', { cache: 'no-store' })
    .then((res) => res.json())
    .catch(() => ({}));

export function SessionProvider({ children }) {
  const [claims, setClaims] = useState(null);
  const [ready, setReady] = useState(false);

  const [legacyDecodable, setLegacyDecodable] = useState(true);

  const apply = useCallback((data) => {
    setClaims(data.claims ?? null);
    setLegacyDecodable(data.legacyDecodable ?? true);
    setReady(true);
    return data;
  }, []);

  const refresh = useCallback(() => fetchSession().then(apply), [apply]);

  useEffect(() => {
    let alive = true;
    fetchSession().then((data) => alive && apply(data));
    return () => {
      alive = false;
    };
  }, [apply]);

  /** POST /api/session → API /api/login. Returns { status, data } with the API body. */
  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.stored) {
      setClaims(data.claims);
      setLegacyDecodable(data.legacyDecodable ?? true);
    }
    return { status: res.status, data };
  }, []);


  const logout = useCallback(async () => {
    await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
    try {
      localStorage.clear();
    } catch {
      /* storage unavailable */
    }
    setClaims(null);
  }, []);

  /** TokenService.remove() + AuthService.changeStatus(false): local only, other storage kept. */
  const removeToken = useCallback(async () => {
    await fetch('/api/session?revoke=0', { method: 'DELETE' }).catch(() => {});
    setClaims(null);
  }, []);

  return <SessionContext.Provider value={{ claims, ready, legacyDecodable, refresh, login, logout, removeToken }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);


export const roleOf = (claims) => (claims?.role_id == null ? '' : String(claims.role_id));
