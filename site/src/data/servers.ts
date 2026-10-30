// Data loaders. They run at build time only (Node). No data reaches the client unless a page passes it to an island.
// Sources (BRIEF section 5 and 6):
//   ../data/catalog.json          58 servers, always present
//   ../data/content/*.json        {"servers":[...]} per content agent, may be missing, partial or full
//   ../data/content/pricing.json  optional, see src/data/content.ts
// Every field falls back to catalog data, so the site builds with zero content files.
import fs from 'node:fs';
import path from 'node:path';
import { brand } from '../config/brand';
import { CATEGORY_IDS, FALLBACK_CATEGORY } from './categories';

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), '..', 'data');
export const CONTENT_DIR = path.join(DATA_DIR, 'content');

// ---------- raw types ----------
interface RawTool { name: string; description: string }
interface RawServer {
  id: string; human: string; npm?: string; version?: string; description?: string; website?: string;
  buy_url?: string | null; price_usd?: number | null; paid?: boolean | null; hosted_live?: boolean; hosted_tools?: number; hosted_url?: string;
  mcpb?: string; what_it_does?: string; tools?: RawTool[]; readme_head?: string;
}
interface RawCatalog { bundle_price_usd?: number; bundle_url?: string; count?: number; servers: RawServer[] }

/** via = child server that owns the tool (office-suite proxies its children, so steps may name child tools). */
export interface CaseStep { tool: string; does: string; via?: string }
export interface ServerCase {
  title: string; persona?: string; prompt: string; steps: CaseStep[]; result?: string;
  minutes_saved?: number; minutes_basis?: string;
}
export interface Tool { name: string; plain: string }
export interface Faq { q: string; a: string }
export interface FreeVsPro { free: string[]; pro: string[]; source?: string }

export interface Server {
  id: string;
  name: string;
  category: string;
  tagline: string;
  plain: string;
  whatItDoes: string;
  forWho: string[];
  outcomeChips: string[];
  cases: ServerCase[];
  tryPrompts: string[];
  topTools: Tool[];
  tools: Tool[];
  freeVsPro: FreeVsPro | null;
  keywords: string[];
  faq: Faq[];
  hosted: boolean;
  hostedUrl: string;
  mcpb: string;
  npm: string;
  version: string;
  priceUsd: number;
  /** false when the server has no Pro gate (catalog `paid`, BRIEF section 8). No single-server buy button then. */
  paid: boolean;
  /** Sold only as the bundle (office-suite: price = bundle price). Buy links go to /buy/bundle. */
  bundleOnly: boolean;
  /** One of the 9 free satellite servers (data/content/satellites.json). Not in catalog.json. */
  satellite: boolean;
  repo: string;
  buyBase: string;
  website: string;
  hasContent: boolean;
}

// ---------- helpers ----------
function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (e) {
    if (fs.existsSync(file)) console.warn(`[data] cannot parse ${file}: ${(e as Error).message}`);
    return null;
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : [];

function firstSentence(s: string, max = 160): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  const m = clean.match(/^(.+?[.!?])(\s|$)/);
  const out = m ? m[1] : clean;
  return out.length > max ? out.slice(0, max - 1).replace(/\s+\S*$/, '') + '...' : out;
}

