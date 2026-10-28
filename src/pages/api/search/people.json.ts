import type { APIRoute } from 'astro';
import { makeImageUrl, tmdbRequest } from '../../../lib/tmdb';
import { tmdbLanguage } from '../../../lib/i18n';
import type { PersonSummary } from '../../../lib/types';

interface PersonSearchResponse {
  results?: Array<{
    id: number;
    name: string;
    profile_path?: string | null;
    known_for_department?: string;
    popularity?: number;
    known_for?: Array<{ title?: string; name?: string }>;
  }>;
}

const MAX_PEOPLE = 12;

export const GET: APIRoute = async ({ url }) => {
  const query = (url.searchParams.get('query') ?? '').trim();
  if (query.length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const data = await tmdbRequest<PersonSearchResponse>('/search/person', {
      query,
      include_adult: 'false',
      language: tmdbLanguage(url.searchParams.get('locale'))
    });

    const results: PersonSummary[] = (data.results ?? [])
      // People with no known work are mostly noise (namesakes, crew with one credit).
      .filter((person) => person.known_for?.length)
      .slice(0, MAX_PEOPLE)
      .map((person) => ({
        id: person.id,
        name: person.name,
        photo: makeImageUrl(person.profile_path ?? null, 'w185'),
        department: person.known_for_department ?? '',
        knownFor: (person.known_for ?? [])
          .map((item) => item.title ?? item.name ?? '')
          .filter(Boolean)
          .slice(0, 2)
      }));

    return Response.json({ results }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Помилка пошуку людей' },
      { status: 500 }
    );
  }
};
