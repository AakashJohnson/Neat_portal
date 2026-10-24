'use client';
// Port of components/pages/free-seat-verification/free-seat-verification.component.{html,ts}:
// company secret code for the course handed over in DataService (freeSeatCode).
import { useRouter } from 'next/navigation';
import SiteChrome from '@/components/layout/SiteChrome';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import { studentService } from '@/services';
import { subscribe } from '@/lib/api';
import { useFormGroup, Validators } from '@/lib/forms';
import { useNgOnInit } from '@/lib/useNgOnInit';
import { useDataService } from '@/lib/dataService';

export default function FreeSeatVerificationPage() {
  const router = useRouter();
  const { claims, ready } = useSession();
  const courseId = useDataService('freeSeatCode');
  const form = useFormGroup({ company_secret_code: [null, [Validators.required]] });

  useNgOnInit(() => {
    if (!claims) {
      try {
        localStorage.setItem('free-seat-verification', 'Yes');
      } catch {
        /* storage unavailable */
      }
      toastr.error('Kindly Login First');
      // jQuery('#Login').modal('show') — no #Login element: no effect.
    }
  }, ready);

  const verifyFreeSeat = (values) => {
    values['course_id'] = courseId;
    if (!claims) {
      toastr.info('Please Login');
    } else if (form.valid) {
      subscribe(studentService.checkCompanySecretCode(values), (data) => {
        if (data['message'] == 'Success') {
          toastr.success(data['reason']);
          router.push('/student/platform');
        } else toastr.error(data['reason']);
      });
    } else {
      toastr.error('Please Enter the code you have received in your mail');
    }
  };

  return (
    <SiteChrome>
      <div className="modal-body container">
        <form
          noValidate
          className="form-horizontal"
          onSubmit={(e) => {
            e.preventDefault();
            form.markSubmitted();
            verifyFreeSeat({ ...form.value });
          }}
        >
          <div className="form-group">
            <input type="text" className="form-control" id="company_secret_code" placeholder="Enter Company Secret Code" {...form.bind('company_secret_code')} name="company_secret_code" required />
          </div>
          <div className="form-group">
            <button type="submit" className="btn button-submit">
              Submit
            </button>
          </div>
        </form>
      </div>
    </SiteChrome>
  );
}
