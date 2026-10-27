import { TMDB_API_KEY, TMDB_DEBUG as TMDB_DEBUG_ENV } from 'astro:env/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const TMDB_DEBUG = TMDB_DEBUG_ENV;

function getApiKey(): string {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY відсутній. Задайте змінну середовища на сервері (або в .env).');
  }

  return TMDB_API_KEY;
}

export async function tmdbRequest<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
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

export function makeImageUrl(path: string | null | undefined, size = 'w500'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
