'use client';


import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function StandaloneGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/bff/panel/context?token=', { headers: { Accept: 'application/json' } })
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 401) return router.replace(`/panel/login?to=${encodeURIComponent(pathname)}`);
        if (!r.ok) return; // 429/5xx: stay (only an unauthenticated session goes to login)
        const ctx = await r.json();
        document.title = ` - ${ctx.settings?.app_name ?? 'Neat'}`;
        setReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [router, pathname]);

  return ready ? children : null;
}
