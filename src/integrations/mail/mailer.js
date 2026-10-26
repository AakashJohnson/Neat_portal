import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

let transport;
const outbox = [];

function smtpTransport() {
  const sendgrid = env.MAIL_HOST?.toLowerCase() === 'smtp.sendgrid.net';
  if (sendgrid && env.MAIL_USERNAME !== 'apikey') {
    logger.warn('SendGrid SMTP requires the literal username apikey; using it with the configured API key');
  }
  return nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_ENCRYPTION === 'ssl',
    requireTLS: env.MAIL_ENCRYPTION === 'tls',
    auth: env.MAIL_USERNAME || sendgrid ? { user: sendgrid ? 'apikey' : env.MAIL_USERNAME, pass: env.MAIL_PASSWORD } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function verifySmtp() {
  const smtp = smtpTransport();
  try { await smtp.verify(); } finally { smtp.close(); }
}

function getTransport() {
  if (transport) return transport;
  if (env.MAIL_TRANSPORT === 'smtp') {
    transport = smtpTransport();
  } else {
    transport = nodemailer.createTransport({ jsonTransport: true });
  }
  return transport;
}

/**
 * Send or capture mail. Transport failures propagate to the caller.
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
