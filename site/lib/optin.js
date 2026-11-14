// s1103 optin: shared code for the double opt-in update list (functions/updates/{subscribe,confirm,unsubscribe}.js).
//
// Flow: POST /updates/subscribe -> confirmation email via Resend (signed link) -> GET /updates/confirm shows a button ->
// POST /updates/confirm adds the address to the Resend audience "mcpstamp-updates". Nothing is stored before that click.
// Unsubscribe: GET /updates/unsubscribe shows a button, POST removes the contact (also RFC 8058 one-click POST).
//
// Secrets (Pages project mcp-showcase-preview, set with `wrangler pages secret put`, never in git):
//   OPTIN_HMAC_SECRET   signs confirm and unsubscribe tokens
//   OPTIN_RESEND_KEY    Resend API key "mcpstamp-optin" (send email + manage this audience's contacts)
// Rate limits live in isolate memory and the Cache API (per colo). No KV or other store is written.

export const AUDIENCE_ID = '0bddb949-303b-42d6-b9bd-51f949bdc03e';
// s1114 badge watch: a separate Resend audience, so a watcher never gets the monthly update email and vice versa.
// The contact carries two contact properties (created 2026-11-14): watch = comma list of /r/ slugs, source = "badge-watch".
export const WATCH_AUDIENCE_ID = '309cd4d6-6c6d-4e40-8a71-57fcb98ff19b';
export const WATCH_SOURCE = 'badge-watch';
const WATCH_MAX = 20;
export const FROM = 'McpStamp updates <hello@zovo.one>';
export const REPLY_TO = 'support@zovo.one';
export const SITE = 'https://www.mcpstamp.com';
const CONFIRM_TTL_S = 3 * 24 * 3600;
const LIMITS = { ip: { max: 5, windowS: 600 }, email: { max: 2, windowS: 3600 } };
const ALLOWED_HOSTS = /^(www\.)?mcpstamp\.com$|^([a-z0-9-]+\.)?mcp-showcase-preview\.pages\.dev$/;

const enc = new TextEncoder();
const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Token = base64url(JSON payload) + "." + base64url(HMAC-SHA256). a: "c" confirm (expires) or "u" unsubscribe (no expiry). */
export async function signToken(secret, payload) {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return body + '.' + b64u(sig);
}

export async function verifyToken(secret, token, action) {
  if (typeof token !== 'string' || token.length > 2000) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  let ok = false;
  try { ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64u(sig), enc.encode(body)); } catch { return null; }
  if (!ok) return null;
  let p;
  try { p = JSON.parse(new TextDecoder().decode(unb64u(body))); } catch { return null; }
  if (!p || p.a !== action || !isEmail(p.e)) return null;
  if (action === 'c' && !(typeof p.i === 'number' && Date.now() / 1000 - p.i <= CONFIRM_TTL_S && p.i <= Date.now() / 1000 + 300)) return null;
  return p;
}

export function normEmail(v) {
  return String(v ?? '').trim().toLowerCase();
}

export function isEmail(e) {
  if (typeof e !== 'string' || e.length < 6 || e.length > 254) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(e)) return false;
  const [local, domain] = e.split('@');
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  const tld = domain.split('.').pop();
  return /^[a-z]{2,24}$|^xn--[a-z0-9-]{1,59}$/.test(tld);
}

export function cleanSource(v) {
  const s = String(v ?? '');
  return /^\/(free-servers|can-claude)\/[a-z0-9/-]{0,120}$/.test(s) ? s : '/';
}

/** /r/ slug from a slug, a registry name or a report URL. Same rule as the /r/ search box. Empty when it cannot be one. */
export function watchSlug(v) {
  let s = String(v ?? '').trim().toLowerCase();
  const m = /\/r\/([a-z0-9-]+)\/?/.exec(s);
  if (m) s = m[1];
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return /^[a-z0-9][a-z0-9-]{0,160}$/.test(s) ? s : '';
}

