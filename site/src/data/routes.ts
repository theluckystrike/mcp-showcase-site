// Every built HTML route, for sitemap.xml and llms.txt. Keep in sync with src/pages/.
import { CATEGORIES } from './categories';
import { getServers } from './servers';
import { pagesOfType, pageMeta } from './pages';
import { COMPARISONS } from './compare';

export const BUILT_PAGE_TYPES = ['use-case', 'answer', 'audience', 'client-guide'];

export function allRoutes(): { path: string; priority: number }[] {
  const prio = (p: string, d: number) => pageMeta(p)?.priority ?? d;
  const fixed = ['/', '/servers/', '/use-cases/', '/pricing/', '/connect/', '/developers/', '/developers/hosted-endpoints/', '/developers/tool-contracts/', '/developers/mcp-inspector/', '/compare/', '/services/', '/about/'];
  const out = [
    ...fixed.map((p) => ({ path: p, priority: prio(p, 0.5) })),
    ...BUILT_PAGE_TYPES.flatMap((t) => pagesOfType(t).map((p) => ({ path: p.path, priority: p.priority }))),
    ...COMPARISONS.map((c) => ({ path: `/compare/${c.slug}/`, priority: prio(`/compare/${c.slug}/`, 0.6) })),
    ...CATEGORIES.map((c) => ({ path: `/categories/${c.id}/`, priority: prio(`/categories/${c.id}/`, 0.6) })),
    ...getServers().map((s) => ({ path: `/servers/${s.id}/`, priority: prio(`/servers/${s.id}/`, 0.4) })),
  ];
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.path) ? false : (seen.add(r.path), true)));
}
