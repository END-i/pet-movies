import { TMDB_API_KEY, TMDB_DEBUG as TMDB_DEBUG_ENV } from 'astro:env/server';
import { createTtlCache } from './cache';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const TMDB_DEBUG = TMDB_DEBUG_ENV;

const MINUTE = 60_000;
export const TMDB_TTL = {
  list: 15 * MINUTE,
  entity: 6 * 60 * MINUTE
} as const;

// Raw TMDB responses; small cap because details with credits can be tens of KB each.
const responseCache = createTtlCache<unknown>({ maxEntries: 300, ttlMs: TMDB_TTL.list });

function getApiKey(): string {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY відсутній. Задайте змінну середовища на сервері (або в .env).');
  }

  return TMDB_API_KEY;
}

/**
 * GET a TMDB endpoint. Responses are cached in memory for `ttlMs` (0 disables caching) and
 * identical concurrent requests share one network call.
 */
export function tmdbRequest<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  options: { ttlMs?: number } = {}
): Promise<T> {
  const ttlMs = options.ttlMs ?? TMDB_TTL.list;
  const key = `${path}?${Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join('&')}`;

  if (ttlMs <= 0) return fetchTmdb<T>(path, params);
  return responseCache.getOrLoad(key, () => fetchTmdb<T>(path, params), ttlMs) as Promise<T>;
}

async function fetchTmdb<T>(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<T> {
  const requestParams = { ...params };
  const language =
    typeof requestParams.language === 'string' && requestParams.language
      ? requestParams.language
      : 'uk-UA';
  delete requestParams.language;

  const searchParams = new URLSearchParams();
  searchParams.set('api_key', getApiKey());
  searchParams.set('language', language);

  Object.entries(requestParams).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(`${TMDB_BASE_URL}${path}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Помилка запиту TMDB: ${response.status}`);
  }

  const payload = (await response.json()) as T;

  if (TMDB_DEBUG) {
    console.log('[TMDB][request]', { path, params: requestParams, language });
    console.log('[TMDB][response]', payload);
  }

  return payload;
}

export function makeImageUrl(path: string | null | undefined, size = 'w342'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
