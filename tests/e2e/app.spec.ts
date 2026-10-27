import { expect, test, type Page } from '@playwright/test';
import { gotoHydrated, mockApi } from './fixtures';

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('home shows catalog results on a phone without horizontal scroll', async ({ page }) => {
  await mockApi(page);
  await gotoHydrated(page, '/');

  await expect(page.getByRole('heading', { name: 'Що подивитися?' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Матриця' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Темрява' })).toBeVisible();
  await expect(page.getByText('UA переклад відсутній')).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('pages expose PWA manifest and iOS metadata', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest'
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/icons/apple-touch-icon.png'
  );
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /viewport-fit=cover/
  );
});

test('search by title sends the query and updates the URL', async ({ page }) => {
  const { discoverRequests } = await mockApi(page);
  await gotoHydrated(page, '/');

  const search = page.getByRole('searchbox', { name: 'Пошук за назвою' });
  await search.fill('matrix');
  await search.press('Enter');

  await expect(page.getByRole('link', { name: 'Темрява' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Матриця' })).toBeVisible();
  expect(discoverRequests.at(-1)?.searchParams.get('query')).toBe('matrix');
  await expect(page).toHaveURL(/query=matrix/);
});

test('category chips switch the category', async ({ page }) => {
  const { discoverRequests } = await mockApi(page);
  await gotoHydrated(page, '/');

  const seriesChip = page.getByRole('button', { name: 'Серіали' });
  await seriesChip.click();
  await expect(seriesChip).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => discoverRequests.at(-1)?.searchParams.get('category')).toBe('tv');
});

test('filters open in a sheet and apply with an active-filter badge', async ({ page }) => {
  const { discoverRequests } = await mockApi(page);
  await gotoHydrated(page, '/');

  await page.getByRole('button', { name: 'Фільтри' }).click();
  const sheet = page.getByRole('dialog', { name: 'Фільтри' });
  await expect(sheet).toBeVisible();

  await sheet.getByLabel('Рейтинг від').fill('7');
  const age = sheet.getByLabel('Вік глядача');
  await expect(age.locator('option')).toHaveText(['Будь-який', '0+', '6+', '12+', '16+', '18+']);
  await age.selectOption('12+');
  await sheet.getByRole('button', { name: 'Показати' }).click();

  await expect(sheet).toBeHidden();
  await expect.poll(() => discoverRequests.at(-1)?.searchParams.get('minRating')).toBe('7');
  expect(discoverRequests.at(-1)?.searchParams.get('ageRating')).toBe('12');
  await expect(page.getByRole('button', { name: 'Фільтри' })).toContainText(/\d/);
});

test('pagination moves to the next page', async ({ page }) => {
  const { discoverRequests } = await mockApi(page, { totalPages: 3 });
  await gotoHydrated(page, '/');

  await page.getByRole('button', { name: 'Наступна сторінка' }).click();
  await expect.poll(() => discoverRequests.at(-1)?.searchParams.get('page')).toBe('2');
  await expect(page.getByText('2 / 3', { exact: true })).toBeVisible();
});

test('heart toggles a title in favorites and favorites page lists it', async ({ page }) => {
  await mockApi(page);
  await gotoHydrated(page, '/');

  const heart = page.getByRole('button', { name: 'Додати «Матриця» в улюблені' });
  await heart.click();
  await expect(
    page.getByRole('button', { name: 'Прибрати «Матриця» з улюблених' })
  ).toHaveAttribute('aria-pressed', 'true');

  await page
    .getByRole('navigation', { name: 'Основна навігація' })
    .getByRole('link', { name: 'Улюблені' })
    .click();
  await expect(page).toHaveURL(/\/favorites/);
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  await expect(page.getByRole('link', { name: 'Матриця' })).toBeVisible();

  await page.getByRole('button', { name: 'Видалити «Матриця»' }).click();
  await expect(page.getByText(/Улюблених ще немає/)).toBeVisible();
});

test('details page shows info, saves to a new category and links to the actor', async ({
  page
}) => {
  await mockApi(page);
  await gotoHydrated(page, '/details/movie/603');

  await expect(page.getByRole('heading', { name: 'Матриця', level: 1 })).toBeVisible();
  await expect(page.getByText('The Matrix')).toBeVisible();
  await expect(page.getByText('16+', { exact: true })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole('textbox', { name: 'Нова категорія' }).fill('Класика');
  await page.getByRole('button', { name: 'Додати', exact: true }).click();
  await expect(page.getByRole('button', { name: '✓ Класика' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  const stored = await page.evaluate(() => localStorage.getItem('movie-finder-favorites-v1'));
  expect(JSON.parse(stored ?? '{}')['Класика'][0].id).toBe(603);

  await page.getByRole('link', { name: /Кіану Рівз/ }).click();
  await expect(page).toHaveURL(/\/person\/6384/);
  await expect(page.getByRole('heading', { name: 'Кіану Рівз' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Матриця/ })).toBeVisible();
});

test('language and theme switches persist across reloads', async ({ page }) => {
  await mockApi(page);
  await gotoHydrated(page, '/');

  await page.getByRole('button', { name: 'Змінити мову на English' }).click();
  await expect(page.getByRole('heading', { name: 'What to watch?' })).toBeVisible();

  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'What to watch?' })).toBeVisible();
});

test('API error shows a retry button', async ({ page }) => {
  await page.route('**/api/discover.json*', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"error":"TMDB недоступний"}'
    })
  );
  await gotoHydrated(page, '/');

  await expect(page.getByText('TMDB недоступний')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Спробувати знову' })).toBeVisible();
});

test('every page shows the TMDB attribution required by its terms', async ({ page }) => {
  await mockApi(page);
  for (const url of ['/', '/favorites', '/details/movie/603']) {
    await gotoHydrated(page, url);
    await expect(
      page.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.')
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'TMDB' })).toHaveAttribute(
      'href',
      'https://www.themoviedb.org/'
    );
  }
});
