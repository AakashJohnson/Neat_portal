'use client';
// Port of components/pages/student-free-seat-allocation (route "free-seat-allocation"):
// link from the free-seat e-mail (?neat_secret_code, student_id, product_id, student_email).
// Logged out: checkStudentExists, the values are kept base64-encoded in
// localStorage for after login/registration ('Please login' / 'Please Register';
// the #Login/#Register modals do not exist). Logged in: checkStudentSecretCode
// and navigation by result.
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SiteChrome from '@/components/layout/SiteChrome';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import { studentService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

const ls = {
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage unavailable */
    }
  },
  remove: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* storage unavailable */
    }
  },
};

function FreeSeatAllocation() {
  const router = useRouter();
  const params = useSearchParams();
  const { claims, ready, removeToken } = useSession();

  useNgOnInit(() => {
    const q = (k) => (params.has(k) ? params.get(k) : undefined);
    const data = { neat_secret_code: q('neat_secret_code'), application_number: q('student_id'), product_id: q('product_id'), student_email: q('student_email') };
    if (data.neat_secret_code === undefined || data.application_number === undefined || data.student_email === undefined || data.product_id === undefined) {
      toastr.error('Invalid Url');
      removeToken();
      router.push('/login');
      router.push('/');
      return;
    }
    if (!claims) {
      subscribe(studentService.checkStudentExists(data), (res) => {
        ls.set('neat_secret_code', btoa(data.neat_secret_code));
        ls.set('application_number', btoa(data.application_number));
        ls.set('freeSeatCode', btoa(data.product_id));
        ls.set('student_email', btoa(data.student_email));
        if (res['registered'] == 'Yes') toastr.info('Please login');
        else toastr.info('Please Register');
      });
      return;
    }
    ['neat_secret_code', 'application_number', 'freeSeatCode', 'student_email'].forEach(ls.remove);
    subscribe(studentService.checkStudentSecretCode(data), (res) => {
      if (res['message'] == 'Success') {
        toastr.success(res['reason']);
        router.push(`/student/free-course-details/${data.product_id}`);
      } else if (res['message'] == 'Availed') {
        toastr.success(res['reason']);
        router.push('/student/platform');
      } else {
        toastr.error(res['reason']);
        router.push('/student');
      }
    });
  }, ready);

  return <p> Please Wait </p>;
}

export default function FreeSeatAllocationPage() {
  return (
    <SiteChrome>
      <Suspense>
        <FreeSeatAllocation />
      </Suspense>
    </SiteChrome>
  );
}
