export interface Certification {
  country: string;
  rating: string;
}

// Countries whose ratings are most familiar to a Ukrainian audience, in order of preference.
const PREFERRED_COUNTRIES = ['UA', 'US', 'GB', 'DE'];

/** Picks a human-readable age rating from TMDB certifications; '' when nothing is known. */
export function pickAgeRating(certifications: Certification[], adult = false): string {
  for (const country of PREFERRED_COUNTRIES) {
    const match = certifications.find((entry) => entry.country === country && entry.rating.trim());
    if (match) {
      return match.rating.trim();
    }
  }

  const anyRating = certifications.find((entry) => entry.rating.trim());
  if (anyRating) {
    return `${anyRating.rating.trim()} (${anyRating.country})`;
  }

  return adult ? '18+' : '';
}
