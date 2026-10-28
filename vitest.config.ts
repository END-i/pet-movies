import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Compiles .svelte files for component tests (tests/unit/components.test.ts).
  plugins: [svelte()],
  resolve: {
    // Browser builds of Svelte, so `mount` works in jsdom.
    conditions: ['browser'],
    alias: {
      'astro:middleware': fileURLToPath(
        new URL('./tests/stubs/astro-middleware.ts', import.meta.url)
      )
    }
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts']
  }
});
