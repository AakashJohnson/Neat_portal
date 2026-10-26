import { button, renderRawHtml } from '../markdownMail.js';
import { setting } from '../../../config/settings.js';

const portal = () => (process.env.FRONTEND_URL || 'https://neat.aicte-india.org').replace(/\/$/, '');

/** @param {{ username, email, email_verification_token }} user (fresh DB row) */
export function userRegistered(user, { year = new Date().getUTCFullYear() } = {}) {
  const url = `${portal()}/verify-email?token=${encodeURIComponent(user.email_verification_token ?? '')}&email=${encodeURIComponent(user.email ?? '')}`;
  const html = `<html>
<style>
    body {
        font-family: Arial, Helvetica, sans-serif;
    }


    .container {
        padding-top: 10px;
        text-align: center;
        background-color: #f1f1f1;
    }
</style>

<body>

    <div class="container">


        <h3 style="text-align:center">NEAT ${year}</h3>


        <div class="container" style="background-color: white;">

            <b>Verify Email</b><br>
            Hi ${user.username ?? ''},
            Click on the button below to verify your email<br>
            <div>
                ${button(url, 'Verify Email')}
            </div>
        </div>

        <div style="text-align: left;margin:3%;">
            Thanks,<br />
            Team NEAT<br />
        </div>
    </div>
    <br />
</body>

</html>`;
  return { subject: `[${setting('app_name')}] New User Registration`, mailable: 'UserRegistered', ...renderRawHtml(html) };
}

export function resetPassword(token, { year = new Date().getUTCFullYear() } = {}) {
  const html = `<html>
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
  }


  .container {
    padding-top: 10px;
    text-align: center;
    background-color: #f1f1f1;
  }

</style>
<body>

  <div class="container">


    <h3 style="text-align:center">NEAT ${year}</h3>


    <div class="container" style="background-color: white;">

      <b>Change Password Request</b><br>
      Click on the button below to reset password.
        ${button(`${portal()}/response-password-reset?token=${token}`, 'Reset Password')}
    </div>

    <div style="text-align: left;margin:3%;">
      Thanks,<br />

      Team NEAT<br />
    </div>
  </div>
</body>
</html>`;
  return { subject: `[${setting('app_name')}] Password Reset Request`, mailable: 'ResetPassword', ...renderRawHtml(html) };
}
