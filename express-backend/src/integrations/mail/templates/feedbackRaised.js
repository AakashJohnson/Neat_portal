// Port of app/Mail/FeedbackRaised.php + resources/views/mail/feedback-raised.blade.php
import { e, renderMessage, table } from '../markdownMail.js';

/** @param {{ name, email, experience, feedback }} content */
export function feedbackRaised(content, { appUrl }) {
  const body = `Hi ${e(content.name)}, <br><br>
Feedback raised successfully.

<br>

${table(`|               |                                   |
|:------------- |----------------------------------:|
| Name          | ${e(content.name)}            |
| Email         | ${e(content.email)}           |
| experience    | ${e(content.experience)}      |`)}

# Feedback : <br>
${e(content.feedback)}
<br><br>

Thanks,<br>
NEAT`;
  // Mailable without ->subject(): Laravel derives "Feedback Raised" from the class name.
  return { subject: 'Feedback Raised', mailable: 'FeedbackRaised', ...renderMessage(body, { appUrl }) };
}
