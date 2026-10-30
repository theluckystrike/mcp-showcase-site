// Honest comparisons (t-angle sitemap: /compare/<x>/). Competitor facts come from agents/t-angle/ANGLE.md
// "Competitor table" (checked 2026-10-30) with the URL named in `source`. Unknown facts say "unknown".
export interface Comparison {
  slug: string;
  name: string;
  what: string;
  price: string;
  data: string;
  pickThem: string[];
  pickUs: string[];
  source: string;
}

export const COMPARISONS: Comparison[] = [
  {
    slug: 'zapier-mcp',
    name: 'Zapier MCP',
    what: 'Connects an AI client to actions in about 9,000 other apps (their claim). It acts inside SaaS apps you already use.',
    price: 'Zapier plans: Free, Professional from $19.99 a month, Team from $69 a month.',
    data: 'Runs through your Zapier account and the connected apps.',
    pickThem: [
      'Your work lives in SaaS apps (Gmail, Sheets, a CRM) and you want the AI to act there.',
      'You already pay for Zapier and use its automations.',
    ],
    pickUs: [
      'You want a file you keep: a numbered PDF invoice, a .docx, an .xlsx, a journal.',
      'You want to pay once ($19 or $39), not every month.',
      'You want the data on your own machine (local servers) or no account at all (free token).',
    ],
    source: 'zapier.com/pricing and zapier.com/mcp, as read by t-angle on 2026-10-30 (agents/t-angle/ANGLE.md)',
  },
  {
    slug: 'composio',
    name: 'Composio',
    what: 'Integration layer that lets an AI client call tools in 1,500+ apps (their claim). Built mainly for developers.',
    price: 'Hobby $0 with 100k tool calls; Pro $29 a month plus usage.',
    data: 'Runs through Composio-hosted integrations and your connected app accounts.',
    pickThem: [
      'You build an agent product and need auth and tool calls to many SaaS APIs.',
      'You are fine with usage-based monthly billing.',
    ],
    pickUs: [
      'You are not building a product. You want the back-office job done in chat today.',
      'You want document output (PDF, Word, spreadsheet) and local records.',
      'You want a one-time price and an MIT-licensed server you can read.',
    ],
    source: 'composio.dev/pricing, as read by t-angle on 2026-10-30 (agents/t-angle/ANGLE.md)',
  },
  {
    slug: 'quickbooks-and-xero-mcp',
    name: 'QuickBooks and Xero MCP',
    what: 'MCP servers from the accounting vendors that read and write records inside a QuickBooks Online or Xero company.',
    price: 'Needs a QuickBooks Online or Xero subscription. Exact MCP terms: unknown (not checked in this sprint).',
    data: 'Your records stay in the QuickBooks or Xero cloud ledger.',
    pickThem: [
      'Your books already live in QuickBooks Online or Xero, and the ledger is your source of truth.',
      'Your accountant works in that ledger.',
    ],
    pickUs: [
      'You do not run a full ledger yet: you need invoices, quotes, a cash book or a bank CSV summary.',
      'You need checks around the ledger: three-way match, duplicate invoices, supplier statements.',
      'You want local files and records with no accounting subscription.',
    ],
    source: 'Vendor facts: unknown beyond the above (not verified on 2026-10-30). Our side: data/catalog.json, data/content/pricing.json',
  },
];
