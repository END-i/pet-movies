import { expect, test, type Page } from '@playwright/test';
import { gotoHydrated, mockApi, movieDetails } from './fixtures';

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
  await expect(page.getByTitle('Немає перекладу: українська')).toHaveText(/UA/);
  await expect(page.getByText('Онлайн', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Анонс · 10 січ/)).toBeVisible();
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

  const search = page.getByRole('searchbox', { name: 'Пошук фільмів, серіалів і людей' });
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

test('favorites: categories are created with + and deleted with the trash icon', async ({
  page
}) => {
  await mockApi(page);
  await gotoHydrated(page, '/favorites');

  const create = page.getByRole('button', { name: 'Створити категорію' });
  await expect(create).toBeDisabled();
  await page.getByRole('textbox', { name: 'Нова категорія' }).fill('На вихідні');
  await create.click();
  const chips = page.getByRole('group', { name: 'Категорії' });
  await expect(chips.getByRole('button', { name: /На вихідні/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Видалити категорію «На вихідні»' }).click();
  await expect(chips.getByRole('button', { name: /На вихідні/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Видалити категорію/ })).toHaveCount(0);
});

test('hidden genres are remembered and sent with every search', async ({ page }) => {
  const { discoverRequests } = await mockApi(page);
  await gotoHydrated(page, '/');
  await expect.poll(() => discoverRequests.at(-1)?.searchParams.get('minVotes')).toBe('50');

  await page.getByRole('button', { name: 'Фільтри' }).click();
  const sheet = page.getByRole('dialog', { name: 'Фільтри' });
  await sheet.getByRole('button', { name: 'Жахи' }).click();
  await sheet.getByRole('button', { name: 'Мелодрами' }).click();
  await expect(sheet.getByLabel('Країна')).toHaveValue('');
  await sheet.getByLabel('Країна').selectOption({ label: 'Україна' });
  await sheet.getByRole('button', { name: 'Показати' }).click();

  await expect
    .poll(() => discoverRequests.at(-1)?.searchParams.get('hideGenres'))
    .toBe('horror,romance');
  expect(discoverRequests.at(-1)?.searchParams.get('includeCountry')).toBe('UA');
  expect(page.url()).not.toContain('hideGenres');

  await page.reload();
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  await expect
    .poll(() => discoverRequests.at(-1)?.searchParams.get('hideGenres'))
    .toBe('horror,romance');
});

test('details page shows info, saves to a new category and links to the actor', async ({
  page
}) => {
  await mockApi(page);
  await gotoHydrated(page, '/details/movie/603');

  await expect(page.getByRole('heading', { name: 'Матриця', level: 1 })).toBeVisible();
  await expect(page.getByText('The Matrix')).toBeVisible();
  await expect(page.getByText('16+', { exact: true })).toBeVisible();
  await expect(page.getByText(/^У кіно · онлайн з 1 груд/)).toBeVisible();
  await expect(page.getByText('2 год 16 хв')).toBeVisible();
  await expect(page.getByText('«Ласкаво просимо в реальний світ.»')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Лана Вачовскі' })).toHaveAttribute(
    'href',
    '/person/9339'
  );
  await expect(page.getByRole('heading', { name: 'Де подивитися в Україні' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Netflix' })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByText('Категорії улюблених').click();
  await page.getByRole('textbox', { name: 'Нова категорія' }).fill('Класика');
  await page.getByRole('button', { name: 'Створити категорію й додати' }).click();
  await expect(page.getByRole('button', { name: '✓ Класика' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  const stored = await page.evaluate(() => localStorage.getItem('movie-finder-favorites-v1'));
  expect(JSON.parse(stored ?? '{}')['Класика'][0].id).toBe(603);

  const heart = page.getByRole('button', { name: 'Прибрати з улюблених' });
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await heart.click();
  await expect(page.getByRole('button', { name: 'Додати в улюблені' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  await page.getByRole('button', { name: 'Додати в улюблені' }).click();
  await expect(page.getByRole('button', { name: '✓ Загальне' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  await page.getByRole('link', { name: /Кіану Рівз/ }).click();
  await expect(page).toHaveURL(/\/person\/6384/);
  await expect(page.getByRole('heading', { name: 'Кіану Рівз' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Матриця/ })).toBeVisible();

  const credits = page.locator('.credit strong');
  // One tile per title in "All", with every role on it.
  await expect(credits.filter({ hasText: 'Матриця' })).toHaveCount(1);
  await expect(page.getByText('Нео · Продюсер')).toBeVisible();
  await page.getByRole('combobox').selectOption({ label: 'Новіші' });
  await expect(credits).toHaveText(['Джон Вік', 'Людина Ци', 'Матриця']);

  await page
    .getByRole('group', { name: 'Роль' })
    .getByRole('button', { name: /Режисура/ })
    .click();
  await expect(credits).toHaveText(['Людина Ци']);
  await expect(page.getByText('Режисер', { exact: true })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Назад' })).toBeVisible();
});

test('language and theme switches persist across reloads', async ({ page }) => {
  await mockApi(page);
  await gotoHydrated(page, '/');

  await page.getByRole('button', { name: 'Змінити мову на English' }).click();
  await expect(page.getByRole('heading', { name: 'What to watch?' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Основна навігація' });
  await expect(nav.getByRole('link', { name: 'Favorites' })).toBeVisible();
  await expect(nav.getByText('Улюблені')).toBeHidden();

  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'What to watch?' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Search' })).toBeVisible();
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

test('presets search the whole catalog, only "New releases" is recent', async ({ page }) => {
  const { discoverRequests } = await mockApi(page);
  await gotoHydrated(page, '/');
  const presets = page.getByRole('group', { name: 'Добірки' });

  await presets.getByRole('button', { name: 'Для сім’ї' }).click();
  await expect.poll(() => discoverRequests.at(-1)?.searchParams.get('genre')).toBe('10751');
  expect(discoverRequests.at(-1)?.searchParams.get('releaseDateGte')).toBe('');
  expect(discoverRequests.at(-1)?.searchParams.get('sortBy')).toBe('popularity.desc');

  await presets.getByRole('button', { name: 'Новинки' }).click();
  await expect.poll(() => discoverRequests.at(-1)?.searchParams.get('releasePeriod')).toBe('120');
  expect(discoverRequests.at(-1)?.searchParams.get('releaseDateGte')).not.toBe('');
});

test('details page with a trailer and many actors fits the screen width', async ({ page }) => {
  await mockApi(page);
  const actors = Array.from({ length: 12 }, (_, index) => ({
    id: 100 + index,
    name: `Актор з дуже довгим іменем ${index + 1}`,
    character: `Роль номер ${index + 1}`,
    photo: null
  }));
  await page.route('**/api/details/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ...movieDetails, actors, trailerKey: 'abc123' })
    })
  );
  await page.route('https://i.ytimg.com/**', (route) => route.abort());
  await gotoHydrated(page, '/details/movie/603');

  await expect(page.getByRole('button', { name: 'Відтворити трейлер' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  const widths = await page.evaluate(() =>
    [...document.querySelectorAll('main .page, .video-wrap, .overview')].map(
      (element) => element.getBoundingClientRect().right
    )
  );
  const viewport = page.viewportSize()!.width;
  for (const right of widths) expect(right).toBeLessThanOrEqual(viewport);
});

test('text search also finds people and links to their page', async ({ page }) => {
  await mockApi(page);
  await gotoHydrated(page, '/');
  await expect(page.getByRole('heading', { name: 'Люди' })).toHaveCount(0);

  await page.getByRole('searchbox').fill('Кіану');
  await page.getByRole('searchbox').press('Enter');

  const people = page.getByRole('region', { name: 'Люди' });
  await expect(people.getByRole('link', { name: /Кіану Рівз/ })).toBeVisible();
  await expect(people.getByText('Акторство · Матриця')).toBeVisible();
  await expectNoHorizontalScroll(page);

  await people.getByRole('link', { name: /Кіану Рівз/ }).click();
  await expect(page).toHaveURL(/\/person\/6384/);
});

test('details page shows recommended and same-topic titles', async ({ page }) => {
  await mockApi(page);
  await gotoHydrated(page, '/details/movie/603');

  const recommended = page.getByRole('region', { name: 'Рекомендуємо' });
  await expect(
    recommended.getByRole('link', { name: /Матриця: Перезавантаження/ })
  ).toHaveAttribute('href', '/details/movie/604');
  // Only "not at home yet" titles get a badge in these rows.
  await expect(recommended.getByText(/^Анонс/)).toHaveCount(1);
  await expect(recommended.getByText('Онлайн')).toHaveCount(0);

  const topic = page.getByRole('region', { name: 'Схожі за темою' });
  await expect(topic.getByText('simulated reality · dystopia')).toBeVisible();
  await expect(topic.getByRole('link', { name: /Тринадцятий поверх/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('similar titles are requested with the hidden genres', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem('pet-hidden-genres', 'horror'));
  const request = page.waitForRequest('**/api/similar/**');
  await gotoHydrated(page, '/details/movie/603');
  expect(new URL((await request).url()).searchParams.get('hideGenres')).toBe('horror');
});

test('the translation badge follows the chosen language', async ({ page }) => {
  await mockApi(page);
  await gotoHydrated(page, '/');
  await expect(page.getByTitle('Немає перекладу: українська')).toHaveCount(1);

  await page.getByRole('button', { name: 'Фільтри' }).click();
  const sheet = page.getByRole('dialog', { name: 'Фільтри' });
  await sheet.getByLabel('Позначати, якщо немає перекладу').selectOption('pl');
  await sheet.getByRole('button', { name: 'Показати' }).click();

  // Dark has Polish, The Matrix does not.
  await expect(page.getByTitle('Немає перекладу: польська')).toHaveCount(1);
  await expect(page.getByTitle('Немає перекладу: українська')).toHaveCount(0);

  await page.reload();
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  await expect(page.getByTitle('Немає перекладу: польська')).toHaveCount(1);
});

test('search suggests titles and people while typing', async ({ page }) => {
  const { discoverRequests } = await mockApi(page);
  await gotoHydrated(page, '/');
  const input = page.getByRole('combobox', { name: 'Пошук фільмів, серіалів і людей' });

  await input.fill('ма');
  await page.waitForTimeout(400);
  await expect(page.getByRole('listbox', { name: 'Підказки' })).toHaveCount(0);

  const requestsBefore = discoverRequests.length;
  await input.fill('матриця');
  const list = page.getByRole('listbox', { name: 'Підказки' });
  await expect(list.getByRole('option')).toHaveCount(2);
  await expect(list.getByRole('option', { name: /Кіану Рівз/ })).toContainText('Людина · Матриця');
  // Typing alone does not run the full search.
  expect(discoverRequests.length).toBe(requestsBefore);

  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', 'search-suggest-0');
  await input.press('Escape');
  await expect(list).toHaveCount(0);

  await input.fill('матрица');
  await input.fill('матриця');
  await list.getByRole('option', { name: /Кіану Рівз/ }).click();
  await expect(page).toHaveURL(/\/person\/6384$/);
});
