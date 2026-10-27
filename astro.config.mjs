// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import AstroPWA from '@vite-pwa/astro';
import { pwaOptions } from './pwa.config.mjs';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [svelte(), AstroPWA(pwaOptions)]
});
