'use client';
// Session state for the browser: the JWT's public claims (role_id, email,
// username, application_number, uuid, …). Replaces Angular's TokenService /
// AuthService and the per-component `atob(token.split('.')[1])` decoding.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const SessionContext = createContext({ claims: null, ready: false, refresh: async () => {}, login: async () => ({}), logout: async () => {} });

const fetchSession = () =>
  fetch('/api/session', { cache: 'no-store' })
    .then((res) => res.json())
    .catch(() => ({}));

export function SessionProvider({ children }) {
  const [claims, setClaims] = useState(null);
  const [ready, setReady] = useState(false);

  const apply = useCallback((data) => {
    setClaims(data.claims ?? null);
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
    if (res.ok) setClaims(data.claims);
    return { status: res.status, data };
  }, []);

  /** Angular logout(): token removed, auth status false, localStorage cleared. */
  const logout = useCallback(async () => {
    await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
    try {
      localStorage.clear();
    } catch {
      /* storage unavailable */
    }
    setClaims(null);
  }, []);

  return <SessionContext.Provider value={{ claims, ready, refresh, login, logout }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

/** Angular templates compared role_id with strings ('' when logged out). */
export const roleOf = (claims) => (claims?.role_id == null ? '' : String(claims.role_id));
