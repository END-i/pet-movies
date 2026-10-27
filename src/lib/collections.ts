import type { CollectionCategory } from './types';

const movieGenres = [
  { id: '28', name: 'Бойовики' },
  { id: '12', name: 'Пригоди' },
  { id: '16', name: 'Анімація' },
  { id: '35', name: 'Комедії' },
  { id: '80', name: 'Кримінал' },
  { id: '99', name: 'Документальні' },
  { id: '18', name: 'Драми' },
  { id: '10751', name: 'Сімейні' },
  { id: '14', name: 'Фентезі' },
  { id: '36', name: 'Історичні' },
  { id: '27', name: 'Жахи' },
  { id: '10402', name: 'Мюзикли' },
  { id: '9648', name: 'Містика' },
  { id: '10749', name: 'Романтичні' },
  { id: '878', name: 'Sci-Fi' },
  { id: '53', name: 'Трилери' },
  { id: '10752', name: 'Воєнні' },
  { id: '37', name: 'Вестерни' }
] as const;

const tvGenres = [
  { id: '10759', name: 'TV Бойовики й пригоди' },
  { id: '16', name: 'TV Анімація' },
  { id: '35', name: 'TV Комедії' },
  { id: '80', name: 'TV Кримінал' },
  { id: '99', name: 'TV Документальні' },
  { id: '18', name: 'TV Драми' },
  { id: '10751', name: 'TV Сімейні' },
  { id: '10762', name: 'TV Дитячі' },
  { id: '9648', name: 'TV Містика' },
  { id: '10763', name: 'TV Новини' },
  { id: '10764', name: 'TV Реаліті' },
  { id: '10765', name: 'TV Sci-Fi та фентезі' }
] as const;

const yearRange = Array.from({ length: 12 }, (_, index) => String(2025 - index));

function buildSpecialCategories(): CollectionCategory[] {
  return [
    {
      id: 'special-comics-movies',
      title: 'Фільми за коміксами',
      mediaType: 'movie',
      sortBy: 'popularity.desc',
      minRating: '5',
      minVotes: '50',
      includeKeywords: 'comic'
    },
    {
      id: 'special-superheroes',
      title: 'Супергеройські фільми',
      mediaType: 'movie',
      sortBy: 'popularity.desc',
      minRating: '5',
      minVotes: '100',
      includeKeywords: 'superhero'
    },
    {
      id: 'special-best-all-time',
      title: 'Найкращі за весь час',
      mediaType: 'all',
      sortBy: 'vote_average.desc',
      minRating: '7',
      minVotes: '1500',
      releasePeriod: 'all'
    }
  ];
}

function buildGenreCategories(): CollectionCategory[] {
  const movie = movieGenres.map((genre) => ({
    id: `genre-movie-${genre.id}`,
    title: `${genre.name}: найкращі фільми`,
    mediaType: 'movie' as const,
    genreId: genre.id,
    sortBy: 'vote_average.desc',
    minRating: '6',
    minVotes: '300',
    releasePeriod: 'all' as const
  }));

  const tv = tvGenres.map((genre) => ({
    id: `genre-tv-${genre.id}`,
    title: `${genre.name}: найкращі серіали`,
    mediaType: 'tv' as const,
    genreId: genre.id,
    sortBy: 'vote_average.desc',
    minRating: '6',
    minVotes: '200',
    releasePeriod: 'all' as const
  }));

  return [...movie, ...tv];
}

function buildYearCategories(): CollectionCategory[] {
  const allByYear = yearRange.map((year) => ({
    id: `year-all-${year}`,
    title: `Найкраще за ${year}`,
    mediaType: 'all' as const,
    year,
    sortBy: 'vote_average.desc',
    minRating: '6',
    minVotes: '200',
    releasePeriod: 'all' as const
  }));

  const movieByYearAndGenre = yearRange.flatMap((year) =>
    movieGenres.slice(0, 8).map((genre) => ({
      id: `year-genre-${year}-${genre.id}`,
      title: `${genre.name} за ${year}`,
      mediaType: 'movie' as const,
      year,
      genreId: genre.id,
      sortBy: 'vote_average.desc',
      minRating: '5',
      minVotes: '80',
      releasePeriod: 'all' as const
    }))
  );

  return [...allByYear, ...movieByYearAndGenre];
}

function buildRecentCategories(): CollectionCategory[] {
  const recentGenres = movieGenres.slice(0, 12).map((genre) => ({
    id: `new-genre-${genre.id}`,
    title: `Новинки 120 днів: ${genre.name}`,
    mediaType: 'movie' as const,
    genreId: genre.id,
    sortBy: 'primary_release_date.desc',
    minRating: '5',
    minVotes: '10',
    releasePeriod: '120' as const
  }));

  const mixed = [
    {
      id: 'new-all-content',
      title: 'Новинки: фільми + серіали',
      mediaType: 'all' as const,
      sortBy: 'primary_release_date.desc',
      minRating: '5',
      minVotes: '10',
      releasePeriod: '120' as const
    },
    {
      id: 'new-tv-content',
      title: 'Новинки серіалів',
      mediaType: 'tv' as const,
      sortBy: 'primary_release_date.desc',
      minRating: '5',
      minVotes: '10',
      releasePeriod: '120' as const
    }
  ];

  return [...mixed, ...recentGenres];
}

export function getCollectionCategories(): CollectionCategory[] {
  const categories = [
    ...buildSpecialCategories(),
    ...buildGenreCategories(),
    ...buildYearCategories(),
    ...buildRecentCategories()
  ];

  return categories;
}

export function getCollectionById(id: string): CollectionCategory | undefined {
  return getCollectionCategories().find((category) => category.id === id);
}
