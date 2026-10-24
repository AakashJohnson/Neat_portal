'use client';
// Port of components/pages/login/login.component.{html,ts}.
// The BFF (POST /api/session) logs in on the API and keeps the JWT in an
// httpOnly cookie only when LoginComponent would have stored it (decodable and
// email_verified_at set); navigation by role_id as in the original switch.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteChrome from '@/components/layout/SiteChrome';
import AuthBanner from '@/components/auth/AuthBanner';
import { useSession } from '@/components/providers/SessionProvider';
import { toastr } from '@/components/common/Toastr';
import { useFormGroup, Validators } from '@/lib/forms';

const ROLE_HOME = { 1: '/admin', 3: '/student/paid-Products-details-checkout', 4: '/company', 5: '/institute', 6: '/learner/learner-free-course' };

export default function LoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const form = useFormGroup({
    username: [null, [Validators.required]],
    password: [null, [Validators.required]],
  });

  const onSubmit = async (values) => {
    if (!form.valid) {
      toastr.error('Please Fill all the details');
      return;
    }
    const { status, data } = await login(values.username, values.password);
    if (status >= 200 && status < 300 && data?.claims) {
      // handleResponse: an undecodable token threw before anything happened.
      if (!data.legacyDecodable) return;
      const user = data.claims;
      if (user.email_verified_at != null) {
        // switch (user['role_id']) — strict comparison with numbers.
        router.push(Object.prototype.hasOwnProperty.call(ROLE_HOME, user.role_id) && typeof user.role_id === 'number' ? ROLE_HOME[user.role_id] : '/login/');
      } else {
        toastr.error('Kindly verify email first!');
      }
    } else {
      // handleError: error.error.error, title 'Error!'
      toastr.error(data?.error, 'Error!');
    }
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
                  <button type="submit" className="btn btn-login float-right">
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
