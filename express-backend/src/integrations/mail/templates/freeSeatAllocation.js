import { button, e, renderRawHtml } from '../markdownMail.js';

export function freeSeatAllocation(student, allocation, courseName) {
  const portal = (process.env.FRONTEND_URL || 'https://neat.aicte-india.org').replace(/\/$/, '');
  const query = new URLSearchParams({
    neat_secret_code: allocation.neat_secret_code,
    student_id: student.application_number,
    product_id: allocation.course_id,
    student_email: student.email,
  });
  return {
    subject: 'NEAT Free Seat Allocation',
    mailable: 'FreeSeatAllocation',
    ...renderRawHtml(`<p>Dear ${e(student.name)},</p>
<p>You have been allocated a free seat for <b>${e(courseName)}</b> through ${e(student.institute_name)}.</p>
<p>Sign in to NEAT to verify and claim your allocated course.</p>
${button(`${portal}/free-seat-allocation?${query}`, 'Claim your free course')}
<p>Regards,<br>NEAT Team</p>`),
  };
}
