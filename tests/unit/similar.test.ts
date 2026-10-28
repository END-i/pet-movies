import { describe, expect, it } from 'vitest';
import {
  filterSimilar,
  pickTopicKeywords,
  rankByKeywordOverlap,
  toSimilarItem,
  type TmdbListItem
} from '../../src/lib/similar';

const item = (overrides: Partial<TmdbListItem> = {}): TmdbListItem => ({
  id: 1,
  title: 'Title',
  release_date: '2020-01-01',
  poster_path: '/p.jpg',
  genre_ids: [28],
  original_language: 'en',
  vote_average: 7,
  ...overrides
});

describe('pickTopicKeywords', () => {
  it('drops generic and mood tags', () => {
    const picked = pickTopicKeywords([
      { id: 1, name: 'based on novel or book' },
      { id: 2, name: 'time travel' },
      { id: 3, name: 'duringcreditsstinger' },
      { id: 4, name: 'paradox' },
      { id: 5, name: 'Chilling' }
    ]);
    expect(picked.map((keyword) => keyword.name)).toEqual(['time travel', 'paradox']);
  });

  it('keeps at most the given number', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({ id: index, name: `tag ${index}` }));
    expect(pickTopicKeywords(many, 5)).toHaveLength(5);
  });

  it('handles titles without keywords', () => {
    expect(pickTopicKeywords(undefined)).toEqual([]);
  });
});

describe('filterSimilar', () => {
  const options = { currentId: 99, isAnimation: false, hiddenIds: [] as number[] };

  it('removes the current title, duplicates, titles without posters and Russian titles', () => {
    const result = filterSimilar(
      [
        item({ id: 99 }),
        item({ id: 1 }),
        item({ id: 1 }),
        item({ id: 2, poster_path: null }),
        item({ id: 3, original_language: 'ru' }),
        item({ id: 4 })
      ],
      options
    );
    expect(result.map((entry) => entry.id)).toEqual([1, 4]);
  });

  it('keeps the format: cartoons for a cartoon, live action otherwise', () => {
    const list = [item({ id: 1, genre_ids: [16, 35] }), item({ id: 2, genre_ids: [35] })];
    expect(filterSimilar(list, options).map((entry) => entry.id)).toEqual([2]);
    expect(filterSimilar(list, { ...options, isAnimation: true }).map((entry) => entry.id)).toEqual(
      [1]
    );
  });

  it('applies hidden genres and an explicit exclude list', () => {
    const list = [item({ id: 1, genre_ids: [27] }), item({ id: 2 }), item({ id: 3 })];
    const result = filterSimilar(list, { ...options, hiddenIds: [27], exclude: new Set([2]) });
    expect(result.map((entry) => entry.id)).toEqual([3]);
  });
});

describe('toSimilarItem', () => {
  it('maps a movie with an approximate release badge', () => {
    const mapped = toSimilarItem(
      item({ release_date: '2030-05-01' }),
      'movie',
      'poster',
      '2026-10-28'
    );
    expect(mapped).toMatchObject({
      year: '2030',
      poster: 'poster',
      release: { status: 'upcoming' }
    });
  });

  it('maps a running series without a badge', () => {
    const mapped = toSimilarItem(
      item({
        title: undefined,
        name: 'Show',
        release_date: undefined,
        first_air_date: '2017-12-01'
      }),
      'tv',
      null,
      '2026-10-28'
    );
    expect(mapped).toMatchObject({ title: 'Show', year: '2017', release: null });
  });
});

describe('rankByKeywordOverlap', () => {
  const source = [
    { id: 1, name: 'time travel' },
    { id: 2, name: 'paradox' },
    { id: 3, name: 'small town ' }
  ];

  it('keeps titles sharing at least two keywords, most shared first', () => {
    const candidates = [
      item({ id: 10, vote_count: 9000 }),
      item({ id: 11, vote_count: 100 }),
      item({ id: 12, vote_count: 500 }),
      item({ id: 13, vote_count: 50 })
    ];
    const keywords = new Map([
      [10, [1, 99]],
      [11, [1, 2, 3]],
      [12, [1, 3]],
      [13, [2, 3]]
    ]);
    const ranked = rankByKeywordOverlap(candidates, keywords, source);
    expect(ranked.items.map((entry) => entry.id)).toEqual([11, 12, 13]);
    // Named by the keywords shared most often (trimmed).
    expect(ranked.keywords).toEqual(['small town', 'time travel', 'paradox']);
  });

  it('returns nothing when no title shares enough keywords', () => {
    const ranked = rankByKeywordOverlap([item({ id: 10 })], new Map([[10, [1]]]), source);
    expect(ranked).toEqual({ items: [], keywords: [] });
  });
});
