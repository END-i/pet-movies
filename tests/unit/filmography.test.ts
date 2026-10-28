import { describe, expect, it } from 'vitest';
import {
  countByRole,
  creditsForRole,
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

  it('shows each title once in "all", combining the cast role and crew jobs', () => {
    const list = [
      credit({ id: 7, role: 'cast', character: 'Who Am I' }),
      credit({ id: 7, role: 'writing', character: 'Screenplay' }),
      credit({ id: 7, role: 'directing', character: 'Director' }),
      credit({ id: 8, role: 'production', character: 'Producer' }),
      credit({ id: 8, role: 'production', character: 'Executive Producer' }),
      credit({ id: 7, mediaType: 'tv', role: 'cast', character: 'Self' })
    ];

    const all = creditsForRole(list, 'all');
    expect(all).toHaveLength(3);
    expect(all[0]).toMatchObject({ id: 7, mediaType: 'movie', character: 'Who Am I' });
    expect(all[0].jobs).toBe('Screenplay, Director');
    expect(all[1]).toMatchObject({ id: 8, character: '', jobs: 'Producer, Executive Producer' });

    const directing = creditsForRole(list, 'directing');
    expect(directing).toEqual([
      expect.objectContaining({ id: 7, character: '', jobs: 'Director' })
    ]);
  });
});
