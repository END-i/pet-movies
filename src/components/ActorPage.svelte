<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { get } from 'svelte/store';
  import { localeMode } from '../lib/preferences';
  import { tr } from '../lib/i18n';
  import { POSTER_SIZES, posterSrcset, profileSrcset } from '../lib/images';
  import type { ActorDetails, CreditRole } from '../lib/types';
  import {
    countByRole,
    creditsForRole,
    CREDIT_ROLES,
    jobLabel,
    sortCredits,
    type CreditSort
  } from '../lib/filmography';

  interface Props {
    id: number;
  }

  let { id }: Props = $props();

  // Biographies can be very long; show a preview until expanded.
  const BIO_PREVIEW_CHARS = 420;
  const CREDITS_PAGE = 30;

  const ROLE_LABELS: Record<CreditRole, [string, string]> = {
    cast: ['Ролі', 'Acting'],
    directing: ['Режисура', 'Directing'],
    writing: ['Сценарії', 'Writing'],
    production: ['Продюсування', 'Production']
  };

  let actor: ActorDetails | null = $state(null);
  let loading = $state(true);
  let error = $state('');
  let bioExpanded = $state(false);
  let loadedLocale = $state('');
  let role: CreditRole | 'all' = $state('all');
  let sort: CreditSort = $state('popular');
  let shown = $state(CREDITS_PAGE);

  async function loadActor() {
    loading = true;
    error = '';
    loadedLocale = get(localeMode);

    try {
      const response = await fetch(`/api/person/${id}.json?locale=${loadedLocale}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(
          payload?.error ??
            tr(get(localeMode), 'Не вдалося завантажити актора', 'Failed to load person')
        );
      }

      actor = (await response.json()) as ActorDetails;
    } catch (err) {
      error = !navigator.onLine
        ? tr(get(localeMode), 'Немає з’єднання з інтернетом', 'You are offline')
        : err instanceof Error
          ? err.message
          : tr(get(localeMode), 'Невідома помилка', 'Unknown error');
    } finally {
      loading = false;
    }
  }

  function goBack() {
    if (history.length > 1 && document.referrer.startsWith(location.origin)) {
      history.back();
    } else {
      location.href = '/';
    }
  }

  onMount(() => {
    void loadActor();
  });

  function resetShown(..._dependencies: unknown[]) {
    shown = CREDITS_PAGE;
  }
  let locale = $derived($localeMode);
  let bio = $derived(actor?.biography ?? '');
  let bioIsLong = $derived(bio.length > BIO_PREVIEW_CHARS);
  let roleCounts = $derived(countByRole(actor?.credits ?? []));
  let availableRoles = $derived(CREDIT_ROLES.filter((item) => roleCounts[item]));
  let filteredCredits = $derived(sortCredits(creditsForRole(actor?.credits ?? [], role), sort));
  let visibleCredits = $derived(filteredCredits.slice(0, shown));
  // A new role or sort starts again from the first page.
  $effect(() => {
    resetShown(role, sort);
  });
  let bioText = $derived(
    bioExpanded || !bioIsLong ? bio : `${bio.slice(0, BIO_PREVIEW_CHARS).trimEnd()}…`
  );
  // Reload in the new language; the load itself must not become a dependency.
  $effect(() => {
    if (loadedLocale && $localeMode !== loadedLocale && !loading) {
      untrack(() => void loadActor());
    }
  });
</script>

<main class="page">
  <div class="top">
    <button
      type="button"
      class="round-btn"
      onclick={goBack}
      aria-label={tr(locale, 'Назад', 'Back')}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
        ><path d="M15 5l-7 7 7 7" /></svg
      >
    </button>
  </div>

  {#if loading}
    <div class="skeleton" style="height: 220px"></div>
  {:else if error || !actor}
    <div class="panel">
      <p class="error">{error || tr(locale, 'Актора не знайдено', 'Person not found')}</p>
      <button type="button" class="btn" onclick={loadActor}
        >{tr(locale, 'Спробувати знову', 'Try again')}</button
      >
    </div>
  {:else}
    <section class="profile">
      <img
        src={actor.photo ?? '/fallback-person.svg'}
        srcset={profileSrcset(actor.photo)}
        sizes="(min-width: 720px) 240px, 120px"
        alt={actor.name}
        width="300"
        height="400"
      />
      <div class="info">
        <h1 class="page-title">{actor.name}</h1>
        {#if actor.originalName && actor.originalName !== actor.name}
          <p class="muted original">{actor.originalName}</p>
        {/if}
        <dl>
          {#if actor.birthday}
            <dt>{tr(locale, 'Народження', 'Born')}</dt>
            <dd>
              {actor.birthday}{#if actor.age !== null}&nbsp;({actor.age}
                {tr(locale, 'р.', 'y.o.')}){/if}
            </dd>
          {/if}
          {#if actor.placeOfBirth}
            <dt>{tr(locale, 'Місце', 'Place')}</dt>
            <dd>{actor.placeOfBirth}</dd>
          {/if}
          {#if actor.knownForDepartment}
            <dt>{tr(locale, 'Відомий за', 'Known for')}</dt>
            <dd>{jobLabel(actor.knownForDepartment, locale)}</dd>
          {/if}
        </dl>
        {#if actor.imdbId}
          <a href={`https://www.imdb.com/name/${actor.imdbId}`} target="_blank" rel="noreferrer"
            >IMDb ↗</a
          >
        {/if}
      </div>
    </section>

    {#if bio}
      <section>
        <h2 class="section-title">{tr(locale, 'Біографія', 'Biography')}</h2>
        <p class="bio">{bioText}</p>
        {#if bioIsLong}
          <button type="button" class="link-btn" onclick={() => (bioExpanded = !bioExpanded)}>
            {bioExpanded
              ? tr(locale, 'Згорнути', 'Show less')
              : tr(locale, 'Читати далі', 'Read more')}
          </button>
        {/if}
      </section>
    {/if}

    <section>
      <h2 class="section-title">{tr(locale, 'Фільмографія', 'Filmography')}</h2>
      {#if actor.credits.length === 0}
        <p class="hint">{tr(locale, 'Ролі поки відсутні.', 'No credits yet.')}</p>
      {:else}
        <div class="credit-controls">
          {#if availableRoles.length > 1}
            <div class="chips" role="group" aria-label={tr(locale, 'Роль', 'Role')}>
              <button
                type="button"
                class="chip"
                aria-pressed={role === 'all'}
                onclick={() => (role = 'all')}
              >
                {tr(locale, 'Усе', 'All')}
              </button>
              {#each availableRoles as item (item)}
                <button
                  type="button"
                  class="chip"
                  aria-pressed={role === item}
                  onclick={() => (role = item)}
                >
                  {tr(locale, ...ROLE_LABELS[item])} <span class="count">{roleCounts[item]}</span>
                </button>
              {/each}
            </div>
          {/if}
          <label class="sort">
            <span class="visually-hidden">{tr(locale, 'Сортування', 'Sorting')}</span>
            <select class="input" bind:value={sort}>
              <option value="popular">{tr(locale, 'Найвідоміші', 'Best known')}</option>
              <option value="rating">{tr(locale, 'Найвищий рейтинг', 'Top rated')}</option>
              <option value="newest">{tr(locale, 'Новіші', 'Newest')}</option>
              <option value="oldest">{tr(locale, 'Старіші', 'Oldest')}</option>
            </select>
          </label>
        </div>
        <div class="credits">
          {#each visibleCredits as credit (`${credit.mediaType}-${credit.id}-${role}`)}
            <a class="credit" href={`/details/${credit.mediaType}/${credit.id}`}>
              <img
                src={credit.poster ?? '/fallback-poster.svg'}
                srcset={posterSrcset(credit.poster)}
                sizes={POSTER_SIZES.credit}
                alt=""
                loading="lazy"
                width="185"
                height="278"
              />
              <strong>{credit.title}</strong>
              <small>
                {credit.year || '—'}{#if credit.voteAverage}&nbsp;· <span class="rating"
                    >★ {credit.voteAverage.toFixed(1)}</span
                  >{/if}
              </small>
              {#if credit.character || credit.jobs}
                <small class="role"
                  >{[credit.character, credit.jobs ? jobLabel(credit.jobs, locale) : '']
                    .filter(Boolean)
                    .join(' · ')}</small
                >
              {/if}
            </a>
          {/each}
        </div>
        {#if filteredCredits.length > shown}
          <button type="button" class="btn more" onclick={() => (shown += CREDITS_PAGE)}>
            {tr(locale, 'Показати ще', 'Show more')} ({filteredCredits.length - shown})
          </button>
        {/if}
      {/if}
    </section>
  {/if}
</main>

<style>
  .top {
    display: flex;
  }

  .top .round-btn {
    background: var(--surface-2);
    color: var(--text);
  }

  .credit-controls {
    display: grid;
    gap: 10px;
    margin-bottom: 12px;
  }

  .credit-controls .chips {
    margin: 0;
    padding: 0;
  }

  .count {
    opacity: 0.7;
    font-weight: 500;
  }

  .sort .input {
    width: auto;
    min-width: 200px;
  }

  .more {
    margin-top: 12px;
    width: 100%;
  }

  .profile {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 14px;
    align-items: start;
  }

  .profile img {
    width: 100%;
    height: auto;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border-radius: 14px;
    background: var(--surface-2);
  }

  .info .page-title {
    margin: 0;
  }

  .original {
    margin: 4px 0 0;
    font-style: italic;
  }

  dl {
    margin: 10px 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 4px 10px;
    font-size: 0.9rem;
  }

  dt {
    color: var(--muted);
  }

  dd {
    margin: 0;
  }

  .bio {
    margin: 0;
    white-space: pre-line;
    line-height: 1.55;
  }

  .link-btn {
    margin-top: 6px;
    padding: 6px 0;
    border: 0;
    background: none;
    color: var(--accent);
    font-weight: 600;
    cursor: pointer;
  }

  .credits {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 12px 10px;
  }

  .credit {
    display: grid;
    gap: 3px;
    align-content: start;
    color: var(--text);
  }

  .credit img {
    width: 100%;
    height: auto;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 10px;
    background: var(--surface-2);
  }

  .credit strong {
    font-size: 0.84rem;
    line-height: 1.25;
  }

  .credit small {
    color: var(--muted);
    font-size: 0.76rem;
  }

  .role {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (min-width: 720px) {
    .profile {
      grid-template-columns: 240px minmax(0, 1fr);
      gap: 24px;
    }

    .credits {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }
  }
</style>
