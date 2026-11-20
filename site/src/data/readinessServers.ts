// s1107: per-server Readiness reports at /r/<slug>/. Data: data/readiness-servers.json, written by
// site/scripts/readiness-servers.py from the s1102m registry scan (engine 1.2.0, checked 2 Nov 2026).
// Missing file = no /r/ pages, nothing in sitemap.xml or llms.txt.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './servers';
import { STORES, type StoreKey } from './readiness';

export type StoreStatus = 'ready' | 'not_ready' | 'unverified';
export interface RCheck { id: string; title: string; status: 'fail' | 'warn'; detail: string; fix: string; blocks: StoreKey[] }
export interface RServer {
  slug: string; name: string; title: string; url: string; desc: string; repo: string; web: string; ver: string;
  score: number; grade: string; auth: string; tools: number; proto: string; below: number; date: string; noindex: boolean;
  stores: Record<StoreKey, { status: StoreStatus; blockers: string[]; unverified: string[] }>;
  bad: RCheck[]; ok: string[]; skipped: string[];
}
export interface RData {
  generated: string; engine: string; population: number; companyGroup: number;
  gradePopulation: Record<string, number>; gradeCompany: Record<string, number>;
  checkTitle: Record<string, string>; rows: RServer[];
}

const LETTER: Record<string, StoreStatus> = { r: 'ready', n: 'not_ready', u: 'unverified' };
let cache: RData | null | undefined;

