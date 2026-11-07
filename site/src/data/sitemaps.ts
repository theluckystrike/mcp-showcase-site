// s1107: sitemap split. sitemap.xml is a sitemap index once there are more than SITEMAP_MAX URLs:
// sitemap-pages.xml holds the site routes (routes.ts), sitemap-r-<n>.xml the /r/ server reports in chunks of SITEMAP_MAX.
import { allRoutes } from './routes';
import { rRoutes } from './readinessServers';
import { CONTENT_REVIEWED } from './schema';

export const SITEMAP_MAX = 5000;
type R = { path: string; priority: number; lastmod?: string };

export function sitemapChunks(): { name: string; routes: R[] }[] {
  const all = rRoutes();
  const isReport = (p: string) => /^\/r\/[^/]+\/$/.test(p);
  const r = all.filter((x) => isReport(x.path));
  const out: { name: string; routes: R[] }[] = [{ name: 'sitemap-pages.xml', routes: [...allRoutes(), ...all.filter((x) => !isReport(x.path))] }];
  for (let i = 0; i < r.length; i += SITEMAP_MAX) out.push({ name: `sitemap-r-${i / SITEMAP_MAX + 1}.xml`, routes: r.slice(i, i + SITEMAP_MAX) });
  return out;
}

export function urlset(routes: R[], site: URL | undefined): string {
  const urls = routes
    .map((r) => `  <url><loc>${new URL(r.path, site).href}</loc><lastmod>${r.lastmod ?? CONTENT_REVIEWED}</lastmod><priority>${r.priority.toFixed(1)}</priority></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const XML = { headers: { 'Content-Type': 'application/xml; charset=utf-8' } };
