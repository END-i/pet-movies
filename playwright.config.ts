import { defineConfig, devices } from '@playwright/test';

// TMDB is mocked per test via page.route, so no API key is needed.
// *.localhost is a secure context in Chromium, and the layout only skips the service worker on
// plain localhost / 127.0.0.1.
const PWA_ORIGIN = 'http://pwa.localhost:4175';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: [
    {
      // --ignore-lock: Astro 7 otherwise backgrounds `astro dev` when an AI agent runs it, and the
      // webServer process would exit at once.
      command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort --ignore-lock',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      // Production build with the real service worker (dev has none).
      command: 'npm run build && node dist/server/entry.mjs',
      env: { HOST: '127.0.0.1', PORT: '4175' },
      url: 'http://127.0.0.1:4175/offline',
      reuseExistingServer: true,
      timeout: 180000
    }
  ],
  projects: [
    {
      name: 'mobile-chromium',
      testIgnore: /offline\.spec\.ts/,
      use: { ...devices['Pixel 7'], baseURL: 'http://127.0.0.1:4174' }
    },
    {
      name: 'pwa-offline',
      testMatch: /offline\.spec\.ts/,
      use: {
        baseURL: PWA_ORIGIN,
        serviceWorkers: 'allow',
        // Full Chromium: the default headless shell never lets the worker control pages.
        channel: 'chromium',
        // The server listens on IPv4 only.
        launchOptions: { args: ['--host-resolver-rules=MAP pwa.localhost 127.0.0.1'] }
      }
    }
  ]
});
