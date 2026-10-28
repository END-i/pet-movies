import { RECENT_RELEASE_DAYS } from './config';
import { normalizeAgeFilter } from './ageRating';
import { parsePositiveInteger } from './pagination';
import type { CatalogItem } from './types';

// Catalog filters, presets and their URL form; the page component only holds the state.

export type Category = '' | 'all' | 'movie' | 'cartoon' | 'tv';

export interface DiscoverPayload {
  page: number;
  totalPages: number;
  totalResults: number;
  results: CatalogItem[];
}

export type ReleasePeriod = 'all' | '7' | '30' | '90' | '120' | 'custom';
export type FilterPreset = '' | 'adult' | 'family' | 'child12' | 'new' | 'documentary';

export const releasePeriodOptions: ReleasePeriod[] = ['all', '7', '30', '90', '120', 'custom'];
export const filterPresetOptions: FilterPreset[] = [
  '',
  'adult',
  'family',
  'child12',
  'new',
  'documentary'
];

export const categoryOptions: Array<{ value: Exclude<Category, ''>; uk: string; en: string }> = [
  { value: 'all', uk: 'Усе', en: 'All' },
  { value: 'movie', uk: 'Фільми', en: 'Movies' },
  { value: 'cartoon', uk: 'Мультфільми', en: 'Cartoons' },
  { value: 'tv', uk: 'Серіали', en: 'TV series' }
];

export const presetOptions: Array<{ value: Exclude<FilterPreset, ''>; uk: string; en: string }> = [
  { value: 'new', uk: 'Новинки', en: 'New releases' },
  { value: 'adult', uk: 'Всі фільми', en: 'All movies' },
  { value: 'documentary', uk: 'Документалки', en: 'Documentaries' },
  { value: 'family', uk: 'Для сім’ї', en: 'Family' },
  { value: 'child12', uk: 'Дитина 12+', en: 'Kids 12+' }
];

export const movieGenres = [
  { id: '', uk: 'Будь-який жанр', en: 'Any genre' },
  { id: '28', uk: 'Бойовик', en: 'Action' },
  { id: '35', uk: 'Комедія', en: 'Comedy' },
  { id: '18', uk: 'Драма', en: 'Drama' },
  { id: '14', uk: 'Фентезі', en: 'Fantasy' },
  { id: '27', uk: 'Жахи', en: 'Horror' },
  { id: '10749', uk: 'Романтика', en: 'Romance' },
  { id: '878', uk: 'Наукова фантастика', en: 'Science fiction' },
  { id: '53', uk: 'Трилер', en: 'Thriller' },
  { id: '10751', uk: 'Сімейний', en: 'Family' },
  { id: '99', uk: 'Документальний', en: 'Documentary' }
];

export const tvGenres = [
  { id: '', uk: 'Будь-який жанр', en: 'Any genre' },
  { id: '10759', uk: 'Бойовик і пригоди', en: 'Action & adventure' },
  { id: '35', uk: 'Комедія', en: 'Comedy' },
  { id: '18', uk: 'Драма', en: 'Drama' },
  { id: '9648', uk: 'Містика', en: 'Mystery' },
  { id: '10765', uk: 'Фантастика і фентезі', en: 'Sci-Fi & fantasy' },
  { id: '16', uk: 'Анімація', en: 'Animation' }
];

// Titles with only a handful of votes are mostly unreleased or obscure; hide them by default.
export const DEFAULT_MIN_VOTES = '50';
export const voteOptions = ['0', '10', '20', '50', '100', '200', '1000', '5000'];

