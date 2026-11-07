import type { APIRoute } from 'astro';
import { sitemapChunks, urlset, XML } from '../data/sitemaps';

// s1107: /r/ server reports and the study page, SITEMAP_MAX URLs per file, listed from sitemap.xml.
export function getStaticPaths() {
  return sitemapChunks().slice(1).map((c, i) => ({ params: { n: String(i + 1) }, props: { routes: c.routes } }));
}

export const GET: APIRoute = ({ site, props }) => new Response(urlset((props as any).routes, site), XML);
