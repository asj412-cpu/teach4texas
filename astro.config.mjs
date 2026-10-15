import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Production is served from www (apex 307s to www). Canonicals and the sitemap use this host.
  site: 'https://www.teach4texas.com',
  integrations: [
    tailwind(),
    sitemap({
      // /products is a redirect stub to /resources; keep it out of the sitemap.
      filter: (page) => !/\/products\/?$/.test(page),
      // Vercel serves pages without a trailing slash (/blog); keep sitemap URLs identical.
      serialize(item) {
        const u = new URL(item.url);
        if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
        item.url = u.href;
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
