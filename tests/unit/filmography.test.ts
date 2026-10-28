import { describe, expect, it } from 'vitest';
import {
  countByRole,
  jobLabel,
  mergeCredits,
  roleForDepartment,
  sortCredits
} from '../../src/lib/filmography';
import type { ActorCreditItem } from '../../src/lib/types';

const credit = (overrides: Partial<ActorCreditItem>): ActorCreditItem => ({
  id: 1,
  mediaType: 'movie',
  title: 'T',
  originalTitle: 'T',
  year: '2000',
  poster: null,
  role: 'cast',
  character: '',
  voteAverage: 7,
  voteCount: 100,
  ...overrides
});

describe('filmography', () => {
  it('maps crew departments to roles and ignores the rest', () => {
    expect(roleForDepartment('Directing')).toBe('directing');
    expect(roleForDepartment('Writing')).toBe('writing');
    expect(roleForDepartment('Sound')).toBeNull();
    expect(roleForDepartment(undefined)).toBeNull();
  });

  it('merges several jobs on one title within a role, keeps roles apart', () => {
    const merged = mergeCredits([
      credit({ role: 'writing', character: 'Screenplay' }),
      credit({ role: 'writing', character: 'Story' }),
      credit({ role: 'writing', character: 'Story' }),
      credit({ role: 'directing', character: 'Director' })
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.role === 'writing')?.character).toBe('Screenplay, Story');
    expect(countByRole(merged)).toEqual({ writing: 1, directing: 1 });
  });

  it('sorts by popularity, rating, newest and oldest', () => {
    const list = [
      credit({ id: 1, year: '1999', voteAverage: 8.7, voteCount: 25000 }),
      credit({ id: 2, year: '2021', voteAverage: 6.5, voteCount: 5000 }),
      credit({ id: 3, year: '', voteAverage: 9.9, voteCount: 3 }),
      credit({ id: 4, year: '2010', voteAverage: 7.9, voteCount: 900 })
    ];
    const ids = (items: ActorCreditItem[]) => items.map((item) => item.id);
    expect(ids(sortCredits(list, 'popular'))).toEqual([1, 2, 4, 3]);
    // 9.9 from 3 votes goes after properly rated titles.
    expect(ids(sortCredits(list, 'rating'))).toEqual([1, 4, 2, 3]);
    expect(ids(sortCredits(list, 'newest'))).toEqual([2, 4, 1, 3]);
    expect(ids(sortCredits(list, 'oldest'))).toEqual([1, 4, 2, 3]);
  });

  it('translates common crew jobs', () => {
    expect(jobLabel('Director, Screenplay', 'uk')).toBe('Режисер, Сценарій');
    expect(jobLabel('Gaffer', 'uk')).toBe('Gaffer');
    expect(jobLabel('Director', 'en')).toBe('Director');
  });
});
