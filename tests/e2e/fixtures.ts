import type { Page, Route } from '@playwright/test';

export const catalogItems = [
  {
    id: 603,
    mediaType: 'movie',
    title: 'Матриця',
    originalTitle: 'The Matrix',
    hasUkrainianTranslation: true,
    year: '1999',
    poster: null,
    countries: ['США'],
    actors: ['Кіану Рівз'],
    genres: ['Бойовик', 'Фантастика'],
    overview: 'Хакер дізнається правду про реальність.',
    voteAverage: 8.2,
    voteCount: 25000
  },
  {
    id: 70523,
    mediaType: 'tv',
    title: 'Темрява',
    originalTitle: 'Dark',
    hasUkrainianTranslation: false,
    year: '2017',
    poster: null,
    countries: ['Німеччина'],
    actors: [],
    genres: ['Драма'],
    overview: 'Зникнення дітей у маленькому містечку.',
    voteAverage: 8.4,
    voteCount: 6000
  }
];

export const movieDetails = {
  id: 603,
  mediaType: 'movie',
  title: 'Матриця',
  originalTitle: 'The Matrix',
  hasUkrainianTranslation: true,
  year: '1999',
  poster: null,
  backdrop: null,
  overview: 'Хакер дізнається правду про реальність.',
  countries: ['США'],
  ageRating: 'R',
  voteAverage: 8.2,
  voteCount: 25000,
  popularity: 80,
  imdbId: 'tt0133093',
  genres: ['Бойовик', 'Фантастика'],
  actors: [{ id: 6384, name: 'Кіану Рівз', character: 'Нео', photo: null }],
  trailerKey: null
};

export const person = {
  id: 6384,
  name: 'Кіану Рівз',
  originalName: 'Keanu Reeves',
  genderLabel: 'Чоловік',
  age: 60,
  segment: 'male',
  photo: null,
  biography: 'Канадський актор.',
  birthday: '1964-09-02',
  placeOfBirth: 'Бейрут',
  knownForDepartment: 'Acting',
  popularity: 50,
  imdbId: 'nm0000206',
  credits: [
    {
      id: 603,
      mediaType: 'movie',
      title: 'Матриця',
      originalTitle: 'The Matrix',
      year: '1999',
      poster: null,
      character: 'Нео',
      voteAverage: 8.2
    }
  ]
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Mocks the app's own /api routes so tests do not need a TMDB key or network. */
export async function mockApi(page: Page, options: { totalPages?: number } = {}) {
  const discoverRequests: URL[] = [];

  await page.route('**/api/discover.json*', (route) => {
    const url = new URL(route.request().url());
    discoverRequests.push(url);
    const query = url.searchParams.get('query') ?? '';
    const results = query
      ? catalogItems.filter((item) =>
          item.originalTitle.toLowerCase().includes(query.toLowerCase())
        )
      : catalogItems;
    return json(route, {
      page: Number(url.searchParams.get('page') ?? '1'),
      totalPages: query ? 1 : (options.totalPages ?? 3),
      totalResults: query ? results.length : 42,
      results
    });
  });
  await page.route('**/api/details/**', (route) => json(route, movieDetails));
  await page.route('**/api/person/**', (route) => json(route, person));
  // Keep tests offline from external image CDNs.
  await page.route('https://image.tmdb.org/**', (route) => route.abort());

  return { discoverRequests };
}

export async function gotoHydrated(page: Page, url: string) {
  await page.goto(url);
  await page.addStyleTag({ content: 'astro-dev-toolbar { display: none !important; }' });
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'), undefined, {
    timeout: 30000
  });
}
