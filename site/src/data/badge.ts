// s1114: static README badge per /r/ report, built to /badge/<slug>.svg (src/pages/badge/[slug].svg.ts).
// Shields-style flat badge. The value is the report's own grade and score from the 2 Nov 2026 scan; nothing is computed here.
// Text widths use Verdana advance widths (units per em 2048) at 11px, and every <text> carries textLength,
// so the badge keeps its shape when the viewer falls back to another font.
import type { RServer } from './readinessServers';

const ADV: Record<string, number> = {
  ' ': 720, '/': 1067, '.': 745, '·': 745, '-': 868,
  '0': 1302, '1': 1302, '2': 1302, '3': 1302, '4': 1302, '5': 1302, '6': 1302, '7': 1302, '8': 1302, '9': 1302,
  A: 1401, B: 1405, C: 1430, D: 1577, E: 1295, F: 1178, M: 1724, P: 1255,
  a: 1229, c: 1067, d: 1271, e: 1219, i: 562, n: 1296, r: 874, s: 1067,
};
const textWidth = (s: string) => Math.round([...s].reduce((w, ch) => w + (ADV[ch] ?? 1300), 0) * 11 / 2048);

/** Grade colors, shields palette: brightgreen, green, yellow, orange, red. */
export const BADGE_COLOR: Record<string, string> = { A: '#4c1', B: '#97ca00', C: '#dfb317', D: '#fe7d37', F: '#e05d44' };
export const BADGE_LABEL = 'MCP readiness';

export const badgeValue = (r: Pick<RServer, 'grade' | 'score'>) => `${r.grade} · ${r.score}/100`;
export const badgePath = (slug: string) => `/badge/${slug}.svg`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function badgeSvg(r: Pick<RServer, 'grade' | 'score' | 'title' | 'date'>): string {
  const label = BADGE_LABEL;
  const value = badgeValue(r);
  const lw = textWidth(label), vw = textWidth(value);
  const L = lw + 10, V = vw + 10, W = L + V;
  const color = BADGE_COLOR[r.grade] ?? '#9f9f9f';
  const day = new Date(r.date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const alt = esc(`${r.title}, MCP readiness grade ${r.grade}, score ${r.score} of 100, McpStamp check of ${day}`);
  const lx = L / 2, vx = L + V / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="20" role="img" aria-label="${alt}"><title>${alt}</title>`
    + `<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>`
    + `<clipPath id="r"><rect width="${W}" height="20" rx="3" fill="#fff"/></clipPath>`
    + `<g clip-path="url(#r)"><rect width="${L}" height="20" fill="#555"/><rect x="${L}" width="${V}" height="20" fill="${color}"/><rect width="${W}" height="20" fill="url(#s)"/></g>`
    + `<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">`
    + `<text x="${lx}" y="15" fill="#010101" fill-opacity=".3" textLength="${lw}">${label}</text><text x="${lx}" y="14" textLength="${lw}">${label}</text>`
    + `<text x="${vx}" y="15" fill="#010101" fill-opacity=".3" textLength="${vw}">${value}</text><text x="${vx}" y="14" textLength="${vw}">${value}</text>`
    + `</g></svg>`;
}
