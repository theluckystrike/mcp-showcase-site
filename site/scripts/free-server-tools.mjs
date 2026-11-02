// Fill or refresh "tools" in ../data/content/free-servers.json from each server's live tools/list.
// Usage (from site/): node scripts/free-server-tools.mjs            -> every server
//                     node scripts/free-server-tools.mjs <repo> ...  -> only these
// Cloudflare blocks some default user agents, so requests send User-Agent: curl/8.7.1.
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), '..', 'data', 'content', 'free-servers.json');
const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
const only = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);
let failed = 0;

for (const s of doc.servers) {
  if (only.length && !only.includes(s.repo)) continue;
  try {
    const res = await fetch(s.hosted_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'User-Agent': 'curl/8.7.1' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      signal: AbortSignal.timeout(20000),
    });
    let text = await res.text();
    // Streamable HTTP may answer as SSE: take the first data: line.
    if (text.startsWith('event:') || text.startsWith('data:')) text = text.split('\n').find((l) => l.startsWith('data:'))?.slice(5) ?? '';
    const tools = JSON.parse(text)?.result?.tools;
    if (!res.ok || !Array.isArray(tools) || tools.length === 0) throw new Error(`HTTP ${res.status}, no tools`);
    s.tools = tools.map((t) => ({ name: t.name, title: t.title ?? '', description: t.description ?? '' }));
    s.tools_checked = today;
    s.added ??= today;
    console.log(`${s.repo}: ${tools.length} tools`);
  } catch (e) {
    failed++;
    console.error(`${s.repo}: FAILED ${e.message}`);
  }
}
fs.writeFileSync(file, JSON.stringify(doc, null, 1) + '\n');
process.exit(failed ? 1 : 0);
