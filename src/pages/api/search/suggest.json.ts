import type { APIRoute } from 'astro';
import { makeImageUrl, tmdbRequest } from '../../../lib/tmdb';
import { tmdbLanguage } from '../../../lib/i18n';
import { SUGGEST_MIN_CHARS, toSuggestions, type TmdbMultiResult } from '../../../lib/suggest';

export const GET: APIRoute = async ({ url }) => {
  const query = (url.searchParams.get('query') ?? '').trim();
  if (query.length < SUGGEST_MIN_CHARS) {
    return Response.json({ results: [] });
  }

  try {
    const data = await tmdbRequest<{ results?: TmdbMultiResult[] }>('/search/multi', {
      query,
      include_adult: 'false',
      language: tmdbLanguage(url.searchParams.get('locale'))
    });

    return Response.json(
      { results: toSuggestions(data.results, (path) => makeImageUrl(path ?? null, 'w92')) },
      { headers: { 'Cache-Control': 'public, max-age=300' } }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Помилка пошуку' },
      { status: 500 }
    );
  }
};
