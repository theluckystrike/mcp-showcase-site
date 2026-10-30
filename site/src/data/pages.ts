// Page metadata (title, H1, meta description, servers) from the t-angle sitemap.
// Source: agents/t-angle/sitemap.json, copied to src/data/pages.json. seo.json rules: {brand} comes from brand.ts.
import fs from 'node:fs';
import path from 'node:path';
import { brand } from '../config/brand';

export interface PageMeta {
  path: string;
  title: string;
  h1: string;
  meta_description: string;
  primary_keyword: string;
  intent: string;
  priority: number;
  servers: string[];
  us_volume: number | null;
  page_type: string;
}

let cache: PageMeta[] | null = null;

function load(): PageMeta[] {
  if (cache) return cache;
  const file = path.resolve(process.cwd(), 'src', 'data', 'pages.json');
  let raw: PageMeta[] = [];
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.warn(`[pages] cannot read ${file}: ${(e as Error).message}`);
  }
  const fill = (s: string) => String(s ?? '').replace(/\{brand\}/g, brand.name);
  cache = raw.map((p) => ({
    ...p,
    title: fill(p.title),
    h1: fill(p.h1),
    meta_description: fill(p.meta_description),
    servers: Array.isArray(p.servers) ? p.servers : [],
  }));
  return cache;
}

export const allPages = (): PageMeta[] => load();
export const pageMeta = (p: string): PageMeta | undefined => load().find((x) => x.path === p);
export const pagesOfType = (t: string): PageMeta[] =>
  load().filter((x) => x.page_type === t).sort((a, b) => b.priority - a.priority || (b.us_volume ?? 0) - (a.us_volume ?? 0));

/** Title + description for a path, with a fallback when the sitemap has no entry. */
export function seo(p: string, fallback: { title: string; description: string }) {
  const m = pageMeta(p);
  // Some generated server descriptions were cut mid-phrase ("escalation dates,." / "discounts and."). Use the fallback then.
  const cut = /,\.|\s(and|or|with|the|a|of)\.(\s|$)/i.test(m?.meta_description ?? '');
  return { title: m?.title || fallback.title, description: (!cut && m?.meta_description) || fallback.description, h1: m?.h1 || '' };
}

/** Slug = last path segment: /use-cases/bill-of-sale/ -> bill-of-sale. */
export const slugOf = (p: string): string => p.split('/').filter(Boolean).pop() ?? '';

/** Use-case and answer pages that use a server (reverse lookup, seo.json internal_links rule). */
export const jobsForServer = (id: string): PageMeta[] =>
  load().filter((x) => (x.page_type === 'use-case' || x.page_type === 'answer') && x.servers.includes(id));

/** The audience page whose server list contains the most of these servers. */
export function audienceFor(servers: string[]): PageMeta | undefined {
  let best: PageMeta | undefined;
  let score = 0;
  for (const a of pagesOfType('audience')) {
    const n = a.servers.filter((s) => servers.includes(s)).length;
    if (n > score) { best = a; score = n; }
  }
  return best ?? pageMeta('/for/small-business/');
}

/** Hub-and-spoke links from seo.json (audience -> use-cases), copied so the site has no dependency on agents/.
 *  chatgpt-small-business is not in seo.json: t-integrate picked its 6 jobs. Some lists got 1-2 extra jobs. */
export const AUDIENCE_JOBS: Record<string, string[]> = {
  // small-business: 8 from seo.json + 4 so the page has the 12 jobs its title promises.
  '/for/small-business/': ['/use-cases/create-invoice-in-claude/', '/use-cases/send-a-quote-from-chat/', '/use-cases/categorize-bank-statement/', '/use-cases/edit-excel-files-in-claude/', '/use-cases/merge-pdf-in-claude/', '/use-cases/chase-overdue-invoices/', '/use-cases/log-expenses-and-receipts/', '/use-cases/mileage-log-for-taxes/', '/use-cases/create-word-document-in-claude/', '/use-cases/recurring-monthly-invoices/', '/use-cases/bill-of-sale/', '/use-cases/convert-currency-ecb-rates/'],
  '/for/chatgpt-small-business/': ['/use-cases/create-invoice-in-claude/', '/use-cases/send-a-quote-from-chat/', '/use-cases/categorize-bank-statement/', '/use-cases/merge-pdf-in-claude/', '/use-cases/create-word-document-in-claude/', '/use-cases/edit-excel-files-in-claude/'],
  '/for/bookkeeping/': ['/use-cases/categorize-bank-statement/', '/use-cases/petty-cash-reconciliation/', '/use-cases/chase-overdue-invoices/', '/use-cases/reconcile-supplier-statement/', '/use-cases/find-duplicate-invoices/', '/use-cases/three-way-match-invoices/'],
  '/for/accountants/': ['/use-cases/three-way-match-invoices/', '/use-cases/find-duplicate-invoices/', '/use-cases/reconcile-supplier-statement/', '/use-cases/depreciation-schedule/', '/use-cases/loan-and-lease-amortization/'],
  '/for/freelancers/': ['/use-cases/send-a-quote-from-chat/', '/use-cases/freelance-service-agreement/', '/use-cases/track-billable-time-in-claude/', '/use-cases/create-invoice-in-claude/', '/use-cases/recurring-monthly-invoices/', '/use-cases/tailored-resume-and-cover-letter/'],
  '/for/trades-field-service/': ['/use-cases/work-orders-and-job-cards/', '/use-cases/change-orders/', '/use-cases/purchase-orders-and-credit-notes/', '/use-cases/bill-of-sale/', '/use-cases/mileage-log-for-taxes/'],
  '/for/ops-hr/': ['/use-cases/employee-leave-tracker/', '/use-cases/new-hire-onboarding-plan/', '/use-cases/schedule-across-time-zones/', '/use-cases/per-diem-travel-allowance/'],
};
