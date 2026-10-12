// Local visual QA only. Uses the real receiver with no email/security bindings;
// it cannot send email, and is excluded from public assets with all tests.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { gzipSync } = require('node:zlib');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:9123');
    // Isolated reflow fixture for UI providers that cannot resize their tab.
    // A real 320/640 CSS-pixel frame exercises the page's media queries.
    if (url.pathname === '/qa/reflow' && req.method === 'GET') {
      const width = url.searchParams.get('width') === '640' ? 640 : 320;
      const routes = ['/', '/services/general-virtual-assistance/', '/services/social-media-management/', '/services/social-media-graphics/', '/work/the-giving-table/'];
      const route = routes.includes(url.searchParams.get('page')) ? url.searchParams.get('page') : '/';
      const chapter = ['services', 'proof', 'work-creative', 'work-reporting', 'work-websites', 'team', 'contact'].includes(url.searchParams.get('chapter')) ? url.searchParams.get('chapter') : 'services';
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      return res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Local reflow check — ${width}px</title><style>body{margin:16px;background:#333;color:white;font:16px sans-serif}iframe{display:block;border:1px solid white;width:${width}px;height:640px}</style><p>Local reflow fixture: ${width} CSS pixels. Sending disabled.</p><iframe title="ARSC reflow preview" src="${route}?qa-reflow=1#${chapter}"></iframe></html>`);
    }
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
    let bytes = await fs.readFile(file);
    // Compare with the committed baseline in the same browser/server. Only
    // these marketing files vary; APIs always stay disabled for local QA.
    const baseline = url.searchParams.has('qa-baseline') || new URL(req.headers.referer || url, url).searchParams.has('qa-baseline');
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    if (baseline && ['index.html', 'script.js', 'page-film.js', 'showcase.js', 'cinematic.js', 'cinematic.css', 'styles.css', 'experience.css', 'showcase.css'].includes(relative)) {
      bytes = execFileSync('git', ['show', `HEAD:${relative}`], { cwd: root });
    }
    // Opt-in local diagnostics only; never included in deployed HTML.
    if (file === path.join(root, 'index.html') && url.searchParams.has('qa-performance')) {
      const diagnostics = await fs.readFile(path.join(__dirname, 'performance-probe.js'), 'utf8');
      bytes = Buffer.from(bytes.toString().replace('<head>', `<head><script>${diagnostics}</script>`));
    }
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Vary': 'Accept-Encoding' };
    // Match production's compressed text delivery for controlled load audits.
    if (/\bgzip\b/.test(req.headers['accept-encoding'] || '') && /\.(?:html|js|css|svg|xml|txt|json)$/.test(file)) {
      bytes = gzipSync(bytes);
      headers['Content-Encoding'] = 'gzip';
    }
    res.writeHead(200, headers);
    res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(9123, '127.0.0.1', () => console.log('Local enquiry preview: http://127.0.0.1:9123/?enquiry=cloudflare#contact — sending disabled'));
