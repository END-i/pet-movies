// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import svelte from '@astrojs/svelte';
import AstroPWA from '@vite-pwa/astro';
import { pwaOptions } from './pwa.config.mjs';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  // Vercel sets VERCEL=1 during its builds; everywhere else (dev, e2e, self-hosting) use Node.
  adapter: process.env.VERCEL ? vercel() : node({ mode: 'standalone' }),
  env: {
    schema: {
      // Read from the server environment at runtime, never inlined into the build output.
      TMDB_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TMDB_DEBUG: envField.boolean({ context: 'server', access: 'public', default: false }),
      PUBLIC_DEBUG_LOGS: envField.boolean({ context: 'client', access: 'public', default: false })
    }
  },
  integrations: [svelte(), AstroPWA(pwaOptions)]
});
