import type { APIRoute } from 'astro';

// Allow all crawlers, and name the AI crawlers so a later "User-agent: *" change cannot block them by accident
// (goal5 3.2). Answer engines read llms.txt and llms-full.txt.
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Amazonbot', 'Meta-ExternalAgent', 'cohere-ai', 'Bytespider', 'CCBot', 'DuckAssistBot', 'MistralAI-User'];

export const GET: APIRoute = ({ site }) => {
  // /api/ runs live checks against third-party servers: crawlers must not trigger them (s1102m QA P2-24).
  // s1103: /check/?url=... result URLs (600 linked from /readiness/) all canonicalize to /check/. Keep crawlers on real pages.
  const rules = ['Allow: /', 'Disallow: /api/', 'Disallow: /check/?'];
  const lines = ['User-agent: *', ...rules, '', ...AI_BOTS.flatMap((b) => [`User-agent: ${b}`, ...rules, '']), `Sitemap: ${new URL('/sitemap.xml', site).href}`, ''];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
