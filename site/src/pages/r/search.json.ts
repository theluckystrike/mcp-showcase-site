// s1107: search index for /r/ ([registry name, display name, grade, score]; the slug is derived from the name in the browser, same rule as the build). Loaded by /r/ only when someone types in the search box.
import type { APIRoute } from 'astro';
import { getRData } from '../../data/readinessServers';

export const GET: APIRoute = () => {
  const rows = (getRData()?.rows ?? []).map((r) => [r.name, r.title, r.grade, r.score]);
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
