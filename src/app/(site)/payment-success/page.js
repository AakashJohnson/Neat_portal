'use client';
// Port of components/pages/payment-success/payment-success.component.{html,ts}:
// full page load to the purchased courses after 10 s.
import PaymentResult from '@/components/payment/PaymentResult';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function PaymentSuccessPage() {
  useNgOnInit(() => {
    setTimeout(() => {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load, as in the original
      window.location.href = '/student/paid-Products-details-checkout';
    }, 10000);
  });
  return (
    <PaymentResult title="Payment Success" icon="zmdi zmdi-check zmdi-hc-5x bg-green-dark gap-padding" heading="Your Payment is Successfull">
      <h6 style={{ fontSize: '17px' }}>Thank you for your payment. An automated payment receipt will be sent to your registered email.</h6>
      <h6 style={{ fontSize: '17px' }}>You will be redirected to your purchased courses in 10 seconds.</h6>
    </PaymentResult>
  );
}
