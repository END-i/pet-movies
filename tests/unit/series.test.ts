import { describe, expect, it } from 'vitest';
import {
  episodesLabel,
  runtimeLabel,
  seasonsLabel,
  seriesStatusLabel,
  summarizeSeries
} from '../../src/lib/series';

describe('summarizeSeries', () => {
  it('maps TMDB status and counts', () => {
    expect(
      summarizeSeries({
        status: 'Returning Series',
        number_of_seasons: 3,
        number_of_episodes: 24,
        next_episode_to_air: { air_date: '2026-11-02' }
      })
    ).toEqual({ status: 'airing', seasons: 3, episodes: 24, nextEpisode: '2026-11-02' });
    expect(summarizeSeries({ status: 'Ended', number_of_seasons: 1 })).toEqual({
      status: 'ended',
      seasons: 1,
      episodes: 0
    });
    expect(summarizeSeries({ status: 'Something new' }).status).toBeNull();
  });
});

describe('labels', () => {
  it('uses Ukrainian plural forms', () => {
    expect(seasonsLabel(1, 'uk')).toBe('1 сезон');
    expect(seasonsLabel(3, 'uk')).toBe('3 сезони');
    expect(seasonsLabel(5, 'uk')).toBe('5 сезонів');
    expect(seasonsLabel(11, 'uk')).toBe('11 сезонів');
    expect(seasonsLabel(22, 'uk')).toBe('22 сезони');
    expect(episodesLabel(21, 'uk')).toBe('21 серія');
    expect(episodesLabel(1, 'en')).toBe('1 episode');
  });

  it('labels series status in both languages', () => {
    expect(seriesStatusLabel('production', 'uk')).toBe('Знімається');
    expect(seriesStatusLabel('canceled', 'en')).toBe('Canceled');
  });

  it('formats runtime', () => {
    expect(runtimeLabel(136, 'uk')).toBe('2 год 16 хв');
    expect(runtimeLabel(120, 'en')).toBe('2 h');
    expect(runtimeLabel(45, 'uk')).toBe('45 хв');
    expect(runtimeLabel(0, 'uk')).toBe('');
    expect(runtimeLabel(null, 'uk')).toBe('');
  });
});
