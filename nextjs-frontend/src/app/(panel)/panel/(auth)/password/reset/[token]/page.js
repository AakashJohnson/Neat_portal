'use client';
// auth/passwords/reset.blade.php (ResetPasswordController, password-reset +
// guest): email + new password; on success the user is logged in and sent
// to the dashboard (ResetsPasswords::reset → $redirectTo = '/').
import { notFound, useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { useGuestPage } from '@/components/panel/guest';
import { Messages } from '@/components/panel/ui';
import { useJsValidation } from '@/lib/jsValidation';
import { validationMessages } from '@/lib/panelApi';

export default function PanelPasswordResetPage({ params }) {
  const { token } = use(params);
  const router = useRouter();
  const settings = useGuestPage('Reset Password');
  const v = useJsValidation({ email: 'required|email', password: 'required|confirmed|min:8' });
  const [errors, setErrors] = useState({ list: [], n: 0 });

  if (settings.loaded && !settings.enabled('forgot_password')) notFound();

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!v.validateAll(form)) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/bff/panel/password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.token) {
      await fetch('/api/panel/session', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: body.token }) });
      router.replace('/panel');
      return;
    }
    setErrors((x) => ({ list: validationMessages(body), n: x.n + 1 }));
  };

  return (
    <div className="col-md-8 col-lg-6 col-xl-5 mx-auto my-10p">
      <div className="text-center">
        <img src="/panel/assets/img/neat-logo.png" alt={settings.app_name} height="50" />
      </div>
      <div className="card mt-5">
        <div className="card-body">
          <h5 className="card-title text-center mt-4 mb-2 text-uppercase">Reset Your Password</h5>
          <form role="form" action="/panel/password/reset" method="POST" id="reset-password-form" autoComplete="off" className="p-4" noValidate onSubmit={onSubmit} key={errors.n}>
            <input type="hidden" name="token" value={token} />
            <p className="text-muted mb-4 text-center font-weight-light px-2">Please provide your email and pick a new password below.</p>
            <Messages errors={errors.list} />
            <div className={v.groupClass('email')}>
              <label htmlFor="password" className="sr-only">
                Your E-Mail
              </label>
              <input type="email" name="email" id="email" className="form-control input-solid" placeholder="Your E-Mail" {...v.field('email')} />
              {v.error('email')}
            </div>
            <div className={v.groupClass('password')}>
              <label htmlFor="password" className="sr-only">
                New Password
              </label>
              <input type="password" name="password" id="password" className="form-control input-solid" placeholder="New Password" {...v.field('password')} />
              {v.error('password')}
            </div>
            <div className="form-group">
              <label htmlFor="password" className="sr-only">
                Confirm New Password
              </label>
              <input type="password" name="password_confirmation" id="password_confirmation" className="form-control input-solid" placeholder="Confirm New Password" />
            </div>
            <div className="form-group mt-5">
              <button type="submit" className="btn btn-primary btn-lg btn-block" id="btn-reset-password">
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
