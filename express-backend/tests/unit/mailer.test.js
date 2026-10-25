import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transport = { verify: vi.fn(), close: vi.fn(), sendMail: vi.fn() };
  return { transport, createTransport: vi.fn(() => transport), env: {} };
});
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock('../../src/config/env.js', () => ({ env: mocks.env }));
import { verifySmtp, sendMail, capturedMail } from '../../src/integrations/mail/mailer.js';

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.env, {
    NODE_ENV: 'test', MAIL_HOST: 'smtp.sendgrid.net', MAIL_PORT: 587, MAIL_ENCRYPTION: 'tls',
    MAIL_USERNAME: 'old-sendgrid-username', MAIL_PASSWORD: 'fixture-api-key', MAIL_TRANSPORT: 'smtp',
  });
  mocks.transport.verify.mockResolvedValue(true);
});

describe('SMTP configuration', () => {
  it('uses SendGrid literal username and the configured API key over TLS', async () => {
    await verifySmtp();
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      auth: { user: 'apikey', pass: 'fixture-api-key' }, secure: false, requireTLS: true,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    }));
    expect(mocks.transport.close).toHaveBeenCalledOnce();
  });

  it('preserves usernames for other SMTP providers', async () => {
    mocks.env.MAIL_HOST = 'smtp.example.invalid';
    await verifySmtp();
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ auth: { user: 'old-sendgrid-username', pass: 'fixture-api-key' } }));
  });

  it('propagates authentication failures and closes the connection', async () => {
    const error = Object.assign(new Error('SMTP rejected the test credentials'), { code: 'EAUTH' });
    mocks.transport.verify.mockRejectedValueOnce(error);
    await expect(verifySmtp()).rejects.toBe(error);
    expect(mocks.transport.close).toHaveBeenCalledOnce();
  });

  it('never creates an SMTP transport when mail is captured for tests', async () => {
    mocks.env.MAIL_TRANSPORT = 'json';
    mocks.transport.sendMail.mockResolvedValue({});
    await sendMail({ to: 'fixture@example.invalid', mailable: 'Test', subject: 'Test', text: 'Captured only' });
    expect(mocks.createTransport).toHaveBeenCalledWith({ jsonTransport: true });
    expect(capturedMail().at(-1).to).toBe('fixture@example.invalid');
  });
});
