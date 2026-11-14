// Every built HTML route, for sitemap.xml and llms.txt. Keep in sync with src/pages/.
import { CATEGORIES } from './categories';
import { getServers } from './servers';
import { pagesOfType, pageMeta } from './pages';
import { COMPARISONS } from './compare';
import { getFreeServers, freeServerLastmod, freeServerPathFor } from './freeServers';
import { getReadiness, readinessPublished } from './readiness';
import { PAGE_MODIFIED } from './schema';
import { getLiveAnswers } from './canClaudeLive';
import { getRData } from './readinessServers';

export const BUILT_PAGE_TYPES = ['use-case', 'answer', 'audience', 'client-guide'];

export function allRoutes(): { path: string; priority: number; lastmod?: string }[] {
  const prio = (p: string, d: number) => pageMeta(p)?.priority ?? d;
  const fixed = ['/', '/servers/', '/use-cases/', '/pricing/', '/connect/', '/developers/', '/developers/hosted-endpoints/', '/developers/tool-contracts/', '/developers/mcp-inspector/', '/compare/', '/services/', '/about/', '/run-your-own-mcp-stack/'];
  // s1114: /badge/ (publisher badge page) only when the /r/ reports exist.
  if (getRData()?.rows.length) fixed.push('/badge/');
  const out = [
    ...fixed.map((p) => ({ path: p, priority: prio(p, 0.5) })),
    ...['/terms/', '/privacy/'].map((p) => ({ path: p, priority: prio(p, 0.2) })),
    ...BUILT_PAGE_TYPES.flatMap((t) => pagesOfType(t).map((p) => ({ path: p.path, priority: p.priority }))),
    ...COMPARISONS.map((c) => ({ path: `/compare/${c.slug}/`, priority: prio(`/compare/${c.slug}/`, 0.6) })),
    ...CATEGORIES.map((c) => ({ path: `/categories/${c.id}/`, priority: prio(`/categories/${c.id}/`, 0.6) })),
    // s1103: satellites whose canonical page is /free-servers/<repo>/ are left out (a sitemap lists canonical URLs only).
    ...getServers().filter((s) => !freeServerPathFor(s)).map((s) => ({ path: `/servers/${s.id}/`, priority: prio(`/servers/${s.id}/`, 0.4) })),
    // Free live-data servers (s1102): own lastmod = date added or tools re-checked (data/content/free-servers.json).
    ...(getFreeServers().length ? [{ path: '/free-servers/', priority: 0.7, lastmod: freeServerLastmod() || undefined }] : []),
    ...getFreeServers().map((s) => ({ path: s.path, priority: 0.6, lastmod: freeServerLastmod(s) || undefined })),
    ...(getFreeServers().length ? [{ path: '/free-servers/privacy/', priority: 0.2 }] : []),
    // s1103: /can-claude/ index and live-data answer pages.
    { path: '/can-claude/', priority: 0.7, lastmod: '2026-11-03' },
    ...getLiveAnswers().map((a) => ({ path: a.path, priority: 0.7, lastmod: '2026-11-03' })),
    // McpStamp Check + Readiness Index (s1102m). /readiness/ only with real scan data (sample or missing = noindex).
    { path: '/check/', priority: 0.8 },
    ...(readinessPublished() ? [{ path: '/readiness/', priority: 0.7, lastmod: getReadiness()!.generated_at.slice(0, 10) || undefined }] : []),
  ];
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.path) ? false : (seen.add(r.path), true)))
    .map((r) => (r.lastmod || !PAGE_MODIFIED[r.path] ? r : { ...r, lastmod: PAGE_MODIFIED[r.path] }));
}
