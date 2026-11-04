import type { CatalogItem, MediaType } from './types';

/** The sorts the catalog offers (TMDB names for movies). */
export const SORTS = [
  'popularity.desc',
  'primary_release_date.desc',
  'primary_release_date.asc',
  'vote_average.desc',
  'vote_count.desc',
  'title.asc',
  'revenue.desc'
] as const;

/** TMDB's name of a sort for series: dates and titles are named differently, box office is none. */
export function normalizeSort(sortBy: string, mediaType: MediaType): string {
  if (mediaType === 'movie') return sortBy;
  if (sortBy.startsWith('primary_release_date.')) {
    return sortBy.replace('primary_release_date', 'first_air_date');
  }
  if (sortBy.startsWith('title.')) return sortBy.replace('title', 'name');
  // Series have no box office: the most voted come first instead.
  if (sortBy.startsWith('revenue.')) return 'vote_count.desc';
  return sortBy;
}

/** Merges movie + TV results into one list ordered like the requested TMDB sort. */
export function mergeCatalogResults(items: CatalogItem[], sortBy: string): CatalogItem[] {
  const sorted = [...items];

  if (sortBy.includes('vote_average')) {
    sorted.sort((left, right) => right.voteAverage - left.voteAverage);
  } else if (sortBy.startsWith('title.')) {
    sorted.sort((left, right) => left.title.localeCompare(right.title));
  } else if (
    sortBy.includes('popularity') ||
    sortBy.includes('vote_count') ||
    sortBy.includes('revenue')
  ) {
    // Popularity and box office are not in the list items: the vote count is the closest order.
    sorted.sort((left, right) => right.voteCount - left.voteCount);
  } else if (sortBy.endsWith('.asc')) {
    sorted.sort((left, right) => left.year.localeCompare(right.year));
  } else {
    sorted.sort((left, right) => right.year.localeCompare(left.year));
  }

  return sorted;
}

export function parseExcludedCountries(raw: string | null): string[] {
  const values = ['RU', ...(raw ?? '').split(',')]
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(values));
}

export function excludeCountries(items: CatalogItem[], excluded: string[]): CatalogItem[] {
  if (excluded.length === 0) return items;

  // Match ISO codes exactly; substring matching on names would also drop e.g. "Peru" for "RU".
  return items.filter((item) => {
    const codes = (item.countryCodes ?? []).map((code) => code.toUpperCase());
    return !excluded.some((country) => codes.includes(country));
  });
}

export function clampLimit(raw: string | null): number {
  const value = Number(raw ?? '20');
  return Number.isFinite(value) ? Math.min(20, Math.max(1, Math.round(value))) : 20;
}
