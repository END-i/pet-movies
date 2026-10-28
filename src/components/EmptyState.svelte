<script lang="ts">
  interface Props {
    /** Decorative picture above an empty-list message; the text stays in the parent. */
    kind: 'favorites' | 'search';
  }

  let { kind }: Props = $props();
</script>

<svg class="empty-art" viewBox="0 0 120 96" width="120" height="96" aria-hidden="true">
  {#if kind === 'favorites'}
    <rect x="18" y="14" width="64" height="68" rx="8" class="card" />
    <rect x="30" y="26" width="64" height="68" rx="8" class="card front" />
    <path
      d="M62 76s-14-8.6-14-18.9A8.2 8.2 0 0 1 62 51.9a8.2 8.2 0 0 1 14 5.2C76 67.4 62 76 62 76Z"
      class="accent"
    />
  {:else}
    <rect x="14" y="20" width="70" height="52" rx="8" class="card" />
    <path d="M14 34h70M30 20l-8 14M48 20l-8 14M66 20l-8 14" class="line" />
    <circle cx="82" cy="62" r="16" class="card front" />
    <path d="M94 74l12 12" class="accent-line" />
  {/if}
</svg>

<style>
  .empty-art {
    display: block;
    margin: 4px 0 2px;
  }

  .card {
    fill: var(--surface-2);
    stroke: var(--border);
    stroke-width: 2;
  }

  .front {
    fill: var(--surface);
  }

  .line {
    fill: none;
    stroke: var(--muted);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .accent {
    fill: var(--accent);
  }

  .accent-line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 6;
    stroke-linecap: round;
  }
</style>
