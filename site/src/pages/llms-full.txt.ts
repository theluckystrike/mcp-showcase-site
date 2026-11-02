// llms-full.txt (t-seo): the full catalog in one plain-text file for answer engines.
// Per server: what it does, every tool, price, how to connect, page URL and the source the facts come from.
// Facts come from the same loaders as the pages (catalog.json + data/content/*.json). No counts we cannot prove.
import type { APIRoute } from 'astro';
import { brand } from '../config/brand';
import { getServers, stats, bundlePrice, bundleUrl, buyUrl, type Server } from '../data/servers';
import { getCategory } from '../data/categories';
import { CONTENT_REVIEWED, specUrl } from '../data/schema';

const one = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim();
// Tool descriptions come from the servers' own code and some use " -- " as a dash. Print them with plain punctuation:
// a pair of dashes becomes parentheses, a single one a comma. The words stay the same.
const plainDash = (s: string) => s.replace(/\s--\s([^]*?)\s--\s/g, ' ($1), ').replace(/\s--\s/g, ', ');
// Markdown table cell: one line, pipes escaped.
const cell = (s: string) => one(s).replace(/\|/g, '\\|');
const table = (head: [string, string], rows: [string, string][]) =>
  [`| ${head[0]} | ${head[1]} |`, '| --- | --- |', ...rows.map(([a, b]) => `| ${cell(a)} | ${cell(b)} |`)];

function price(s: Server): string {
  if (s.satellite || !s.paid) return 'Free. No paid tier.';
  if (s.bundleOnly) return `Sold only as the bundle: $${bundlePrice()} once (${buyUrl(bundleUrl(), 'llms', s.id)}).`;
  return `Free tier, no key. Pro: $${s.priceUsd} once per server (${buyUrl(s.buyBase, 'llms', s.id)}), or the $${bundlePrice()} bundle.`;
}

function connect(s: Server): [string, string][] {
  const out: [string, string][] = [];
  if (s.hosted && s.satellite) out.push(['Hosted URL (no token)', s.hostedUrl]);
  else if (s.hosted) out.push(['Hosted URL', `${brand.backend.origin}/mcp/${s.id}/t/<token> (free token: POST ${brand.backend.tokenEndpoint}; 30 days, 600 calls an hour)`]);
  if (s.npm) out.push(['Local', `npx -y ${s.npm}`]);
  if (s.mcpb) out.push(['Claude Desktop bundle', s.mcpb]);
  return out;
}

export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const st = stats();
  const all = getServers();
  const block = (s: Server) => {
    const tools = s.tools.filter((t) => !t.name.startsWith('license_'));
    const fvp = s.freeVsPro;
    // Facts as a two-column table and tools as a table, so no section is a long bullet list.
    const facts: [string, string][] = [
      ['Page', u(`/servers/${s.id}/`)],
      ['Category', getCategory(s.category).name],
      ...(s.forWho.length ? [['For', s.forWho.join(', ')] as [string, string]] : []),
      ['Price', price(s)],
      ...(fvp && s.paid && !s.satellite ? [['Free tier', fvp.free.map(one).join('; ')], ['Pro adds', fvp.pro.map(one).join('; ')]] as [string, string][] : []),
      ...connect(s),
      ['Source of the tool list', specUrl(s)],
    ];
    return [
      `## ${s.name}`,
      '',
      one(s.plain || s.whatItDoes),
      '',
      ...table(['Detail', 'Value'], facts),
      '',
      `### Tools (${tools.length})`,
      '',
      ...table(['Tool', 'What it does'], tools.map((t) => [t.name, plainDash(one(t.plain)) || 'no description'])),
      '',
    ].join('\n');
  };
  const text = [
    `# ${brand.name} full catalog`,
    '',
    `> ${brand.tagline} ${st.servers} MCP servers and ${st.satellites} free calculator servers for Claude, Cursor and any MCP client.`,
    `> Pricing: free tier on every server. Pro is $${brand.pricing.serverUsd} once per server, or $${bundlePrice()} once for all ${st.paid} paid servers. No subscription.`,
    `> Hosted: ${st.hosted} servers run at one URL with a free token (no account). Source code: ${brand.links.github}`,
    `> Last reviewed: ${CONTENT_REVIEWED}. Short index: ${u('/llms.txt')}`,
    '',
    ...all.filter((s) => !s.satellite).map(block),
    '# Free calculator servers',
    '',
    ...all.filter((s) => s.satellite).map(block),
  ].join('\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
