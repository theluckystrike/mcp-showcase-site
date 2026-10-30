// JSON-LD and GEO builders (owner: t-seo). Layout.astro joins every page's JSON-LD into ONE @graph:
// Organization + WebSite + WebPage + BreadcrumbList + the page's own nodes, linked by @id.
// Sources: seo.json json_ld (t-angle), seo-geo-sprint-goal5 Phase 3.1 (entity graph, isBasedOn, speakable).
// Forbidden (BRIEF rule 9, seo.json): AggregateRating, Review, user/install/download counts.
import { brand } from '../config/brand';
import { getServer, type Server } from './servers';
import { pageMeta } from './pages';
import { getJob } from './content';

/** Date of the last real content review. Used for sitemap lastmod and WebPage dateModified.
 *  Change it only when the content changes (goal5 5.5: no fake freshness). Not the build date. */
export const CONTENT_REVIEWED = '2026-10-30';

type Node = Record<string, unknown>;
const FORBIDDEN = new Set(['AggregateRating', 'Review']);

export const ids = (site: URL) => ({
  org: new URL('/#organization', site).href,
  website: new URL('/#website', site).href,
});

export function organizationNode(site: URL): Node {
  return {
    '@type': 'Organization',
    '@id': ids(site).org,
    name: brand.name,
    url: site.href,
    description: brand.description,
    logo: { '@type': 'ImageObject', url: new URL('/favicon.svg', site).href },
    sameAs: [brand.links.github],
    knowsAbout: ['Model Context Protocol', 'MCP servers', 'Claude connectors', 'invoicing', 'bookkeeping', 'accounts payable', 'PDF documents'],
  };
}

export function websiteNode(site: URL): Node {
  return { '@type': 'WebSite', '@id': ids(site).website, name: brand.name, url: site.href, inLanguage: 'en', publisher: { '@id': ids(site).org } };
}

/** Public spec of a server: the tool list every claim on the page is checked against (BRIEF rule 9). */
// These servers have no SPEC.md in the public repo (checked 2026-10-30, git tree of theluckystrike/mcp-servers).
// Their tool list comes from the source file (BRIEF section 8).
const NO_SPEC: Record<string, string> = {
  budget: 'src/index.js', 'loan-calculator': 'src/index.js', 'office-suite': 'src/index.ts', payroll: 'src/index.js',
  pomodoro: 'src/index.js', receipts: 'src/index.js', 'stripe-billing': 'src/index.js', 'tax-calc': 'src/index.js',
};
export function specUrl(s: Server): string {
  if (s.satellite) return s.repo || brand.links.github;
  return `${brand.links.github}/blob/main/servers/${s.id}/${NO_SPEC[s.id] ?? 'SPEC.md'}`;
}
export const specName = (s: Server): string =>
  s.satellite ? `${s.name} source repository` : NO_SPEC[s.id] ? `${s.name} source code (${NO_SPEC[s.id]})` : `${s.name} tool specification (SPEC.md)`;

/** GEO citation block for a job or answer page: one quotable answer, the keyword it targets, and its source.
 *  The answer text is the page's visible 40-word answer (JobPage.astro), so schema and HTML say the same thing. */
export interface Citation { text: string; keyword: string; sources: { name: string; url: string }[] }
export function citationFor(pagePath: string): Citation | null {
  const p = pageMeta(pagePath);
  if (!p || !['use-case', 'answer'].includes(p.page_type)) return null;
  const text = getJob(pagePath)?.answer?.trim();
  if (!text) return null;
  const servers = p.servers.map((id) => getServer(id)).filter((s): s is Server => Boolean(s));
  return {
    text,
    keyword: p.primary_keyword || p.h1,
    sources: servers.map((s) => ({ name: specName(s), url: specUrl(s) })),
  };
}

interface PageInput {
  url: string;
  title: string;
  description: string;
  hasBreadcrumb: boolean;
  /** CSS selector of the visible quotable answer, when the page has one. */
  speakable?: string;
  citation?: Citation | null;
}

