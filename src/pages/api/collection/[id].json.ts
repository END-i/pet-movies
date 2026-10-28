import { tmdbLanguage } from '../../../lib/i18n';
import type { APIRoute } from 'astro';
import { getCollectionById } from '../../../lib/collections';
import { makeImageUrl, tmdbRequest } from '../../../lib/tmdb';
import type { CatalogItem, CollectionDetails, MediaType } from '../../../lib/types';

interface DiscoverResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: Array<{
    id: number;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path: string | null;
    overview?: string;
    vote_average: number;
    vote_count: number;
  }>;
}

interface GenreResponse {
  genres: Array<{ id: number; name: string }>;
}

function localeToTmdbLanguage(locale: string): string {
  return tmdbLanguage(locale);
}

function mapSort(sortBy: string, mediaType: MediaType): string {
  if (mediaType === 'movie') return sortBy;
  if (sortBy.includes('primary_release_date')) {
    return sortBy.replace('primary_release_date', 'first_air_date');
  }
  return sortBy;
}

function periodDates(period: 'all' | '120' | undefined) {
  if (period !== '120') {
    return { gte: '', lte: '' };
  }

  const lteDate = new Date();
  const gteDate = new Date();
  gteDate.setDate(lteDate.getDate() - 120);

  return {
    gte: gteDate.toISOString().slice(0, 10),
    lte: lteDate.toISOString().slice(0, 10)
  };
}

async function fetchGenres(mediaType: MediaType, language: string) {
  const endpoint = mediaType === 'movie' ? '/genre/movie/list' : '/genre/tv/list';
  const payload = await tmdbRequest<GenreResponse>(endpoint, { language });

  return Object.fromEntries(payload.genres.map((genre) => [String(genre.id), genre.name]));
}

async function loadCatalogForType(args: {
  mediaType: MediaType;
  page: number;
  sortBy: string;
  minRating: string;
  minVotes: string;
  year?: string;
  genreId?: string;
  query?: string;
  period?: 'all' | '120';
  language: string;
}): Promise<{ page: number; totalPages: number; totalResults: number; results: CatalogItem[] }> {
  const { mediaType, page, sortBy, minRating, minVotes, year, genreId, query, period, language } =
    args;

  const dates = periodDates(period);
  const discoverParams: Record<string, string | number | undefined> = {
    page,
    sort_by: mapSort(sortBy, mediaType),
    'vote_average.gte': minRating,
    'vote_count.gte': minVotes,
    with_genres: genreId || undefined,
    language,
    query: query || undefined
  };

  if (mediaType === 'movie') {
    discoverParams.primary_release_year = year || undefined;
    discoverParams['primary_release_date.gte'] = dates.gte || undefined;
    discoverParams['primary_release_date.lte'] = dates.lte || undefined;
    discoverParams.without_genres = genreId === '16' ? undefined : '16';
  } else {
    discoverParams.first_air_date_year = year || undefined;
    discoverParams['first_air_date.gte'] = dates.gte || undefined;
    discoverParams['first_air_date.lte'] = dates.lte || undefined;
  }

  const endpoint = query ? `/search/${mediaType}` : `/discover/${mediaType}`;
  const discovered = await tmdbRequest<DiscoverResponse>(endpoint, discoverParams);

  const genreMap = await fetchGenres(mediaType, language);
  const genreList = genreId ? [genreMap[genreId]].filter(Boolean) : [];

  return {
    page: discovered.page,
    totalPages: discovered.total_pages,
    totalResults: discovered.total_results,
    results: discovered.results.map((item) => {
      const title = item.title ?? item.name ?? 'Без назви';
      const originalTitle = item.original_title ?? item.original_name ?? title;
      return {
        id: item.id,
        mediaType,
        title,
        originalTitle,
        hasUkrainianTranslation: true,
        year: (item.release_date ?? item.first_air_date ?? '').slice(0, 4),
        poster: makeImageUrl(item.poster_path),
        countries: [],
        actors: [],
        genres: genreList,
        overview: item.overview ?? '',
        voteAverage: item.vote_average,
        voteCount: item.vote_count
      };
    })
  };
}

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const category = getCollectionById(params.id ?? '');
    if (!category) {
      return new Response(JSON.stringify({ error: 'Категорію не знайдено' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const locale = (url.searchParams.get('locale') ?? 'uk').trim();
    const language = localeToTmdbLanguage(locale);

    const query = category.includeKeywords;

    const loaded =
      category.mediaType === 'all'
        ? await Promise.all([
            loadCatalogForType({
              mediaType: 'movie',
              page,
              sortBy: category.sortBy,
              minRating: category.minRating,
              minVotes: category.minVotes,
              year: category.year,
              genreId: undefined,
              query,
              period: category.releasePeriod,
              language
            }),
            loadCatalogForType({
              mediaType: 'tv',
              page,
              sortBy: category.sortBy,
              minRating: category.minRating,
              minVotes: category.minVotes,
              year: category.year,
              genreId: undefined,
              query,
              period: category.releasePeriod,
              language
            })
          ])
        : [
            await loadCatalogForType({
              mediaType: category.mediaType,
              page,
              sortBy: category.sortBy,
              minRating: category.minRating,
              minVotes: category.minVotes,
              year: category.year,
              genreId: category.genreId,
              query,
              period: category.releasePeriod,
              language
            })
          ];

    const merged = loaded.flatMap((payload) => payload.results);
    merged.sort((left, right) => {
      if (category.sortBy.includes('vote_average')) return right.voteAverage - left.voteAverage;
      return right.year.localeCompare(left.year);
    });

    const payload: CollectionDetails = {
      category,
      page,
      totalPages: Math.max(...loaded.map((item) => item.totalPages), 1),
      totalResults: loaded.reduce((sum, item) => sum + item.totalResults, 0),
      results: merged.slice(0, 20)
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Помилка завантаження колекції'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
