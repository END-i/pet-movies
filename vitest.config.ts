import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
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
