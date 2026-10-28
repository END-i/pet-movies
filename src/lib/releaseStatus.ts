export type ReleaseStatus = 'online' | 'cinema' | 'upcoming';

export interface ReleaseInfo {
  status: ReleaseStatus;
  /** YYYY-MM-DD: premiere date for `upcoming`, expected home release for `cinema`. */
  date?: string;
}

/** Earliest release date per kind, across all countries (YYYY-MM-DD). */
export interface ReleaseDates {
  home?: string;
  cinema?: string;
}

export interface TmdbReleaseDates {
  results?: Array<{ release_dates?: Array<{ type?: number; release_date?: string }> }>;
}

// TMDB release types: 1 premiere, 2 limited theatrical, 3 theatrical, 4 digital, 5 physical, 6 TV.
const HOME_TYPES = new Set([4, 5, 6]);
const CINEMA_TYPES = new Set([1, 2, 3]);

// After this long in cinemas a title is almost always on streaming, even if TMDB lacks the date.
const CINEMA_WINDOW_DAYS = 180;

const earliest = (a: string | undefined, b: string) => (!a || b < a ? b : a);

export function summarizeReleaseDates(data: TmdbReleaseDates | undefined): ReleaseDates {
  const summary: ReleaseDates = {};
  for (const country of data?.results ?? []) {
    for (const entry of country.release_dates ?? []) {
      const date = entry.release_date?.slice(0, 10);
      if (!date || entry.type === undefined) continue;
      if (HOME_TYPES.has(entry.type)) summary.home = earliest(summary.home, date);
      else if (CINEMA_TYPES.has(entry.type)) summary.cinema = earliest(summary.cinema, date);
    }
  }
  return summary;
}

export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return isoDate(value);
}

/** Can the movie be watched at home, only in cinemas, or not released yet? */
export function movieRelease(
  dates: ReleaseDates,
  primaryDate: string | undefined,
  today: string
): ReleaseInfo | null {
  if (dates.home && dates.home <= today) return { status: 'online' };

  const cinema = dates.cinema ?? (primaryDate || undefined);
  if (cinema && cinema <= today) {
    if (addDays(cinema, CINEMA_WINDOW_DAYS) <= today) return { status: 'online' };
    return dates.home ? { status: 'cinema', date: dates.home } : { status: 'cinema' };
  }

  const next = [cinema, dates.home].filter((date): date is string => Boolean(date)).sort()[0];
  return next ? { status: 'upcoming', date: next } : null;
}

/** Series are only marked while their premiere is still ahead. */
export function tvRelease(firstAirDate: string | undefined, today: string): ReleaseInfo | null {
  if (!firstAirDate) return null;
  return firstAirDate > today ? { status: 'upcoming', date: firstAirDate } : null;
}
