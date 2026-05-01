<script lang="ts">
  import { ui, config } from '../lib/state.svelte';
  import { LANE_HEIGHT, ROW_PADDING_PX } from '../lib/layout';
  import { formatDate } from '../lib/format';
  import type { LaneEvent } from '../lib/types';

  type Props = { event: LaneEvent; isMatch: boolean; isCurrent: boolean; isPast: boolean };
  const { event, isMatch, isCurrent, isPast }: Props = $props();

  function open(): void {
    ui.modalEvent = event;
  }

  const dateLabel = $derived(formatDate(event.start, config.dateFormat, config.locale));
</script>

<article
  data-all-day={event.allDay ? 'true' : null}
  data-match={isMatch ? 'true' : null}
  data-past={isPast ? 'true' : null}
  data-style={event.styleVariant === 'none' ? null : event.styleVariant}
  aria-current={isCurrent ? 'true' : null}
  style="left: {event.leftPx}px; width: {event.widthPx}px; top: {event.lane * LANE_HEIGHT + ROW_PADDING_PX}px;"
>
  <button type="button" onclick={open} aria-label="Open event {event.displayTitle}">
    <h3>{event.displayTitle}</h3>
    {#if event.displayDescriptionSnippet}
      <p>{event.displayDescriptionSnippet}</p>
    {/if}
    <time data-mono datetime={event.start.toISOString()}>{dateLabel}</time>
  </button>
</article>

<style>
  article {
    position: absolute;
    height: 36px;
    border: 1px solid var(--ink);
    background: var(--paper);
    overflow: hidden;
    box-sizing: border-box;
  }
  article[data-all-day='true'] {
    background: var(--ink);
    color: var(--paper);
  }
  article[aria-current='true'] {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  button {
    display: block;
    width: 100%;
    height: 100%;
    padding: 2px 6px;
    background: transparent;
    color: inherit;
    border: none;
    text-align: left;
    cursor: pointer;
    font: inherit;
  }
  h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  p {
    margin: 0;
    font-size: 10px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  time {
    display: block;
    font-size: 10px;
    line-height: 1.2;
    color: var(--ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  article[data-all-day='true'] time {
    color: var(--paper);
    opacity: 0.7;
  }
</style>
