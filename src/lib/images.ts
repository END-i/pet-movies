const TMDB_IMAGE_URL = /^(https:\/\/image\.tmdb\.org\/t\/p\/)(?:w\d+|h\d+|original)(\/.+)$/;

// Widths TMDB serves for posters; profiles only have w45, w185 and h632 (~421px wide).
const POSTER_WIDTHS = [154, 185, 342, 500] as const;

export const POSTER_SIZES = {
  card: '(min-width: 720px) 120px, 96px',
  details: '(min-width: 720px) 220px, 116px',
  credit: '(min-width: 720px) 160px, 34vw',
  thumb: '64px'
} as const;

export function resizeTmdbImage(url: string | null | undefined, size: string): string | null {
  if (!url) return null;
  const match = TMDB_IMAGE_URL.exec(url);
  return match ? `${match[1]}${size}${match[2]}` : url;
}

/** `srcset` for a TMDB poster URL of any size (also old favorites saved with w500). */
export function posterSrcset(url: string | null | undefined): string | undefined {
  if (!url || !TMDB_IMAGE_URL.test(url)) return undefined;
  return POSTER_WIDTHS.map((width) => `${resizeTmdbImage(url, `w${width}`)} ${width}w`).join(', ');
}

export function profileSrcset(url: string | null | undefined): string | undefined {
  if (!url || !TMDB_IMAGE_URL.test(url)) return undefined;
  return `${resizeTmdbImage(url, 'w185')} 185w, ${resizeTmdbImage(url, 'h632')} 421w`;
}
