// Tiny receiver for Zipline's HTTP_WEBHOOK_ON_UPLOAD: after each upload it
// fetches the file once through the public domain, so Cloudflare (Tiered Cache)
// already has it when Discord asks for it. Listens on 127.0.0.1 only.
const http = require('node:http');

const DOMAIN = process.env.WARMUP_DOMAIN;
const log = (m) => console.log(`[Zipline] warm-up ${m}`);

function findNames(obj, out = new Set()) {
  if (typeof obj === 'string') {
    const re = new RegExp(`https?://[^/"\\s]+/(?:u|raw|view)/([^"?\\s]+)`, 'g');
    let m;
    while ((m = re.exec(obj))) out.add(decodeURIComponent(m[1]));
  } else if (obj && typeof obj === 'object') {
    if (typeof obj.name === 'string' && /\.[a-z0-9]{2,5}$/i.test(obj.name) && obj.size !== undefined) out.add(obj.name);
    for (const v of Object.values(obj)) findNames(v, out);
  }
  return out;
}

async function warm(name) {
  const url = `https://${DOMAIN}/raw/${encodeURIComponent(name)}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'zipline-warmup' } });
    let bytes = 0;
    for await (const chunk of res.body) bytes += chunk.length;
    log(`${name}: ${res.status} cf=${res.headers.get('cf-cache-status')} ${(bytes / 1048576).toFixed(1)} MB ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    log(`${name}: HIBA ${e.message}`);
  }
}

http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { if (body.length < 1e6) body += c; });
    req.on('end', () => {
      res.end('ok');
      let data;
      try { data = JSON.parse(body); } catch { data = body; }
      const names = [...findNames(data)];
      if (!names.length) {
        log(`nem találtam fájlnevet (kulcsok: ${data && typeof data === 'object' ? Object.keys(data).join(',') : typeof data})`);
        return;
      }
      // Small delay so the upload is fully committed before the public fetch.
      setTimeout(() => names.forEach(warm), 1500);
    });
  })
  .listen(3999, '127.0.0.1', () => log(`fogadó fut (https://${DOMAIN}/raw/<fájl>)`));