/** True when /r/<slug>/ exists in this deployment (its static badge is built from the same rows). */
export async function watchSlugExists(env, request, slug) {
  try {
    const res = await env.ASSETS.fetch(new Request(new URL(`/badge/${slug}.svg`, request.url), { method: 'GET' }));
    return res.status === 200;
  } catch { return false; }
}

/** Merge one slug into the comma list kept in the contact's "watch" property. */
export function mergeWatch(prev, slug) {
  const list = String(prev ?? '').split(',').map((x) => x.trim()).filter(Boolean).filter((x) => x !== slug);
  return [...list, slug].slice(-WATCH_MAX).join(',');
}

export function originOk(request) {
  const o = request.headers.get('origin') || request.headers.get('referer');
  if (!o) return false;
  try { return ALLOWED_HOSTS.test(new URL(o).hostname); } catch { return false; }
}

// ---- rate limit: isolate memory first, then the Cache API (survives isolate restarts within one colo) ----
const mem = new Map();
async function sha(s) {
  return b64u(await crypto.subtle.digest('SHA-256', enc.encode(s))).slice(0, 32);
}
/** Returns true when this hit is over the limit. Counts every call, including invalid ones. */
export async function overLimit(kind, rawKey) {
  const { max, windowS } = LIMITS[kind];
  const key = `${kind}:${await sha(rawKey)}`;
  const now = Date.now();
  const bucket = Math.floor(now / 1000 / windowS);
  const memKey = `${key}:${bucket}`;
  let n = mem.get(memKey) || 0;
  const cacheReq = new Request(`https://optin-rl.mcpstamp.internal/${key}/${bucket}`);
  let cache = null;
  try { cache = caches.default; } catch { /* no Cache API */ }
  if (cache) {
    try {
      const hit = await cache.match(cacheReq);
      if (hit) n = Math.max(n, Number(await hit.text()) || 0);
    } catch { /* ignore */ }
  }
  n += 1;
  mem.set(memKey, n);
  if (mem.size > 5000) for (const k of mem.keys()) { if (!k.endsWith(':' + bucket)) mem.delete(k); }
  if (cache) {
    try { await cache.put(cacheReq, new Response(String(n), { headers: { 'cache-control': `max-age=${windowS}` } })); } catch { /* ignore */ }
  }
  return n > max;
}

