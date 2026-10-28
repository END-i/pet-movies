import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import ReleaseBadge from '../../src/components/ReleaseBadge.svelte';
import MovieCard from '../../src/components/MovieCard.svelte';
import { localeMode, translationPreference } from '../../src/lib/preferences';
import type { CatalogItem } from '../../src/lib/types';

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function render<Props extends Record<string, unknown>>(Component: unknown, props: Props) {
  component = mount(Component as never, { target, props }) as Record<string, unknown>;
  flushSync();
  return target;
}

beforeEach(() => {
  localStorage.clear();
  localeMode.set('uk');
  translationPreference.set('uk');
  target = document.createElement('div');
  document.body.append(target);
});

afterEach(() => {
  if (component) unmount(component);
  component = null;
  target.remove();
});

describe('ReleaseBadge', () => {
  it('shows where a title can be watched, in the UI language', () => {
    expect(render(ReleaseBadge, { release: { status: 'online' }, locale: 'uk' }).textContent).toBe(
      'Онлайн'
    );
  });

  it('shows the series status when there is no release badge', () => {
    const element = render(ReleaseBadge, {
      release: null,
      series: { status: 'ended', seasons: 3, episodes: 26 },
      locale: 'de'
    });
    expect(element.textContent).toBe('Beendet');
  });

  it('renders nothing without data', () => {
    expect(render(ReleaseBadge, { release: null, locale: 'uk' }).textContent?.trim()).toBe('');
  });
});

describe('MovieCard', () => {
  const item: CatalogItem = {
    id: 70523,
    mediaType: 'tv',
    title: 'Темрява',
    originalTitle: 'Dark',
    hasUkrainianTranslation: false,
    translations: ['en', 'pl'],
    year: '2017',
    poster: null,
    countries: ['Німеччина'],
    actors: [],
    genres: ['Драма'],
    overview: 'Зникнення дітей.',
    voteAverage: 8.4,
    voteCount: 6000,
    series: { status: 'ended', seasons: 3, episodes: 26 }
  };

  it('links to details and flags the missing translation in the chosen language', () => {
    const element = render(MovieCard, { item });
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/details/tv/70523');
    expect(element.querySelector('[title="Немає перекладу: українська"]')).not.toBeNull();

    translationPreference.set('pl');
    flushSync();
    expect(element.querySelector('.no-translation')).toBeNull();
  });

  it('the heart saves the title to favorites and removes it again', () => {
    const element = render(MovieCard, { item });
    const heart = element.querySelector<HTMLButtonElement>('button.fav')!;
    heart.click();
    flushSync();
    expect(localStorage.getItem('movie-finder-favorites-v1')).toContain('70523');
    expect(heart.getAttribute('aria-label')).toBe('Прибрати «Темрява» з улюблених');
    heart.click();
    flushSync();
    expect(localStorage.getItem('movie-finder-favorites-v1')).not.toContain('70523');
  });
});
