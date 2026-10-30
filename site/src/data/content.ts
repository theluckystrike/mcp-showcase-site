// Optional page content: pricing.json (t-money) and developers.json (t-dev). Both may be missing.
// Schemas follow tasks/t-money.md and tasks/t-dev.md. Unknown or missing keys fall back to safe defaults.
import fs from 'node:fs';
import path from 'node:path';
import { brand } from '../config/brand';
import { CONTENT_DIR, bundleUrl, buyUrl } from './servers';

function read(name: string): Record<string, any> | null {
  const f = path.join(CONTENT_DIR, name);
  if (!fs.existsSync(f)) return null;
  try {
    // QA (t-qa): site copy rule bans the hype word "unlock". pricing.json copy uses it 4 times; reword at load time.
    const text = fs.readFileSync(f, 'utf8')
      .replace(/\bunlocks\b/g, 'turns on').replace(/\bunlocked\b/g, 'turned on').replace(/\bunlock\b/g, 'turn on');
    return JSON.parse(text);
  } catch (e) {
    console.warn(`[content] cannot parse ${f}: ${(e as Error).message}`);
    return null;
  }
}
const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// ---------- pricing ----------
export interface Plan {
  id: string; name: string; price: string; period: string; cta_label: string; cta_url: string;
  features: string[]; highlight: boolean;
}
export interface Sourced { text: string; source?: string }

export function getPricing() {
  const j = read('pricing.json');
  const fallbackPlans: Plan[] = [
    { id: 'free', name: 'Free', price: '$0', period: 'forever', cta_label: 'Browse servers', cta_url: '/servers/',
      features: ['Every server, free tier', 'No key, no sign-up', 'Hosted URL with a free 30-day token', 'Run locally with npx or .mcpb'],
      highlight: false },
    { id: 'pro', name: 'Pro, one server', price: `$${brand.pricing.serverUsd}`, period: 'once, lifetime', cta_label: 'Pick a server',
      cta_url: '/servers/', features: ['Lifetime Pro licence for one server', 'Pro tools of that server', 'Key works offline'],
      highlight: false },
    { id: 'bundle', name: 'Bundle, all servers', price: `$${brand.pricing.bundleUsd}`, period: 'once, lifetime',
      cta_label: 'Get the bundle', cta_url: buyUrl(bundleUrl(), 'pricing', 'plans'),
      features: ['Pro for every paid server', 'About the price of two single servers', 'Lifetime licence'], highlight: true },
  ];
  const plans = arr<Record<string, any>>(j?.plans)
    .filter((p) => p && p.name)
    .map((p, i): Plan => ({
      id: String(p.id ?? i), name: String(p.name),
      price: typeof p.price === 'number' ? `$${p.price}` : String(p.price ?? ''), period: String(p.period ?? ''),
      cta_label: String(p.cta_label ?? 'Choose'), cta_url: String(p.cta_url ?? '/servers/'),
      features: arr<string>(p.features).map(String), highlight: Boolean(p.highlight),
    }));
  return {
    fromFile: Boolean(j),
    plans: plans.length ? plans : fallbackPlans,
    faq: arr<Record<string, any>>(j?.faq).filter((f) => f?.q && f?.a).map((f) => ({ q: String(f.q), a: String(f.a) })),
    trust: arr<Record<string, any>>(j?.trust).filter((t) => t?.text).map((t): Sourced => ({ text: String(t.text), source: t.source })),
    proFeatures: arr<Record<string, any>>(j?.pro_features).filter((t) => t?.text).map((t): Sourced => ({ text: String(t.text), source: t.source })),
    upsellSlots: arr<Record<string, any>>(j?.upsell_slots).filter((u) => u?.page && u?.slot),
  };
}

/** Upsell copy for a page slot from pricing.json, or the fallback. Replaces {id} and {name}. */
export function upsell(page: string, slot: string, fallback: { copy: string; cta_url: string }, vars: Record<string, string> = {}) {
  const u = getPricing().upsellSlots.find((x) => x.page === page && x.slot === slot);
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  return u ? { copy: fill(String(u.copy ?? fallback.copy)), cta_url: fill(String(u.cta_url ?? fallback.cta_url)) } : fallback;
}

// ---------- developers ----------
export interface Quickstart { client: string; steps: string[]; snippet: string; lang: string; tested: boolean; method: string; note: string }

