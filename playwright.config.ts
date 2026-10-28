import { defineConfig, devices } from '@playwright/test';

// TMDB is mocked per test via page.route, so no API key is needed.
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4174'
  },
  webServer: {
    // --ignore-lock: Astro 7 otherwise backgrounds `astro dev` when an AI agent runs it, and the
    // webServer process would exit at once.
    command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort --ignore-lock',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: true,
    timeout: 120000
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] }
    }
  ]
});
