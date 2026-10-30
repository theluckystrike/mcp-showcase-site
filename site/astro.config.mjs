// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { brand } from './src/config/brand.ts';

export default defineConfig({
  site: `https://${brand.domain}`,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  // sitemap.xml is src/pages/sitemap.xml.ts (only built routes, priorities from the t-angle sitemap).
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
