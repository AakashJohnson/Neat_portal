'use client';
// Port of components/pages/email-verification/email-verification.component.ts
// (empty template; guest-only route). Sends ?email= and ?token= (absent
// parameters are undefined and therefore omitted from the JSON body), then
// toasts and goes to /login on success.
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { jarwisService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';
import { toastr } from '@/components/common/Toastr';

function EmailVerification() {
  const router = useRouter();
  const params = useSearchParams();
  useNgOnInit(() => {
    const param = (k) => (params.has(k) ? params.get(k) : undefined);
    subscribe(
      jarwisService.emailVerification({ email: param('email'), token: param('token') }),
      () => {
        toastr.success('Email verified Successfully');
        router.push('/login');
      },
      () => toastr.error('Email Already Verified or Incorrect token'),
    );
  });
  return null;
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <EmailVerification />
    </Suspense>
  );
}
