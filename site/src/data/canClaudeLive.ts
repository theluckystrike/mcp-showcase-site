// s1103: /can-claude/<slug>/ answer pages backed by one free live-data server.
// Data: ../data/content/can-claude-live.json (generator: ~/mcp-servers/data/s1103/stamp/make_can_claude_live.py).
// Each example is a real tools/call result from the hosted server, with the date it ran.
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR, getServers } from './servers';
import { brand } from '../config/brand';
import { getFreeServer, type FreeServer } from './freeServers';

export interface LiveExample { prompt: string; tool: string; args: Record<string, unknown>; result: string; note: string; is_error: boolean; run: string }
export interface LiveAnswer {
  slug: string; path: string; repo: string; server: FreeServer;
  h1: string; title: string; query: string; answer: string;
  native: string[]; needs: string[];
  example: LiveExample; example2?: LiveExample;
  faq: { q: string; a: string }[];
  /** s1103 canclaude2: true for a catalog server on mcp.zovo.one (free token in the URL), false for a no-token satellite. */
  tokenRequired: boolean;
}

/**
 * s1103 canclaude2: a catalog server (mcp.zovo.one, free token) shaped like a FreeServer so the same template renders it.
 * hostedUrl carries the literal <token> placeholder; path is /servers/<id>/.
 */
function catalogAsFree(id: string): FreeServer | undefined {
  const c = getServers().find((x) => x.id === id && x.hosted && !x.satellite);
  if (!c) return undefined;
  return {
    repo: c.id, topic: c.name, name: c.name, tagline: c.tagline, knows: [], sources: '',
    hostedUrl: `${brand.backend.origin}/mcp/${c.id}/t/<token>`, repoUrl: '', npm: c.npm, moneySite: null, prompts: [],
    tools: c.tools.filter((t) => !t.name.startsWith('license_')).map((t) => ({ name: t.name, title: t.name, description: t.plain })),
    toolsChecked: '', added: '', path: `/servers/${c.id}/`, h1: `${c.name} MCP server`,
  };
}

let cache: LiveAnswer[] | null = null;
export function getLiveAnswers(): LiveAnswer[] {
  if (cache) return cache;
  let raw: Record<string, unknown>[] = [];
  try {
    raw = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'can-claude-live.json'), 'utf8')).pages ?? [];
  } catch (e) {
    console.warn(`[can-claude-live] cannot read: ${(e as Error).message}`);
  }
  cache = raw
    .map((r) => {
      const free = getFreeServer(String(r.repo));
      const server = free ?? (r.server_id ? catalogAsFree(String(r.server_id)) : undefined);
      if (!server) { console.warn(`[can-claude-live] skipped ${r.slug}: no free server ${r.repo} and no catalog server ${r.server_id}`); return null; }
      return { ...(r as unknown as LiveAnswer), server, tokenRequired: !free, path: `/can-claude/${r.slug}/` };
    })
    .filter((x): x is LiveAnswer => x !== null);
  return cache;
}
/** Live answer pages that use this free server (for links from /free-servers/<repo>/). */
export const liveAnswersFor = (repo: string) => getLiveAnswers().filter((a) => a.repo === repo);
/** Live answer pages that use this catalog server (for links from /servers/<id>/). */
export const liveAnswersForServer = (id: string) => getLiveAnswers().filter((a) => a.tokenRequired && a.server.repo === id);
