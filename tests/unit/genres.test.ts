import { describe, expect, it } from 'vitest';
import { hiddenGenreIds, isGenreAllowed, parseHiddenGenres } from '../../src/lib/genres';

describe('hidden genres', () => {
  it('keeps only known keys, once', () => {
    expect(parseHiddenGenres('horror, action,horror,bogus')).toEqual(['horror', 'action']);
    expect(parseHiddenGenres(null)).toEqual([]);
  });

  it('maps keys to TMDB ids per media type', () => {
    expect(hiddenGenreIds(['horror', 'action'], 'movie')).toEqual([27, 28]);
    expect(hiddenGenreIds(['horror', 'action'], 'tv')).toEqual([10759]);
    expect(hiddenGenreIds(['scifi', 'fantasy'], 'tv')).toEqual([10765]);
  });

  it('filters titles that have any hidden genre', () => {
    expect(isGenreAllowed([28, 12], [27, 28])).toBe(false);
    expect(isGenreAllowed([35], [27, 28])).toBe(true);
    expect(isGenreAllowed(undefined, [27])).toBe(true);
    expect(isGenreAllowed([27], [])).toBe(true);
  });
});
