import type { APIRoute } from 'astro';
import { makeImageUrl, tmdbRequest, TMDB_DEBUG, TMDB_TTL } from '../../../lib/tmdb';
import { tmdbLanguage } from '../../../lib/i18n';
import type { ActorCreditItem, ActorDetails } from '../../../lib/types';

interface PersonResponse {
  id: number;
  name: string;
  gender?: number;
  also_known_as?: string[];
  biography?: string;
  birthday?: string;
  place_of_birth?: string;
  known_for_department?: string;
  popularity?: number;
  profile_path?: string | null;
  imdb_id?: string | null;
  movie_credits?: {
    cast?: Array<{
      id: number;
      title?: string;
      original_title?: string;
      release_date?: string;
      poster_path?: string | null;
      character?: string;
      vote_average?: number;
      vote_count?: number;
    }>;
  };
  tv_credits?: {
    cast?: Array<{
      id: number;
      name?: string;
      original_name?: string;
      first_air_date?: string;
      poster_path?: string | null;
      character?: string;
      vote_average?: number;
      vote_count?: number;
    }>;
  };
}

function calculateAge(birthday?: string): number | null {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function resolveGenderLabel(gender?: number): string {
  if (gender === 1) return 'Жінка';
  if (gender === 2) return 'Чоловік';
  return 'Невідомо';
}

function resolveSegment(
  gender: number | undefined,
  age: number | null
): 'male' | 'female' | 'child' | 'person' {
  if (typeof age === 'number' && age < 18) return 'child';
  if (gender === 2) return 'male';
  if (gender === 1) return 'female';
  return 'person';
}

function sortCredits(credits: Array<ActorCreditItem & { voteCount: number }>) {
  return credits.sort((left, right) => {
    if (right.voteCount !== left.voteCount) {
      return right.voteCount - left.voteCount;
    }
    return right.year.localeCompare(left.year);
  });
}

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const id = Number(params.id ?? '0');
    if (Number.isNaN(id) || id < 1) {
      return new Response(JSON.stringify({ error: 'Некоректний ID актора' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await tmdbRequest<PersonResponse>(
      `/person/${id}`,
      {
        append_to_response: 'movie_credits,tv_credits',
        language: tmdbLanguage(url.searchParams.get('locale'))
      },
      { ttlMs: TMDB_TTL.entity }
    );

    const age = calculateAge(data.birthday);
    const segment = resolveSegment(data.gender, age);

    const movieCredits = (data.movie_credits?.cast ?? []).map((item) => ({
      id: item.id,
      mediaType: 'movie' as const,
      title: item.title ?? item.original_title ?? 'Без назви',
      originalTitle: item.original_title ?? item.title ?? 'Без назви',
      year: (item.release_date ?? '').slice(0, 4),
      poster: makeImageUrl(item.poster_path ?? null),
      character: item.character ?? '—',
      voteAverage: item.vote_average ?? 0,
      voteCount: item.vote_count ?? 0
    }));

    const tvCredits = (data.tv_credits?.cast ?? []).map((item) => ({
      id: item.id,
      mediaType: 'tv' as const,
      title: item.name ?? item.original_name ?? 'Без назви',
      originalTitle: item.original_name ?? item.name ?? 'Без назви',
      year: (item.first_air_date ?? '').slice(0, 4),
      poster: makeImageUrl(item.poster_path ?? null),
      character: item.character ?? '—',
      voteAverage: item.vote_average ?? 0,
      voteCount: item.vote_count ?? 0
    }));

    const credits = sortCredits([...movieCredits, ...tvCredits])
      .slice(0, 40)
      .map(({ voteCount, ...credit }) => credit);

    const payload: ActorDetails = {
      id: data.id,
      name: data.name,
      originalName: data.also_known_as?.[0] ?? data.name,
      genderLabel: resolveGenderLabel(data.gender),
      age,
      segment,
      photo: makeImageUrl(data.profile_path ?? null, 'h632'),
      biography: data.biography?.trim() || 'Біографія поки відсутня.',
      birthday: data.birthday ?? 'Невідомо',
      placeOfBirth: data.place_of_birth ?? 'Невідомо',
      knownForDepartment: data.known_for_department ?? 'Невідомо',
      popularity: data.popularity ?? 0,
      imdbId: data.imdb_id ?? null,
      credits
    };

    if (TMDB_DEBUG) {
      console.log('[API][person][response]', payload);
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
        error: error instanceof Error ? error.message : 'Помилка завантаження актора з TMDB'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
