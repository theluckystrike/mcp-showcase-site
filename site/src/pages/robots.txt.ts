import type { APIRoute } from 'astro';

// Allow all crawlers, and name the AI crawlers so a later "User-agent: *" change cannot block them by accident
// (goal5 3.2). Answer engines read llms.txt and llms-full.txt.
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Amazonbot', 'Meta-ExternalAgent', 'cohere-ai', 'Bytespider', 'CCBot', 'DuckAssistBot', 'MistralAI-User'];

export const GET: APIRoute = ({ site }) => {
  const lines = ['User-agent: *', 'Allow: /', '', ...AI_BOTS.flatMap((b) => [`User-agent: ${b}`, 'Allow: /', '']), `Sitemap: ${new URL('/sitemap.xml', site).href}`, ''];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
