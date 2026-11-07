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
      id, title: title[id] ?? id, status: st === 'f' ? 'fail' : 'warn', detail, fix: fx >= 0 ? j.fixes[fx] : '',
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

/** Every /r/ route for sitemap.xml: index, grade lists, indexable server pages. */
export function rRoutes(): { path: string; priority: number; lastmod: string }[] {
  const d = getRData();
  if (!d || !d.rows.length) return [];
  const lastmod = d.generated;
  return [
    { path: '/state-of-mcp-2026-11/', priority: 0.8, lastmod },
    { path: '/r/', priority: 0.7, lastmod },
    ...R_GRADES.flatMap((g) => Array.from({ length: rowsOfGrade(g).length ? gradePages(g) : 0 }, (_, i) => ({ path: gradePath(g, i + 1), priority: 0.5, lastmod }))),
    ...d.rows.filter((r) => !r.noindex).map((r) => ({ path: `/r/${r.slug}/`, priority: 0.4, lastmod })),
  ];
}

export const AUTH_LABEL: Record<string, string> = { none: 'No sign-in', oauth: 'OAuth', other: 'API key or other', unknown: 'Not detected' };
export const STATUS_LABEL: Record<StoreStatus, string> = { ready: 'Ready', not_ready: 'Not ready', unverified: 'Unverified' };
