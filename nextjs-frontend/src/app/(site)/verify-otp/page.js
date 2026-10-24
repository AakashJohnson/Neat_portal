'use client';
// Port of components/pages/otp-verification/otp-verification.component.ts
// (empty template; guest-only route). Sends ?otp= and ?phone= (absent
// parameters omitted), then reacts to message Success/Error.
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { jarwisService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';
import { toastr } from '@/components/common/Toastr';

function OtpVerification() {
  const router = useRouter();
  const params = useSearchParams();
  useNgOnInit(() => {
    const param = (k) => (params.has(k) ? params.get(k) : undefined);
    subscribe(
      jarwisService.otpVerification({ otp: param('otp'), phone: param('phone') }),
      (data) => {
        if (data['message'] == 'Success') {
          toastr.success('OTP verified Successfully');
          router.push('/login');
        }
        if (data['message'] == 'Error') toastr.error(data['reason']);
      },
      () => toastr.error('Some error occured! Please try again.'),
    );
  });
  return null;
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <OtpVerification />
    </Suspense>
  );
}
