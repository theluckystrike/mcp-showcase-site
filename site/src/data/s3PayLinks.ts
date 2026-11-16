// Sprint 3 lane D1B (2026-11-16): one-click Stripe Payment Links for the offers on the top GSC pages.
// NEW links (metadata site=mcpstamp.com, sprint=20261116, offer_id, product=<billing id>). They use the
// billing Worker's own Prices and redirect to https://mcp.zovo.one/success?session_id=..., so the key is
// issued by the same fulfillment code as /buy/ (metadata.product + exact price id are checked there).
// Other servers keep the mcp.zovo.one/buy/<id> route (one extra confirm click on the Worker page).
export interface S3PayLink { url: string; price: number; name: string; itemId: string; gets: string }
export const S3_PAYLINKS: Record<string, S3PayLink> = {
  zip: { url: 'https://buy.stripe.com/6oUcN62oaa3S2BDc3343S3X', price: 19, name: 'MCP Zip Pro', itemId: 'zip', gets: 'MCP Zip Pro, lifetime key: unlimited archive size, entries and archives' },
  docx: { url: 'https://buy.stripe.com/4gMbJ2gf0focfopc3343S3Y', price: 19, name: 'MCP Docx Pro', itemId: 'docx', gets: 'MCP Docx Pro, lifetime key: unlimited proposals and contracts, letterhead, unlimited template fills' },
  bundle: { url: 'https://buy.stripe.com/3cI6oI5Am0tidgh4AB43S3Z', price: 39, name: 'MCP Servers Bundle', itemId: 'bundle', gets: 'one lifetime key that turns on Pro on every paid server, no subscription' },
};
export const s3Link = (id: string): S3PayLink | undefined => S3_PAYLINKS[id];
