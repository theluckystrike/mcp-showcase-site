// Pages Function (s1102m): proxy GET /badge/* on www.mcpstamp.com to the mcpstamp-check worker at
// https://mcp.zovo.one/stamp/badge/*. Status, content-type and cache-control pass through.
// The client IP goes out as x-mcpstamp-client-ip (and X-Forwarded-For) so the engine rate-limits the real visitor.
// The engine trusts x-mcpstamp-client-ip only with x-mcpstamp-proxy-key = env.PROXY_KEY (Pages secret, never in git).
// Without PROXY_KEY the request is still proxied, but all visitors share the proxy's rate-limit bucket.
// The same file shape is used for functions/api and functions/badge; keep them in sync.
// s1114 exception: /badge/ with no query (the publisher landing page) and /badge/<slug>.svg (static per-report badges
// built from src/pages/badge/) are served from the static build via next(). Everything else is still proxied,
// so live embeds of /badge?url=<server> keep working.
const STATIC_SVG = /^[a-z0-9][a-z0-9-]{0,160}\.svg$/;
const ORIGIN = 'https://mcp.zovo.one/stamp/badge';
const PASS = ['content-type', 'cache-control', 'retry-after', 'etag', 'last-modified', 'expires', 'vary'];
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, HEAD, OPTIONS', 'access-control-max-age': '86400' };

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export async function onRequest({ request, params, env, next }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'GET' && request.method !== 'HEAD') return json(405, { error: 'method_not_allowed' });
  const segs = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  if (segs.length === 0 && !new URL(request.url).search) return next();
  if (segs.length === 1 && STATIC_SVG.test(segs[0])) {
    const res = await next();
    if (res.status !== 200) return res;
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS)) h.set(k, v);
    h.set('content-type', 'image/svg+xml; charset=utf-8');
    h.set('cache-control', 'public, max-age=86400');
    return new Response(request.method === 'HEAD' ? null : res.body, { status: 200, headers: h });
  }
  const tail = segs.map(encodeURIComponent).join('/');
  const target = ORIGIN + (tail ? '/' + tail : '') + new URL(request.url).search;
  const headers = new Headers({ accept: request.headers.get('accept') || '*/*', 'user-agent': 'mcpstamp-pages-proxy/1' });
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) headers.set('x-forwarded-for', ip);
  if (env && env.PROXY_KEY) {
    headers.set('x-mcpstamp-proxy-key', env.PROXY_KEY);
    if (ip) headers.set('x-mcpstamp-client-ip', ip);
  }
  let res;
  try {
    res = await fetch(target, { method: request.method, headers, redirect: 'manual' });
  } catch (e) {
    return json(502, { error: 'unreachable', detail: 'The check service did not answer. Try again in a minute.' });
  }
  const out = new Headers(CORS);
  for (const h of PASS) { const v = res.headers.get(h); if (v) out.set(h, v); }
  const loc = res.headers.get('location');
  if (loc) out.set('location', loc.replace(/^https:\/\/mcp\.zovo\.one\/stamp\//, '/'));
  return new Response(request.method === 'HEAD' ? null : res.body, { status: res.status, headers: out });
}