// s1118b L11: the scan stored fix text cut at 240 characters, so some fixes stop mid-sentence.
// Show only the whole sentences. Text with no sentence end before the cut is kept as it is.
function wholeSentences(t: string): string {
  const s = (t ?? '').trim();
  if (/[.!?)"\]]$/.test(s)) return s;
  const cut = s.lastIndexOf('. ');
  return cut > 0 ? s.slice(0, cut + 1) : s;
}

export function getRData(): RData | null {
  if (cache !== undefined) return cache;
  cache = null;
  const f = path.join(DATA_DIR, 'readiness-servers.json');
  if (!fs.existsSync(f)) return cache;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const ids: string[] = j.check_ids;
  const title: Record<string, string> = Object.fromEntries(Object.entries(j.checks).map(([k, v]: [string, any]) => [k, v.title]));
  const bits = (m: number) => ids.filter((_, i) => m & (1 << i));
  const rows: RServer[] = j.rows.map((r: any) => {
    const stores = Object.fromEntries(STORES.map((s, i) => [s.key, {
      status: LETTER[r.st[i]] ?? 'not_ready', blockers: r.sb?.[s.key] ?? [], unverified: r.su?.[s.key] ?? [],
    }])) as RServer['stores'];
    const bad: RCheck[] = r.bad.map(([id, st, detail, fx]: [string, string, string, number]) => ({
      id, title: title[id] ?? id, status: st === 'f' ? 'fail' : 'warn', detail, fix: fx >= 0 ? wholeSentences(j.fixes[fx]) : '',
      blocks: STORES.filter((s) => stores[s.key].blockers.includes(id)).map((s) => s.key),
    }));
    return {
      slug: r.slug, name: r.name, title: r.title, url: r.url, desc: r.desc, repo: r.repo, web: r.web, ver: r.ver,
      score: r.score, grade: r.grade, auth: r.auth, tools: r.tools, proto: r.proto, below: r.below, date: r.date,
      noindex: Boolean(r.noindex), stores, bad, ok: bits(r.ok), skipped: bits(r.sk),
    };
  });
  cache = {
    generated: j.generated, engine: j.engine, population: j.population, companyGroup: j.company_group,
    gradePopulation: j.grade_population, gradeCompany: j.grade_company, checkTitle: title, rows,
  };
  return cache;
}

export const R_GRADES = ['A', 'B', 'C', 'D', 'F'] as const;
export const R_PAGE_SIZE = 250;

/** Rows of one grade, best score first, then name. */
export function rowsOfGrade(g: string): RServer[] {
  return (getRData()?.rows ?? []).filter((r) => r.grade === g).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Path of the grade list page that holds a server (page 1 = /r/grade/a/, page 2 = /r/grade/a/2/). */
export function gradePath(g: string, page = 1): string {
  return `/r/grade/${g.toLowerCase()}/${page > 1 ? `${page}/` : ''}`;
}

export function gradePages(g: string): number {
  return Math.max(1, Math.ceil(rowsOfGrade(g).length / R_PAGE_SIZE));
}

// s1120: true lastmod for /r/ pages (sitemap-r-*.xml lastmod and the WebPage dateModified of each report).
// A report page changes when its own data changes (row.date = the date the server was checked) or when the
// report template or the shared report content changes. The template part cannot be read from the data, so it
// is a date constant. Bump R_REPORT_TEMPLATE_CHANGED in the same commit as a visible change to /r/<slug>/ pages
// (title or meta template, page blocks, fix texts or other text in data/readiness-servers.json that keeps the old
// check date), and only then. Never set it to the build date: Google ignores a lastmod that moves on every build.
// 2026-11-17: default title and meta rewrite (s1118b L1, f0890df), fix-text restore (L12, df19b88),
// sample audit link (L11, 796c735), audit box and related links (72db604, 6ef60ee).
export const R_REPORT_TEMPLATE_CHANGED = '2026-11-17';
// Same rule for the grade list pages /r/grade/<g>/. 2026-11-17: audit box on the grade lists (72db604).
export const R_GRADE_TEMPLATE_CHANGED = '2026-11-17';

const latest = (...dates: (string | undefined)[]): string => dates.filter((x): x is string => Boolean(x)).sort().pop() ?? '';

/** Date of the last real change of one report page: newer of its check date and the template date. */
export function rReportLastmod(r: Pick<RServer, 'date'>): string {
  return latest(r.date?.slice(0, 10), R_REPORT_TEMPLATE_CHANGED);
}

let bySlug: Map<string, RServer> | undefined;

/** lastmod of /r/<slug>/ by path, or undefined for any other path. Used for the WebPage dateModified. */
export function rReportLastmodForPath(p: string): string | undefined {
  const m = /^\/r\/([^/]+)\/$/.exec(p);
  if (!m || m[1] === 'grade') return undefined;
  if (!bySlug) bySlug = new Map((getRData()?.rows ?? []).map((r) => [r.slug, r]));
  const row = bySlug.get(m[1]);
  return row ? rReportLastmod(row) : undefined;
}

/** Every /r/ route for sitemap.xml: index, grade lists, indexable server pages. */
export function rRoutes(): { path: string; priority: number; lastmod: string }[] {
  const d = getRData();
  if (!d || !d.rows.length) return [];
  const lastmod = d.generated;
  const gradeLastmod = latest(d.generated, R_GRADE_TEMPLATE_CHANGED);
  return [
    { path: '/state-of-mcp-2026-11/', priority: 0.8, lastmod },
    { path: '/r/', priority: 0.7, lastmod },
    ...R_GRADES.flatMap((g) => Array.from({ length: rowsOfGrade(g).length ? gradePages(g) : 0 }, (_, i) => ({ path: gradePath(g, i + 1), priority: 0.5, lastmod: gradeLastmod }))),
    ...d.rows.filter((r) => !r.noindex).map((r) => ({ path: `/r/${r.slug}/`, priority: 0.4, lastmod: rReportLastmod(r) })),
  ];
}

export const AUTH_LABEL: Record<string, string> = { none: 'No sign-in', oauth: 'OAuth', other: 'API key or other', unknown: 'Not detected' };
export const STATUS_LABEL: Record<StoreStatus, string> = { ready: 'Ready', not_ready: 'Not ready', unverified: 'Unverified' };
