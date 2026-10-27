import { defineConfig, devices } from '@playwright/test';

// TMDB is mocked per test via page.route, so no API key is needed.
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4174'
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
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