export const countryOptions = [
  { code: 'UA', uk: 'Україна', en: 'Ukraine' },
  { code: 'US', uk: 'США', en: 'USA' },
  { code: 'GB', uk: 'Велика Британія', en: 'United Kingdom' },
  { code: 'FR', uk: 'Франція', en: 'France' },
  { code: 'DE', uk: 'Німеччина', en: 'Germany' },
  { code: 'IT', uk: 'Італія', en: 'Italy' },
  { code: 'ES', uk: 'Іспанія', en: 'Spain' },
  { code: 'PL', uk: 'Польща', en: 'Poland' },
  { code: 'SE', uk: 'Швеція', en: 'Sweden' },
  { code: 'DK', uk: 'Данія', en: 'Denmark' },
  { code: 'NO', uk: 'Норвегія', en: 'Norway' },
  { code: 'CA', uk: 'Канада', en: 'Canada' },
  { code: 'AU', uk: 'Австралія', en: 'Australia' },
  { code: 'JP', uk: 'Японія', en: 'Japan' },
  { code: 'KR', uk: 'Південна Корея', en: 'South Korea' },
  { code: 'IN', uk: 'Індія', en: 'India' },
  { code: 'TR', uk: 'Туреччина', en: 'Turkey' }
];

export interface CatalogFilters {
  category: Category;
  genre: string;
  minRating: string;
  minVotes: string;
  year: string;
  sortBy: string;
  query: string;
  includeCountry: string;
  ageRating: string;
  releaseDateGte: string;
  releaseDateLte: string;
  releasePeriod: ReleasePeriod;
  limit: string;
  preset: FilterPreset;
}

export const formatDate = (value: Date) => value.toISOString().slice(0, 10);

/** Date range for a release period ending today; null keeps a custom range as it is. */
export function releaseRange(
  period: ReleasePeriod,
  today = new Date()
): { gte: string; lte: string } | null {
  if (period === 'custom') return null;
  if (period === 'all') return { gte: '', lte: '' };
  const start = new Date(today);
  start.setDate(today.getDate() - Number(period));
  return { gte: formatDate(start), lte: formatDate(today) };
}

/** First screen: popular titles of the last RECENT_RELEASE_DAYS days. */
export function defaultFilters(today = new Date()): CatalogFilters {
  const start = new Date(today);
  start.setDate(today.getDate() - RECENT_RELEASE_DAYS);
  return {
    category: 'all',
    genre: '',
    minRating: '',
    minVotes: DEFAULT_MIN_VOTES,
    year: '',
    // Popular recent titles make a better first screen than raw newest releases (mostly unrated).
    sortBy: 'popularity.desc',
    query: '',
    includeCountry: '',
    ageRating: '',
    releaseDateGte: formatDate(start),
    releaseDateLte: formatDate(today),
    releasePeriod: '120',
    limit: '20',
    preset: ''
  };
}

/** "Reset filters": everything cleared, whole catalog. */
export function clearedFilters(today = new Date()): CatalogFilters {
  return { ...defaultFilters(today), releasePeriod: 'all', releaseDateGte: '', releaseDateLte: '' };
}

const PRESETS: Record<Exclude<FilterPreset, ''>, Partial<CatalogFilters>> = {
  adult: {
    category: 'movie',
    genre: '',
    minRating: '5',
    minVotes: '50',
    ageRating: '18',
    limit: '20'
  },
  family: {
    category: 'movie',
    genre: '10751',
    minRating: '6',
    minVotes: '50',
    ageRating: '6',
    limit: '15'
  },
  child12: {
    category: 'cartoon',
    genre: '',
    minRating: '6',
    minVotes: '100',
    ageRating: '12',
    limit: '15'
  },
  new: {
    category: 'all',
    genre: '',
    minRating: '5',
    minVotes: '10',
    ageRating: '',
    sortBy: 'primary_release_date.desc',
    releasePeriod: '120',
    limit: '20'
  },
  documentary: {
    category: 'movie',
    genre: '99',
    minRating: '5',
    minVotes: '20',
    ageRating: '',
    limit: '20'
  }
};

/** Presets browse the whole catalog by popularity; only "New releases" is limited in time. */
export function presetFilters(
  current: CatalogFilters,
  preset: Exclude<FilterPreset, ''>,
  today = new Date()
): CatalogFilters {
  const next: CatalogFilters = {
    ...current,
    query: '',
    year: '',
    includeCountry: '',
    sortBy: 'popularity.desc',
    releasePeriod: 'all',
    ...PRESETS[preset],
    preset
  };
  const range = releaseRange(next.releasePeriod, today);
  return range ? { ...next, releaseDateGte: range.gte, releaseDateLte: range.lte } : next;
}

