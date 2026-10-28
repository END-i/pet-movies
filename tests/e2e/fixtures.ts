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
    voteCount: 25000,
    release: { status: 'online' }
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
    voteCount: 6000,
    release: { status: 'upcoming', date: '2027-01-10' }
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
  ageRating: '16+',
  voteAverage: 8.2,
  voteCount: 25000,
  popularity: 80,
  imdbId: 'tt0133093',
  genres: ['Бойовик', 'Фантастика'],
  actors: [{ id: 6384, name: 'Кіану Рівз', character: 'Нео', photo: null }],
  trailerKey: null,
  release: { status: 'cinema', date: '2026-12-01' },
  tagline: 'Ласкаво просимо в реальний світ.',
  runtime: 136,
  makers: [{ id: 9339, name: 'Лана Вачовскі' }],
  budget: 63000000,
  revenue: 463517383,
  networks: [],
  series: null,
  seasons: [],
  watch: {
    link: 'https://www.themoviedb.org/movie/603/watch?locale=UA',
    stream: [{ id: 8, name: 'Netflix', logo: null }],
    rent: [],
    buy: []
  }
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
      role: 'cast',
      character: 'Нео',
      voteAverage: 8.2,
      voteCount: 25000
    },
    {
      id: 155,
      mediaType: 'movie',
      title: 'Джон Вік',
      originalTitle: 'John Wick',
      year: '2014',
      poster: null,
      role: 'cast',
      character: 'Джон Вік',
      voteAverage: 7.4,
      voteCount: 19000
    },
    {
      id: 900,
      mediaType: 'movie',
      title: 'Людина Ци',
      originalTitle: 'Man of Tai Chi',
      year: '2013',
      poster: null,
      role: 'directing',
      character: 'Director',
      voteAverage: 6.1,
      voteCount: 700
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
  await page.route('**/api/search/people.json*', (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') ?? '';
    return json(route, {
      results: /кіану|keanu/i.test(query)
        ? [
            {
              id: 6384,
              name: 'Кіану Рівз',
              photo: null,
              department: 'Acting',
              knownFor: ['Матриця', 'Джон Вік']
            }
          ]
        : []
    });
  });
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
