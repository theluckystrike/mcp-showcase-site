// llms-full.txt (t-seo): the full catalog in one plain-text file for answer engines.
// Per server: what it does, every tool, price, how to connect, page URL and the source the facts come from.
// Facts come from the same loaders as the pages (catalog.json + data/content/*.json). No counts we cannot prove.
import type { APIRoute } from 'astro';
import { brand } from '../config/brand';
import { getServers, stats, bundlePrice, bundleUrl, buyUrl, type Server } from '../data/servers';
import { getCategory } from '../data/categories';
import { CONTENT_REVIEWED, specUrl } from '../data/schema';

const one = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim();

function price(s: Server): string {
  if (s.satellite || !s.paid) return 'Free. No paid tier.';
  if (s.bundleOnly) return `Sold only as the bundle: $${bundlePrice()} once (${buyUrl(bundleUrl(), 'llms', s.id)}).`;
  return `Free tier, no key. Pro: $${s.priceUsd} once per server (${buyUrl(s.buyBase, 'llms', s.id)}), or the $${bundlePrice()} bundle.`;
}

function connect(s: Server): string[] {
  const out: string[] = [];
  if (s.hosted && s.satellite) out.push(`Hosted URL (no token): ${s.hostedUrl}`);
  else if (s.hosted) out.push(`Hosted URL: ${brand.backend.origin}/mcp/${s.id}/t/<token> (free token: POST ${brand.backend.tokenEndpoint}; 30 days, 600 calls an hour)`);
  if (s.npm) out.push(`Local: npx -y ${s.npm}`);
  if (s.mcpb) out.push(`Claude Desktop bundle: ${s.mcpb}`);
  return out;
}

export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const st = stats();
  const all = getServers();
  const block = (s: Server) => {
    const tools = s.tools.filter((t) => !t.name.startsWith('license_'));
    const fvp = s.freeVsPro;
    return [
      `## ${s.name}`,
      '',
      `- Page: ${u(`/servers/${s.id}/`)}`,
      `- Category: ${getCategory(s.category).name}`,
      `- What it does: ${one(s.plain || s.whatItDoes)}`,
      ...(s.forWho.length ? [`- For: ${s.forWho.join(', ')}`] : []),
      `- Price: ${price(s)}`,
      ...(fvp && s.paid && !s.satellite ? [`- Free tier: ${fvp.free.map(one).join('; ')}`, `- Pro adds: ${fvp.pro.map(one).join('; ')}`] : []),
      ...connect(s).map((c) => `- ${c}`),
      `- Source of the tool list: ${specUrl(s)}`,
      '',
      `### Tools (${tools.length})`,
      ...tools.map((t) => `- ${t.name}: ${one(t.plain) || 'no description'}`),
      '',
    ].join('\n');
  };
  const text = [
    `# ${brand.name}: full catalog`,
    '',
    `> ${brand.tagline} ${st.servers} MCP servers and ${st.satellites} free calculator servers for Claude, ChatGPT, Cursor and any MCP client.`,
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
