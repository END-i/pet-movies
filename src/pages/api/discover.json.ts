import type { APIRoute } from 'astro';
import { makeImageUrl, tmdbRequest, TMDB_DEBUG } from '../../lib/tmdb';
import { createTtlCache } from '../../lib/cache';
import type { CatalogItem, MediaType } from '../../lib/types';
import {
  clampLimit,
  excludeCountries,
  mergeCatalogResults,
  normalizeSort,
  parseExcludedCountries
} from '../../lib/discover';
import { tmdbLanguage } from '../../lib/i18n';

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
    overview: string;
    vote_average: number;
    vote_count: number;
  }>;
}

interface EntityDetails {
  title?: string;
  name?: string;
  overview?: string;
  genres?: Array<{ name: string }>;
  production_countries?: Array<{ name: string; iso_3166_1?: string }>;
  origin_country?: string[];
  credits?: {
    cast?: Array<{ name: string }>;
  };
  translations?: {
    translations?: Array<{
      iso_639_1: string;
      data?: {
        title?: string;
        name?: string;
        overview?: string;
      };
    }>;
  };
}

/** The part of `/{type}/{id}` the catalog needs; kept small so thousands fit in memory. */
interface Enrichment {
  title?: string;
  overview?: string;
  countryNames: string[];
  countryCodes: string[];
  actors: string[];
  genres: string[];
  hasUkrainianTranslation: boolean;
}

// Each catalog page needs details for up to 20 titles; they change rarely, so keep them half a day.
const enrichmentCache = createTtlCache<Enrichment>({
  maxEntries: 5000,
  ttlMs: 12 * 60 * 60 * 1000
});

async function loadEnrichment(
  mediaType: MediaType,
  id: number,
  language: string
): Promise<Enrichment> {
  return enrichmentCache.getOrLoad(`${mediaType}:${id}:${language}`, async () => {
    const details = await tmdbRequest<EntityDetails>(
      `/${mediaType}/${id}`,
      { append_to_response: 'credits,translations', language },
      { ttlMs: 0 }
    );
    const ukTranslation = (details.translations?.translations ?? []).find(
      (translation) => translation.iso_639_1 === 'uk'
    );

    return {
      title: details.title ?? details.name,
      overview: details.overview,
      countryNames: details.production_countries?.map((country) => country.name) ?? [],
      countryCodes: Array.from(
        new Set([
          ...(details.production_countries ?? [])
            .map((country) => country.iso_3166_1)
            .filter((code): code is string => Boolean(code)),
          ...(details.origin_country ?? [])
        ])
      ),
      actors: (details.credits?.cast ?? []).slice(0, 3).map((actor) => actor.name),
      genres: (details.genres ?? []).map((genreItem) => genreItem.name),
      hasUkrainianTranslation: Boolean(
        ukTranslation?.data?.title || ukTranslation?.data?.name || ukTranslation?.data?.overview
      )
    };
  });
}

const CATEGORY_TO_CONFIG: Record<string, { mediaType: MediaType; forceAnimation: boolean }> = {
  movie: { mediaType: 'movie', forceAnimation: false },
  cartoon: { mediaType: 'movie', forceAnimation: true },
  tv: { mediaType: 'tv', forceAnimation: false }
};

