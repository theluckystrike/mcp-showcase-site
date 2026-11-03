// s1103 optin: GET /updates/confirm?t= shows a button (mail scanners that open links do not subscribe anyone);
// POST /updates/confirm adds the address to the Resend audience. This is the only place an address is stored.
import { verifyToken, resend, json, redirect, page, readForm, wantsJson, AUDIENCE_ID } from '../../lib/optin.js';

const EXPIRED = 'This confirmation link is broken or more than 3 days old. Sign up again from any free server page and use the newest email.';

export async function onRequestGet({ request, env }) {
  const t = new URL(request.url).searchParams.get('t') || '';
  const p = env.OPTIN_HMAC_SECRET ? await verifyToken(env.OPTIN_HMAC_SECRET, t, 'c') : null;
  if (!p) return page(env, request, '/updates/problem/', { status: 400, msg: EXPIRED });
  return page(env, request, '/updates/confirm-email/', { token: t });
}

export async function onRequestPost({ request, env }) {
  const asJson = wantsJson(request);
  const form = await readForm(request);
  const t = String(form.t || new URL(request.url).searchParams.get('t') || '');
  const p = env.OPTIN_HMAC_SECRET ? await verifyToken(env.OPTIN_HMAC_SECRET, t, 'c') : null;
  if (!p) return asJson ? json(400, { ok: false, error: 'bad_token' }) : page(env, request, '/updates/problem/', { status: 400, msg: EXPIRED });
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
