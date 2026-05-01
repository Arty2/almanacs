<script lang="ts">
  import IconButton from './IconButton.svelte';
  import { config } from '../lib/state.svelte';
  import { icons } from '../lib/icons';
  import type { CalendarFeed } from '../lib/types';

  type Props = { feed: CalendarFeed; eventCount: number };
  const { feed, eventCount }: Props = $props();

  function toggle(): void {
    const target = config.feeds.find((f) => f.id === feed.id);
    if (target) target.collapsed = !target.collapsed;
  }

  function rename(e: Event): void {
    const target = config.feeds.find((f) => f.id === feed.id);
    if (target) target.name = (e.currentTarget as HTMLInputElement).value;
  }

  const expandIcon = $derived(feed.collapsed ? icons.chevronRight : icons.arrowDown);
  const expandLabel = $derived(feed.collapsed ? 'Expand row' : 'Collapse row');
</script>

<header class="row-header" data-collapsed={feed.collapsed ? 'true' : null}>
  <IconButton icon={expandIcon} label={expandLabel} variant="ghost" onclick={toggle} />
  <input
    type="text"
    class="name"
    value={feed.name}
    onchange={rename}
    aria-label="Calendar name"
    spellcheck="false"
  />
  <span class="badge" data-mono>{eventCount}</span>
</header>

<style>
  .row-header {
    position: sticky;
    left: 0;
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 4px 8px;
    height: 36px;
    background: var(--paper);
    border-bottom: 1px solid var(--ink-faint);
    box-shadow: var(--shadow-1);
    z-index: 4;
    width: max-content;
    min-width: 100%;
  }
  .row-header[data-collapsed='true'] {
    border-bottom: none;
  }
  .name {
    flex: 1;
    min-width: 0;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    padding: 4px 6px;
    font-size: 13px;
    font-weight: 600;
    width: auto;
    max-width: 360px;
  }
  .name:focus {
    outline: none;
    border-color: var(--ink);
  }
  .name:hover {
    border-color: var(--ink-faint);
  }
  .badge {
    font-size: 11px;
    color: var(--ink-muted);
    background: var(--paper-2);
    padding: 2px 6px;
    border-radius: 999px;
  }
</style>
