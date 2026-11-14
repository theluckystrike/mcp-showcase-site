// s1103 optin: GET /updates/unsubscribe?t= shows a button; POST removes the contact from the Resend audience.
// The POST also serves RFC 8058 one-click unsubscribe (List-Unsubscribe-Post), where the token is in the query string.
import { verifyToken, resend, json, redirect, page, readForm, wantsJson, AUDIENCE_ID, WATCH_AUDIENCE_ID } from '../../lib/optin.js';
// s1114: a token with l = "w" removes the address from the badge watch audience instead of the update list.

const BAD = 'This unsubscribe link is broken. Email support@zovo.one from the address you want removed and we will remove it by hand.';

export async function onRequestGet({ request, env }) {
  const t = new URL(request.url).searchParams.get('t') || '';
  const p = env.OPTIN_HMAC_SECRET ? await verifyToken(env.OPTIN_HMAC_SECRET, t, 'u') : null;
  if (!p) return page(env, request, '/updates/problem/', { status: 400, msg: BAD });
  return page(env, request, p.l === 'w' ? '/updates/watch-leave/' : '/updates/leave/', { token: t });
}

export async function onRequestPost({ request, env }) {
  const asJson = wantsJson(request);
  const form = await readForm(request);
  const t = String(form.t || new URL(request.url).searchParams.get('t') || '');
  const p = env.OPTIN_HMAC_SECRET ? await verifyToken(env.OPTIN_HMAC_SECRET, t, 'u') : null;
  if (!p) return asJson ? json(400, { ok: false, error: 'bad_token' }) : page(env, request, '/updates/problem/', { status: 400, msg: BAD });
  const r = await resend(env, 'DELETE', `/audiences/${p.l === 'w' ? WATCH_AUDIENCE_ID : AUDIENCE_ID}/contacts/${encodeURIComponent(p.e)}`);
  // 404 = not on the list (never confirmed, or already removed): the person is unsubscribed either way.
  if (!r.ok && r.status !== 404) {
    console.log('optin unsubscribe failed', r.status, r.data && r.data.name);
    return asJson ? json(502, { ok: false, error: 'remove_failed' }) : page(env, request, '/updates/problem/', { status: 502, msg: 'We could not remove you just now. Please try again in a few minutes, or email support@zovo.one.' });
  }
  return asJson ? json(200, { ok: true, status: 'unsubscribed' }) : redirect(p.l === 'w' ? '/updates/watch-stopped/' : '/updates/unsubscribed/');
}
