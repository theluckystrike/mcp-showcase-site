// s1116: per-report title, meta and lead answer for /r/<slug>/ pages that Google shows for a named query.
// ONE data file: ../data/content/r-overrides.json. Pages without an entry render the default template text.
// The lead may hold internal links written as [text](/path/). Only paths that start with "/" become links.
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR } from './servers';

export interface ROverride { title: string; description: string; lead: string; related: string[] }

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
let cache: Record<string, ROverride> | null = null;

export function getROverride(slug: string): ROverride | undefined {
  if (!cache) {
    cache = {};
    const f = path.join(CONTENT_DIR, 'r-overrides.json');
    if (fs.existsSync(f)) {
      const pages = (JSON.parse(fs.readFileSync(f, 'utf8')).pages ?? {}) as Record<string, Record<string, unknown>>;
      for (const [k, v] of Object.entries(pages)) {
        const o = { title: str(v.title), description: str(v.description), lead: str(v.lead),
          related: Array.isArray(v.related) ? v.related.map(str).filter(Boolean) : [] };
        if (o.title.length > 60) throw new Error(`r-overrides ${k}: title over 60 chars`);
        if (o.description.length > 160) throw new Error(`r-overrides ${k}: description over 160 chars`);
        cache[k] = o;
      }
    }
  }
  return cache[slug];
}

/** Split a lead into text and internal-link parts. */
export function leadParts(lead: string): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = [];
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  for (let m = re.exec(lead); m; m = re.exec(lead)) {
    if (m.index > last) out.push({ text: lead.slice(last, m.index) });
    out.push({ text: m[1], href: m[2] });
    last = m.index + m[0].length;
  }
  if (last < lead.length) out.push({ text: lead.slice(last) });
  return out;
}
