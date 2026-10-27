import { describe, expect, it } from 'vitest';
import { buildPaginationTokens, parsePositiveInteger } from '../../src/lib/pagination';

describe('buildPaginationTokens', () => {
  it('returns a single page for 0 or 1 pages', () => {
    expect(buildPaginationTokens(1, 0)).toEqual([1]);
    expect(buildPaginationTokens(1, 1)).toEqual([1]);
  });

  it('lists every page when there are 7 or fewer', () => {
    expect(buildPaginationTokens(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses gaps with ellipses around the current page', () => {
    expect(buildPaginationTokens(10, 20)).toEqual([1, '...', 9, 10, 11, '...', 20]);
  });

  it('has no leading ellipsis near the start and no trailing one near the end', () => {
    expect(buildPaginationTokens(1, 20)).toEqual([1, 2, '...', 20]);
    expect(buildPaginationTokens(20, 20)).toEqual([1, '...', 19, 20]);
  });
});

describe('parsePositiveInteger', () => {
  it('parses valid values and falls back otherwise', () => {
    expect(parsePositiveInteger('3', 1)).toBe(3);
    expect(parsePositiveInteger(null, 1)).toBe(1);
    expect(parsePositiveInteger('abc', 1)).toBe(1);
    expect(parsePositiveInteger('0', 1)).toBe(1);
    expect(parsePositiveInteger('-4', 2)).toBe(2);
  });
});
