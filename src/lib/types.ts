export type MediaType = 'movie' | 'tv';
export type PersonSegment = 'male' | 'female' | 'child' | 'person';

export interface CatalogItem {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  hasUkrainianTranslation: boolean;
  year: string;
  poster: string | null;
  countries: string[];
  /** ISO 3166-1 codes (production + origin countries), used for country filtering. */
  countryCodes?: string[];
  actors: string[];
  genres: string[];
  overview: string;
  voteAverage: number;
  voteCount: number;
}

export interface Actor {
  id: number;
  name: string;
  character: string;
  photo: string | null;
}

export interface ActorCreditItem {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  year: string;
  poster: string | null;
  character: string;
  voteAverage: number;
}

export interface ActorDetails {
  id: number;
  name: string;
  originalName: string;
  genderLabel: string;
  age: number | null;
  segment: PersonSegment;
  photo: string | null;
  biography: string;
  birthday: string;
  placeOfBirth: string;
  knownForDepartment: string;
  popularity: number;
  imdbId: string | null;
  credits: ActorCreditItem[];
}

export interface CollectionCategory {
  id: string;
  title: string;
  mediaType: 'movie' | 'tv' | 'all';
  year?: string;
  genreId?: string;
  sortBy: string;
  minRating: string;
  minVotes: string;
  releasePeriod?: 'all' | '120';
  includeKeywords?: string;
}

export interface CollectionDetails {
  category: CollectionCategory;
  page: number;
  totalPages: number;
  totalResults: number;
  results: CatalogItem[];
}

export interface MovieDetails {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  hasUkrainianTranslation: boolean;
  year: string;
  poster: string | null;
  backdrop: string | null;
  overview: string;
  countries: string[];
  ageRating: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  imdbId: string | null;
  genres: string[];
  actors: Actor[];
  trailerKey: string | null;
}

export interface FavoriteEntry {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle?: string;
  poster: string | null;
  year: string;
}

export type FavoritesStore = Record<string, FavoriteEntry[]>;
