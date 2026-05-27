// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://keep-self.vercel.app',
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    assetsInclude: ['**/*.tsx'],
    ssr: {
      noExternal: ['style-to-js', 'hast-util-to-estree'],
    },
  },
});
