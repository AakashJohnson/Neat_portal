// Latency of read endpoints, Laravel (reference) vs Express, same machine and
// same database (neat_portal_test). Sequential requests after a warm-up; reports
// median / p95 / max in ms. Read-only endpoints only.
//   node tests/perf/latency.mjs [runs=30]
import 'dotenv/config';

if (process.env.DB_DATABASE !== 'neat_portal_test') throw new Error('refusing: test database only');
const RUNS = Number(process.argv[2] ?? 30);
const TARGETS = { laravel: process.env.LARAVEL_REFERENCE_URL ?? 'http://127.0.0.1:8001', express: process.env.NODE_URL ?? 'http://localhost:4000' };

async function login(base) {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: 'neatadmin@aicte-india.org', password: process.env.FIXTURE_PASSWORD }) });
  return (await r.json()).token;
}

const CASES = [
  ['GET', '/api/getProductsLandingPage'],
  ['GET', '/api/getB2CBucketWiseProducts?bucket=All'],
  ['GET', '/api/getHomePageCounter'],
  ['GET', '/api/getStates'],
  ['GET', '/api/getAnnouncements'],
  ['GET', '/api/getAdminCounts', true],
  ['GET', '/api/getAdminStudents?page=1&per_page=10', true],
  ['GET', '/api/getAdminProducts', true],
  ['GET', '/api/users?per_page=20', true],
];

const pct = (xs, p) => xs[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
const out = [];
for (const [name, base] of Object.entries(TARGETS)) {
  const token = await login(base);
  for (const [method, p, auth] of CASES) {
    const url = new URL(base + p);
    if (auth) url.searchParams.set('token', token);
    const once = async () => {
      const t = performance.now();
      const r = await fetch(url, { method, headers: { Accept: 'application/json' } });
      await r.arrayBuffer();
      return [performance.now() - t, r.status];
    };
    for (let i = 0; i < 3; i++) await once(); // warm-up
    const times = [];
    let status;
    for (let i = 0; i < RUNS; i++) {
      const [ms, s] = await once();
      times.push(ms);
      status = s;
    }
    times.sort((a, b) => a - b);
    out.push({ backend: name, endpoint: p.replace(/\?.*/, ''), status, median: +pct(times, 50).toFixed(1), p95: +pct(times, 95).toFixed(1), max: +times.at(-1).toFixed(1) });
  }
}
console.table(out);
console.log(JSON.stringify(out));
