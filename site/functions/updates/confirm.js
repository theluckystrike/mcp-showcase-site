// s1103 optin: GET /updates/confirm?t= shows a button (mail scanners that open links do not subscribe anyone);
// POST /updates/confirm adds the address to the Resend audience. This is the only place an address is stored.
import { verifyToken, resend, json, redirect, page, readForm, wantsJson, AUDIENCE_ID, WATCH_AUDIENCE_ID, WATCH_SOURCE, watchSlug, mergeWatch } from '../../lib/optin.js';
// s1114: a token with w (badge watch) adds the contact to the watch audience and merges the slug into its "watch" property.

const EXPIRED = 'This confirmation link is broken or more than 3 days old. Sign up again from any free server page and use the newest email.';

export async function onRequestGet({ request, env }) {
  const t = new URL(request.url).searchParams.get('t') || '';
  const p = env.OPTIN_HMAC_SECRET ? await verifyToken(env.OPTIN_HMAC_SECRET, t, 'c') : null;
  if (!p) return page(env, request, '/updates/problem/', { status: 400, msg: EXPIRED });
  return page(env, request, p.w ? '/updates/watch-confirm/' : '/updates/confirm-email/', { token: t });
}

export async function onRequestPost({ request, env }) {
  const asJson = wantsJson(request);
  const form = await readForm(request);
  const t = String(form.t || new URL(request.url).searchParams.get('t') || '');
  const p = env.OPTIN_HMAC_SECRET ? await verifyToken(env.OPTIN_HMAC_SECRET, t, 'c') : null;
  if (!p) return asJson ? json(400, { ok: false, error: 'bad_token' }) : page(env, request, '/updates/problem/', { status: 400, msg: EXPIRED });
  const w = p.w ? watchSlug(p.w) : '';
  if (w) return confirmWatch(env, request, asJson, p.e, w);
  const r = await resend(env, 'POST', `/audiences/${AUDIENCE_ID}/contacts`, { email: p.e, unsubscribed: false });
  // An address already on the list is a success too: make sure it is not marked unsubscribed.
  let ok = r.ok;
  if (!ok && (r.status === 409 || r.status === 422)) {
    const u = await resend(env, 'PATCH', `/audiences/${AUDIENCE_ID}/contacts/${encodeURIComponent(p.e)}`, { unsubscribed: false });
    ok = u.ok;
  }
  if (!ok) {
    console.log('optin contact add failed', r.status, r.data && r.data.name);
    return asJson ? json(502, { ok: false, error: 'store_failed' }) : page(env, request, '/updates/problem/', { status: 502, msg: 'We could not add you to the list just now. Please open the link in your email again in a few minutes.' });
  }
  return asJson ? json(200, { ok: true, status: 'subscribed', contact: r.data && r.data.id }) : redirect('/updates/confirmed/');
}

// Create (or keep) the contact in the watch audience, then write the merged slug list. Resend ignores properties on a
// create for a contact that already exists, so the PATCH always runs.
async function confirmWatch(env, request, asJson, email, slug) {
  const base = `/audiences/${WATCH_AUDIENCE_ID}/contacts`;
  const c = await resend(env, 'POST', base, { email, unsubscribed: false });
  if (!c.ok && c.status !== 409 && c.status !== 422) return watchFail(env, request, asJson, 'add', c);
  const cur = await resend(env, 'GET', `${base}/${encodeURIComponent(email)}`);
  const prev = cur.ok && cur.data && cur.data.properties && cur.data.properties.watch ? cur.data.properties.watch.value : '';
  const watch = mergeWatch(prev, slug);
  const u = await resend(env, 'PATCH', `${base}/${encodeURIComponent(email)}`, { unsubscribed: false, properties: { watch, source: WATCH_SOURCE } });
  if (!u.ok) return watchFail(env, request, asJson, 'patch', u);
  return asJson ? json(200, { ok: true, status: 'watching', watch: slug }) : redirect(`/updates/watching/?s=${encodeURIComponent(slug)}`);
}

function watchFail(env, request, asJson, step, r) {
  console.log('watch contact failed', step, r.status, r.data && r.data.name);
  return asJson ? json(502, { ok: false, error: 'store_failed' }) : page(env, request, '/updates/problem/', { status: 502, msg: 'We could not start the watch just now. Please open the link in your email again in a few minutes.' });
}
