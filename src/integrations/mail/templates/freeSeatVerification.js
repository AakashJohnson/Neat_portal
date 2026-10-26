import { e, renderRawHtml } from '../markdownMail.js';

export function freeSeatVerification(content, { year = new Date().getUTCFullYear() } = {}) {
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

            <b>Free Seat Verification Email</b><br>
            Hi,
            Please Enter the below code on the NEAT portal to avail your free seat<br>
            <div>
                ${e(content.company_secret_code)}
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
  return { subject: 'Free Seat Verification', mailable: 'FreeSeatVerification', ...renderRawHtml(html) };
}
