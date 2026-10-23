// Laravel `throttle:60,1` behaviour of the api middleware group.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('API throttle', () => {
  it('sends X-RateLimit headers and answers 429 {"message":"Too Many Attempts."} past the limit', async () => {
    const app = createApp({ rateLimit: 3 });
    const remaining = [];
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/api/getAnnouncements');
      expect(res.headers['x-ratelimit-limit']).toBe('3');
      remaining.push(res.headers['x-ratelimit-remaining']);
    }
    expect(remaining).toEqual(['2', '1', '0']);

    const blocked = await request(app).get('/api/getAnnouncements');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ message: 'Too Many Attempts.' });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('defaults to 60 requests per minute like Laravel', async () => {
    const res = await request(createApp()).get('/api/getAnnouncements');
    expect(res.headers['x-ratelimit-limit']).toBe('60');
    expect(res.headers['x-ratelimit-remaining']).toBe('59');
  });
});
