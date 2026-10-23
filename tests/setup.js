import 'dotenv/config';

// Tests must never run against anything but the isolated test copy.
if (process.env.DB_DATABASE !== 'neat_portal_test') {
  throw new Error(`Refusing to run tests against database "${process.env.DB_DATABASE}". Use neat_portal_test.`);
}
process.env.NODE_ENV = 'test';
process.env.MAIL_TRANSPORT = 'json';
