// The ONE place for brand identity. Pages never hard-code the name or domain.
// Working brand = t-mcpdomain recommendation (agents/t-mcpdomain/DOMAINS-MCP.md, 2026-10-30): mcpstamp.com, score 80.0.
// Owner direction 2026-10-30: the .com must include "mcp".
// NOT REGISTERED YET (owner action). If the owner picks another name, change `name` and `domain` here only.
export const brand = {
  name: 'McpStamp',
  shortName: 'McpStamp',
  domain: 'mcpstamp.com',
  tagline: 'Do your back office in chat.',
  description:
    'MCP servers that turn Claude, Cursor and other MCP clients into a back office: real PDFs, invoices, checks and reports. Run locally or paste one URL.',
  // Accent colors. Category colors live in src/data/categories.ts.
  colors: {
    accent: '#8b5cf6',
    accent2: '#22d3ee',
    accent3: '#f472b6',
  },
  // Existing backend. Do not build new checkout (BRIEF section 2).
  backend: {
    origin: 'https://mcp.zovo.one',
    tokenEndpoint: 'https://mcp.zovo.one/mcp/token',
  },
  links: {
    github: 'https://github.com/theluckystrike/mcp-servers',
    registry: 'https://registry.modelcontextprotocol.io/v0.1/servers?search=theluckystrike',
  },
  pricing: { serverUsd: 19, bundleUsd: 39 },
} as const;

export type Brand = typeof brand;
