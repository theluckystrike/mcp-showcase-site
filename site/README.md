# MCP showcase site

Astro 5 (static output) + React islands + Tailwind CSS v4. Host: Cloudflare Pages.

## Run

Check disk first: `df -g /System/Volumes/Data` must show Avail >= 20 GB.

```sh
cd ~/mcp-site-2026-10-30/site
npm_config_cache=/Users/mike/.npm-cache-local npm install          # one time
BUILDSLOT_MIN_FREE_GB=20 BUILDSLOT_MAX_WAIT=600 /Users/mike/bin/buildslot npm run build   # writes dist/
npx astro preview                                                    # serve dist/ locally; stop it when done
```

`npm run dev` starts a dev server with hot reload. Stop it when you are done.

## How data flows

```
../data/catalog.json            58 servers (always present)
../data/content/*.json          {"servers":[...]} per content agent (a.json, b.json, ...), optional
../data/content/pricing.json    plans, upsell_slots, faq, trust, pro_features, meta.server_count_paid (optional)
../data/content/developers.json quickstart, hosted, architecture, conventions, faq, links (optional)
        |
        v
src/data/servers.ts   getServers(), getServer(id), getServersByCategory(cat), allCases(), stats(), buyUrl()
src/data/content.ts   getPricing(), upsell(page, slot, fallback, vars), getDevelopers()
src/data/categories.ts  the 10 category ids (BRIEF 5.1), colors (hue), icons, fallback category per server
        |
        v
src/pages/*  (build time only; the data never ships to the browser except the /servers/ island props)
```

- Loaders read files with `fs` at build time. Override the data folder with `DATA_DIR=/path/to/data`.
- Content items merge by `id` over the catalog. Files load in name order; a later file wins per field.
- Every field has a fallback: no content file, a partial file or a full file all build.
  - name -> catalog `human`; tagline -> catalog `description` or README paragraph; plain -> `what_it_does`.
  - top_tools -> first 6 catalog tools; cases -> README "Try it" prompts (prompt only, no invented results).
  - category -> `FALLBACK_CATEGORY` in `categories.ts`; faq -> 2-3 factual default questions.
- Catalog `tools[]` is clean since the 13:55 fix (552 tools, 458 without license_*). `cleanTools()` only de-duplicates now.
- `paid` is false when every `free_vs_pro.pro` line says "unknown" / "no extra" (8 servers today). Those pages show no
  single-server buy button. A content item can set `"paid": true|false` to override.
- The paid server count in copy comes from `pricing.json` `meta.server_count_paid` (49, from license code), else derived.
- Case steps whose tool is not in the catalog print a `[data]` warning during the build. Fix the content, not the loader.
- `paid` comes from catalog `paid` (8 free-only servers). office-suite (price = bundle price) is `bundleOnly`: its buy links go to /buy/bundle.
- `satellites.json` (9 free servers) loads as servers in `calculators` (`satellite: true`, no buy button). Their hosted URL and
  full tool table come from `src/data/satellites-extra.json` (extracted from ~/mcp-servers/satellites/*/README.md).
- office-suite case steps that name child tools render "via <child>" (from "(invoice child)" in the step text).
- Page titles, H1s and meta descriptions come from `src/data/pages.json` (copy of agents/t-angle/sitemap.json) via `src/data/pages.ts`.

## Where to change the brand

`src/config/brand.ts` is the only place: name, domain, tagline, description, accent colors, backend origin, links, prices.
`astro.config.mjs` reads `brand.domain` for canonical URLs; sitemap.xml, robots.txt and llms.txt use it too.
Design tokens (dark default, light via `html[data-theme=light]`) are CSS variables at the top of `src/styles/global.css`.
Category colors are `hue` values in `src/data/categories.ts` (rendered with `oklch`).
`public/og.png` (1200x630) is made by a Pillow script (see agents/t-integrate/FINDINGS.md). `favicon.svg` is a placeholder.

## Paid links

All buy buttons go to the existing checkout: `https://mcp.zovo.one/buy/<id>?src=site.<page>.<slot>` or
`/buy/bundle?src=...`. Use `buyUrl(base, page, slot)`. Upsell copy per slot comes from `pricing.json` `upsell_slots`.

## Pages

`/`, `/servers/` (React island), `/servers/<id>/` (58 + 9 satellites), `/categories/<cat>/` (10), `/use-cases/` +
`/use-cases/<job>/` (30), `/can-claude/<x>/` + `/can-chatgpt/<x>/` (5), `/for/<audience>/` (7), `/connect/` + 8 guides,
`/compare/` + 3, `/pricing/`, `/developers/`, `/about/`, `/404`. Endpoints: `/robots.txt`, `/sitemap.xml`, `/llms.txt`.
`public/_redirects` maps `/guides/<client>/` to `/connect/<client>/`. Route list for the sitemap: `src/data/routes.ts`.

## JavaScript budget

Only `/servers/` ships React (`client:load`). Everything else is zero-JS except two inline snippets in the layout
(theme from localStorage, theme toggle). Install tabs and FAQ use CSS (radio inputs, `<details>`). The hero demo is CSS
keyframes and respects `prefers-reduced-motion`.

## Deploy (orchestrator only)

```sh
npx wrangler pages deploy dist --project-name <project>
```

Do not deploy from an agent. Record the previous deployment ID and the rollback command in the report.
