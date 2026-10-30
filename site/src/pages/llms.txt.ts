// llms.txt (llmstxt.org format, seo.json llms_txt): facts, jobs, connect guides, one line per server with its page URL.
import type { APIRoute } from 'astro';
import { brand } from '../config/brand';
import { getServers, stats, bundlePrice } from '../data/servers';
import { pagesOfType } from '../data/pages';
import { COMPARISONS } from '../data/compare';

export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const st = stats();
  const servers = getServers();
  const line = (s: (typeof servers)[number]) =>
    `- [${s.name}](${u(`/servers/${s.id}/`)}): ${s.tagline.replace(/\s+/g, ' ')} (${s.satellite ? 'free calculator, hosted URL' : `${s.hosted ? 'hosted URL' : 'local install'}, ${s.bundleOnly ? `bundle $${bundlePrice()}` : s.paid ? `free tier, Pro $${s.priceUsd} once` : 'free'}`})`;
  const lines = [
    `# ${brand.name}`,
    '',
    `> ${brand.tagline} ${st.servers} MCP servers make real files (PDF invoices, Word, Excel, reports) from Claude, ChatGPT, Cursor and any MCP client.`,
    `> ${st.hosted} servers run at one hosted URL: free token, no account, 600 calls an hour, valid 30 days.`,
    `> Every server has a free tier. Pro is $${brand.pricing.serverUsd} once per server, or $${bundlePrice()} once for all ${st.paid} paid servers. No subscription.`,
    `> Open source (MIT). Also ${st.satellites} free calculator servers.`,
    '',
    '## Jobs',
    ...pagesOfType('use-case').map((p) => `- [${p.h1}](${u(p.path)}): ${p.meta_description} Server: ${p.servers.join(', ')}.`),
    ...pagesOfType('answer').map((p) => `- [${p.h1}](${u(p.path)}): ${p.meta_description}`),
    '',
    '## Connect',
    ...pagesOfType('client-guide').map((p) => `- [${p.h1}](${u(p.path)}): ${p.meta_description}`),
    '',
    '## Servers',
    ...servers.filter((s) => !s.satellite).map(line),
    '',
    '## Free calculators',
    ...servers.filter((s) => s.satellite).map(line),
    '',
    '## Pricing',
    `- [Pricing](${u('/pricing/')}): Free tier, $${brand.pricing.serverUsd} once per server, $${bundlePrice()} once for all ${st.paid} paid servers. Buy at ${brand.backend.origin}/buy/bundle.`,
    '',
    '## Developers',
    `- [For developers](${u('/developers/')}): stdio and hosted endpoints, tool contracts, npm packages, .mcpb bundles.`,
    `- [Source code](${brand.links.github}): MIT licence.`,
    '',
    '## Optional',
    ...pagesOfType('audience').map((p) => `- [${p.h1}](${u(p.path)}): ${p.meta_description}`),
    ...COMPARISONS.map((c) => `- [${brand.name} vs ${c.name}](${u(`/compare/${c.slug}/`)}): honest comparison.`),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
