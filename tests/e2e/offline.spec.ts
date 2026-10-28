import { spawn, type ChildProcess } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

// `context.setOffline` fails navigations before the service worker sees them, so "offline"
// here means the server is gone: this test runs its own copy of the production build and stops it.
// The build itself comes from the `pwa-offline` webServer in playwright.config.ts.
const PORT = 4176;
const ORIGIN = `http://pwa.localhost:${PORT}`;
let server: ChildProcess | null = null;

async function startServer() {
  server = spawn('node', ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(PORT) },
    stdio: 'ignore'
  });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/offline`)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Production server did not start');
}

function stopServer() {
  server?.kill();
  server = null;
}

test.beforeAll(startServer);
test.afterAll(stopServer);

async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(
    // Activated and claimed this page: only then do navigations go through it.
    async () =>
      (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated' &&
      Boolean(navigator.serviceWorker.controller),
    undefined,
    { timeout: 20000 }
  );
}

test('the installed app keeps working offline', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'movie-finder-favorites-v1',
      JSON.stringify({
        Загальне: [{ id: 603, mediaType: 'movie', title: 'Матриця', poster: null, year: '1999' }]
      })
    );
  });

  // The first visit installs the worker; the next navigation goes through it and is cached.
  await page.goto(`${ORIGIN}/favorites`);
  await waitForServiceWorker(page);
  // Right after activation Chromium may still send a navigation past the worker; revisit until
  // the page is in the runtime cache.
  await expect
    .poll(
      async () => {
        await page.goto(`${ORIGIN}/favorites`);
        return page.evaluate(async () => {
          const cache = await caches.open('pages');
          return Boolean(await cache.match(location.href));
        });
      },
      { timeout: 15000 }
    )
    .toBe(true);
  await expect(page.getByRole('link', { name: 'Матриця' })).toBeVisible();

  stopServer();

  // A page visited before opens from the cache, with favorites from the device.
  await page.goto(`${ORIGIN}/favorites`);
  await expect(page.getByRole('heading', { name: 'Улюблені', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Матриця' })).toBeVisible();

  // A page never visited falls back to the precached offline page.
  await page.goto(`${ORIGIN}/person/6384`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Немає з.єднання/);
});
