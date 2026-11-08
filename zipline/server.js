// Front proxy for Zipline (Zipline itself listens on 127.0.0.1:3001).
//
// - Big videos get a link card (thumbnail + title, no og:video) on /view/
//   until Discord has cached them, so a Discord post never ends up empty.
// - After each upload (Zipline HTTP webhook -> 127.0.0.1:3999):
//     1. the raw file is fetched once through Cloudflare (cache warm-up),
//     2. optionally ("pre-warm"), the link is posted to a private Discord
//        channel with a webhook, we wait until Discord embeds the video,
//        then the message is deleted and the file is marked "ready", so the
//        /view/ page switches from card to the real video embed.
// - Without a pre-warm webhook big videos simply stay link cards.
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

const UPSTREAM = { host: '127.0.0.1', port: 3001 };
const DOMAIN = process.env.ZP_DOMAIN || '';
const UPLOADS = process.env.ZP_UPLOADS || '/media/zipline/uploads';
const CARD_MB = Number(process.env.ZP_CARD_MB || 35);
const CF_WARMUP = process.env.ZP_CF_WARMUP === 'true';
const PREWARM_WEBHOOK = process.env.ZP_PREWARM_WEBHOOK || '';
const STATE_FILE = '/data/prewarmed.json';
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

const log = (m) => console.log(`[Zipline] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- state: which big videos Discord already has ----------
let ready = new Set();
try { ready = new Set(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))); } catch {}
const saveReady = () => {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify([...ready])); } catch (e) { log(`state mentés hiba: ${e.message}`); }
};

function fileInfo(name) {
  if (!VIDEO_EXT.test(name) || name.includes('/') || name.startsWith('.')) return null;
  try {
    const st = fs.statSync(path.join(UPLOADS, name));
    return { size: st.size, big: st.size > CARD_MB * 1048576 };
  } catch { return null; }
}

// ---------- HTML rewrite: video embed -> link card ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toCard(html, name, size) {
  const mb = (size / 1048576).toFixed(0);
  let out = html
    .replace(/<meta property="og:video[^>]*>\s*/g, '')
    .replace(/<meta property="og:type" content="video\.other" \/>/, '<meta property="og:type" content="website" />');
  const extra = [];
  if (!/property="og:title"/.test(out)) extra.push(`<meta property="og:title" content="${esc(name)}" />`);
  if (!/property="og:description"/.test(out)) extra.push(`<meta property="og:description" content="Videó · ${mb} MB · kattints a lejátszáshoz" />`);
  if (!/twitter:card/.test(out)) extra.push('<meta name="twitter:card" content="summary_large_image" />');
  return out.replace('</head>', `${extra.join('\n')}\n</head>`);
}

// ---------- reverse proxy ----------
function forwardHeaders(req) {
  const h = { ...req.headers };
  const ip = req.socket.remoteAddress?.replace(/^::ffff:/, '') || '';
  h['x-forwarded-for'] = h['x-forwarded-for'] ? `${h['x-forwarded-for']}, ${ip}` : ip;
  return h;
}

function proxy(req, res) {
  const up = http.request({ ...UPSTREAM, method: req.method, path: req.url, headers: forwardHeaders(req) }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Zipline nem elérhető'); });
  req.pipe(up);
}

function proxyView(req, res, name, info, prewarm) {
  const headers = forwardHeaders(req);
  delete headers['accept-encoding']; // plain HTML so it can be rewritten
  const up = http.request({ ...UPSTREAM, method: 'GET', path: `/view/${encodeURIComponent(name)}`, headers }, (r) => {
    const chunks = [];
    r.on('data', (c) => chunks.push(c));
    r.on('end', () => {
      let body = Buffer.concat(chunks).toString('utf8');
      const isHtml = (r.headers['content-type'] || '').includes('text/html');
      if (r.statusCode === 200 && isHtml && info.big && !prewarm && !ready.has(name)) body = toCard(body, name, info.size);
      const h = { ...r.headers };
      delete h['content-length'];
      delete h['content-encoding'];
      // The card/video choice changes over time: never cache the page.
      h['cache-control'] = 'no-store';
      h['cdn-cache-control'] = 'no-store';
      res.writeHead(r.statusCode, h);
      res.end(body);
    });
  });
  up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Zipline nem elérhető'); });
  up.end();
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const m = u.pathname.match(/^\/(u|view)\/([^/]+)$/);
  if (req.method === 'GET' && m) {
    const name = decodeURIComponent(m[2]);
    const info = fileInfo(name);
    if (info && m[1] === 'u') {
      res.writeHead(302, { Location: `/view/${encodeURIComponent(name)}${u.search}`, 'Cache-Control': 'no-store' });
      return res.end();
    }
    if (info) {
      // ?zpw=1 is used only by the Discord pre-warm post: always the full video embed.
      const prewarm = u.searchParams.has('zpw');
      return proxyView(req, res, name, info, prewarm);
    }
  }
  proxy(req, res);
});

server.on('upgrade', (req, socket, head) => {
  const up = net.connect(UPSTREAM.port, UPSTREAM.host, () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (const [k, v] of Object.entries(forwardHeaders(req))) lines.push(`${k}: ${v}`);
    up.write(lines.join('\r\n') + '\r\n\r\n');
    if (head?.length) up.write(head);
    socket.pipe(up).pipe(socket);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(3000, '0.0.0.0', () => log(`proxy fut: kártya ${CARD_MB} MB felett, előmelegítés: ${PREWARM_WEBHOOK ? 'BE' : 'KI (csak kártya)'}`));

// ---------- upload hook: Cloudflare warm-up + Discord pre-warm ----------
async function cfWarm(name) {
  const t0 = Date.now();
  try {
    const r = await fetch(`https://${DOMAIN}/raw/${encodeURIComponent(name)}`, { headers: { 'User-Agent': 'zipline-warmup' } });
    let bytes = 0;
    for await (const c of r.body) bytes += c.length;
    log(`cf warm-up ${name}: ${r.status} cf=${r.headers.get('cf-cache-status')} ${(bytes / 1048576).toFixed(1)} MB ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } catch (e) { log(`cf warm-up ${name}: HIBA ${e.message}`); }
}

async function discordPrewarm(name) {
  const hook = PREWARM_WEBHOOK.replace(/\/+$/, '');
  const link = `https://${DOMAIN}/u/${encodeURIComponent(name)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let id;
    try {
      const r = await fetch(`${hook}?wait=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `${link}?zpw=${attempt}`, allowed_mentions: { parse: [] } }),
      });
      id = (await r.json()).id;
    } catch (e) { log(`előmelegítés ${name}: webhook hiba ${e.message}`); return; }
    if (!id) { log(`előmelegítés ${name}: a webhook nem adott üzenet-azonosítót`); return; }

    let ok = false;
    for (let i = 0; i < 18 && !ok; i++) { // up to ~90 s
      await sleep(5000);
      try {
        const msg = await (await fetch(`${hook}/messages/${id}`)).json();
        ok = (msg.embeds || []).some((e) => e.video);
      } catch {}
    }
    try { await fetch(`${hook}/messages/${id}`, { method: 'DELETE' }); } catch {}
    if (ok) {
      ready.add(name);
      saveReady();
      log(`előmelegítés ${name}: KÉSZ (${attempt}. próba) – mostantól videóként ágyazódik be`);
      return;
    }
    log(`előmelegítés ${name}: ${attempt}. próba nem sikerült`);
    await sleep(20000);
  }
  log(`előmelegítés ${name}: feladva, kártya marad`);
}

function namesFrom(obj, out = new Set()) {
  if (typeof obj === 'string') {
    const re = /https?:\/\/[^/"\s]+\/(?:u|raw|view)\/([^"?\s]+)/g;
    let m;
    while ((m = re.exec(obj))) out.add(decodeURIComponent(m[1]));
  } else if (obj && typeof obj === 'object') {
    if (typeof obj.name === 'string' && obj.size !== undefined) out.add(obj.name);
    for (const v of Object.values(obj)) namesFrom(v, out);
  }
  return out;
}

const queue = [];
let busy = false;
async function runQueue() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const name = queue.shift();
    const info = fileInfo(name);
    if (!info || !info.big || !PREWARM_WEBHOOK || !DOMAIN) continue;
    await discordPrewarm(name);
  }
  busy = false;
}

http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { if (body.length < 1e6) body += c; });
    req.on('end', async () => {
      res.end('ok');
      let data;
      try { data = JSON.parse(body); } catch { data = body; }
      const names = [...namesFrom(data)].filter((n) => !n.startsWith('.'));
      await sleep(1500);
      for (const n of names) {
        if (CF_WARMUP && DOMAIN) await cfWarm(n);
        queue.push(n);
      }
      runQueue();
    });
  })
  .listen(3999, '127.0.0.1');
