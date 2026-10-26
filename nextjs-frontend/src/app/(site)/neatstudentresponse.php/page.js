'use client';


import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import { paymentService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

function PaymentVerification() {
  const router = useRouter();
  const params = useSearchParams();
  const { removeToken } = useSession();

  useNgOnInit(() => {
    const q = (k) => (params.has(k) ? params.get(k) : undefined);
    const neatCourseid = q('neat_course_id');
    const data = {
      studentid: q('studentid'),
      success: q('Success'),
      token: q('sessionid'),
      payment: q('payment'),
      courseid: neatCourseid !== undefined ? neatCourseid : q('courseid'),
      failure: q('Failure'),
    };
    if (data.studentid === undefined || data.token === undefined || data.courseid === undefined) {
      toastr.error('Invalid Url');
      // logout(): token removed, navigate /login — superseded by navigate '/'.
      removeToken();
      router.push('/login');
      router.push('/');
      return;
    }
    if (data.success == '1') {
      subscribe(paymentService.paymentSuccess(data), (res) => router.push(res['message'] == 'Success' ? '/payment-success' : '/payment-failure'));
    } else if (data.failure == '1') {
      subscribe(paymentService.paymentFailure(data), (res) => {
        if (res['message'] != 'Success') toastr.error(res['reason']);
      });
      router.push('/payment-failure');
    }
  });

  return (
    <table className="table table-bordered">
      <tbody>
        <tr>
          <td colSpan="2" className="aligncenter" style={{ verticalAlign: 'middle' }}>
            <img src="/assets/images/processing-icon.png" />
            <span className="processing">Processing...</span>
          </td>
        </tr>
        <tr>
          <td colSpan="2" className="aligncenter">
            <h1>You will be redirected to NEAT portal. Please Wait...</h1>
          </td>
        </tr>
        <tr>
          <td colSpan="2" className="aligncenter">
            <h6>Please do not refresh the page or click the &quot;Back&quot; or &quot;Close&quot; button of your browser.</h6>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default function NeatStudentResponsePage() {
  return (
    <Suspense>
      <PaymentVerification />
    </Suspense>
  );
}
