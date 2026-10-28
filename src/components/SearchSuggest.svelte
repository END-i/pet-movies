<script lang="ts">
  import { onDestroy } from 'svelte';
  import { tr } from '../lib/i18n';
  import type { LocaleMode } from '../lib/preferences';
  import { SUGGEST_MIN_CHARS, suggestionHref, type Suggestion } from '../lib/suggest';

  interface Props {
    /** Text typed in the search field (bound by the catalog). */
    query: string;
    locale: LocaleMode;
    /** id of the listbox, referenced by the input's `aria-controls`. */
    id?: string;
    open?: boolean;
    /** Index of the highlighted option, -1 for none (the input's `aria-activedescendant`). */
    active?: number;
  }

  let {
    query,
    locale,
    id = 'search-suggest',
    open = $bindable(false),
    active = $bindable(-1)
  }: Props = $props();

  const DEBOUNCE_MS = 300;

  let items: Suggestion[] = $state([]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastKey = '';

  function schedule(text: string, language: LocaleMode) {
    clearTimeout(timer);
    const trimmed = text.trim();
    if (trimmed.length < SUGGEST_MIN_CHARS) {
      items = [];
      lastKey = '';
      active = -1;
      return;
    }
    timer = setTimeout(() => void load(trimmed, language), DEBOUNCE_MS);
  }

  async function load(text: string, language: LocaleMode) {
    const key = `${language}:${text}`;
    if (key === lastKey) return;
    lastKey = key;
    try {
      const params = new URLSearchParams({ query: text, locale: language });
      const response = await fetch(`/api/search/suggest.json?${params}`);
      const payload = (await response.json()) as { results?: Suggestion[] };
      // Ignore answers to queries the user has already typed past.
      if (key === lastKey) {
        items = payload.results ?? [];
        active = -1;
      }
    } catch {
      if (key === lastKey) items = [];
    }
  }

  /** Arrow keys move the highlight, Enter opens it, Escape closes the list. Returns true if handled. */
  export function handleKey(event: KeyboardEvent): boolean {
    if (!open || !items.length) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const step = event.key === 'ArrowDown' ? 1 : -1;
      active = (active + step + items.length + 1) % (items.length + 1);
      if (active === items.length) active = -1;
      return true;
    }
    if (event.key === 'Enter' && active >= 0) {
      window.location.href = suggestionHref(items[active]);
      return true;
    }
    if (event.key === 'Escape') {
      open = false;
      return true;
    }
    return false;
  }

  export function optionId(index: number) {
    return `${id}-${index}`;
  }

  function kindLabel(item: Suggestion) {
    return item.kind === 'person'
      ? tr(locale, 'Людина', 'Person')
      : item.kind === 'tv'
        ? tr(locale, 'Серіал', 'Series')
        : tr(locale, 'Фільм', 'Movie');
  }

  onDestroy(() => clearTimeout(timer));
  $effect(() => {
    schedule(query, locale);
  });
</script>

{#if open && items.length}
  <ul class="suggest" role="listbox" {id} aria-label={tr(locale, 'Підказки', 'Suggestions')}>
    {#each items as item, index (`${item.kind}-${item.id}`)}
      <li role="presentation">
        <!-- mousedown fires before the input's blur, so the tap is not lost when the list closes. -->
        <a
          href={suggestionHref(item)}
          role="option"
          id={optionId(index)}
          aria-selected={index === active}
          class:active={index === active}
          onmousedown={(event) => event.preventDefault()}
        >
          <img
            src={item.image ??
              (item.kind === 'person' ? '/fallback-person.svg' : '/fallback-poster.svg')}
            alt=""
            width="36"
            height="54"
            loading="lazy"
          />
          <span class="text">
            <strong>{item.title}</strong>
            <small>{[kindLabel(item), item.detail].filter(Boolean).join(' · ')}</small>
          </span>
        </a>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .suggest {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    z-index: 30;
    margin: 0;
    padding: 6px;
    list-style: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: 0 12px 32px rgb(0 0 0 / 0.35);
    max-height: min(60vh, 440px);
    overflow-y: auto;
  }

  a {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 6px 8px;
    border-radius: 10px;
    color: var(--text);
    text-decoration: none;
  }

  a:hover,
  a.active {
    background: var(--surface-2);
  }

  img {
    flex: none;
    width: 36px;
    height: 54px;
    object-fit: cover;
    border-radius: 6px;
    background: var(--surface-2);
  }

  .text {
    display: grid;
    min-width: 0;
  }

  strong {
    font-size: 0.92rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: var(--muted);
    font-size: 0.78rem;
  }
</style>
