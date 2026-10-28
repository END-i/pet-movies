import type { MediaType } from './types';

// TMDB matches whole words better than prefixes; shorter queries return mostly noise.
export const SUGGEST_MIN_CHARS = 3;
export const SUGGEST_LIMIT = 8;

export interface Suggestion {
  kind: MediaType | 'person';
  id: number;
  title: string;
  /** Year for titles, best-known work for people. */
  detail: string;
  image: string | null;
}

export interface TmdbMultiResult {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  profile_path?: string | null;
  original_language?: string;
  popularity?: number;
  known_for?: Array<{ title?: string; name?: string }>;
}

/** Movies, series and people with something to show, most popular first; no Russian titles. */
export function toSuggestions(
  results: TmdbMultiResult[] | undefined,
  image: (path: string | null | undefined) => string | null
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const byPopularity = [...(results ?? [])].sort(
    (left, right) => (right.popularity ?? 0) - (left.popularity ?? 0)
  );

  for (const item of byPopularity) {
    if (item.media_type === 'movie' || item.media_type === 'tv') {
      if (item.original_language === 'ru') continue;
      suggestions.push({
        kind: item.media_type,
        id: item.id,
        title: item.title ?? item.name ?? '',
        detail: (item.release_date ?? item.first_air_date ?? '').slice(0, 4),
        image: image(item.poster_path)
      });
    } else if (item.media_type === 'person' && item.known_for?.length) {
      suggestions.push({
        kind: 'person',
        id: item.id,
        title: item.name ?? '',
        detail: item.known_for[0]?.title ?? item.known_for[0]?.name ?? '',
        image: image(item.profile_path)
      });
    }
  }

  return suggestions.filter((suggestion) => suggestion.title).slice(0, SUGGEST_LIMIT);
}

export function suggestionHref(suggestion: Suggestion): string {
  return suggestion.kind === 'person'
    ? `/person/${suggestion.id}`
    : `/details/${suggestion.kind}/${suggestion.id}`;
}