export function countActiveFilters(filters: CatalogFilters, hiddenGenreCount: number): number {
  return [
    filters.genre,
    filters.minRating,
    filters.minVotes !== DEFAULT_MIN_VOTES ? filters.minVotes : '',
    filters.year,
    filters.includeCountry,
    filters.ageRating,
    filters.releasePeriod !== 'all' ? filters.releasePeriod : '',
    hiddenGenreCount ? 'hidden' : ''
  ].filter(Boolean).length;
}

/** Query for `/api/discover.json`. */
export function filtersToParams(
  filters: CatalogFilters,
  page: number,
  extra: { locale: string; hiddenGenres: string[] }
): URLSearchParams {
  return new URLSearchParams({
    category: filters.category,
    page: String(page),
    sortBy: filters.sortBy,
    query: filters.query.trim(),
    genre: filters.genre,
    minRating: filters.minRating,
    minVotes: filters.minVotes,
    year: filters.year,
    includeCountry: filters.includeCountry.trim().toUpperCase(),
    locale: extra.locale,
    ageRating: filters.ageRating,
    releaseDateGte: filters.releaseDateGte,
    releaseDateLte: filters.releaseDateLte,
    releasePeriod: filters.releasePeriod,
    preset: filters.preset,
    limit: filters.limit,
    hideGenres: extra.hiddenGenres.join(',')
  });
}

/**
 * The page URL for a search: no language or hidden genres (device preferences, not part of
 * a shareable search) and no empty values.
 */
export function shareableSearch(params: URLSearchParams): string {
  const shared = new URLSearchParams(params);
  shared.delete('locale');
  shared.delete('hideGenres');
  for (const [key, value] of [...shared.entries()]) {
    if (!value) shared.delete(key);
  }
  return shared.toString();
}

const CATEGORIES: Category[] = ['all', 'movie', 'cartoon', 'tv'];

/** Restores filters from a shared URL; unknown or missing values keep `current`. */
export function filtersFromParams(
  params: URLSearchParams,
  current: CatalogFilters,
  today = new Date()
): { filters: CatalogFilters; page: number } {
  const text = (key: string, fallback: string) => params.get(key) ?? fallback;
  const category = params.get('category') as Category | null;
  const period = params.get('releasePeriod') as ReleasePeriod | null;
  const preset = params.get('preset') as FilterPreset | null;

  const filters: CatalogFilters = {
    ...current,
    category: category && CATEGORIES.includes(category) ? category : current.category,
    genre: text('genre', current.genre),
    minRating: text('minRating', current.minRating),
    minVotes: text('minVotes', current.minVotes),
    year: text('year', current.year),
    sortBy: text('sortBy', current.sortBy),
    query: text('query', current.query),
    includeCountry: text('includeCountry', current.includeCountry).toUpperCase(),
    ageRating: params.has('ageRating')
      ? normalizeAgeFilter(params.get('ageRating'))
      : current.ageRating,
    limit: text('limit', current.limit),
    releasePeriod: period && releasePeriodOptions.includes(period) ? period : current.releasePeriod,
    preset: preset && filterPresetOptions.includes(preset) ? preset : current.preset
  };

  if (params.has('releaseDateGte') || params.has('releaseDateLte')) {
    filters.releaseDateGte = text('releaseDateGte', filters.releaseDateGte);
    filters.releaseDateLte = text('releaseDateLte', filters.releaseDateLte);
  } else {
    const range = releaseRange(filters.releasePeriod, today);
    if (range) {
      filters.releaseDateGte = range.gte;
      filters.releaseDateLte = range.lte;
    }
  }

  return { filters, page: parsePositiveInteger(params.get('page'), 1) };
}
