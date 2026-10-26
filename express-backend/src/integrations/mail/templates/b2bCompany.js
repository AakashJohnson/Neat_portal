import { e, renderRawHtml } from '../markdownMail.js';

export function b2bCompany(c) {
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
   <div class="mailbox-read-message">

       <p>Dear Ed-Tech Company,</p>
       <p>NEAT Enquiry No.<b> :${e(c.enquiry_no)} </b></p>
       <p>Product Name<b> :${e(c.product_name)} </b></p>
       <p>College Name<b> :${e(c.college_name)} </b></p>
       <p>College Email<b> :${e(c.college_email)} </b></p>
       <p>College Representative Name<b> :${e(c.college_representative_name)} </b></p>
       <p>Designation<b> :${e(c.designation)} </b></p>
       <p>Mobile<b> :${e(c.mobile_number)} </b></p>
       <p>Number of Seats<b> :${e(c.no_of_seats)} </b></p>
       <p>Description<b> :${e(c.message)} </b></p>

       <b>Regards,<br />
       NEAT TEAM</b><br />
   </div>
</body>

</html>`;
  // Str::title(Str::snake('B2BCompany', ' ')) === 'B2 B Company'
  return { subject: 'B2 B Company', mailable: 'B2BCompany', ...renderRawHtml(html) };
}
