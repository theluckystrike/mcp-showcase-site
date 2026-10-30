// The ONE place for brand identity. Pages never hard-code the name or domain.
// Working brand = t-mcpdomain recommendation (agents/t-mcpdomain/DOMAINS-MCP.md, 2026-10-30): mcpstamp.com, score 80.0.
// Owner direction 2026-10-30: the .com must include "mcp".
// Registered 2026-10-30 at Porkbun (owner). If the owner picks another name, change `name` and `domain` here only.
export const brand = {
  name: 'McpStamp',
  shortName: 'McpStamp',
  domain: 'mcpstamp.com',
  // Canonical origin. The apex 301-redirects to www (Porkbun URL forward); Pages serves www.
  siteUrl: 'https://www.mcpstamp.com',
  tagline: 'Do your back office in chat.',
  description:
    'MCP servers that turn Claude, Cursor and other MCP clients into a back office: real PDFs, invoices, checks and reports. Run locally or paste one URL.',
  // Identity colors (d-identity, agents/d-identity/BRANDKIT.md). Pages use the CSS tokens, not these values.
  // These are for places without CSS: og image, manifest, theme-color. Category colors live in src/data/categories.ts.
  colors: {
    paper: '#eef0ea', // ledger stock, light bg
    carbon: '#10141f', // carbon paper, dark bg
    graphite: '#1a1d22', // text
    accent: '#2b3c9e', // carbon blue: actions, links
    stamp: '#b42318', // stamp-pad red: state stamps, the mark
    manila: '#ebddb4', // folder card
  },
  fonts: { display: 'Archivo', text: 'Public Sans', mono: 'IBM Plex Mono' },
  // Existing backend. Do not build new checkout (BRIEF section 2).
  backend: {
    origin: 'https://mcp.zovo.one',
    tokenEndpoint: 'https://mcp.zovo.one/mcp/token',
  },
  links: {
    github: 'https://github.com/theluckystrike/mcp-servers',
    githubProfile: 'https://github.com/theluckystrike',
    buyMeACoffee: 'https://buymeacoffee.com/michaellip',
    paypal: 'https://paypal.me/najzzz',
    telegram: 'https://t.me/zovo_chat',
    registry: 'https://registry.modelcontextprotocol.io/v0.1/servers?search=theluckystrike',
  },
  pricing: { serverUsd: 19, bundleUsd: 39 },
  // GA4 property 561638567 (account Portfolio sites), web stream www.mcpstamp.com. Created 2026-10-30 by the orchestrator.
  analytics: { ga4: 'G-KDB103CDCZ' },
} as const;

export type Brand = typeof brand;
