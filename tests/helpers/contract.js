import request from 'supertest';
import { createApp } from '../../src/app.js';

let app;
export const nodeApp = () => (app ??= createApp({ rateLimit: 100_000 }));

export async function callNode(method, path, { query, body, headers = {} } = {}) {
  const url = query ? `${path}?${new URLSearchParams(query)}` : path;
  let call = request(nodeApp())[method.toLowerCase()](url).set('Accept', 'application/json');
  for (const [key, value] of Object.entries(headers)) call = call.set(key, value);
  if (body) call = call.send(body);
  const response = await call;
  let data = response.text;
  try { data = JSON.parse(response.text); } catch { /* Non-JSON responses are part of the API contract. */ }
  return { status: response.status, contentType: response.headers['content-type'], body: data };
}
