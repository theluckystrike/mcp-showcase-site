// s1103: /can-claude/<slug>/ answer pages backed by one free live-data server.
// Data: ../data/content/can-claude-live.json (generator: ~/mcp-servers/data/s1103/stamp/make_can_claude_live.py).
// Each example is a real tools/call result from the hosted server, with the date it ran.
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR } from './servers';
import { getFreeServer, type FreeServer } from './freeServers';

export interface LiveExample { prompt: string; tool: string; args: Record<string, unknown>; result: string; note: string; is_error: boolean; run: string }
export interface LiveAnswer {
  slug: string; path: string; repo: string; server: FreeServer;
  h1: string; title: string; query: string; answer: string;
  native: string[]; needs: string[];
  example: LiveExample; example2?: LiveExample;
  faq: { q: string; a: string }[];
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
      const server = getFreeServer(String(r.repo));
      if (!server) { console.warn(`[can-claude-live] skipped ${r.slug}: no free server ${r.repo}`); return null; }
      return { ...(r as unknown as LiveAnswer), server, path: `/can-claude/${r.slug}/` };
    })
    .filter((x): x is LiveAnswer => x !== null);
  return cache;
}
/** Live answer pages that use this free server (for links from /free-servers/<repo>/). */
export const liveAnswersFor = (repo: string) => getLiveAnswers().filter((a) => a.repo === repo);