function stripMd(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Catalog tools[] is clean since the 13:55 fix (552 real tools). The parameter-row guard stays for old catalogs only.
const PARAM_ROW = /^[^|]{1,60}\|\s*(yes|no|required|optional)\s*\|/i;
function cleanTools(raw: RawTool[] = [], readme = ''): Tool[] {
  const seen = new Set<string>();
  const out: Tool[] = [];
  for (const t of raw) {
    const name = str(t.name);
    const desc = str(t.description);
    if (!name || seen.has(name) || PARAM_ROW.test(desc)) continue;
    seen.add(name);
    out.push({ name, plain: desc ? firstSentence(desc, 220) : '' });
  }
  if (out.length === 0 && readme) {
    // Fallback: README bullet list "- `tool_name` — what it does".
    for (const m of readme.matchAll(/^[-*]\s+`([a-z0-9_]+)`\s*[—:-]+\s*(.+)$/gim)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      out.push({ name: m[1], plain: firstSentence(stripMd(m[2]), 220) });
    }
  }
  return out;
}

function readmeParagraph(readme = ''): string {
  for (const block of readme.split(/\n\s*\n/)) {
    const b = block.trim();
    if (!b || b.startsWith('#') || b.startsWith('!') || b.startsWith('```') || b.startsWith('-')) continue;
    if (/^\*\*(In the|Listed|Featured)/.test(b) || /^In the \[official/.test(b)) continue;
    const t = stripMd(b);
    if (t.length > 60) return t;
  }
  return '';
}

function tryPrompts(readme = ''): string[] {
  const m = readme.match(/##\s*Try it\s*\n([\s\S]*?)(\n##|$)/i);
  if (!m) return [];
  return [...m[1].matchAll(/^[-*]\s+"?(.+?)"?\s*$/gm)].map((x) => stripMd(x[1]).replace(/^"|"$/g, '')).slice(0, 4);
}

// No paid tier when every "pro" line of the content says unknown / no extra features (t-content, t-money: 49 paid of 58).
function isFreeOnly(fvp?: Record<string, unknown>): boolean {
  const pro = strArr(fvp?.pro);
  return pro.length > 0 && pro.every((x) => /^(unknown|no extra|none)/i.test(x));
}

const isPlaceholder = (s = '') => !s || /^MCP server: /i.test(s);

// ---------- content files ----------
type ContentItem = Record<string, unknown> & { id?: string };

function loadContentItems(): Map<string, ContentItem> {
  const map = new Map<string, ContentItem>();
  if (!fs.existsSync(CONTENT_DIR)) return map;
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json')).sort();
  for (const f of files) {
    const j = readJson<{ servers?: ContentItem[] }>(path.join(CONTENT_DIR, f));
    if (!j || !Array.isArray(j.servers)) continue;
    for (const item of j.servers) {
      const id = str(item?.id);
      if (!id) continue;
      map.set(id, { ...(map.get(id) ?? {}), ...item });
    }
  }
  return map;
}

function parseCases(v: unknown, toolNames: Set<string>, id: string): ServerCase[] {
  if (!Array.isArray(v)) return [];
  const out: ServerCase[] = [];
  for (const c of v as Record<string, unknown>[]) {
    const prompt = str(c?.prompt);
    const title = str(c?.title);
    if (!prompt || !title) continue;
    const steps: CaseStep[] = (Array.isArray(c.steps) ? c.steps : [])
      .map((s: Record<string, unknown>) => ({ tool: str(s?.tool), does: str(s?.does) }))
      .filter((s: CaseStep) => s.tool);
    for (const s of steps) {
      if (!toolNames.size || toolNames.has(s.tool)) continue;
      // office-suite proxies 50 child servers: "(invoice child)" in the step text names the owner.
      const child = s.does.match(/\(([a-z0-9-]+) child\)/i);
      if (child) {
        s.via = child[1];
        s.does = s.does.replace(child[0], '').trim();
      } else if (id === 'office-suite') {
        s.via = 'child server';
      } else {
        console.warn(`[data] ${id}: case tool "${s.tool}" not in catalog`);
      }
    }
    out.push({
      title, prompt, steps,
      persona: str(c.persona) || undefined,
      result: str(c.result) || undefined,
      minutes_saved: typeof c.minutes_saved === 'number' ? c.minutes_saved : undefined,
      minutes_basis: str(c.minutes_basis) || undefined,
    });
  }
  return out;
}

function parseFaq(v: unknown): Faq[] {
  if (!Array.isArray(v)) return [];
  return (v as Record<string, unknown>[])
    .map((f) => ({ q: str(f?.q), a: str(f?.a) }))
    .filter((f) => f.q && f.a);
}

function defaultFaq(s: Omit<Server, 'faq'>): Faq[] {
  const faq: Faq[] = [
    {
      q: `Do I need an account to try ${s.name}?`,
      a: 'No. The free tier needs no key and no sign-up.' +
        (s.hosted ? ' For the hosted URL, request a free token with one POST request. It lasts 30 days and allows 600 calls per hour.' : ''),
    },
    {
      q: 'What does Pro cost?',
      a: s.paid
        ? `$${s.priceUsd} once for a lifetime Pro licence for ${s.name}, or $${brand.pricing.bundleUsd} once for every paid server in the bundle.`
        : `${s.name} has no paid tier. All of its tools are free.`,
    },
  ];
  if (s.npm) faq.push({ q: 'Can I run it on my own machine?', a: `Yes. Run it with npx (${s.npm}) or install the .mcpb file in Claude Desktop.` });
  return faq;
}

// ---------- public API ----------
let cache: { servers: Server[]; catalog: RawCatalog } | null = null;

function build() {
  const catalog = readJson<RawCatalog>(path.join(DATA_DIR, 'catalog.json'));
  if (!catalog?.servers?.length) throw new Error(`[data] catalog.json missing or empty in ${DATA_DIR}`);
  const content = loadContentItems();
  const servers: Server[] = catalog.servers.map((r) => {
    const c = content.get(r.id) ?? {};
    const tools = cleanTools(r.tools, r.readme_head);
    const toolNames = new Set(tools.map((t) => t.name));
    const readmePara = readmeParagraph(r.readme_head);
    const desc = isPlaceholder(r.description) ? '' : str(r.description);
    const whatItDoes = str(r.what_it_does) || desc || readmePara;
    const cat = str(c.category);
    const topToolsContent = Array.isArray(c.top_tools)
      ? (c.top_tools as Record<string, unknown>[]).map((t) => ({ name: str(t?.name), plain: str(t?.plain) })).filter((t) => t.name)
      : [];
    const fvp = c.free_vs_pro as Record<string, unknown> | undefined;
    const base = {
      id: r.id,
      name: str(c.name) || r.human,
      category: CATEGORY_IDS.includes(cat) ? cat : FALLBACK_CATEGORY[r.id] ?? 'calculators',
      tagline: str(c.tagline) || firstSentence(desc || readmePara || `${r.human} tools for your AI assistant.`, 110),
      plain: str(c.plain) || firstSentence(whatItDoes, 320),
      whatItDoes,
      forWho: strArr(c.for_who),
      outcomeChips: strArr(c.outcome_chips),
      cases: parseCases(c.cases, toolNames, r.id),
      tryPrompts: tryPrompts(r.readme_head),
      topTools: topToolsContent.length
        ? topToolsContent
        : tools.filter((t) => !t.name.startsWith('license_')).slice(0, 6),
      tools,
      freeVsPro: fvp && (Array.isArray(fvp.free) || Array.isArray(fvp.pro))
        ? { free: strArr(fvp.free), pro: strArr(fvp.pro), source: str(fvp.source) || undefined }
        : null,
      keywords: strArr(c.keywords),
      paid: typeof c.paid === 'boolean' ? c.paid : typeof r.paid === 'boolean' ? r.paid : !isFreeOnly(fvp),
      bundleOnly: (r.price_usd ?? 0) === (catalog.bundle_price_usd ?? brand.pricing.bundleUsd),
      satellite: false,
      repo: str(c.repo) || brand.links.github,
      hosted: Boolean(r.hosted_live),
      hostedUrl: str(r.hosted_url) || `${brand.backend.origin}/mcp/${r.id}`,
      mcpb: str(r.mcpb),
      npm: str(r.npm),
      version: str(r.version),
      priceUsd: r.price_usd ?? brand.pricing.serverUsd,
      buyBase: (r.price_usd ?? 0) === (catalog.bundle_price_usd ?? brand.pricing.bundleUsd)
        ? catalog.bundle_url || `${brand.backend.origin}/buy/bundle`
        : str(r.buy_url) || `${brand.backend.origin}/buy/${r.id}`,
      website: str(r.website),
      hasContent: content.has(r.id),
    };
    const faq = parseFaq(c.faq);
    return { ...base, faq: faq.length ? faq : defaultFaq(base) };
  });
  return { servers: [...servers, ...buildSatellites(new Set(servers.map((s) => s.id)))], catalog };
}

// ---------- satellites (9 free servers, BRIEF section 2) ----------
// Content: data/content/satellites.json. Hosted URL and full tool table: src/data/satellites-extra.json
// (extracted from ~/mcp-servers/satellites/<id>-mcp/README.md). No paid tier, no buy button: pages show the bundle.
function buildSatellites(catalogIds: Set<string>): Server[] {
  const j = readJson<{ servers?: ContentItem[] }>(path.join(CONTENT_DIR, 'satellites.json'));
  const extra =
    readJson<Record<string, { hosted_url?: string; tools?: RawTool[] }>>(path.resolve(process.cwd(), 'src', 'data', 'satellites-extra.json')) ?? {};
  return (j?.servers ?? [])
    .filter((c) => str(c.id) && !catalogIds.has(str(c.id)))
    .map((c): Server => {
      const id = str(c.id);
      const x = extra[id] ?? {};
      const topTools = Array.isArray(c.top_tools)
        ? (c.top_tools as Record<string, unknown>[]).map((t) => ({ name: str(t?.name), plain: str(t?.plain) })).filter((t) => t.name)
        : [];
      const tools = x.tools?.length ? cleanTools(x.tools) : topTools;
      const fvp = c.free_vs_pro as Record<string, unknown> | undefined;
      const base = {
        id,
        name: str(c.name) || id,
        category: 'calculators',
        tagline: str(c.tagline),
        plain: str(c.plain),
        whatItDoes: str(c.plain),
        forWho: strArr(c.for_who),
        outcomeChips: strArr(c.outcome_chips),
        cases: parseCases(c.cases, new Set(tools.map((t) => t.name)), id),
        tryPrompts: [],
        topTools: topTools.length ? topTools : tools.slice(0, 6),
        tools,
        freeVsPro: fvp ? { free: strArr(fvp.free), pro: strArr(fvp.pro), source: str(fvp.source) || undefined } : null,
        keywords: strArr(c.keywords),
        paid: false,
        bundleOnly: false,
        satellite: true,
        repo: str(c.repo),
        hosted: Boolean(x.hosted_url),
        hostedUrl: str(x.hosted_url),
        mcpb: '',
        npm: str(c.npm),
        version: '',
        priceUsd: 0,
        buyBase: '',
        website: str(c.repo),
        hasContent: true,
      };
      const faq = parseFaq(c.faq);
      return { ...base, faq: faq.length ? faq : defaultFaq(base) };
    });
}

function data() {
  return (cache ??= build());
}

export const getServers = (): Server[] => data().servers;
export const getServer = (id: string): Server | undefined => data().servers.find((s) => s.id === id);
export const getServersByCategory = (cat: string): Server[] => data().servers.filter((s) => s.category === cat);
export const bundleUrl = (): string => data().catalog.bundle_url || `${brand.backend.origin}/buy/bundle`;
export const bundlePrice = (): number => data().catalog.bundle_price_usd ?? brand.pricing.bundleUsd;

/** Paid link with source tag: ?src=site.<page>.<slot> (BRIEF section 2). */
export function buyUrl(base: string, page: string, slot: string): string {
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}src=site.${page}.${slot}`;
}

export function allCases(): { server: Server; case: ServerCase }[] {
  return data().servers.flatMap((s) => s.cases.map((c) => ({ server: s, case: c })));
}

function paidCountFromPricing(): number | null {
  const n = readJson<{ meta?: { server_count_paid?: unknown } }>(path.join(CONTENT_DIR, 'pricing.json'))?.meta?.server_count_paid;
  return typeof n === 'number' && n > 0 ? n : null;
}

export function stats() {
  const all = data().servers;
  const s = all.filter((x) => !x.satellite);
  return {
    // Catalog servers only (58). The 9 satellites are counted separately.
    servers: s.length,
    satellites: all.length - s.length,
    hosted: s.filter((x) => x.hosted).length,
    // Sourced count from pricing.json meta (license code SERVER_COUNT) wins over the derived count.
    paid: paidCountFromPricing() ?? s.filter((x) => x.paid).length,
    tools: s.reduce((n, x) => n + x.tools.filter((t) => !t.name.startsWith('license_')).length, 0),
    withContent: s.filter((x) => x.hasContent).length,
  };
}
