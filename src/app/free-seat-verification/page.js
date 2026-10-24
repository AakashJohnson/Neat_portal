// Port of components/pages/free-seat-verification/free-seat-verification.component.{html,ts}
import SiteChrome from '@/components/layout/SiteChrome';
import FreeSeatVerificationForm from '@/components/student/FreeSeatVerificationForm';

export default function FreeSeatVerificationPage() {
  return (
    <SiteChrome>
      <FreeSeatVerificationForm />
    </SiteChrome>
  );
}
