import type { APIRoute } from 'astro';
import { makeImageUrl, tmdbRequest, TMDB_DEBUG, TMDB_TTL } from '../../../../lib/tmdb';
import type { MediaType, MovieDetails } from '../../../../lib/types';
import { pickAgeRating } from '../../../../lib/ageRating';
import { tmdbLanguage } from '../../../../lib/i18n';

interface DetailsResponse {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  production_countries?: Array<{ name: string }>;
  genres?: Array<{ name: string }>;
  adult?: boolean;
  vote_average: number;
  vote_count: number;
  popularity: number;
  external_ids?: {
    imdb_id?: string;
  };
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }>;
  };
  release_dates?: {
    results?: Array<{
      iso_3166_1: string;
      release_dates?: Array<{ certification?: string }>;
    }>;
  };
  content_ratings?: {
    results?: Array<{ iso_3166_1: string; rating?: string }>;
  };
  videos?: {
    results?: Array<{
      key: string;
      site: string;
      type: string;
      official: boolean;
    }>;
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

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const mediaType = params.mediaType as MediaType;
    const id = Number(params.id);

    if (!['movie', 'tv'].includes(mediaType) || Number.isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Некоректні параметри' }), { status: 400 });
    }

    const language = tmdbLanguage(url.searchParams.get('locale'));
    const data = await tmdbRequest<DetailsResponse>(
      `/${mediaType}/${id}`,
      {
        append_to_response: `credits,videos,external_ids,translations,${
          mediaType === 'movie' ? 'release_dates' : 'content_ratings'
        }`,
        include_video_language: 'uk,en,null',
        language
      },
      { ttlMs: TMDB_TTL.entity }
    );

    const certifications =
      mediaType === 'movie'
        ? (data.release_dates?.results ?? []).map((entry) => ({
            country: entry.iso_3166_1,
            rating:
              (entry.release_dates ?? []).map((date) => date.certification ?? '').find(Boolean) ??
              ''
          }))
        : (data.content_ratings?.results ?? []).map((entry) => ({
            country: entry.iso_3166_1,
            rating: entry.rating ?? ''
          }));

    const ukTranslation = (data.translations?.translations ?? []).find(
      (translation) => translation.iso_639_1 === 'uk'
    );
    // TMDB already localizes title/overview for `language`; the uk translation is only a fallback.
    const preferredTranslation = language === 'uk-UA' ? ukTranslation : undefined;
    const localizedTitle =
      preferredTranslation?.data?.title ??
      preferredTranslation?.data?.name ??
      data.title ??
      data.name;
    const localizedOverview = preferredTranslation?.data?.overview || data.overview;
    const originalTitle =
      data.original_title ?? data.original_name ?? localizedTitle ?? 'Без назви';
    const hasUkrainianTranslation = Boolean(
      ukTranslation?.data?.title || ukTranslation?.data?.name || ukTranslation?.data?.overview
    );

    const trailer = (data.videos?.results ?? []).find(
      (video) => video.site === 'YouTube' && video.type === 'Trailer'
    );

    const payload: MovieDetails = {
      id: data.id,
      mediaType,
      title: localizedTitle ?? originalTitle,
      originalTitle,
      hasUkrainianTranslation,
      year: (data.release_date ?? data.first_air_date ?? '').slice(0, 4),
      poster: makeImageUrl(data.poster_path),
      backdrop: makeImageUrl(data.backdrop_path, 'w780'),
      overview: localizedOverview || 'Опис поки відсутній.',
      countries: (data.production_countries ?? []).map((country) => country.name),
      ageRating: pickAgeRating(certifications, Boolean(data.adult)),
      voteAverage: data.vote_average,
      voteCount: data.vote_count,
      popularity: data.popularity,
      imdbId: data.external_ids?.imdb_id ?? null,
      genres: (data.genres ?? []).map((genre) => genre.name),
      actors: (data.credits?.cast ?? []).slice(0, 12).map((actor) => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
        photo: makeImageUrl(actor.profile_path, 'w185')
      })),
      trailerKey: trailer?.key ?? null
    };

    if (TMDB_DEBUG) {
      console.log('[API][details][response]', payload);
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Помилка завантаження деталей TMDB'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
