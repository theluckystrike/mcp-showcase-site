import type { APIRoute } from 'astro';
import { sitemapChunks, urlset, XML } from '../data/sitemaps';

// s1107: site routes (routes.ts), listed from the sitemap index in sitemap.xml.
export const GET: APIRoute = ({ site }) => new Response(urlset(sitemapChunks()[0].routes, site), XML);