export function webPageNode(site: URL, p: PageInput): Node {
  return {
    '@type': 'WebPage',
    '@id': `${p.url}#webpage`,
    url: p.url,
    name: p.title,
    description: p.description,
    inLanguage: 'en',
    isPartOf: { '@id': ids(site).website },
    publisher: { '@id': ids(site).org },
    dateModified: CONTENT_REVIEWED,
    primaryImageOfPage: { '@type': 'ImageObject', url: new URL('/og.png', site).href, width: 1200, height: 630 },
    ...(p.hasBreadcrumb ? { breadcrumb: { '@id': `${p.url}#breadcrumb` } } : {}),
    ...(p.speakable ? { speakable: { '@type': 'SpeakableSpecification', cssSelector: [p.speakable] } } : {}),
    ...(p.citation?.sources.length
      ? { isBasedOn: p.citation.sources.map((s) => ({ '@type': 'CreativeWork', name: s.name, url: s.url })) }
      : {}),
  };
}

export function breadcrumbNode(site: URL, url: string, crumbs: { name: string; path: string }[]): Node {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [{ name: 'Home', path: '/' }, ...crumbs].map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: new URL(c.path, site).href,
    })),
  };
}

/** Clean one page node and link it to the entity graph. Returns null for nodes we must not emit. */
function linkNode(n: Node, site: URL, url: string): Node | null {
  const { '@context': _ctx, ...o } = n;
  const t = String(o['@type'] ?? '');
  if (!t || FORBIDDEN.has(t)) return null;
  const org = { '@id': ids(site).org };
  if (t === 'FAQPage') {
    const qs = (o.mainEntity as Node[] | undefined)?.filter((q) => q?.name && (q.acceptedAnswer as Node | undefined)?.text);
    if (!qs?.length) return null;
    return { ...o, mainEntity: qs, '@id': `${url}#faq`, isPartOf: { '@id': `${url}#webpage` } };
  }
  if (t === 'SoftwareApplication' || t === 'WebApplication') {
    const offers = (Array.isArray(o.offers) ? o.offers : o.offers ? [o.offers] : []) as Node[];
    // Server entity (@id = /servers/<id>/#app): add its page, spec, npm package and real tool names (seo.json: codeRepository via sameAs).
    const sid = /\/servers\/([^/]+)\/#app$/.exec(String(o['@id'] ?? ''))?.[1];
    const srv = sid ? getServer(sid) : undefined;
    const extra: Node = srv ? {
      url: new URL(`/servers/${srv.id}/`, site).href,
      description: o.description ?? srv.tagline,
      sameAs: [specUrl(srv), ...(srv.npm ? [`https://www.npmjs.com/package/${srv.npm}`] : [])],
      featureList: srv.tools.filter((x) => !x.name.startsWith('license_')).slice(0, 30).map((x) => x.name).join(', '),
      ...(srv.version ? { softwareVersion: srv.version } : {}),
    } : {};
    const sameAs = [...new Set([...((extra.sameAs as string[]) ?? []), ...[o.sameAs ?? []].flat().map(String)])];
    return {
      ...extra,
      ...o,
      ...(sameAs.length ? { sameAs } : {}),
      publisher: o.publisher ?? org,
      isAccessibleForFree: offers.some((x) => String(x.price) === '0') || undefined,
      offers: offers.filter((x) => x.price != null && x.price !== '' && !Number.isNaN(Number(x.price))).map((x) => ({ ...x, priceCurrency: x.priceCurrency ?? 'USD', seller: org })),
    };
  }
  if (t === 'Article' || t === 'TechArticle') {
    return { ...o, author: o.author ?? org, publisher: o.publisher ?? org, dateModified: o.dateModified ?? CONTENT_REVIEWED, mainEntityOfPage: { '@id': `${url}#webpage` } };
  }
  if (t === 'HowTo') {
    const step = (o.step as Node[] | undefined)?.filter((s) => s?.text);
    if (!step?.length) return null;
    return { ...o, step };
  }
  if (t === 'BreadcrumbList') return null; // Layout builds the one breadcrumb from `crumbs`.
  return o;
}

/** The single JSON-LD document for a page. */
export function buildGraph(site: URL, page: PageInput, crumbs: { name: string; path: string }[], extra: Node[]): Node {
  const webPage = webPageNode(site, page);
  const nodes: Node[] = [organizationNode(site), websiteNode(site), webPage];
  if (crumbs.length) nodes.push(breadcrumbNode(site, page.url, crumbs));
  for (const n of extra) {
    // A CollectionPage is this page: fold it into the WebPage node instead of a second page entity.
    if (n['@type'] === 'CollectionPage') { webPage['@type'] = 'CollectionPage'; if (n.name) webPage.name = n.name; continue; }
    const x = linkNode(n, site, page.url);
    if (x) nodes.push(JSON.parse(JSON.stringify(x))); // drops undefined keys
  }
  return { '@context': 'https://schema.org', '@graph': nodes };
}
