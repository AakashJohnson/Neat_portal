'use client';
// ngOnInit semantics: run once per component instance, when `ready` is true.
// React StrictMode (next dev) runs effects twice; a ref keeps requests with
// side effects (view counters, audit rows) from being sent twice.
import { useEffect, useRef } from 'react';

export function useNgOnInit(init, ready = true) {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, like ngOnInit
  }, [ready]);
}
