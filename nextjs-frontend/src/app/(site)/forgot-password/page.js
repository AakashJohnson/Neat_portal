'use client';


import Link from 'next/link';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import SiteChrome from '@/components/layout/SiteChrome';
import AuthBanner from '@/components/auth/AuthBanner';
import { toastr } from '@/components/common/Toastr';
import { jarwisService } from '@/services';
import { subscribe } from '@/lib/api';
import { useFormGroup, Validators } from '@/lib/forms';

const isSpace = (evt) => (evt.which ? evt.which : evt.keyCode) != 32;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const form = useFormGroup({ email: [null, [Validators.required]] });
  const formValues = useRef({ email: null });

  const onSubmit = (values) => {
    if (form.valid) formValues.current.email = values.email;
    subscribe(
      jarwisService.sendPasswordResetLink({ ...formValues.current }),
      () => {
        formValues.current.email = null;
        toastr.success('Password reset link has been sent. Please Check your inbox!');
        alert('Password reset link has been sent. Please check your inbox!');
        setTimeout(() => router.push('/login'), 2000);
      },
      (res) => toastr.error(res.data['error']),
    );
  };

  return (
    <SiteChrome>
      <section className="login-block">
        <div className="container">
          <div className="row">
            <AuthBanner />
            <div className="col-md-6 login-sec">
              <h2 className="text-center">Forgot Password</h2>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  form.markSubmitted();
                  onSubmit(form.value);
                }}
              >
                <div className="form-group">
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    placeholder="Enter email. e.g. abc@gmail.com"
                    {...form.bind('email')}
                    onKeyPress={(e) => {
                      if (isSpace(e) === false) e.preventDefault();
                    }}
                    required
                  />
                </div>
                <div className="form-check">
                  <label className="form-check-label fgPwLbl">
                    <Link href="/register" className="fgpw">
                      Register{' '}
                    </Link>
                    <Link href="/login" className="lstEml">
                      Login
                    </Link>
                  </label>
                  <button type="submit" className="btn btn-login float-right" style={{ marginTop: '0px', marginBottom: '10px' }}>
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
