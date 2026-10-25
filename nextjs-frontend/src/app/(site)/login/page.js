'use client';
// Port of components/pages/login/login.component.{html,ts}.
// The BFF (POST /api/session) logs in on the API and keeps the JWT in an
// httpOnly cookie for a verified account; navigation is selected by role_id.
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteChrome from '@/components/layout/SiteChrome';
import AuthBanner from '@/components/auth/AuthBanner';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import { useFormGroup, Validators } from '@/lib/forms';
import { apiErrorMessage, subscribe } from '@/lib/api';
import { jarwisService } from '@/services';

const ROLE_HOME = { 1: '/admin', 3: '/student/paid-Products-details-checkout', 4: '/company', 5: '/institute', 6: '/learner/learner-free-course' };

export default function LoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const form = useFormGroup({
    username: [null, [Validators.required]],
    password: [null, [Validators.required]],
  });

  const onSubmit = async (values) => {
    if (submitting) return;
    if (!form.valid) {
      toastr.error('Please Fill all the details');
      return;
    }
    setSubmitting(true);
    let response;
    try {
      response = await login(values.username, values.password);
    } catch (err) {
      console.error('Login request failed:', err.name);
      toastr.error('Unable to reach the login service. Please try again.', 'Error!');
      return;
    } finally {
      setSubmitting(false);
    }
    const { status, data } = response;
    if (status >= 200 && status < 300 && data?.claims) {
      if (!data.legacyDecodable) {
        toastr.error('Unable to read your session. Please contact support.');
        return;
      }
      const user = data.claims;
      if (user.email_verified_at != null) {
        router.push(ROLE_HOME[user.role_id] ?? '/');
      } else {
        toastr.error('Kindly verify email first!');
      }
    } else {
      toastr.error(apiErrorMessage(response), 'Error!');
    }
  };

  const resend = async () => {
    if (!form.value.username || Validators.email(form.value.username)) {
      toastr.error('Enter your email address above to resend the verification link.');
      return;
    }
    setResending(true);
    await subscribe(jarwisService.resendEmailVerificationLink({ email: form.value.username }),
      (data) => toastr.success(data.reason),
      (res) => toastr.error(apiErrorMessage(res)));
    setResending(false);
  };

  return (
    <SiteChrome>
      <section className="login-block">
        <div className="container">
          <div className="row">
            <AuthBanner />
            <div className="col-md-6 login-sec">
              <h2 className="text-center">Login Now</h2>
              <form
                noValidate
                className="login-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  form.markSubmitted();
                  onSubmit(form.value);
                }}
              >
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1" className="text-uppercase">
                    Email ID
                  </label>
                  <input type="text" id="email" className="form-control" placeholder="Enter email" {...form.bind('username')} name="email" required />
                </div>
                <div className="form-group">
                  <label htmlFor="exampleInputPassword1" className="text-uppercase">
                    Password
                  </label>
                  <input type="password" className="form-control" placeholder="Enter Password" id="password" {...form.bind('password')} name="password" required />
                </div>
                <div className="form-check">
                  <label className="form-check-label fgPwLbl">
                    <Link href="/forgot-password" className="fgpw">
                      Forgot password?{' '}
                    </Link>
                    <Link href="/register" className="lstEml">
                      Register
                    </Link>
                  </label>
                  <button type="submit" disabled={submitting} className="btn btn-login float-right">
                    {submitting ? 'Signing in...' : 'Submit'}
                  </button>
                </div>
              </form>
              <button type="button" className="btn btn-link" disabled={resending} onClick={resend}>
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
