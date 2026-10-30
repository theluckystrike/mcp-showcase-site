import type { APIRoute } from 'astro';
import { allRoutes } from '../data/routes';
import { CONTENT_REVIEWED } from '../data/schema';

// lastmod = the date of the last real content review (src/data/schema.ts), not the build date.
// A build-date lastmod changes on every deploy and tells crawlers that unchanged pages changed (goal5 5.5).
export const GET: APIRoute = ({ site }) => {
  const urls = allRoutes()
    .map((r) => `  <url><loc>${new URL(r.path, site).href}</loc><lastmod>${CONTENT_REVIEWED}</lastmod><priority>${r.priority.toFixed(1)}</priority></url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
