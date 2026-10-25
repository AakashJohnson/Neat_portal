'use client';
// Port of components/pages/email-verification/email-verification.component.ts
// (guest-only route). Sends ?email= and ?token= (absent
// parameters are undefined and therefore omitted from the JSON body), then
// toasts and goes to /login on success.
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { jarwisService } from '@/services';
import { apiErrorMessage, subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';
import { toastr } from '@/components/common/Toastr';

function EmailVerification() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState('Verifying your email...');
  useNgOnInit(() => {
    const param = (k) => (params.has(k) ? params.get(k) : undefined);
    subscribe(
      jarwisService.emailVerification({ email: param('email'), token: param('token') }),
      (data) => {
        if (data?.message === 'Success') {
          toastr.success('Email verified Successfully');
          router.push('/login');
        } else {
          const error = data?.reason || 'Email Already Verified or Incorrect token';
          setMessage(error);
          toastr.error(error);
        }
      },
      (res) => {
        const error = apiErrorMessage(res);
        setMessage(error);
        toastr.error(error);
      },
    );
  });
  return <div className="container"><p role="status">{message}</p><Link href="/login">Go to login or resend verification email</Link></div>;
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <EmailVerification />
    </Suspense>
  );
}
