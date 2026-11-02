// McpStamp Readiness Index (s1102m). Data: data/content/readiness.json, written by the registry scan.
// Missing or broken file = null, and /readiness/ renders a "first scan running" page with noindex and stays out of
// sitemap.xml and llms.txt. A file with "sample": true is test data: the page renders it, marks it, and is noindex.
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR } from './servers';

export const STORES = [
  { key: 'claude', name: 'Claude', long: 'Claude Connectors Directory', short: 'Cl' },
  { key: 'chatgpt', name: 'ChatGPT', long: 'ChatGPT app directory', short: 'GPT' },
  { key: 'gemini', name: 'Gemini', long: 'Gemini Connected Apps', short: 'Gem' },
  { key: 'registry', name: 'MCP Registry', long: 'Official MCP Registry', short: 'Reg' },
] as const;
export type StoreKey = (typeof STORES)[number]['key'];
export const GRADES = ['A', 'B', 'C', 'D', 'F'] as const;

export interface ReadinessRow {
  name: string; url: string; repo: string; score: number | null; grade: string; auth: string; tools: number | null;
  stores: Record<StoreKey, boolean>; unverified: Record<StoreKey, boolean>; top_fixes: string[];
}
export interface Readiness {
  sample: boolean;
  generated_at: string;
  method: { text: string[]; items: { label: string; value: string }[] };
  totals: {
    scanned: number; reachable: number; oauth: number; authless: number; avg_score: number;
    by_grade: Record<string, number>; store_ready: Record<StoreKey, number>; store_unverified: Record<StoreKey, number>;
  };
  /** Partial-scan facts (s1102m QA P1-3): complete=false means the scan is still running. */
  partial: { complete: boolean; registry_urls: number; sampling: string };
  rows: ReadinessRow[];
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v) ? +v : d);
const str = (v: unknown) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
const ready = (v: any) => (typeof v === 'boolean' ? v : Boolean(v && typeof v === 'object' && v.ready));

function method(m: unknown): Readiness['method'] {
  if (typeof m === 'string') return { text: m.split(/\n\s*\n/).map(str).filter(Boolean), items: [] };
  if (Array.isArray(m)) return { text: m.map(str).filter(Boolean), items: [] };
  if (m && typeof m === 'object') {
    const o = m as Record<string, unknown>;
    // Blank lines in the generator text mark paragraphs. Keep them, so the method reads as paragraphs, not one block.
    const text = [o.summary, o.text, o.description].filter((x): x is string => typeof x === 'string').flatMap((x) => x.split(/\n\s*\n/)).map(str).filter(Boolean);
    const items = Object.entries(o)
      .filter(([k]) => !['summary', 'text', 'description'].includes(k))
      .map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: Array.isArray(v) ? v.map(str).join('; ') : typeof v === 'object' && v ? JSON.stringify(v) : str(v) }))
      .filter((x) => x.value);
    return { text, items };
  }
  return { text: [], items: [] };
}

function fixText(f: unknown): string {
  if (typeof f === 'string') return str(f);
  if (f && typeof f === 'object') { const o = f as Record<string, unknown>; return str(o.fix ?? o.title ?? o.text ?? ''); }
  return '';
}

let cache: Readiness | null | undefined;
export function getReadiness(): Readiness | null {
  if (cache !== undefined) return cache;
  cache = null;
  const f = path.join(CONTENT_DIR, 'readiness.json');
  if (!fs.existsSync(f)) return cache;
  let j: any;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.warn(`[readiness] cannot parse ${f}: ${(e as Error).message}`); return cache; }
  if (!j || !Array.isArray(j.rows)) return cache;
  const rows: ReadinessRow[] = j.rows
    .filter((r: any) => r && (r.url || r.name))
    .map((r: any) => ({
      name: str(r.name) || str(r.url), url: str(r.url), repo: str(r.repo),
      score: typeof r.score === 'number' || (typeof r.score === 'string' && r.score !== '') ? num(r.score) : null,
      grade: str(r.grade).toUpperCase().slice(0, 1), auth: str(r.auth) || 'unknown',
      tools: r.tools == null ? null : Array.isArray(r.tools) ? r.tools.length : num(r.tools),
      stores: Object.fromEntries(STORES.map((s) => [s.key, ready(r.stores?.[s.key])])) as Record<StoreKey, boolean>,
      unverified: Object.fromEntries(STORES.map((s) => [s.key, Boolean(r.stores?.[s.key] && typeof r.stores[s.key] === 'object' && r.stores[s.key].status === 'unverified')])) as Record<StoreKey, boolean>,
      top_fixes: (Array.isArray(r.top_fixes) ? r.top_fixes : []).map(fixText).filter(Boolean).slice(0, 3),
    }));
  const t = j.totals ?? {};
  const reachableRows = rows.filter((r) => r.score != null);
  const byGrade = Object.fromEntries(GRADES.map((g) => [g, num(t.by_grade?.[g], rows.filter((r) => r.grade === g).length)]));
  cache = {
    sample: Boolean(j.sample),
    generated_at: str(j.generated_at),
    method: (() => {
      const m = method(j.method);
      // Registry counts from the scan (entries, Streamable HTTP remotes, skipped kinds) go under the method text.
      const LABEL: Record<string, string> = {
        entries_latest: 'Registry entries, latest version', with_streamable_http: 'With a Streamable HTTP remote', sse_listed: 'Listing an SSE remote',
        sse_only: 'SSE remote only (not checked)', templated_url_only: 'Templated URL only (not checked)', deprecated_skipped: 'Deprecated (skipped)', unique_urls: 'Unique remote URLs',
      };
      if (j.registry && typeof j.registry === 'object') {
        for (const [k, v] of Object.entries(j.registry)) if (typeof v === 'number') m.items.push({ label: LABEL[k] ?? k.replace(/_/g, ' '), value: v.toLocaleString('en-US') });
      }
      if (typeof t.unreachable === 'number') m.items.push({ label: 'Did not answer', value: t.unreachable.toLocaleString('en-US') });
      return m;
    })(),
    totals: {
      scanned: num(t.scanned, rows.length),
      reachable: num(t.reachable, reachableRows.length),
      oauth: num(t.oauth, rows.filter((r) => r.auth === 'oauth').length),
      authless: num(t.authless, rows.filter((r) => r.auth === 'none').length),
      avg_score: num(t.avg_score, reachableRows.length ? reachableRows.reduce((a, r) => a + (r.score ?? 0), 0) / reachableRows.length : 0),
      by_grade: byGrade,
      store_ready: Object.fromEntries(STORES.map((s) => [s.key, num(t.store_ready?.[s.key], rows.filter((r) => r.stores[s.key]).length)])) as Record<StoreKey, number>,
      store_unverified: Object.fromEntries(STORES.map((s) => [s.key, num(t.store_unverified?.[s.key], rows.filter((r) => r.unverified[s.key]).length)])) as Record<StoreKey, number>,
    },
    partial: { complete: t.complete !== false, registry_urls: num(t.registry_remote_urls, 0), sampling: str(t.sampling) },
    rows,
  };
  return cache;
}

/** True when the index has real (non-sample) data, so the page is indexable and listed in sitemap/llms. */
export function readinessPublished(): boolean {
  const r = getReadiness();
  return Boolean(r && !r.sample && r.rows.length > 0);
}
