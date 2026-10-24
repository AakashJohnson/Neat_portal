'use client';
// GET logout (LoginController@logout): event(LoggedOut), Auth::logout(), redirect('login').
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PanelLogoutPage() {
  const router = useRouter();
  useEffect(() => {
    fetch('/api/panel/session', { method: 'DELETE' }).finally(() => router.replace('/panel/login'));
  }, [router]);
  return null;
}
