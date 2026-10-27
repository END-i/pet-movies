import { describe, expect, it } from 'vitest';
import { movieRelease, summarizeReleaseDates, tvRelease } from '../../src/lib/releaseStatus';

const TODAY = '2026-10-27';

describe('summarizeReleaseDates', () => {
  it('keeps the earliest home and cinema dates across countries', () => {
    expect(
      summarizeReleaseDates({
        results: [
          {
            release_dates: [
              { type: 3, release_date: '2026-09-12T00:00:00.000Z' },
              { type: 4, release_date: '2026-11-20T00:00:00.000Z' }
            ]
          },
          {
            release_dates: [
              { type: 3, release_date: '2026-09-05T00:00:00.000Z' },
              { type: 6, release_date: '2027-03-01T00:00:00.000Z' }
            ]
          }
        ]
      })
    ).toEqual({ cinema: '2026-09-05', home: '2026-11-20' });
    expect(summarizeReleaseDates(undefined)).toEqual({});
  });
});

describe('movieRelease', () => {
  it('is online once a digital, disc or TV release has happened', () => {
    expect(movieRelease({ cinema: '2026-08-01', home: '2026-10-01' }, '2026-08-01', TODAY)).toEqual(
      { status: 'online' }
    );
  });

  it('is in cinemas with the expected home date when known', () => {
    expect(movieRelease({ cinema: '2026-10-10', home: '2026-12-01' }, '2026-10-10', TODAY)).toEqual(
      { status: 'cinema', date: '2026-12-01' }
    );
    expect(movieRelease({ cinema: '2026-10-10' }, '2026-10-10', TODAY)).toEqual({
      status: 'cinema'
    });
  });

  it('treats long-past cinema releases as available at home', () => {
    expect(movieRelease({ cinema: '1999-03-31' }, '1999-03-31', TODAY)).toEqual({
      status: 'online'
    });
    expect(movieRelease({}, '2010-01-01', TODAY)).toEqual({ status: 'online' });
  });

  it('is an announcement before the premiere', () => {
    expect(movieRelease({ cinema: '2027-02-14' }, '2027-02-14', TODAY)).toEqual({
      status: 'upcoming',
      date: '2027-02-14'
    });
    expect(movieRelease({}, '2026-12-25', TODAY)).toEqual({
      status: 'upcoming',
      date: '2026-12-25'
    });
  });

  it('returns null without any dates', () => {
    expect(movieRelease({}, undefined, TODAY)).toBeNull();
  });
});

describe('tvRelease', () => {
  it('marks only series that have not premiered', () => {
    expect(tvRelease('2027-01-10', TODAY)).toEqual({ status: 'upcoming', date: '2027-01-10' });
    expect(tvRelease('2020-01-10', TODAY)).toBeNull();
    expect(tvRelease(undefined, TODAY)).toBeNull();
  });
});
