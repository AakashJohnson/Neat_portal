'use client';
// auth/{provider}/login (SocialAuthController@redirectToProvider). No OAuth
// client is configured for the new stack (BLOCKED), so the user is sent back
// to the login form with an error instead of to the provider.
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { setFlash } from '@/components/panel/ui';

export default function PanelSocialLoginPage() {
  const router = useRouter();
  useEffect(() => {
    setFlash({ error: 'Social authentication is not configured.' });
    router.replace('/panel/login');
  }, [router]);
  return null;
}
