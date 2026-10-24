'use client';
// settings/auth.blade.php (settings.auth): Authentication tab (general,
// two-factor, throttling) and Registration tab (general, reCAPTCHA). The
// 2FA / reCAPTCHA cards show the "not configured" alert unless AUTHY_KEY /
// RECAPTCHA_SITEKEY + RECAPTCHA_SECRETKEY are set on the backend.
import { useState } from 'react';
import { Crumb, Messages, PanelPage } from '@/components/panel/ui';
import { SettingSwitch, phpTruthy, settingValue, useSettings } from '@/components/panel/settings';

function Toggle({ id, enabled, onEnable, onDisable, loader }) {
  const [busy, setBusy] = useState(false);
  const run = async (e, fn) => {
    e.preventDefault();
    setBusy(true);
    await fn();
    setBusy(false);
  };
  return enabled ? (
    <form method="POST" id={id} onSubmit={(e) => run(e, onDisable)}>
      <button type="submit" className="btn btn-danger" disabled={busy}>
        {busy && loader ? 'Disabling...' : 'Disable'}
      </button>
    </form>
  ) : (
    <form method="POST" id={id} onSubmit={(e) => run(e, onEnable)}>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy && loader ? 'Enabling...' : 'Enable'}
      </button>
    </form>
  );
}

