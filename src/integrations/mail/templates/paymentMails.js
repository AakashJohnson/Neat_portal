// Ports of app/Mail/InstitutePayment.php and app/Mail/LearnerPayment.php
// (resources/views/mail/{institute,learner}-payment.blade.php).
import { e, renderRawHtml, table } from '../markdownMail.js';

/** Indentation is part of the Blade slot, exactly as in the original view. */
export function institutePayment(c, { year = new Date().getUTCFullYear() } = {}) {
  const slot = `            |                               |                                       |
            |:------------------------------|--------------------------------------:|
            | Institution ID:               | ${e(c.application_number)}  |
            | Institution Name:             | ${e(c.name)}                |
            | Institution Address:          | ${e(c.address)}             |
            | Contact Email:                | ${e(c.email)}               |
            | Name of NEAT Nodal Officer    | ${e(c.nodal_name)}          |
            | Email of NEAT Nodal Officer:  | ${e(c.nodal_email)}         |
            | Mobile of NEAT Nodal Officer: | ${e(c.nodal_phone)}         |`;
  const html = `<html>
<h1 style="text-align: center; margin-top:15px">NEAT ${year}</h1>
<style>
    body {
        font-family: Arial, Helvetica, sans-serif;
    }


    .container {
        padding: 10px;
        background-color: #f1f1f1;
        margin: 5%;
    }
</style>

<body>

    <div class="container">

        Dear ${e(c.company_name)},
        <br><br>

        ${e(c.quantity)} seat(s) have been purchased by ${e(c.name)}
        ${e(c.address)} , ${e(c.state)} through NEAT portal.
        This is to inform you that based on your Memorandum of Understanding signed with AICTE, clause 1.7,
        this would be counted for calculating free seats due for ${e(c.code)}.

        <br>
            The details of the institution are as follows:
            <div style="margin-left:15px; margin-right:15px">
            ${table(slot)}
</div>

            ${e(c.code)} has ${e(c.total_paid_seats)} paid registrations.
            ${e(c.allocated_free_seats)} seats have been allocated so far as free seats out of total ${e(c.total_free_seats)} due till now.
        <br><br>


        Regards,<br>
        NEAT Team
        <br><br>
        <h3>DISCLAIMER</h3>
        The information transmitted by this email is intended
        only for the person to which it is addressed. This email may contain proprietary,
        business-confidential and/or privileged material.
        If you are not the intended recipient of this message, be aware that
        any use, review, retransmission, distribution, reproduction or any action
        taken in reliance upon this message is strictly prohibited.
        If you received this in error, please contact the sender and delete the material from all computers.
    </div>
</body>

</html>`;
  return { subject: 'Institute Payment', mailable: 'InstitutePayment', ...renderRawHtml(html) };
}

export function learnerPayment(c) {
  const html = `<html>
<h1 style="text-align: center; margin-top:15px">NEAT 2020</h1>
<style>
    body {
        font-family: Arial, Helvetica, sans-serif;
    }


    .container {
        background-color: #f1f1f1;
        margin: 5%;
    }
</style>

<body>


Dear ${e(c.company_name)},
<br>

One seat has been purchased by ${e(c.name)}
through NEAT portal. This is to inform you that based on your
Memorandum of Understanding signed with AICTE, clause 1.7, this would be counted for
calculating free seats due for ${e(c.code)}.
<br><br>

The details of the learner are as follows:

<br>

<div style="margin-left:15px; margin-right:15px">
${table(`|                   |                                       |
|:----------------- |--------------------------------------:|
| Learner ID:       | ${e(c.application_number)}  |
| Learner Name:     | ${e(c.name)}                |
| Learner Email:    | ${e(c.email)}               |
| Learner Phone:    | ${e(c.phone)}               |`)}
</div>
<br><br>

${e(c.code)} has ${e(c.total_paid_seats)} paid seats sold.

Regards,<br>
Neat Team
<br><br>

<h3>DISCLAIMER</h3>
The information transmitted by this email is intended
only for the person to which it is addressed. This email may contain proprietary,
business-confidential and/or privileged material.
If you are not the intended recipient of this message, be aware that
any use, review, retransmission, distribution, reproduction or any action
taken in reliance upon this message is strictly prohibited.
If you received this in error, please contact the sender and delete the material from all computers.

</body>
</html>`;
  return { subject: 'Learner Payment', mailable: 'LearnerPayment', ...renderRawHtml(html) };
}
