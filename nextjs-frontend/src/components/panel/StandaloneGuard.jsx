'use client';
// Login check for the standalone company-profile pages: no session → the
// login form, coming back here afterwards. The page title is the original's
// "@yield('page-title') - app_name" with no page title.
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
        if (!r.ok) return router.replace(`/panel/login?to=${encodeURIComponent(pathname)}`);
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
