// s1114: one static badge per /r/ report, /badge/<slug>.svg. Same rows as src/pages/r/[slug].astro.
// functions/badge/[[path]].js hands /badge/<slug>.svg to these static files; /badge?url= stays the live proxy.
import type { APIRoute } from 'astro';
import { getRData, type RServer } from '../../data/readinessServers';
import { badgeSvg } from '../../data/badge';

export function getStaticPaths() {
  return (getRData()?.rows ?? []).map((r) => ({ params: { slug: r.slug }, props: { r } }));
}

export const GET: APIRoute = ({ props }) => {
  const r = (props as { r: RServer }).r;
  return new Response(badgeSvg(r), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
