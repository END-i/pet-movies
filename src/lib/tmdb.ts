const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function isTrue(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const processDebugValue =
  typeof globalThis !== 'undefined' && 'process' in globalThis
    ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
        ?.TMDB_DEBUG
    : undefined;
export const TMDB_DEBUG = isTrue(import.meta.env.TMDB_DEBUG) || isTrue(processDebugValue);

function getApiKey(): string {
  const apiKey = import.meta.env.TMDB_API_KEY || import.meta.env.PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY відсутній. Додайте його у файл .env.');
  }

  return apiKey;
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
    console.log('[TMDB][request]', {
      path,
      params: requestParams,
      language
    });
    console.log('[TMDB][response]', payload);
  }

  return payload;
}

export function makeImageUrl(path: string | null | undefined, size = 'w500'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