export function getDevelopers() {
  const j = read('developers.json');
  const quickstart = arr<Record<string, any>>(j?.quickstart)
    .filter((q) => q?.client)
    .map((q): Quickstart => ({
      client: String(q.client), steps: arr<string>(q.steps).map(String), snippet: String(q.snippet ?? ''),
      lang: String(q.lang ?? 'bash'), tested: Boolean(q.tested), method: String(q.method ?? ''), note: String(q.note ?? ''),
    }));
  const hosted = j?.hosted && typeof j.hosted === 'object' ? j.hosted : null;
  return {
    fromFile: Boolean(j),
    quickstart,
    hosted: hosted
      ? {
          token_request: typeof hosted.token_request === 'string' ? hosted.token_request : String(hosted.token_request?.command ?? ''),
          token_note: typeof hosted.token_request === 'object' ? String(hosted.token_request?.also ?? '') : '',
          url_forms: arr<any>(hosted.url_forms).map((u) =>
            typeof u === 'string' ? { form: '', url: u, header: '', use: '' }
              : { form: String(u.form ?? ''), url: String(u.url ?? ''), header: String(u.header ?? ''), use: String(u.use ?? '') }),
          limits: (typeof hosted.limits === 'string'
            ? [{ label: 'Limits', value: hosted.limits }]
            : hosted.limits && typeof hosted.limits === 'object'
              ? Object.entries(hosted.limits).filter(([k]) => k !== 'source')
                  .map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: typeof v === 'string' ? v : JSON.stringify(v) }))
              : []) as { label: string; value: string }[],
          session: {
            transport: String(hosted.example_session?.transport ?? ''),
            requests: arr<Record<string, any>>(hosted.example_session?.requests).filter((r) => r?.curl)
              .map((r) => ({ step: String(r.step ?? ''), curl: String(r.curl), summary: String(r.response_summary ?? '') })),
          },
          errors: arr<Record<string, any>>(hosted.errors).map((e) => ({ code: String(e.code ?? ''), meaning: String(e.meaning ?? ''), fix: String(e.fix ?? '') })),
        }
      : null,
    architecture: j?.architecture
      ? { summary: String(j.architecture.summary ?? ''), points: arr<string>(j.architecture.points).map(String) }
      : null,
    conventions: arr<Record<string, any>>(j?.conventions).filter((c) => c?.title).map((c) => ({ title: String(c.title), text: String(c.text ?? '') })),
    faq: arr<Record<string, any>>(j?.faq).filter((f) => f?.q && f?.a).map((f) => ({ q: String(f.q), a: String(f.a) })),
    links: arr<Record<string, any>>(j?.links).filter((l) => l?.url).map((l) => ({ label: String(l.label ?? l.url), url: String(l.url) })),
  };
}

// ---------- client guides (/connect/<client>/) ----------
// Slug -> display name + the developers.json quickstart entries whose client name starts with the match text.
export const CLIENTS: { slug: string; name: string; match: string[] }[] = [
  { slug: 'claude-ai', name: 'Claude.ai', match: ['Claude.ai'] },
  { slug: 'claude-desktop', name: 'Claude Desktop', match: ['Claude Desktop'] },
  { slug: 'claude-code', name: 'Claude Code', match: ['Claude Code'] },
  { slug: 'cursor', name: 'Cursor', match: ['Cursor'] },
  { slug: 'vs-code', name: 'VS Code', match: ['VS Code'] },
  { slug: 'chatgpt', name: 'ChatGPT', match: ['ChatGPT'] },
  { slug: 'windsurf', name: 'Windsurf', match: ['Windsurf'] },
];

export function quickstartsFor(slug: string): Quickstart[] {
  const c = CLIENTS.find((x) => x.slug === slug);
  if (!c) return [];
  return getDevelopers().quickstart.filter((q) => c.match.some((m) => q.client.startsWith(m)));
}

// ---------- job pages ----------
// jobs.json (t-polish): unique copy per use-case and answer page, keyed by page path. Missing file or page = null,
// and JobPage.astro falls back to the template copy.
export interface JobStep { tool: string; does: string }
export interface JobCopy {
  intro: string; without_tool: string; with_tool: string; answer: string; pitfalls: string[];
  example: { persona: string; prompt: string; steps: JobStep[]; result: string } | null;
}
let jobsCache: Record<string, any> | null = null;
export function getJob(pagePath: string): JobCopy | null {
  jobsCache ??= read('jobs.json')?.jobs ?? {};
  const j = jobsCache![pagePath];
  if (!j || typeof j !== 'object') return null;
  const ex = j.example;
  return {
    intro: String(j.intro ?? ''), without_tool: String(j.without_tool ?? ''), with_tool: String(j.with_tool ?? ''),
    answer: String(j.answer ?? ''), pitfalls: arr<string>(j.pitfalls).map(String),
    example: ex?.prompt ? {
      persona: String(ex.persona ?? ''), prompt: String(ex.prompt), result: String(ex.result ?? ''),
      steps: arr<Record<string, any>>(ex.steps).filter((s) => s?.tool).map((s) => ({ tool: String(s.tool), does: String(s.does ?? '') })),
    } : null,
  };
}
