'use client';
// auth/register.blade.php (RegisterController, `registration` middleware:
// 404 unless reg_enabled). RegisterRequest client rules; the server also
// requires `phone`, which the form never sends (R-41), so every web sign-up
// fails with "The phone field is required." exactly as in the original.
// The success message is shown on the login form (DEV: the original flashed
// it to "/", whose auth redirect dropped it).
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useGuestPage } from '@/components/panel/guest';
import SocialButtons from '@/components/panel/SocialButtons';
import { Messages, setFlash } from '@/components/panel/ui';
import { useJsValidation } from '@/lib/jsValidation';
import { validationMessages } from '@/lib/panelApi';

function TosModal({ onClose }) {
  return (
    <>
      <div className="modal fade show" id="tos-modal" tabIndex="-1" role="dialog" aria-labelledby="tos-label" style={{ display: 'block' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="tos-label">
                Terms of Service
              </h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onClose}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <h4>1. Terms</h4>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec quis lacus porttitor, dignissim nibh sit amet, fermentum felis. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ultricies
                consectetur viverra. Nullam velit neque, placerat condimentum tempus tincidunt, placerat eu lectus. Nam molestie porta purus, et pretium risus vehicula in. Cras sem ipsum, varius sagittis rhoncus nec, dictum maximus diam. Duis ac
                laoreet est. In turpis velit, placerat eget nisi vitae, dignissim tristique nisl. Curabitur sollicitudin, nunc ut viverra interdum, lacus...
              </p>
              <h4>2. Use License</h4>
              <ol type="a">
                <li>Aenean vehicula erat eu nisi scelerisque, a mattis purus blandit. Curabitur congue ollis nisl malesuada egestas. Lorem ipsum dolor sit amet, consectetur adipiscing elit:</li>
              </ol>
              <p>...</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}

export default function PanelRegisterPage() {
  const router = useRouter();
  const settings = useGuestPage('Sign Up');
  const v = useJsValidation({
    email: 'required|email',
    username: 'required',
    password: 'required|min:8|regex:/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{6,}$/',
    password_confirmation: 'required|same:password',
  });
  const [errors, setErrors] = useState([]);
  const [old, setOld] = useState({ email: '', username: '' });
  const [tos, setTos] = useState(false);
  const [n, setN] = useState(0);

  if (settings.loaded && !settings.enabled('reg_enabled')) notFound();

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!v.validateAll(form)) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/bff/panel/register', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setFlash(body.message);
      router.replace('/panel/login');
      return;
    }
    // back()->withInput(): email and username come back, the passwords do not
    setOld({ email: data.email ?? '', username: data.username ?? '' });
    setErrors(validationMessages(body));
    setN((x) => x + 1);
  };

  return (
    <div className="col-md-8 col-lg-6 col-xl-5 mx-auto my-10p">
      <div className="text-center">
        <img src="/panel/assets/img/neat-logo.png" alt={settings.app_name} height="50" />
      </div>
      <div className="card mt-5">
        <div className="card-body">
          <h5 className="card-title text-center mt-4 text-uppercase">Register</h5>
          <div className="p-4">
            <SocialButtons />
            <Messages errors={errors} />
            <form role="form" action="/panel/register" method="post" id="registration-form" autoComplete="off" className="mt-3" noValidate onSubmit={onSubmit} key={n}>
              <div className={v.groupClass('email')}>
                <input type="email" name="email" id="email" className="form-control input-solid" placeholder="Email" defaultValue={old.email} {...v.field('email')} />
                {v.error('email')}
              </div>
              <div className={v.groupClass('username')}>
                <input type="text" name="username" id="username" className="form-control input-solid" placeholder="Username" defaultValue={old.username} {...v.field('username')} />
                {v.error('username')}
              </div>
              <div className={v.groupClass('password')}>
                <input type="password" name="password" id="password" className="form-control input-solid" placeholder="Password" {...v.field('password')} />
                {v.error('password')}
              </div>
              <div className={v.groupClass('password_confirmation')}>
                <input type="password" name="password_confirmation" id="password_confirmation" className="form-control input-solid" placeholder="Confirm Password" {...v.field('password_confirmation')} />
                {v.error('password_confirmation')}
              </div>
              {settings.enabled('tos') && (
                <div className="custom-control custom-checkbox">
                  <input type="checkbox" className="custom-control-input" name="tos" id="tos" value="1" />
                  <label className="custom-control-label font-weight-normal" htmlFor="tos">
                    I accept{' '}
                    <a
                      href="#tos-modal"
                      data-toggle="modal"
                      onClick={(e) => {
                        e.preventDefault();
                        setTos(true);
                      }}
                    >
                      Terms of Service
                    </a>
                  </label>
                </div>
              )}
              <div className="form-group mt-4">
                <button type="submit" className="btn btn-primary btn-lg btn-block" id="btn-login">
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="text-center text-muted">
        {settings.enabled('reg_enabled') && (
          <>
            {'Already have an account? '}
            <Link className="font-weight-bold" href="/panel/login">
              Login
            </Link>
          </>
        )}
      </div>
      {tos && <TosModal onClose={() => setTos(false)} />}
    </div>
  );
}
