// Port of components/pages/payment-failure/payment-failure.component.{html,ts}
import PaymentResult from '@/components/payment/PaymentResult';

export default function PaymentFailurePage() {
  return (
    <PaymentResult title="Payment Failure" icon="zmdi zmdi-close zmdi-hc-5x bg-red gap-padding" heading="Oh no, your payment Failed">
      <h6 style={{ fontSize: '17px' }}>Don’t worry your money is safe! If money was debited from your account, it will be refunded automatically in 5-7 working days.</h6>
    </PaymentResult>
  );
}
