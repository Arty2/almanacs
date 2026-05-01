<script lang="ts">
  import EventPill from './EventPill.svelte';
  import RowHeader from './RowHeader.svelte';
  import RowNavButtons from './RowNavButtons.svelte';
  import { ui } from '../lib/state.svelte';
  import { assignLanes, dateToPx } from '../lib/layout';
  import { formatDate } from '../lib/format';
  import { config } from '../lib/state.svelte';
  import { today } from '../lib/today.svelte';
  import type { CalendarFeed, DisplayEvent } from '../lib/types';

  type Props = {
    feed: CalendarFeed;
    events: DisplayEvent[];
    rangeStart: Date;
    pxPerDay: number;
    bodyHeight: number;
    matchUids: Set<string>;
    currentMatchUid: string | null;
    scrollEl: HTMLElement | undefined;
    todayPx: number;
    totalWidth: number;
    monthStartsPx: number[];
  };
  const {
    feed,
    events,
    rangeStart,
    pxPerDay,
    bodyHeight,
    matchUids,
    currentMatchUid,
    scrollEl,
    todayPx,
    totalWidth,
    monthStartsPx,
  }: Props = $props();

  const visibleEvents = $derived(events.filter((e) => !e.hidden));
  const lanes = $derived(assignLanes(visibleEvents, pxPerDay, rangeStart));

  const dots = $derived.by(() => {
    if (!feed.collapsed) return [] as { px: number; ev: DisplayEvent }[];
    return visibleEvents.map((ev) => ({ ev, px: dateToPx(ev.start, rangeStart, pxPerDay) }));
  });

  const todayMs = $derived(today.value.getTime());

  function dotLabel(ev: DisplayEvent): string {
    return ev.displayTitle + ' · ' + formatDate(ev.start, config.dateFormat, config.locale);
  }

  function openDot(ev: DisplayEvent): void {
    ui.modalEvent = ev;
  }
</script>

<section class="row" data-feed-id={feed.id} data-collapsed={feed.collapsed ? 'true' : null}>
  <RowHeader {feed} eventCount={visibleEvents.length} />
  {#if !feed.collapsed}
    <div class="row-body" style="height: {bodyHeight}px; width: {totalWidth}px;">
      {#each monthStartsPx as mx, i (i)}
        <i class="month-line" style="left: {mx}px"></i>
      {/each}
      <hr class="today-line" style="left: {todayPx}px" />
      {#each lanes.laneEvents as e (e.uid)}
        <EventPill
          event={e}
          isMatch={matchUids.has(e.uid)}
          isCurrent={currentMatchUid === e.uid}
          isPast={e.end.getTime() < todayMs}
        />
      {/each}
      <RowNavButtons events={visibleEvents} {rangeStart} {pxPerDay} {scrollEl} />
    </div>
  {:else}
    <div class="row-collapsed" style="width: {totalWidth}px;">
      <hr class="today-line" style="left: {todayPx}px" />
      {#each dots as d (d.ev.uid)}
        <button
          type="button"
          class="dot"
          style="left: {d.px}px"
          aria-label={dotLabel(d.ev)}
          title={dotLabel(d.ev)}
          onclick={() => openDot(d.ev)}
        ></button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .row {
    width: max-content;
    min-width: 100%;
    background: var(--paper-2);
    border: 1px solid var(--ink-faint);
    border-radius: 4px;
    margin: 0 8px 8px 8px;
    overflow: hidden;
    box-sizing: border-box;
  }
  .row[data-collapsed='true'] {
    background: var(--paper);
  }
  .row-body {
    position: relative;
    box-sizing: border-box;
    background: var(--paper);
  }
  .row-collapsed {
    position: relative;
    height: 16px;
    background: var(--paper);
  }
  .today-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
    margin: 0;
    border: none;
    border-left: 2px dotted var(--accent);
    z-index: 2;
    pointer-events: none;
  }
  .month-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
    border-left: 1px solid var(--ink-faint);
    pointer-events: none;
    z-index: 0;
  }
  .today-line::before {
    content: '';
    position: absolute;
    left: -5px;
    top: -1px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--accent);
  }
  .dot {
    position: absolute;
    top: 50%;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    border: none;
    padding: 0;
    background: var(--ink);
    transform: translate(-50%, -50%);
    cursor: pointer;
  }
  .dot:hover, .dot:focus-visible {
    width: 12px;
    height: 12px;
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
