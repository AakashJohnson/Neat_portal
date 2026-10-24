'use client';
// Guest pages of the panel (layouts/auth): the page title, the settings the
// views read, and the `guest` middleware (a logged-in user goes to the dashboard).
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const DEFAULTS = { app_name: 'Neat', remember_me: true, forgot_password: true, reg_enabled: '1', tos: '1' };
const on = (v) => !(v === false || v === null || v === undefined || v === '' || v === '0' || v === 0);

export function useGuestPage(title, { guest = true } = {}) {
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    document.title = `${title} - ${settings.app_name}`;
  }, [title, settings.app_name]);

  useEffect(() => {
    let alive = true;
    fetch('/bff/panel/settings/public', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => alive && s && setSettings({ ...DEFAULTS, ...s }))
      .catch(() => {});
    if (guest) {
      fetch('/bff/panel/context?token=', { headers: { Accept: 'application/json' } })
        .then((r) => alive && r.ok && router.replace('/panel'))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [guest, router]);

  return { ...settings, enabled: (key) => on(settings[key]) };
}
