'use client';
// auth/login.blade.php (Web\Auth\LoginController): username/password with
// LoginRequest client validation, "Remember me?" when enabled, errors from the
// web login, redirect to ?to= or the dashboard.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useGuestPage } from '@/components/panel/guest';
import { Messages } from '@/components/panel/ui';
import { useJsValidation } from '@/lib/jsValidation';
import { validationMessages } from '@/lib/panelApi';

export default function PanelLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const to = params.get('to');
  const v = useJsValidation({ username: 'required', password: 'required' });
  const settings = useGuestPage('Login');
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!v.validateAll(form) || busy) return;
    setBusy(true);
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/api/panel/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErrors(validationMessages(body));
      return;
    }
    router.replace(to || '/panel');
  };

  return (
    <div className="col-md-8 col-lg-6 col-xl-5 mx-auto my-10p" id="login">
      <div className="text-center">
        <img src="/panel/assets/img/neat-logo.png" alt={settings.app_name} height="50" />
      </div>
      <div className="card mt-5">
        <div className="card-body">
          <h5 className="card-title text-center mt-4 text-uppercase">Login</h5>
          <div className="p-4">
            <Messages errors={errors} />
            <form role="form" action="/panel/login" method="POST" id="login-form" autoComplete="off" className="mt-3" noValidate onSubmit={onSubmit}>
              {to && <input type="hidden" value={to} name="to" />}
              <div className={v.groupClass('username')}>
                <label htmlFor="username" className="sr-only">
                  Email or Username
                </label>
                <input type="text" name="username" id="username" className="form-control input-solid" placeholder="Email or Username" {...v.field('username')} />
                {v.error('username')}
              </div>
              <div className={v.groupClass('password', 'form-group password-field')}>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input type="password" name="password" id="password" className="form-control input-solid" placeholder="Password" {...v.field('password')} />
                {v.error('password')}
              </div>
              {settings.enabled('remember_me') && (
                <div className="custom-control custom-checkbox">
                  <input type="checkbox" className="custom-control-input" name="remember" id="remember" value="1" />
                  <label className="custom-control-label font-weight-normal" htmlFor="remember">
                    Remember me?
                  </label>
                </div>
              )}
              <div className="form-group mt-4">
                <button type="submit" className="btn btn-primary btn-lg btn-block" id="btn-login">
                  Log In
                </button>
              </div>
            </form>
            {settings.enabled('forgot_password') && (
              <Link href="/panel/password/reset" className="forgot">
                I forgot my password
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="text-center text-muted">
        {settings.enabled('reg_enabled') && (
          <>
            {"Don't have an account? "}
            <Link className="font-weight-bold" href="/panel/register">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
