// Local visual QA only. Uses the real receiver with no email/security bindings;
// it cannot send email, and is excluded from public assets with all tests.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:9123');
    if (url.pathname === '/api/enquiry/config' || url.pathname === '/api/enquiry') {
      const api = await import('../../lib/enquiries.js');
      const request = new Request(url, { method: req.method });
      const response = url.pathname.endsWith('/config') ? api.enquiryConfig(request, {}) : await api.handleEnquiry(request, {});
      res.writeHead(response.status, Object.fromEntries(response.headers));
      return res.end(await response.text());
    }
    if (req.method !== 'GET' || /^\/(?:\.|src\/|lib\/|docs\/|tests\/|node_modules\/)/.test(url.pathname)) { res.writeHead(404); return res.end('Not found'); }
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Not found'); }
    const file = url.pathname.endsWith('/') ? path.join(target, 'index.html') : target;
    const bytes = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(9123, '127.0.0.1', () => console.log('Local enquiry preview: http://127.0.0.1:9123/?enquiry=cloudflare#contact — sending disabled'));
