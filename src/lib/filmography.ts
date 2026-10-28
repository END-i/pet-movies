import type { ActorCreditItem, CreditRole } from './types';

export type CreditSort = 'popular' | 'rating' | 'newest' | 'oldest';

export const CREDIT_ROLES: CreditRole[] = ['cast', 'directing', 'writing', 'production'];

const ROLE_BY_DEPARTMENT: Record<string, CreditRole> = {
  Directing: 'directing',
  Writing: 'writing',
  Production: 'production'
};

export function roleForDepartment(department: string | undefined): CreditRole | null {
  return (department && ROLE_BY_DEPARTMENT[department]) || null;
}

/**
 * One entry per title and role: a person who wrote and directed a film appears under both
 * roles, but several writing jobs on one film collapse into one entry.
 */
export function mergeCredits(credits: ActorCreditItem[]): ActorCreditItem[] {
  const merged = new Map<string, ActorCreditItem>();
  for (const credit of credits) {
    const key = `${credit.mediaType}:${credit.id}:${credit.role}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...credit });
    } else if (credit.character && !existing.character.split(', ').includes(credit.character)) {
      existing.character = existing.character
        ? `${existing.character}, ${credit.character}`
        : credit.character;
    }
  }
  return [...merged.values()];
}

// Ratings from a handful of votes are noise; such titles go after well-rated ones.
const MIN_VOTES_FOR_RATING = 20;

export function sortCredits(credits: ActorCreditItem[], sort: CreditSort): ActorCreditItem[] {
  const list = [...credits];
  const byYear = (direction: 1 | -1) => (a: ActorCreditItem, b: ActorCreditItem) => {
    if (!a.year && !b.year) return 0;
    if (!a.year) return 1;
    if (!b.year) return -1;
    return direction * a.year.localeCompare(b.year);
  };

  switch (sort) {
    case 'rating':
      return list.sort((a, b) => {
        const aRated = a.voteCount >= MIN_VOTES_FOR_RATING;
        const bRated = b.voteCount >= MIN_VOTES_FOR_RATING;
        if (aRated !== bRated) return aRated ? -1 : 1;
        return b.voteAverage - a.voteAverage || b.voteCount - a.voteCount;
      });
    case 'newest':
      return list.sort(byYear(-1));
    case 'oldest':
      return list.sort(byYear(1));
    default:
      return list.sort((a, b) => b.voteCount - a.voteCount || b.year.localeCompare(a.year));
  }
}

export function countByRole(credits: ActorCreditItem[]): Partial<Record<CreditRole, number>> {
  const counts: Partial<Record<CreditRole, number>> = {};
  for (const credit of credits) counts[credit.role] = (counts[credit.role] ?? 0) + 1;
  return counts;
}

const JOBS_UK: Record<string, string> = {
  Acting: 'Акторство',
  Directing: 'Режисура',
  Writing: 'Сценарії',
  Production: 'Продюсування',
  Sound: 'Звук',
  Camera: 'Оператор',
  Editing: 'Монтаж',
  Art: 'Художник',
  'Costume & Make-Up': 'Костюми й грим',
  'Visual Effects': 'Візуальні ефекти',
  Lighting: 'Світло',
  Crew: 'Знімальна група',
  Director: 'Режисер',
  'Co-Director': 'Співрежисер',
  Screenplay: 'Сценарій',
  Writer: 'Сценарист',
  Story: 'Історія',
  Novel: 'Роман',
  Characters: 'Персонажі',
  Teleplay: 'Телесценарій',
  Creator: 'Автор ідеї',
  Producer: 'Продюсер',
  'Executive Producer': 'Виконавчий продюсер',
  'Co-Producer': 'Співпродюсер',
  'Associate Producer': 'Асоційований продюсер'
};

/** Crew jobs come from TMDB in English; translate the common ones. */
export function jobLabel(jobs: string, locale: 'uk' | 'en'): string {
  if (locale === 'en') return jobs;
  return jobs
    .split(', ')
    .map((job) => JOBS_UK[job] ?? job)
    .join(', ');
}