async function loadByConfig(args: {
  categoryConfig: { mediaType: MediaType; forceAnimation: boolean };
  page: number;
  query: string;
  sortBy: string;
  year: string;
  minRating: string;
  minVotes: string;
  genre: string;
  ageRating: string;
  releaseDateGte: string;
  releaseDateLte: string;
  includeCountry: string;
  language: 'uk-UA' | 'en-US';
}): Promise<{ page: number; totalPages: number; totalResults: number; results: CatalogItem[] }> {
  const {
    categoryConfig,
    page,
    query,
    sortBy,
    year,
    minRating,
    minVotes,
    genre,
    ageRating,
    releaseDateGte,
    releaseDateLte,
    includeCountry,
    language
  } = args;

  const withGenres = [categoryConfig.forceAnimation ? '16' : undefined, genre]
    .filter(Boolean)
    .join(',');

  const discoverParams: Record<string, string | number | undefined> = {
    page,
    sort_by: normalizeSort(sortBy, categoryConfig.mediaType),
    'vote_average.gte': minRating,
    'vote_count.gte': minVotes,
    with_genres: withGenres || undefined,
    with_origin_country: includeCountry || undefined,
    language
  };

  if (query) {
    discoverParams.query = query;
  }

  if (categoryConfig.mediaType === 'movie') {
    discoverParams.primary_release_year = year || undefined;
    discoverParams['primary_release_date.gte'] = releaseDateGte || undefined;
    discoverParams['primary_release_date.lte'] = releaseDateLte || undefined;
    discoverParams.certification_country = ageRating ? 'US' : undefined;
    discoverParams['certification.lte'] = ageRating || undefined;
    discoverParams.without_genres = categoryConfig.forceAnimation ? undefined : '16';
  } else {
    discoverParams.first_air_date_year = year || undefined;
    discoverParams['first_air_date.gte'] = releaseDateGte || undefined;
    discoverParams['first_air_date.lte'] = releaseDateLte || undefined;
  }

  const endpoint = query
    ? `/search/${categoryConfig.mediaType}`
    : `/discover/${categoryConfig.mediaType}`;
  const discovered = await tmdbRequest<DiscoverResponse>(endpoint, discoverParams);

  const enrichedItems = await Promise.all(
    discovered.results.map(async (item) => {
      try {
        const details = await loadEnrichment(categoryConfig.mediaType, item.id, language);
        const localizedTitle = details.title ?? item.title ?? item.name;
        const localizedOverview = details.overview ?? item.overview;
        const originalTitle =
          item.original_title ?? item.original_name ?? localizedTitle ?? 'Без назви';

        return {
          id: item.id,
          mediaType: categoryConfig.mediaType,
          title: localizedTitle ?? originalTitle,
          originalTitle,
          hasUkrainianTranslation: details.hasUkrainianTranslation,
          year: (item.release_date ?? item.first_air_date ?? '').slice(0, 4),
          poster: makeImageUrl(item.poster_path),
          countries: details.countryNames.length ? details.countryNames : details.countryCodes,
          countryCodes: details.countryCodes,
          actors: details.actors,
          genres: details.genres,
          overview: localizedOverview || 'Опис поки відсутній.',
          voteAverage: item.vote_average,
          voteCount: item.vote_count
        } as CatalogItem;
      } catch {
        const originalTitle =
          item.original_title ?? item.original_name ?? item.title ?? item.name ?? 'Без назви';
        return {
          id: item.id,
          mediaType: categoryConfig.mediaType,
          title: item.title ?? item.name ?? originalTitle,
          originalTitle,
          hasUkrainianTranslation: false,
          year: (item.release_date ?? item.first_air_date ?? '').slice(0, 4),
          poster: makeImageUrl(item.poster_path),
          countries: [],
          actors: [],
          genres: [],
          overview: item.overview || 'Опис поки відсутній.',
          voteAverage: item.vote_average,
          voteCount: item.vote_count
        } as CatalogItem;
      }
    })
  );

  return {
    page: discovered.page,
    totalPages: discovered.total_pages,
    totalResults: discovered.total_results,
    results: enrichedItems
  };
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get('category') ?? '';
    const categoryConfig = CATEGORY_TO_CONFIG[category];
    const locale = (url.searchParams.get('locale') ?? 'uk').trim();
    const language = tmdbLanguage(locale);

    if (!categoryConfig && category !== 'all') {
      return new Response(
        JSON.stringify({ page: 1, totalPages: 0, totalResults: 0, results: [] as CatalogItem[] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const query = (url.searchParams.get('query') ?? '').trim();
    const sortBy = url.searchParams.get('sortBy') ?? 'popularity.desc';
    const year = (url.searchParams.get('year') ?? '').trim();
    const minRating = (url.searchParams.get('minRating') ?? '').trim();
    const minVotes = (url.searchParams.get('minVotes') ?? '').trim();
    const genre = (url.searchParams.get('genre') ?? '').trim();
    const ageRating = (url.searchParams.get('ageRating') ?? '').trim();
    const releaseDateGte = (url.searchParams.get('releaseDateGte') ?? '').trim();
    const releaseDateLte = (url.searchParams.get('releaseDateLte') ?? '').trim();
    const limit = clampLimit(url.searchParams.get('limit'));
    const includeCountry = (url.searchParams.get('includeCountry') ?? '').trim().toUpperCase();
    const excludedCountries = parseExcludedCountries(url.searchParams.get('excludedCountries'));

    const loaded =
      category === 'all'
        ? await Promise.all([
            loadByConfig({
              categoryConfig: CATEGORY_TO_CONFIG.movie,
              page,
              query,
              sortBy,
              year,
              minRating,
              minVotes,
              genre: '',
              ageRating,
              releaseDateGte,
              releaseDateLte,
              includeCountry,
              language
            }),
            loadByConfig({
              categoryConfig: CATEGORY_TO_CONFIG.tv,
              page,
              query,
              sortBy,
              year,
              minRating,
              minVotes,
              genre: '',
              ageRating,
              releaseDateGte,
              releaseDateLte,
              includeCountry,
              language
            })
          ])
        : [
            await loadByConfig({
              categoryConfig,
              page,
              query,
              sortBy,
              year,
              minRating,
              minVotes,
              genre,
              ageRating,
              releaseDateGte,
              releaseDateLte,
              includeCountry,
              language
            })
          ];

    const mergedResults = mergeCatalogResults(
      loaded.flatMap((payload) => payload.results),
      sortBy
    );

    const filtered = excludeCountries(mergedResults, excludedCountries);
    const limitedResults = filtered
      .slice(0, limit)
      .map(({ countryCodes: _codes, ...item }) => item);

    const backendPayload = {
      page,
      totalPages: Math.max(...loaded.map((payload) => payload.totalPages), 1),
      totalResults: loaded.reduce((acc, payload) => acc + payload.totalResults, 0),
      results: limitedResults
    };

    if (TMDB_DEBUG) {
      console.log('[API][discover][response]', backendPayload);
    }

    return new Response(JSON.stringify(backendPayload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Помилка пошуку TMDB'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
