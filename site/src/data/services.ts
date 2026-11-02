// Paid services ladder (run s1102m). Content: data/content/services.json. Used by /services/, /pricing/ and the home band.
// Every service is paid upfront by card on Stripe before work starts (s1102m sales lane). Options (one-store launch,
// simple server) have their own pay links. checkout_live=false: every pay button is a prefilled email to support@zovo.one.
// checkout_live=true: pay buttons go to mcp.zovo.one/buy/<product> with a src tag. Internal links never carry src tags.
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR, buyUrl } from './servers';

export const SUPPORT_EMAIL = 'support@zovo.one';

export interface Cta { label: string; label_email?: string; url?: string; pay?: boolean; mailto?: boolean; subject?: string }
export interface Option { label: string; price_usd: number; price_label: string; subject: string; cta?: Cta; slot?: string; note?: string }
export interface Service {
  id: string; name: string; short: string; price_usd?: number; list_usd?: number; price_label?: string; price_unit?: string;
  price_tag?: string; price_note?: string; price_from?: boolean; deposit_usd?: number; credit?: string; guarantee?: string;
  order_subject?: string; options?: Option[]; scope: string[]; you_get: string[]; note?: string; cta?: Cta; cta2?: Cta; slot: string;
  /** Anxiety micro-copy directly under the pay button: when work starts and what is refundable. */
  cta_note?: string;
  /** Price contrast line, for example one store against four. */
  price_compare?: string;
  /** Months covered by one payment (Care plan). */
  months?: number;
}

const fallback = {
  show_prices: false, checkout_live: false, checkout_off_note: '', eyebrow: 'Custom work', h1: 'Get an MCP server built around your own data', lead: '',
  hero_cta_note: '', final: null as { h2: string; text: string[] } | null,
  services: [] as Service[], steps: [] as any[], proof: null as any, github: null as any, faq: [] as { q: string; a: string }[],
};

let cache: typeof fallback | null = null;
export function getServicesContent(): typeof fallback {
  if (cache) return cache;
  try { cache = { ...fallback, ...JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'services.json'), 'utf8')) }; }
  catch { cache = fallback; }
  return cache!;
}

export const mailto = (subject: string, body?: string) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;

/** Prefilled order email: the subject names the job and price, the body asks for the server URL. */
export const orderMailto = (subject: string) =>
  mailto(subject, `Hi,\n\nI want to order: ${subject}.\n\nMy MCP server URL (or "none yet"):\nCompany:\nAnything we should know:\n`);

/** Href for a service's main button. Pay links only when checkout is live; otherwise a prefilled order email. */
export function ctaHref(s: Service, page: string, slot: string): string {
  const c = s.cta;
  const live = getServicesContent().checkout_live;
  if (!c) return orderMailto(s.order_subject || s.name);
  if (c.mailto || !c.url) return orderMailto(c.subject || s.order_subject || c.label);
  if (c.pay && !live) return orderMailto(s.order_subject || s.name);
  return c.url.startsWith('http') ? buyUrl(c.url, page, slot) : c.url;
}

/** Href for an option's pay button (one-store launch, simple server). Prefilled order email while checkout is off. */
export function optionHref(o: Option, page: string, slot: string): string {
  if (!o.cta?.url || !getServicesContent().checkout_live) return orderMailto(o.subject);
  return o.cta.url.startsWith('http') ? buyUrl(o.cta.url, page, slot) : o.cta.url;
}

/** Visible label for an option's pay button. */
export function optionLabel(o: Option): string {
  return o.cta?.url && getServicesContent().checkout_live ? o.cta.label : 'Order by email';
}

/** Visible label for a service's main button. */
export function ctaLabel(s: Service): string {
  const c = s.cta;
  if (!c) return 'Email us';
  return c.pay && !getServicesContent().checkout_live ? (c.label_email || c.label) : c.label;
}

/** "$490", "from $4,500", "$490 a month" for one-line lists. */
export function priceText(s: Service): string {
  const p = s.price_label ?? (s.price_usd ? `$${s.price_usd.toLocaleString('en-US')}` : '');
  return s.price_unit ? `${p} ${s.price_unit}` : p;
}

export const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
