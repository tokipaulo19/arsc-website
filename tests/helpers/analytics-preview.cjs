// Local-only QA. Ephemeral signed identity and SQLite. No cloud or email bindings.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const analyticsDb = require('./analytics-db.cjs');
const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
(async () => {
  const { generateKeyPair, SignJWT } = await import('jose');
  const { handleAnalyticsPrivate } = await import('../../lib/analytics.js');
  const db = analyticsDb(), { publicKey, privateKey } = await generateKeyPair('RS256');
  const token = await new SignJWT({ email: 'local-owner@example.com' }).setProtectedHeader({ alg: 'RS256' }).setIssuer('https://local-qa.cloudflareaccess.com').setAudience('local-qa').setExpirationTime('1h').sign(privateKey);
  const env = { ARSC_ANALYTICS: db, ANALYTICS_ACCESS_TEAM: 'local-qa', ANALYTICS_ACCESS_AUD: 'local-qa', ANALYTICS_OWNER_EMAIL: 'local-owner@example.com' };
  // Fictional counts exist only in this in-memory QA server, visibly labelled.
  for (let i = 0; i < 30; i++) { const date = new Date(); date.setUTCDate(date.getUTCDate() - i); db.sqlite.prepare('INSERT INTO analytics_daily VALUES (?,?,?,?)').run(date.toISOString().slice(0, 10), '/', 'page_view', 9 + (i * 7 % 38)); }
  http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1:9124');
      if (url.pathname === '/api/analytics/config') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"enabled":true}'); }
      if (url.pathname === '/api/analytics/collect') { res.writeHead(202, { 'Content-Type': 'application/json' }); return res.end('{"ok":true}'); }
      if (url.pathname === '/api/enquiry/config') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"enabled":false}'); }
      if (url.pathname === '/analytics' || url.pathname.startsWith('/analytics/')) {
        const request = new Request(url, { headers: req.headers['x-qa-unauthenticated'] ? {} : { 'cf-access-jwt-assertion': token } });
        const response = await handleAnalyticsPrivate(request, env, publicKey);
        let body = await response.text(); if (response.headers.get('content-type')?.includes('text/html')) body = body.replace('<main class="wrap">', '<main class="wrap"><p>LOCAL QA — fictional chart data; production remains unchanged.</p>');
        res.writeHead(response.status, Object.fromEntries(response.headers)); return res.end(body);
      }
      if (req.method !== 'GET' || /^\/(?:\.|src\/|lib\/|docs\/|tests\/|migrations\/|node_modules\/|api\/)/.test(url.pathname)) { res.writeHead(404); return res.end('Not found'); }
      const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Not found'); }
      const file = url.pathname.endsWith('/') ? path.join(target, 'index.html') : target;
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(await fs.readFile(file));
    } catch { res.writeHead(500); res.end('Local QA error'); }
  }).listen(9124, '127.0.0.1', () => console.log('ARSC analytics local QA http://127.0.0.1:9124/analytics/ — no live writes or emails'));
})();
