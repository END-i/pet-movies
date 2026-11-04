import { describe, expect, it } from 'vitest';
import {
  clearedFilters,
  countActiveFilters,
  defaultFilters,
  filtersFromParams,
  filtersToParams,
  cleanVotes,
  findTheme,
  keywordFilters,
  presetFilters,
  releaseRange,
  shareableSearch
} from '../../src/lib/catalog';

const today = new Date('2026-10-28T12:00:00Z');

describe('catalog filters', () => {
  it('starts with popular titles of the last 120 days', () => {
    const filters = defaultFilters(today);
    expect(filters).toMatchObject({
      category: 'all',
      sortBy: 'popularity.desc',
      releasePeriod: '120',
      releaseDateLte: '2026-10-28',
      releaseDateGte: '2026-06-30'
    });
    expect(countActiveFilters(filters, 0)).toBe(1);
  });

  it('clears everything on reset', () => {
    const filters = clearedFilters(today);
    expect(filters.releasePeriod).toBe('all');
    expect(filters.releaseDateGte).toBe('');
    expect(countActiveFilters(filters, 0)).toBe(0);
    expect(countActiveFilters(filters, 2)).toBe(1);
  });

  it('computes release ranges and keeps custom ones', () => {
    expect(releaseRange('7', today)).toEqual({ gte: '2026-10-21', lte: '2026-10-28' });
    expect(releaseRange('all', today)).toEqual({ gte: '', lte: '' });
    expect(releaseRange('custom', today)).toBeNull();
  });

  it('presets search the whole catalog, only "New releases" is recent', () => {
    const base = { ...defaultFilters(today), query: 'matrix', year: '1999' };
    const family = presetFilters(base, 'family', today);
    expect(family).toMatchObject({
      preset: 'family',
      category: 'movie',
      genre: '10751',
      ageRating: '6',
      query: '',
      year: '',
      releasePeriod: 'all',
      releaseDateGte: ''
    });
    const fresh = presetFilters(base, 'new', today);
    expect(fresh).toMatchObject({ releasePeriod: '120', sortBy: 'primary_release_date.desc' });
    expect(fresh.releaseDateGte).toBe('2026-06-30');
  });
});

describe('catalog URL', () => {
  it('round-trips filters through the shareable URL', () => {
    const filters = {
      ...presetFilters(defaultFilters(today), 'family', today),
      includeCountry: 'ua'
    };
    const params = filtersToParams(filters, 3, { locale: 'de', hiddenGenres: ['horror'] });
    expect(params.get('includeCountry')).toBe('UA');
    expect(params.get('hideGenres')).toBe('horror');

    const search = shareableSearch(params);
    expect(search).not.toContain('locale');
    expect(search).not.toContain('hideGenres');
    expect(search).not.toContain('query=');

    const restored = filtersFromParams(new URLSearchParams(search), defaultFilters(today), today);
    expect(restored.page).toBe(3);
    expect(restored.filters).toMatchObject({
      preset: 'family',
      genre: '10751',
      ageRating: '6',
      includeCountry: 'UA',
      releasePeriod: 'all'
    });
  });

  it('ignores unknown values and recomputes dates for a named period', () => {
    const restored = filtersFromParams(
      new URLSearchParams('category=books&releasePeriod=30&preset=nope&ageRating=PG-13&page=-2'),
      defaultFilters(today),
      today
    );
    expect(restored.filters.category).toBe('all');
    expect(restored.filters.preset).toBe('');
    expect(restored.filters.releaseDateGte).toBe('2026-09-28');
    expect(restored.filters.ageRating).toBe('12');
    expect(restored.page).toBe(1);
  });

  it('restores a theme or tag from the URL and rejects a bad keyword', () => {
    const restored = filtersFromParams(
      new URLSearchParams('keyword=4379&keywordName=time%20travel'),
      defaultFilters(today),
      today
    );
    expect(restored.filters.keyword).toBe('4379');
    expect(restored.filters.keywordName).toBe('time travel');
    // Not limited to the default recent period.
    expect(restored.filters.releasePeriod).toBe('all');
    expect(restored.filters.releaseDateGte).toBe('');
    const bad = filtersFromParams(new URLSearchParams('keyword=1,2'), defaultFilters(today), today);
    expect(bad.filters.keyword).toBe('');
  });
});

describe('themes', () => {
  it('a theme shows the whole catalog on that motif and leaves search and presets', () => {
    const current = { ...presetFilters(defaultFilters(today), 'family', today), query: 'abc' };
    const next = keywordFilters(current, '4379', 'time travel');
    expect(next).toMatchObject({
      keyword: '4379',
      // A known theme has its own translated name.
      keywordName: '',
      query: '',
      preset: '',
      releasePeriod: 'all',
      releaseDateGte: '',
      sortBy: 'popularity.desc'
    });
    expect(keywordFilters(current, '123', 'heist gone wrong').keywordName).toBe('heist gone wrong');
    expect(filtersToParams(next, 1, { locale: 'uk', hiddenGenres: [] }).get('keyword')).toBe(
      '4379'
    );
  });

  it('a preset leaves the theme', () => {
    const themed = keywordFilters(defaultFilters(today), '4379');
    expect(presetFilters(themed, 'new', today).keyword).toBe('');
  });

  it('finds a theme by keyword', () => {
    expect(findTheme('9715')?.en).toBe('Superheroes');
    expect(findTheme('1')).toBeUndefined();
  });
});

describe('typed filters', () => {
  it('takes any whole vote count and treats the rest as "any"', () => {
    expect(cleanVotes('350')).toBe('350');
    expect(cleanVotes(' 007 ')).toBe('7');
    expect(cleanVotes('5000000')).toBe('1000000');
    expect(cleanVotes('-3')).toBe('');
    expect(cleanVotes('1.5')).toBe('');
    expect(cleanVotes('')).toBe('');
  });

  it('restores only known sorts and clean vote counts from a link', () => {
    const restored = filtersFromParams(
      new URLSearchParams('sortBy=title.asc&minVotes=350'),
      defaultFilters(today),
      today
    );
    expect(restored.filters).toMatchObject({ sortBy: 'title.asc', minVotes: '350' });
    const bad = filtersFromParams(
      new URLSearchParams('sortBy=evil&minVotes=abc'),
      defaultFilters(today),
      today
    );
    expect(bad.filters.sortBy).toBe('popularity.desc');
    expect(bad.filters.minVotes).toBe('');
  });
});