// ---- Resend ----
export async function resend(env, method, path, body) {
  const res = await fetch('https://api.resend.com' + path, {
    method,
    headers: { authorization: 'Bearer ' + env.OPTIN_RESEND_KEY, 'content-type': 'application/json', 'user-agent': 'mcpstamp-optin/1' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, ok: res.ok, data };
}

export async function unsubscribeUrl(env, email, list) {
  const p = list === 'w' ? { a: 'u', e: email, l: 'w' } : { a: 'u', e: email };
  return `${SITE}/updates/unsubscribe?t=${await signToken(env.OPTIN_HMAC_SECRET, p)}`;
}

export function watchConfirmEmail({ confirmUrl, unsubUrl, slug }) {
  const report = `${SITE}/r/${slug}/`;
  const text = [
    'Hi,',
    '',
    'Someone, probably you, asked on www.mcpstamp.com for an email when the readiness grade of this MCP server changes.',
    report,
    '',
    'When a new McpStamp snapshot gives the server a different grade, we send one short email saying so. We use your address for nothing else.',
    '',
    'To start the watch, open this link and press the button.',
    confirmUrl,
    '',
    'The link works for 3 days. If you did not ask for this, ignore this email. You will not be added and we keep nothing.',
    '',
    'McpStamp, run by autom8 LLC. Questions: support@zovo.one',
    `Privacy: ${SITE}/privacy/#updates`,
    `Stop all watch emails: ${unsubUrl}`,
  ].join('\n');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#111;max-width:560px">
<p>Hi,</p>
<p>Someone, probably you, asked on www.mcpstamp.com for an email when the readiness grade of this MCP server changes: <a href="${esc(report)}">${esc(report)}</a></p>
<p>When a new McpStamp snapshot gives the server a different grade, we send one short email saying so. We use your address for nothing else.</p>
<p><a href="${esc(confirmUrl)}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:2px">Confirm and start the watch</a></p>
<p>The link works for 3 days. If you did not ask for this, ignore this email. You will not be added and we keep nothing.</p>
<p style="font-size:13px;color:#555">McpStamp, run by autom8 LLC. Questions: support@zovo.one. <a href="${SITE}/privacy/#updates">Privacy</a>. <a href="${esc(unsubUrl)}">Stop all watch emails</a></p>
</body></html>`;
  return { subject: `Confirm your McpStamp watch for ${slug}`, text, html };
}

export function confirmEmail({ confirmUrl, unsubUrl, source }) {
  const page = source && source !== '/' ? `www.mcpstamp.com${source}` : 'www.mcpstamp.com';
  const text = [
    'Hi,',
    '',
    `Someone, probably you, entered this address on ${page} to get the McpStamp update list.`,
    'That is about one email a month listing the free MCP servers and Can Claude answers we added since the last one.',
    '',
    'To join, open this link and press the button:',
    confirmUrl,
    '',
    'The link works for 3 days. If you did not ask for this, ignore this email. You will not be added and we keep nothing.',
    '',
    'McpStamp, run by autom8 LLC. Questions: support@zovo.one',
    `Privacy: ${SITE}/privacy/#updates`,
    `Do not want any email from this list: ${unsubUrl}`,
  ].join('\n');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#111;max-width:560px">
<p>Hi,</p>
<p>Someone, probably you, entered this address on ${esc(page)} to get the McpStamp update list. That is about one email a month listing the free MCP servers and Can Claude answers we added since the last one.</p>
<p><a href="${esc(confirmUrl)}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:2px">Confirm and join the list</a></p>
<p>The link works for 3 days. If you did not ask for this, ignore this email. You will not be added and we keep nothing.</p>
<p style="font-size:13px;color:#555">McpStamp, run by autom8 LLC. Questions: support@zovo.one. <a href="${SITE}/privacy/#updates">Privacy</a>. <a href="${esc(unsubUrl)}">Unsubscribe</a></p>
</body></html>`;
  return { subject: 'Confirm the McpStamp update list', text, html };
}

// ---- responses ----
export const wantsJson = (request) => /application\/json/i.test(request.headers.get('accept') || '') || /application\/json/i.test(request.headers.get('content-type') || '');

export function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
}

export function redirect(to) {
  return new Response(null, { status: 303, headers: { location: to, 'cache-control': 'no-store' } });
}

/** Serve a built /updates/<page>/ through ASSETS, optionally filling the hidden token and the message. */
export async function page(env, request, path, { status = 200, token, msg } = {}) {
  const res = await env.ASSETS.fetch(new Request(new URL(path, request.url), { method: 'GET' }));
  let rw = new HTMLRewriter();
  if (token) rw = rw.on('input[name="t"]', { element(el) { el.setAttribute('value', token); } });
  if (msg) rw = rw.on('[data-msg]', { element(el) { el.setInnerContent(msg); } });
  const out = rw.transform(res);
  const headers = new Headers(out.headers);
  headers.set('cache-control', 'no-store');
  headers.set('x-robots-tag', 'noindex');
  headers.set('referrer-policy', 'no-referrer');
  return new Response(out.body, { status, headers });
}

export async function readForm(request) {
  const ct = request.headers.get('content-type') || '';
  if (/application\/json/i.test(ct)) {
    try { const j = await request.json(); return j && typeof j === 'object' ? j : {}; } catch { return {}; }
  }
  if (/application\/x-www-form-urlencoded|multipart\/form-data/i.test(ct)) {
    try { return Object.fromEntries(await request.formData()); } catch { return {}; }
  }
  return {};
}
