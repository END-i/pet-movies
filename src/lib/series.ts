import { intlLocale, tr } from './i18n';
import type { LocaleMode } from './preferences';

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

type Unit = 'season' | 'episode';

// Forms for Intl.PluralRules categories `one` / `other` (all these languages use just the two).
const UNIT_FORMS: Record<Exclude<LocaleMode, 'uk'>, Record<Unit, [string, string]>> = {
  en: { season: ['season', 'seasons'], episode: ['episode', 'episodes'] },
  bg: { season: ['сезон', 'сезона'], episode: ['епизод', 'епизода'] },
  de: { season: ['Staffel', 'Staffeln'], episode: ['Folge', 'Folgen'] },
  es: { season: ['temporada', 'temporadas'], episode: ['episodio', 'episodios'] },
  fr: { season: ['saison', 'saisons'], episode: ['épisode', 'épisodes'] }
};

const UK_FORMS: Record<Unit, [string, string, string]> = {
  season: ['сезон', 'сезони', 'сезонів'],
  episode: ['серія', 'серії', 'серій']
};

function countLabel(count: number, unit: Unit, locale: LocaleMode): string {
  if (locale === 'uk') return `${count} ${pluralUk(count, ...UK_FORMS[unit])}`;
  const [one, other] = UNIT_FORMS[locale][unit];
  return `${count} ${new Intl.PluralRules(intlLocale(locale)).select(count) === 'one' ? one : other}`;
}

export function seasonsLabel(count: number, locale: LocaleMode): string {
  return countLabel(count, 'season', locale);
}

export function episodesLabel(count: number, locale: LocaleMode): string {
  return countLabel(count, 'episode', locale);
}

export function seriesStatusLabel(status: SeriesStatus, locale: LocaleMode): string {
  const labels: Record<SeriesStatus, [string, string]> = {
    airing: ['Виходить', 'Airing'],
    production: ['Знімається', 'In production'],
    planned: ['Анонс', 'Announced'],
    ended: ['Завершено', 'Ended'],
    canceled: ['Закрито', 'Canceled']
  };
  return tr(locale, ...labels[status]);
}

/** "2 год 16 хв" / "2 h 16 min"; '' when unknown. */
const TIME_UNITS: Record<LocaleMode, [string, string]> = {
  uk: ['год', 'хв'],
  en: ['h', 'min'],
  bg: ['ч', 'мин'],
  de: ['Std.', 'Min.'],
  es: ['h', 'min'],
  fr: ['h', 'min']
};

export function runtimeLabel(minutes: number | null | undefined, locale: LocaleMode): string {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const [h, m] = TIME_UNITS[locale];
  if (!hours) return `${rest} ${m}`;
  return rest ? `${hours} ${h} ${rest} ${m}` : `${hours} ${h}`;
}
