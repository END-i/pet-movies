export interface Certification {
  country: string;
  rating: string;
}

/** Age steps shown to users; the same scale as Ukrainian cinema ratings. */
export const AGE_STEPS = ['0', '6', '12', '16', '18'] as const;
export type AgeStep = (typeof AGE_STEPS)[number];

// TMDB `discover` filters only by one country's certification; US data is the most complete.
const US_CERTIFICATION_FOR_AGE: Record<AgeStep, string> = {
  '0': 'G',
  '6': 'PG',
  '12': 'PG-13',
  '16': 'R',
  '18': 'NC-17'
};

// Letter ratings mapped onto the age scale (rounded to the nearest step).
const LETTER_RATINGS: Record<string, Record<string, AgeStep>> = {
  US: {
    G: '0',
    PG: '6',
    'PG-13': '12',
    R: '16',
    'NC-17': '18',
    'TV-Y': '0',
    'TV-G': '0',
    'TV-Y7': '6',
    'TV-PG': '6',
    'TV-14': '16',
    'TV-MA': '18'
  },
  GB: { U: '0', UC: '0', PG: '6', '12': '12', '12A': '12', '15': '16', '18': '18', R18: '18' }
};

// Countries whose ratings are most familiar to a Ukrainian audience, in order of preference.
const PREFERRED_COUNTRIES = ['UA', 'DE', 'GB', 'US'];

/** Smallest age step that is not below `age` (e.g. 7 → 12, 15 → 16). */
function snapAge(age: number): AgeStep {
  return AGE_STEPS.find((step) => Number(step) >= age) ?? '18';
}

/** Converts one certification to the age scale, e.g. US "PG-13" → "12", DE "16" → "16". */
export function certificationToAge(country: string, rating: string): AgeStep | null {
  const value = rating.trim().toUpperCase();
  if (!value) return null;

  const letter = LETTER_RATINGS[country]?.[value];
  if (letter) return letter;

  const numeric = /^(\d{1,2})\s*\+?$/.exec(value);
  return numeric ? snapAge(Number(numeric[1])) : null;
}

/** Age label for the details page ("12+"); '' when nothing is known. */
export function pickAgeRating(certifications: Certification[], adult = false): string {
  const usable = certifications.filter((entry) => entry.rating.trim());
  const ordered = [
    ...PREFERRED_COUNTRIES.flatMap((country) =>
      usable.filter((entry) => entry.country === country)
    ),
    ...usable.filter((entry) => !PREFERRED_COUNTRIES.includes(entry.country))
  ];

  for (const entry of ordered) {
    const age = certificationToAge(entry.country, entry.rating);
    if (age) return `${age}+`;
  }

  return adult ? '18+' : '';
}

/**
 * Catalog filter value → US certification for `certification.lte`. Accepts the age steps and,
 * for old shared links, the US letters used before.
 */
export function usCertificationForFilter(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if ((AGE_STEPS as readonly string[]).includes(trimmed)) {
    return US_CERTIFICATION_FOR_AGE[trimmed as AgeStep];
  }
  return Object.values(US_CERTIFICATION_FOR_AGE).includes(trimmed) ? trimmed : undefined;
}

/** Normalises a filter value from the URL to an age step ('' for any). */
export function normalizeAgeFilter(value: string | null | undefined): AgeStep | '' {
  const trimmed = (value ?? '').trim();
  if ((AGE_STEPS as readonly string[]).includes(trimmed)) return trimmed as AgeStep;
  return certificationToAge('US', trimmed) ?? '';
}
