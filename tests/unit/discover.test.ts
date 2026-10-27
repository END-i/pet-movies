import { describe, expect, it } from 'vitest';
import {
  clampLimit,
  excludeCountries,
  mergeCatalogResults,
  normalizeSort,
  parseExcludedCountries
} from '../../src/lib/discover';
import type { CatalogItem } from '../../src/lib/types';

function item(id: number, overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id,
    mediaType: 'movie',
    title: `Title ${id}`,
    originalTitle: `Title ${id}`,
    hasUkrainianTranslation: true,
    year: '2020',
    poster: null,
    countries: [],
    countryCodes: [],
    actors: [],
    genres: [],
    overview: '',
    voteAverage: 7,
    voteCount: 100,
    ...overrides
  };
}

describe('normalizeSort', () => {
  it('keeps movie sorts and maps release date sorts for TV', () => {
    expect(normalizeSort('primary_release_date.desc', 'movie')).toBe('primary_release_date.desc');
    expect(normalizeSort('primary_release_date.asc', 'tv')).toBe('first_air_date.asc');
    expect(normalizeSort('popularity.desc', 'tv')).toBe('popularity.desc');
  });
});

describe('mergeCatalogResults', () => {
  const items = [
    item(1, { year: '2001', voteAverage: 6, voteCount: 50 }),
    item(2, { year: '2023', voteAverage: 8, voteCount: 10 }),
    item(3, { year: '1995', voteAverage: 7, voteCount: 900 })
  ];

  it('sorts by rating, popularity, newest and oldest', () => {
    expect(mergeCatalogResults(items, 'vote_average.desc').map((i) => i.id)).toEqual([2, 3, 1]);
    expect(mergeCatalogResults(items, 'popularity.desc').map((i) => i.id)).toEqual([3, 1, 2]);
    expect(mergeCatalogResults(items, 'primary_release_date.desc').map((i) => i.id)).toEqual([
      2, 1, 3
    ]);
    expect(mergeCatalogResults(items, 'primary_release_date.asc').map((i) => i.id)).toEqual([
      3, 1, 2
    ]);
  });

  it('does not mutate the input', () => {
    const copy = [...items];
    mergeCatalogResults(items, 'vote_average.desc');
    expect(items).toEqual(copy);
  });
});

describe('country exclusion', () => {
  it('always excludes RU and normalizes extra codes', () => {
    expect(parseExcludedCountries(null)).toEqual(['RU']);
    expect(parseExcludedCountries(' by, ru ,')).toEqual(['RU', 'BY']);
  });

  it('matches ISO codes exactly instead of substrings of names', () => {
    const peru = item(1, { countries: ['Peru'], countryCodes: ['PE'] });
    const russia = item(2, { countries: ['Russia'], countryCodes: ['RU'] });
    const coProduction = item(3, { countries: ['USA', 'Russia'], countryCodes: ['US', 'RU'] });
    const result = excludeCountries([peru, russia, coProduction], ['RU']);
    expect(result.map((i) => i.id)).toEqual([1]);
  });

  it('returns items unchanged when nothing is excluded', () => {
    const list = [item(1)];
    expect(excludeCountries(list, [])).toBe(list);
  });
});

describe('clampLimit', () => {
  it('keeps the limit within 1..20', () => {
    expect(clampLimit(null)).toBe(20);
    expect(clampLimit('5')).toBe(5);
    expect(clampLimit('500')).toBe(20);
    expect(clampLimit('0')).toBe(1);
    expect(clampLimit('nope')).toBe(20);
  });
});
