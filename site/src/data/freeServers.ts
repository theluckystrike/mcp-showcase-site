// Free live-data MCP servers (s1102, 2026-11-02): /free-servers/, /free-servers/<repo>/ and the home page section.
// ONE data file: ../data/content/free-servers.json. To add a server, append an object to its "servers" array.
// No token, no account: each server answers at its own hosted URL (Cloudflare Worker, Streamable HTTP).
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR } from './servers';

export interface FreeTool { name: string; title: string; description: string }
export interface FreeServer {
  repo: string;
  topic: string;
  name: string;
  tagline: string;
  knows: string[];
  sources: string;
  hostedUrl: string;
  repoUrl: string;
  npm: string;
  moneySite: { name: string; url: string } | null;
  prompts: string[];
  tools: FreeTool[];
  toolsChecked: string;
  added: string;
  /** Page path, /free-servers/<repo>/ */
  path: string;
  /** "<topic> MCP server", the query the page targets. */
  h1: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

let cache: FreeServer[] | null = null;

export function getFreeServers(): FreeServer[] {
  if (cache) return cache;
  const file = path.join(CONTENT_DIR, 'free-servers.json');
  let raw: Record<string, unknown>[] = [];
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8')).servers ?? [];
  } catch (e) {
    console.warn(`[free-servers] cannot read ${file}: ${(e as Error).message}`);
  }
  const seen = new Set<string>();
  cache = raw
    .map((r): FreeServer | null => {
      const repo = str(r.repo);
      const topic = str(r.topic);
      const hostedUrl = str(r.hosted_url);
      if (!/^[a-z0-9-]+$/.test(repo) || !topic || !hostedUrl || seen.has(repo)) {
        if (repo) console.warn(`[free-servers] skipped ${repo}: needs repo, topic and hosted_url, and a unique repo`);
        return null;
      }
      seen.add(repo);
      const ms = r.money_site as Record<string, unknown> | undefined;
      const tools = Array.isArray(r.tools)
        ? (r.tools as Record<string, unknown>[]).map((t) => ({ name: str(t?.name), title: str(t?.title), description: str(t?.description) })).filter((t) => t.name)
        : [];
      return {
        repo,
        topic,
        name: str(r.name) || topic,
        tagline: str(r.tagline),
        knows: strArr(r.knows),
        sources: str(r.sources),
        hostedUrl,
        repoUrl: str(r.repo_url) || `https://github.com/theluckystrike/${repo}`,
        npm: str(r.npm),
        moneySite: ms && str(ms.url) ? { name: str(ms.name) || str(ms.url), url: str(ms.url) } : null,
        prompts: strArr(r.prompts),
        tools,
        toolsChecked: str(r.tools_checked),
        added: str(r.added),
        path: `/free-servers/${repo}/`,
        h1: `${topic} MCP server`,
      };
    })
    .filter((x): x is FreeServer => x !== null);
  return cache;
}

export const getFreeServer = (repo: string) => getFreeServers().find((s) => s.repo === repo);

/** Tool table text: the first one or two sentences of the live description, at most ~240 chars. */
export function shortDescription(d: string, max = 240): string {
  const clean = d.replace(/\s+/g, ' ').trim();
  // Split only where a sentence end is followed by a capital letter, so "U.S. federal" and "5 U.S.C. 6103" stay whole.
  const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z])/);
  let out = '';
  for (const s of sentences) {
    const next = (out + ' ' + s.trim()).trim();
    if (out && next.length > max) break;
    out = next;
    if (out.length > max * 0.6) break;
  }
  return out.length > max + 40 ? out.slice(0, max).replace(/\s+\S*$/, '') + '...' : out;
}

/** Money-site link. Absolute URLs get UTM tags (site visitors, not tool results). Paths stay internal. */
export function moneyHref(s: FreeServer, slot: string): string {
  if (!s.moneySite) return '';
  const u = s.moneySite.url;
  if (u.startsWith('/')) return u;
  const sep = u.includes('?') ? '&' : '?';
  return `${u}${sep}utm_source=mcpstamp&utm_medium=referral&utm_campaign=free-servers&utm_content=${s.repo}-${slot}`;
}

/** Short client key used in config snippets (repo without the -mcp suffix). */
export const clientKey = (s: FreeServer) => s.repo.replace(/-mcp$/, '');

export function installLines(s: FreeServer) {
  const key = clientKey(s);
  return {
    claudeAi: s.hostedUrl,
    claudeCode: `claude mcp add --transport http ${key} ${s.hostedUrl}`,
    cursor: JSON.stringify({ mcpServers: { [key]: { url: s.hostedUrl } } }, null, 2),
    vscode: JSON.stringify({ servers: { [key]: { type: 'http', url: s.hostedUrl } } }, null, 2),
    local: s.npm ? `npx -y ${s.npm}` : '',
  };
}

/** Newest "added" or "tools_checked" date, for sitemap lastmod of these pages. */
export const freeServerLastmod = (s?: FreeServer): string => {
  const list = s ? [s] : getFreeServers();
  return list.flatMap((x) => [x.added, x.toolsChecked]).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().pop() ?? '';
};

/**
 * s1103: the 9 satellite servers in /servers/<id>/ are the same hosted Workers as /free-servers/<id>-mcp/.
 * Two pages for one server split Google's signals. /free-servers/<repo>/ is the canonical page (H1 = query phrase).
 * Returns the free-servers path for a satellite with a matching free-servers entry, else undefined.
 */
export function freeServerPathFor(s: { id: string; satellite?: boolean }): string | undefined {
  if (!s.satellite) return undefined;
  return getFreeServers().find((f) => f.repo === `${s.id}-mcp`)?.path;
}
/** The page a server link should point to: the canonical free-servers page for a satellite, else /servers/<id>/. */
export const serverHref = (s: { id: string; satellite?: boolean }): string => freeServerPathFor(s) ?? `/servers/${s.id}/`;
