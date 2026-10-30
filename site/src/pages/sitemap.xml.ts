import type { APIRoute } from 'astro';
import { allRoutes } from '../data/routes';

export const GET: APIRoute = ({ site }) => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = allRoutes()
    .map((r) => `  <url><loc>${new URL(r.path, site).href}</loc><lastmod>${today}</lastmod><priority>${r.priority.toFixed(1)}</priority></url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
