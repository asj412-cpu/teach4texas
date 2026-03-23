import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://teach4texas.com',
  integrations: [tailwind()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
