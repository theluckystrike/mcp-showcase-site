// Paid services ladder (run s1102m). Content: data/content/services.json. Used by /services/, /pricing/ and the home band.
// Pay links go to mcp.zovo.one/buy/<product> with a src tag; internal links never carry src tags.
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR, buyUrl } from './servers';

export const SUPPORT_EMAIL = 'support@zovo.one';

export interface Cta { label: string; url?: string; pay?: boolean; mailto?: boolean; subject?: string }
export interface Service {
  id: string; name: string; short: string; price_usd?: number; price_label?: string; price_unit?: string; price_note?: string;
  price_from?: boolean; deposit_usd?: number; scope: string[]; you_get: string[]; note?: string; cta?: Cta; cta2?: Cta; slot: string;
}

const fallback = { show_prices: false, eyebrow: 'Custom work', h1: 'Get an MCP server built around your own data', lead: '', services: [] as Service[], steps: [] as any[], proof: null as any, github: null as any, faq: [] as { q: string; a: string }[] };

let cache: typeof fallback | null = null;
export function getServicesContent(): typeof fallback {
  if (cache) return cache;
  try { cache = { ...fallback, ...JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'services.json'), 'utf8')) }; }
  catch { cache = fallback; }
  return cache!;
}

export const mailto = (subject: string) => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

/** Resolve a CTA to an href. Pay links get a src tag (site.<page>.<slot>). */
export function ctaHref(c: Cta | undefined, page: string, slot: string): string {
  if (!c) return mailto('MCP work');
  if (c.mailto || !c.url) return mailto(c.subject || c.label);
  return c.url.startsWith('http') ? buyUrl(c.url, page, slot) : c.url;
}

/** "$490", "from $2,900", "$490 a month" for one-line lists. */
export function priceText(s: Service): string {
  const p = s.price_label ?? (s.price_usd ? `$${s.price_usd.toLocaleString('en-US')}` : '');
  return s.price_unit ? `${p} ${s.price_unit}` : p;
}
