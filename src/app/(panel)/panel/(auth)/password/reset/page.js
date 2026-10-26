'use client';


import { notFound } from 'next/navigation';
import { useState } from 'react';
import { useGuestPage } from '@/components/panel/guest';
import { Messages } from '@/components/panel/ui';
import { useJsValidation } from '@/lib/jsValidation';
import { validationMessages } from '@/lib/panelApi';

export default function PanelPasswordRemindPage() {
  const settings = useGuestPage('Reset Password');
  const v = useJsValidation({ email: 'required|email' });
  const [messages, setMessages] = useState({ errors: [], success: null, n: 0 });

  if (settings.loaded && !settings.enabled('forgot_password')) notFound();

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!v.validateAll(form)) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/bff/panel/password/remind', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    setMessages((m) => (res.ok ? { errors: [], success: body.message, n: m.n + 1 } : { errors: validationMessages(body), success: null, n: m.n + 1 }));
  };

  return (
    <div className="col-md-8 col-lg-6 col-xl-5 mx-auto my-10p">
      <div className="text-center">
        <img src="/panel/assets/img/neat-logo.png" alt={settings.app_name} height="50" />
      </div>
      <div className="card mt-5">
        <div className="card-body">
          <h5 className="card-title text-center mt-4 mb-2 text-uppercase">Forgot Your Password?</h5>
          <div className="p-4">
            <form role="form" action="/panel/password/email" method="POST" id="remind-password-form" autoComplete="off" noValidate onSubmit={onSubmit} key={messages.n}>
              <p className="text-muted mb-4 text-center font-weight-light">Please provide your email below and we will send you a password reset link.</p>
              <Messages key={messages.n} errors={messages.errors} success={messages.success} />
              <div className={v.groupClass('email', 'form-group password-field my-3')}>
                <label htmlFor="password" className="sr-only">
                  Email
                </label>
                <input type="email" name="email" id="email" className="form-control input-solid" placeholder="Your E-Mail" {...v.field('email')} />
                {v.error('email')}
              </div>
              <div className="form-group mt-4">
                <button type="submit" className="btn btn-primary btn-lg btn-block" id="btn-reset-password">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
