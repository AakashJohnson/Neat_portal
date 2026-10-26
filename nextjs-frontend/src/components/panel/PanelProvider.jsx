'use client';


import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { panelApi } from '@/lib/panelApi';

const PanelContext = createContext(null);

export function PanelProvider({ children }) {
  const [state, setState] = useState({ loading: true, data: null, status: null });

  const refresh = useCallback(async () => {
    const res = await panelApi.get('/panel/context');
    setState({ loading: false, data: res.ok ? res.data : null, status: res.status });
    return res;
  }, []);

  useEffect(() => {
    let alive = true;
    panelApi.get('/panel/context').then((res) => alive && setState({ loading: false, data: res.ok ? res.data : null, status: res.status }));
    return () => {
      alive = false;
    };
  }, []);

  const permissions = new Set(state.data?.permissions ?? []);
  const value = {
    ...state,
    user: state.data?.user ?? null,
    role: state.data?.role ?? null,
    settings: state.data?.settings ?? {},
    impersonating: !!state.data?.impersonating,
    announcements: state.data?.announcements ?? { items: [], unread: false },
    /** User::hasPermission(names): every name is required. */
    can: (...names) => names.flat().every((n) => permissions.has(n)),
    hasRole: (name) => state.data?.role?.name === name,
    refresh,
  };
  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
}

export const usePanel = () => useContext(PanelContext);

/** UserPresenter::nameOrEmail() / name(). */
export const nameOrEmail = (u) => (`${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : u?.email ?? '');
export const presentName = (u) => `${u?.first_name ?? ''} ${u?.last_name ?? ''}`;
