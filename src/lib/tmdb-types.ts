// Shapes of the TMDB responses the API routes read (only the fields they use).
import type { TmdbReleaseDates } from './releaseStatus';
import type { TmdbSeriesFields } from './series';
import type { Keyword, TmdbListItem } from './similar';

export interface TmdbCredit {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  name?: string;
  original_name?: string;
  first_air_date?: string;
  poster_path?: string | null;
  character?: string;
  job?: string;
  department?: string;
  vote_average?: number;
  vote_count?: number;
}

export interface TmdbPersonResponse {
  id: number;
  name: string;
  gender?: number;
  also_known_as?: string[];
  biography?: string;
  birthday?: string;
  place_of_birth?: string;
  known_for_department?: string;
  popularity?: number;
  profile_path?: string | null;
  imdb_id?: string | null;
  movie_credits?: { cast?: TmdbCredit[]; crew?: TmdbCredit[] };
  tv_credits?: { cast?: TmdbCredit[]; crew?: TmdbCredit[] };
}

export interface TmdbSimilarSource {
  genres?: Array<{ id: number }>;
  keywords?: { keywords?: Keyword[]; results?: Keyword[] };
  recommendations?: { results?: TmdbListItem[] };
  similar?: { results?: TmdbListItem[] };
}

export interface TmdbDiscoverResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: Array<{
    id: number;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path: string | null;
    genre_ids?: number[];
    overview: string;
    vote_average: number;
    vote_count: number;
  }>;
}

export interface TmdbEntityDetails extends TmdbSeriesFields {
  title?: string;
  name?: string;
  overview?: string;
  genres?: Array<{ name: string }>;
  production_countries?: Array<{ name: string; iso_3166_1?: string }>;
  origin_country?: string[];
  credits?: {
    cast?: Array<{ name: string }>;
  };
  release_dates?: TmdbReleaseDates;
  translations?: {
    translations?: Array<{
      iso_639_1: string;
      data?: {
        title?: string;
        name?: string;
        overview?: string;
      };
    }>;
  };
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export interface TmdbDetailsResponse extends TmdbSeriesFields {
  id: number;
  tagline?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  last_episode_to_air?: { runtime?: number | null } | null;
  budget?: number;
  revenue?: number;
  created_by?: Array<{ id: number; name: string }>;
  networks?: Array<{ name: string }>;
  seasons?: Array<{
    season_number: number;
    name: string;
    episode_count?: number;
    air_date?: string | null;
  }>;
  'watch/providers'?: {
    results?: Record<
      string,
      { link?: string; flatrate?: TmdbProvider[]; rent?: TmdbProvider[]; buy?: TmdbProvider[] }
    >;
  };
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  production_countries?: Array<{ name: string; iso_3166_1?: string }>;
  genres?: Array<{ name: string }>;
  adult?: boolean;
  vote_average: number;
  vote_count: number;
  popularity: number;
  external_ids?: {
    imdb_id?: string;
  };
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }>;
    crew?: Array<{ id: number; name: string; job?: string }>;
  };
  /** Series: cast of every season (`credits` has only the latest one). */
  aggregate_credits?: {
    cast?: Array<{
      id: number;
      name: string;
      profile_path: string | null;
      roles?: Array<{ character?: string }>;
    }>;
  };
  release_dates?: {
    results?: Array<{
      iso_3166_1: string;
      release_dates?: Array<{ certification?: string; type?: number; release_date?: string }>;
    }>;
  };
  content_ratings?: {
    results?: Array<{ iso_3166_1: string; rating?: string }>;
  };
  videos?: {
    results?: Array<{
      key: string;
      site: string;
      type: string;
      official: boolean;
    }>;
  };
  translations?: {
    translations?: Array<{
      iso_639_1: string;
      data?: {
        title?: string;
        name?: string;
        overview?: string;
      };
    }>;
  };
}

export interface TmdbPersonSearchResponse {
  results?: Array<{
    id: number;
    name: string;
    profile_path?: string | null;
    known_for_department?: string;
    popularity?: number;
    known_for?: Array<{ title?: string; name?: string }>;
  }>;
}
