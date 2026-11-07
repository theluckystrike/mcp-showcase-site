import type { APIRoute } from 'astro';
import { sitemapChunks, urlset, SITEMAP_MAX, XML } from '../data/sitemaps';

// lastmod = the date of the last real content review (src/data/schema.ts), not the build date.
// A build-date lastmod changes on every deploy and tells crawlers that unchanged pages changed (goal5 5.5).
// s1107: more than SITEMAP_MAX URLs in all = this file is a sitemap index of sitemap-pages.xml and sitemap-r-<n>.xml.
export const GET: APIRoute = ({ site }) => {
  const chunks = sitemapChunks();
  const total = chunks.reduce((a, c) => a + c.routes.length, 0);
  if (total <= SITEMAP_MAX) return new Response(urlset(chunks.flatMap((c) => c.routes), site), XML);
  const items = chunks.map((c) => {
    const last = c.routes.map((r) => r.lastmod ?? '').sort().pop();
    return `  <sitemap><loc>${new URL(`/${c.name}`, site).href}</loc>${last ? `<lastmod>${last}</lastmod>` : ''}</sitemap>`;
  });
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>\n`, XML);
};
