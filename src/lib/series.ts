export type SeriesStatus = 'airing' | 'production' | 'planned' | 'ended' | 'canceled';

export interface SeriesInfo {
  status: SeriesStatus | null;
  seasons: number;
  episodes: number;
  /** YYYY-MM-DD of the next announced episode, if any. */
  nextEpisode?: string;
}

const STATUS_BY_TMDB: Record<string, SeriesStatus> = {
  'Returning Series': 'airing',
  'In Production': 'production',
  Planned: 'planned',
  Pilot: 'planned',
  Ended: 'ended',
  Canceled: 'canceled',
  Cancelled: 'canceled'
};

export interface TmdbSeriesFields {
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  next_episode_to_air?: { air_date?: string | null } | null;
}

export function summarizeSeries(data: TmdbSeriesFields): SeriesInfo {
  const nextEpisode = data.next_episode_to_air?.air_date || undefined;
  return {
    status: (data.status && STATUS_BY_TMDB[data.status]) || null,
    seasons: data.number_of_seasons ?? 0,
    episodes: data.number_of_episodes ?? 0,
    ...(nextEpisode ? { nextEpisode } : {})
  };
}

/** Ukrainian plural: 1 сезон, 2 сезони, 5 сезонів. */
export function pluralUk(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function seasonsLabel(count: number, locale: 'uk' | 'en'): string {
  return locale === 'en'
    ? `${count} ${count === 1 ? 'season' : 'seasons'}`
    : `${count} ${pluralUk(count, 'сезон', 'сезони', 'сезонів')}`;
}

export function episodesLabel(count: number, locale: 'uk' | 'en'): string {
  return locale === 'en'
    ? `${count} ${count === 1 ? 'episode' : 'episodes'}`
    : `${count} ${pluralUk(count, 'серія', 'серії', 'серій')}`;
}

export function seriesStatusLabel(status: SeriesStatus, locale: 'uk' | 'en'): string {
  const labels: Record<SeriesStatus, [string, string]> = {
    airing: ['Виходить', 'Airing'],
    production: ['Знімається', 'In production'],
    planned: ['Анонс', 'Announced'],
    ended: ['Завершено', 'Ended'],
    canceled: ['Закрито', 'Canceled']
  };
  return labels[status][locale === 'en' ? 1 : 0];
}

/** "2 год 16 хв" / "2 h 16 min"; '' when unknown. */
export function runtimeLabel(minutes: number | null | undefined, locale: 'uk' | 'en'): string {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const [h, m] = locale === 'en' ? ['h', 'min'] : ['год', 'хв'];
  if (!hours) return `${rest} ${m}`;
  return rest ? `${hours} ${h} ${rest} ${m}` : `${hours} ${h}`;
}
