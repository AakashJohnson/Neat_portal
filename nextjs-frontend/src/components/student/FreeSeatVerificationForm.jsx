'use client';
// Free-seat company-code form shared by /free-seat-verification
// (FreeSeatVerificationComponent, with navbar/footer) and
// /student/free-seat-verification (StudentFreeSeatVerificationComponent, inside
// the student shell): identical component logic and form markup.
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import { studentService } from '@/services';
import { subscribe } from '@/lib/api';
import { useFormGroup, Validators } from '@/lib/forms';
import { useNgOnInit } from '@/lib/useNgOnInit';
import { useDataService } from '@/lib/dataService';

export default function FreeSeatVerificationForm() {
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
  );
}
