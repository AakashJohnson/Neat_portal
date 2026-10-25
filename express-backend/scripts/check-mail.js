import { verifySmtp } from '../src/integrations/mail/mailer.js';
import { env } from '../src/config/env.js';

try {
  await verifySmtp();
  console.log(`SMTP connection, TLS and authentication passed. Active mail transport: ${env.MAIL_TRANSPORT}.`);
} catch (err) {
  console.error('SMTP verification failed.', { code: err.code, responseCode: err.responseCode });
  process.exitCode = 1;
}
