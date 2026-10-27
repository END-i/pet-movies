import type { APIRoute } from 'astro';
import { makeImageUrl, tmdbRequest } from '../../../lib/tmdb';
import type { PersonSegment } from '../../../lib/types';

interface PopularPersonItem {
  id: number;
  name: string;
  gender: number;
  popularity: number;
  profile_path: string | null;
  known_for_department?: string;
}

interface PopularPeopleResponse {
  page: number;
  results: PopularPersonItem[];
}

interface PersonDetailsResponse {
  birthday?: string;
}

function calculateAge(birthday?: string): number | null {
  if (!birthday) return null;
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function matchesSegment(segment: PersonSegment, gender: number, age: number | null): boolean {
  if (segment === 'child') {
    return typeof age === 'number' && age < 18;
  }
  if (segment === 'male') return gender === 2;
  if (segment === 'female') return gender === 1;
  return true;
}

function resolveSegment(value: string): PersonSegment {
  if (value === 'male' || value === 'female' || value === 'child') return value;
  return 'person';
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const segment = resolveSegment((url.searchParams.get('segment') ?? '').trim());
    const excludeId = Number(url.searchParams.get('excludeId') ?? '0');

    for (let page = 1; page <= 5; page += 1) {
      const payload = await tmdbRequest<PopularPeopleResponse>('/person/popular', { page });

      for (const person of payload.results) {
        if (excludeId > 0 && person.id === excludeId) continue;

        const details = await tmdbRequest<PersonDetailsResponse>(`/person/${person.id}`);
        const age = calculateAge(details.birthday);

        if (!matchesSegment(segment, person.gender, age)) continue;

        return new Response(
          JSON.stringify({
            id: person.id,
            name: person.name,
            popularity: person.popularity,
            photo: makeImageUrl(person.profile_path),
            knownForDepartment: person.known_for_department ?? 'Acting'
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=600'
            }
          }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Нічого не знайдено для цього сегмента' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Помилка пошуку популярного актора'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
