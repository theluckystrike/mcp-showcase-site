// s1103 optin: POST /updates/subscribe. Validates, rate-limits, sends the confirmation email. Stores nothing.
// Form posts get a 303 to /updates/check-email/; JSON callers (Accept or Content-Type application/json) get JSON.
import { normEmail, isEmail, cleanSource, originOk, overLimit, signToken, unsubscribeUrl, confirmEmail, resend,
  wantsJson, json, redirect, page, readForm, FROM, REPLY_TO, SITE,
  watchSlug, watchSlugExists, watchConfirmEmail, WATCH_SOURCE } from '../../lib/optin.js';
// s1114: a form with a "watch" field (badge watch on /r/<slug>/ and /badge/) signs a token with w = slug and
// s = "badge-watch", and sends the watch confirmation email instead. Same limits, same honeypot, nothing stored here.

export async function onRequestPost({ request, env }) {
  const asJson = wantsJson(request);
  const fail = (status, code, msg) => (asJson ? json(status, { ok: false, error: code, detail: msg }, status === 429 ? { 'retry-after': '600' } : {}) : page(env, request, '/updates/problem/', { status, msg }));
  if (!env.OPTIN_HMAC_SECRET || !env.OPTIN_RESEND_KEY) return fail(503, 'not_configured', 'Signup is not available right now. Please try again later.');
  if (!originOk(request)) return fail(403, 'bad_origin', 'Please use the signup form on www.mcpstamp.com.');
  const ip = request.headers.get('cf-connecting-ip') || 'none';
  if (await overLimit('ip', ip)) return fail(429, 'rate_limited', 'Too many signups from your network. Please wait ten minutes and try again.');

  const form = await readForm(request);
  const email = normEmail(form.email);
  const watchField = form.watch !== undefined && form.watch !== null && String(form.watch) !== '';
  const watch = watchField ? watchSlug(form.watch) : '';
  const source = watchField ? WATCH_SOURCE : cleanSource(form.source);
  // Honeypot: people never fill "website". Answer like a success and send nothing.
  if (form.website) return asJson ? json(200, { ok: true, status: 'check_email' }) : redirect(form.watch ? '/updates/watch-check-email/' : '/updates/check-email/');
  if (!isEmail(email)) return fail(400, 'invalid_email', 'That does not look like an email address. Go back and check it.');
  if (watchField && !(watch && await watchSlugExists(env, request, watch))) return fail(400, 'unknown_server', 'We have no report for that server. Paste the address of its report page, for example https://www.mcpstamp.com/r/your-server/, or its registry name.');
  if (await overLimit('email', email)) return fail(429, 'rate_limited', 'We already sent a link to this address. Check your inbox and spam folder, or try again in an hour.');

  const t = await signToken(env.OPTIN_HMAC_SECRET, { a: 'c', e: email, s: source, i: Math.floor(Date.now() / 1000), ...(watch ? { w: watch } : {}) });
  const confirmUrl = `${SITE}/updates/confirm?t=${t}`;
  const unsubUrl = await unsubscribeUrl(env, email, watch ? 'w' : undefined);
  const msg = watch ? watchConfirmEmail({ confirmUrl, unsubUrl, slug: watch }) : confirmEmail({ confirmUrl, unsubUrl, source });
  const r = await resend(env, 'POST', '/emails', {
    from: FROM, to: [email], reply_to: REPLY_TO, subject: msg.subject, text: msg.text, html: msg.html,
    headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    tags: [{ name: 'list', value: watch ? 'mcpstamp-badge-watch' : 'mcpstamp-updates' }, { name: 'kind', value: 'confirm' }, ...(watch ? [{ name: 'source', value: WATCH_SOURCE }] : [])],
  });
  if (!r.ok) {
    console.log('optin send failed', r.status, r.data && r.data.name);
    return fail(502, 'send_failed', 'We could not send the confirmation email. Please try again in a few minutes.');
  }
  return asJson ? json(200, { ok: true, status: 'check_email', id: r.data && r.data.id }) : redirect(watch ? '/updates/watch-check-email/' : '/updates/check-email/');
}

export async function onRequest({ request }) {
  return json(405, { ok: false, error: 'method_not_allowed' }, { allow: 'POST' });
}
