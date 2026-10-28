import type { APIRoute } from 'astro';
import { makeImageUrl, tmdbRequest, TMDB_DEBUG, TMDB_TTL } from '../../../../lib/tmdb';
import type { MediaType, MovieDetails } from '../../../../lib/types';
import { pickAgeRating } from '../../../../lib/ageRating';
import { countryName, tmdbLanguage } from '../../../../lib/i18n';
import {
  isoDate,
  movieRelease,
  summarizeReleaseDates,
  tvRelease
} from '../../../../lib/releaseStatus';
import { summarizeSeries } from '../../../../lib/series';
import type { WatchProvider } from '../../../../lib/types';
import { translatedLanguages } from '../../../../lib/translations';
import type { TmdbDetailsResponse, TmdbProvider } from '../../../../lib/tmdb-types';

function toProviders(list: TmdbProvider[] | undefined): WatchProvider[] {
  return (list ?? []).map((provider) => ({
    id: provider.provider_id,
    name: provider.provider_name,
    logo: makeImageUrl(provider.logo_path, 'w92')
  }));
}

function pickWatchProviders(
  region:
    | { link?: string; flatrate?: TmdbProvider[]; rent?: TmdbProvider[]; buy?: TmdbProvider[] }
    | undefined
): MovieDetails['watch'] {
  if (!region) return null;
  const watch = {
    link: region.link ?? '',
    stream: toProviders(region.flatrate),
    rent: toProviders(region.rent),
    buy: toProviders(region.buy)
  };
  return watch.stream.length || watch.rent.length || watch.buy.length ? watch : null;
}

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const mediaType = params.mediaType as MediaType;
    const id = Number(params.id);

    if (!['movie', 'tv'].includes(mediaType) || Number.isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Некоректні параметри' }), { status: 400 });
    }

    const language = tmdbLanguage(url.searchParams.get('locale'));
    const data = await tmdbRequest<TmdbDetailsResponse>(
      `/${mediaType}/${id}`,
      {
        append_to_response: `credits,videos,external_ids,translations,watch/providers,${
          mediaType === 'movie' ? 'release_dates' : 'content_ratings,aggregate_credits'
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
      translations: translatedLanguages(data.translations?.translations),
      year: (data.release_date ?? data.first_air_date ?? '').slice(0, 4),
      poster: makeImageUrl(data.poster_path),
      backdrop: makeImageUrl(data.backdrop_path, 'w780'),
      overview: localizedOverview || '',
      countries: (data.production_countries ?? []).map((country) =>
        country.iso_3166_1 ? countryName(country.iso_3166_1, language, country.name) : country.name
      ),
      ageRating: pickAgeRating(certifications, Boolean(data.adult)),
      voteAverage: data.vote_average,
      voteCount: data.vote_count,
      popularity: data.popularity,
      imdbId: data.external_ids?.imdb_id ?? null,
      genres: (data.genres ?? []).map((genre) => genre.name),
      actors: (data.aggregate_credits?.cast?.length
        ? data.aggregate_credits.cast.map((actor) => ({
            ...actor,
            character: actor.roles?.[0]?.character ?? ''
          }))
        : (data.credits?.cast ?? [])
      )
        .slice(0, 12)
        .map((actor) => ({
          id: actor.id,
          name: actor.name,
          character: actor.character,
          photo: makeImageUrl(actor.profile_path, 'w185')
        })),
      trailerKey: trailer?.key ?? null,
      tagline: data.tagline?.trim() || undefined,
      runtime:
        mediaType === 'movie'
          ? (data.runtime ?? null)
          : (data.episode_run_time?.[0] ?? data.last_episode_to_air?.runtime ?? null),
      makers:
        mediaType === 'movie'
          ? (data.credits?.crew ?? [])
              .filter((member) => member.job === 'Director')
              .map(({ id: personId, name }) => ({ id: personId, name }))
              .filter((person, index, list) => list.findIndex((p) => p.id === person.id) === index)
          : (data.created_by ?? []).map(({ id: personId, name }) => ({ id: personId, name })),
      budget: data.budget || undefined,
      revenue: data.revenue || undefined,
      networks: (data.networks ?? []).map((network) => network.name),
      series: mediaType === 'tv' ? summarizeSeries(data) : null,
      seasons:
        mediaType === 'tv'
          ? (data.seasons ?? [])
              .filter((season) => season.season_number > 0)
              .map((season) => ({
                number: season.season_number,
                name: season.name,
                episodes: season.episode_count ?? 0,
                year: (season.air_date ?? '').slice(0, 4)
              }))
          : [],
      watch: pickWatchProviders(data['watch/providers']?.results?.UA),
      release:
        mediaType === 'movie'
          ? movieRelease(
              summarizeReleaseDates(data.release_dates),
              data.release_date,
              isoDate(new Date())
            )
          : tvRelease(data.first_air_date, isoDate(new Date()))
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
