// Serves the UNMODIFIED Angular dev server (:4200) on :4201 with its hard-coded
// API origin (app.component.ts `baseUrl = 'http://localhost:8000/api'`)
// rewritten to the Express backend. Used for:
//   - B11: the original Angular app running against Express (backend parity);
//   - visual parity: Angular and Next.js reading the same database.
// Nothing in frontend/ is changed; the rewrite happens on the HTTP response.
//   node tests/parity/angular-on-express-proxy.mjs [listenPort=4201] [api=http://localhost:4000]
import http from 'node:http';

const PORT = Number(process.argv[2] ?? 4201);
const API = process.argv[3] ?? 'http://localhost:4000';
const UPSTREAM = { host: '127.0.0.1', port: 4200 };
const FROM = 'http://localhost:8000';

http
  .createServer((req, res) => {
    const headers = { ...req.headers, host: `localhost:${UPSTREAM.port}`, 'accept-encoding': 'identity' };
    const up = http.request({ ...UPSTREAM, path: req.url, method: req.method, headers }, (upRes) => {
      const type = upRes.headers['content-type'] ?? '';
      if (!/javascript|html/.test(type)) {
        res.writeHead(upRes.statusCode, upRes.headers);
        upRes.pipe(res);
        return;
      }
      const chunks = [];
      upRes.on('data', (c) => chunks.push(c));
      upRes.on('end', () => {
        const body = Buffer.from(Buffer.concat(chunks).toString('utf8').split(FROM).join(API), 'utf8');
        const out = { ...upRes.headers, 'content-length': body.length };
        delete out['transfer-encoding'];
        delete out.etag;
        res.writeHead(upRes.statusCode, out);
        res.end(body);
      });
    });
    up.on('error', (e) => {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end(`upstream error: ${e.code}`);
    });
    req.pipe(up);
  })
  .listen(PORT, () => console.log(`Angular (:${UPSTREAM.port}) on :${PORT} with ${FROM} → ${API}`));
