// Mail delivery. MAIL_TRANSPORT=smtp uses the same SMTP settings as Laravel;
// MAIL_TRANSPORT=json (default, and forced in tests) never delivers anything —
// messages are kept in memory so tests can assert on them.
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

let transport;
const outbox = [];

function getTransport() {
  if (transport) return transport;
  if (env.MAIL_TRANSPORT === 'smtp') {
    transport = nodemailer.createTransport({
      host: env.MAIL_HOST,
      port: env.MAIL_PORT,
      secure: env.MAIL_ENCRYPTION === 'ssl',
      requireTLS: env.MAIL_ENCRYPTION === 'tls',
      auth: env.MAIL_USERNAME ? { user: env.MAIL_USERNAME, pass: env.MAIL_PASSWORD } : undefined,
    });
  } else {
    transport = nodemailer.createTransport({ jsonTransport: true });
  }
  return transport;
}

/**
 * Laravel Mail::to()->cc()->bcc()->send(new Mailable). Sent synchronously,
 * like the original (QUEUE_DRIVER=sync); a transport failure throws so the
 * caller reports it exactly where Laravel's exception would surface.
 * @param {{ to: string|string[], cc?: string|string[], bcc?: string|string[], subject: string, html: string, text?: string, mailable: string }} message
 */
export async function sendMail({ mailable, ...message }) {
  const from = env.MAIL_FROM_ADDRESS ? { name: env.MAIL_FROM_NAME || 'NEAT', address: env.MAIL_FROM_ADDRESS } : undefined;
  const info = await getTransport().sendMail({ from, ...message });
  if (env.MAIL_TRANSPORT !== 'smtp') {
    outbox.push({ mailable, ...message });
    if (outbox.length > 1000) outbox.splice(0, outbox.length - 1000);
    logger.debug({ mailable, to: message.to }, 'mail captured (json transport)');
  }
  return info;
}

/** Test helpers. */
export const capturedMail = () => [...outbox];
export const clearCapturedMail = () => outbox.splice(0, outbox.length);
