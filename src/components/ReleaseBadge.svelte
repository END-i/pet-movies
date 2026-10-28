<script lang="ts">
  import { tr } from '../lib/i18n';
  import type { LocaleMode } from '../lib/preferences';
  import type { ReleaseInfo } from '../lib/releaseStatus';
  import { seriesStatusLabel, type SeriesInfo } from '../lib/series';

  export let release: ReleaseInfo | null | undefined;
  /** Series: shown when there is no release badge (i.e. the series has premiered). */
  export let series: SeriesInfo | null | undefined = null;
  export let locale: LocaleMode;
  /** Long form adds the expected home release date for titles in cinemas. */
  export let long = false;

  function formatDate(value: string): string {
    const date = new Date(`${value}T00:00:00Z`);
    const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'uk-UA', {
      day: 'numeric',
      month: 'short',
      year: sameYear ? undefined : 'numeric',
      timeZone: 'UTC'
    });
  }

  $: label = !release
    ? ''
    : release.status === 'online'
      ? tr(locale, 'Онлайн', 'Streaming')
      : release.status === 'cinema'
        ? long && release.date
          ? tr(
              locale,
              `У кіно · онлайн з ${formatDate(release.date)}`,
              `In cinemas · streaming ${formatDate(release.date)}`
            )
          : tr(locale, 'У кіно', 'In cinemas')
        : release.date
          ? tr(locale, `Анонс · ${formatDate(release.date)}`, `Coming ${formatDate(release.date)}`)
          : tr(locale, 'Анонс', 'Coming soon');

  $: hint = !release
    ? ''
    : release.status === 'online'
      ? tr(locale, 'Можна подивитися вдома', 'Available to watch at home')
      : release.status === 'cinema'
        ? tr(locale, 'Поки лише в кінотеатрах', 'Only in cinemas for now')
        : tr(locale, 'Ще не вийшов', 'Not released yet');
</script>

{#if release}
  <span class="release {release.status}" title={hint}>{label}</span>
{:else if series?.status}
  <span class="release series-{series.status}">{seriesStatusLabel(series.status, locale)}</span>
{/if}

<style>
  .release {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
    border: 1px solid currentColor;
  }

  .online {
    color: var(--success);
  }

  .cinema {
    color: var(--star);
  }

  .upcoming,
  .series-planned,
  .series-production {
    color: var(--accent);
  }

  .series-airing {
    color: var(--success);
  }

  .series-ended,
  .series-canceled {
    color: var(--muted);
  }
</style>