export default function PanelAuthSettingsPage() {
  const { data, settings, messages, save, onSubmit } = useSettings('auth');
  const [tab, setTab] = useState('auth');
  const s = (key, fallback) => settingValue(settings, key, fallback);
  const on = (key) => phpTruthy(s(key));

  const pill = (id, icon, label) => (
    <li className="nav-item">
      <a
        href={`#${id}`}
        className={`nav-link${tab === id ? ' active' : ''}`}
        id="pills-home-tab"
        data-toggle="pill"
        aria-controls="pills-home"
        aria-selected="true"
        onClick={(e) => {
          e.preventDefault();
          setTab(id);
        }}
      >
        <i className={icon}></i> {label}
      </a>
    </li>
  );

  return (
    <PanelPage
      title="Authentication Settings"
      heading="Authentication"
      breadcrumbs={
        <>
          <Crumb muted>Settings</Crumb>
          <Crumb active>Authentication</Crumb>
        </>
      }
    >
      <Messages key={messages.n} errors={messages.errors} success={messages.success} />
      <ul className="nav nav-pills mb-4 mt-2" id="pills-tab" role="tablist">
        {pill('auth', 'fa fa-lock', 'Authentication')}
        {pill('registration', 'fa fa-user-plus', 'Registration')}
      </ul>
      {data && (
        <div className="tab-content" key={messages.n}>
          <div role="tabpanel" className={`tab-pane${tab === 'auth' ? ' active' : ''}`} id="auth">
            <div className="row">
              <div className="col-md-6">
                <div className="card">
                  <h6 className="card-header">General</h6>
                  <div className="card-body">
                    <form method="POST" action="/panel/settings/auth" id="auth-general-settings-form" onSubmit={onSubmit}>
                      <SettingSwitch className="form-group mb-4" name="remember_me" id="switch-remember-me" checked={on('remember_me')} label={'Allow "Remember Me"'} help="Should 'Remember Me' checkbox be displayed on login form?" />
                      <SettingSwitch name="forgot_password" id="switch-forgot-pass" checked={on('forgot_password')} label="Forgot Password" help="Enable/Disable forgot password feature." />
                      <div className="form-group my-4">
                        <label htmlFor="login_reset_token_lifetime">
                          Reset Token Lifetime <br />
                          <small className="text-muted">Number of minutes that the reset token should be considered valid.</small>
                        </label>
                        <input type="text" name="login_reset_token_lifetime" className="form-control input-solid" defaultValue={s('login_reset_token_lifetime', 30)} />
                      </div>
                      <button type="submit" className="btn btn-primary">
                        Update
                      </button>
                    </form>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title mb-1">Two-Factor Authentication</h5>
                    <small className="text-muted d-block mb-4">Enable/Disable Two-Factor Authentication for the application.</small>
                    {!data.two_factor_configured ? (
                      <div className="alert alert-info">
                        In order to enable Two-Factor Authentication you have to register and create new application on{' '}
                        <a href="https://www.authy.com/" target="_blank" rel="noreferrer">
                          <strong>Authy website</strong>
                        </a>
                        , and update your <code>AUTHY_KEY</code> environment variable inside <code>.env</code> file.
                      </div>
                    ) : (
                      <Toggle
                        id="auth-2fa-settings-form"
                        loader
                        enabled={on('2fa.enabled')}
                        onEnable={() => save({ '2fa.enabled': true }, 'Two-Factor Authentication enabled successfully.')}
                        onDisable={() => save({ '2fa.enabled': false }, 'Two-Factor Authentication disabled successfully.')}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card">
                  <h6 className="card-header">Authentication Throttling</h6>
                  <div className="card-body">
                    <form method="POST" action="/panel/settings/auth" id="auth-throttle-settings-form" onSubmit={onSubmit}>
                      <SettingSwitch className="form-group mb-4" name="throttle_enabled" id="switch-throttle" checked={on('throttle_enabled')} label="Throttle Authentication" help="Should the system throttle authentication attempts?" helpClass="text-muted" />
                      <div className="form-group my-4">
                        <label htmlFor="throttle_attempts">
                          Maximum Number of Attempts <br />
                          <small className="text-muted">Maximum number of incorrect login attempts before lockout.</small>
                        </label>
                        <input type="text" name="throttle_attempts" className="form-control input-solid" defaultValue={s('throttle_attempts', 10)} />
                      </div>
                      <div className="form-group my-4">
                        <label htmlFor="throttle_lockout_time">
                          Lockout Time <br />
                          <small className="text-muted">Number of minutes to lock the user out for after specified maximum number of incorrect login attempts.</small>
                        </label>
                        <input type="text" name="throttle_lockout_time" className="form-control input-solid" defaultValue={s('throttle_lockout_time', 1)} />
                      </div>
                      <button type="submit" className="btn btn-primary">
                        Update
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div role="tabpanel" className={`tab-pane${tab === 'registration' ? ' active' : ''}`} id="registration">
            <div className="row">
              <div className="col-md-6">
                <div className="card">
                  <h6 className="card-header">General</h6>
                  <div className="card-body">
                    <form method="POST" action="/panel/settings/auth" id="registration-settings-form" onSubmit={onSubmit}>
                      <SettingSwitch className="form-group mb-4" name="reg_enabled" id="switch-reg-enabled" checked={on('reg_enabled')} label="Allow Registration" />
                      <SettingSwitch name="tos" id="switch-tos" checked={on('tos')} label="Terms & Conditions" help="The user has to confirm that he agree with terms and conditions in order to create an account." />
                      <SettingSwitch name="reg_email_confirmation" id="switch-reg-email-confirm" checked={on('reg_email_confirmation')} label="Email Confirmation" help="Require email confirmation from your newly registered users." helpClass="text-muted" />
                      <button type="submit" className="btn btn-primary mt-3">
                        Update
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title mb-1">Google reCAPTCHA</h5>
                    <small className="text-muted d-block mb-4">Enable/Disable Google reCAPTCHA during the registration.</small>
                    {!data.captcha_configured ? (
                      <div className="alert alert-info">
                        To utilize Google reCAPTCHA, please get your <code>Site Key</code> and <code>Secret Key</code> from{' '}
                        <a href="https://www.google.com/recaptcha/intro/index.html" target="_blank" rel="noreferrer">
                          <strong>reCAPTCHA Website</strong>
                        </a>
                        , and update your <code>RECAPTCHA_SITEKEY</code> and <code>RECAPTCHA_SECRETKEY</code> environment variables inside <code>.env</code> file.
                      </div>
                    ) : (
                      <Toggle
                        id="captcha-settings-form"
                        enabled={on('registration.captcha.enabled')}
                        onEnable={() => save({ 'registration.captcha.enabled': true }, 'reCAPTCHA enabled successfully.')}
                        onDisable={() => save({ 'registration.captcha.enabled': false }, 'reCAPTCHA disabled successfully.')}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PanelPage>
  );
}
