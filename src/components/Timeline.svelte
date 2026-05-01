<script lang="ts">
  import TimeHeader from './TimeHeader.svelte';
  import Row from './Row.svelte';
  import { zoom, search, config, displayEventsFor } from '../lib/state.svelte';
  import { PX_PER_DAY, dateToPx, LANE_HEIGHT, ROW_PADDING_PX, assignLanes } from '../lib/layout';
  import { MS_PER_DAY, ticksBetween, addDays } from '../lib/time';
  import { buildIndex, search as runSearch } from '../lib/search';
  import { pinchZoom } from '../lib/pinch';
  import type { DisplayEvent, Zoom } from '../lib/types';

  type Props = { rangeStart: Date; rangeEnd: Date; today: Date };
  const { rangeStart, rangeEnd, today }: Props = $props();

  const pxPerDay = $derived(PX_PER_DAY[zoom.value]);
  const totalWidth = $derived(((rangeEnd.getTime() - rangeStart.getTime()) / MS_PER_DAY) * pxPerDay);
  const todayPx = $derived(dateToPx(today, rangeStart, pxPerDay));
  const searchActive = $derived(search.query.trim().length > 0);

  const orderedFeeds = $derived([...config.feeds].sort((a, b) => a.order - b.order));

  const displayByFeed = $derived.by<Record<string, DisplayEvent[]>>(() => {
    const out: Record<string, DisplayEvent[]> = {};
    for (const feed of config.feeds) out[feed.id] = displayEventsFor(feed.id);
    return out;
  });

  const allVisibleEvents = $derived.by(() => {
    const out: DisplayEvent[] = [];
    for (const feed of orderedFeeds) {
      if (feed.collapsed) continue;
      const arr = displayByFeed[feed.id] ?? [];
      for (const e of arr) if (!e.hidden) out.push(e);
    }
    return out;
  });

  const searchIndex = $derived(buildIndex(allVisibleEvents));
  const matches = $derived(searchActive ? runSearch(searchIndex, search.query) : []);
  const matchUids = $derived(new Set(matches.map((m) => m.event.uid)));
  const currentMatchUid = $derived(matches[search.currentIndex]?.event.uid ?? null);

  const monthStartsPx = $derived.by(() => {
    return ticksBetween(addDays(rangeStart, 1), rangeEnd, 'month').map((d) => dateToPx(d, rangeStart, pxPerDay));
  });

  const rowBodyHeights = $derived.by(() => {
    const result: Record<string, number> = {};
    for (const feed of orderedFeeds) {
      const arr = (displayByFeed[feed.id] ?? []).filter((e) => !e.hidden);
      const { laneCount } = assignLanes(arr, pxPerDay, rangeStart);
      result[feed.id] = Math.max(LANE_HEIGHT, laneCount * LANE_HEIGHT) + ROW_PADDING_PX * 2;
    }
    return result;
  });

  let scrollEl: HTMLElement | undefined = $state();
  let didCenter = false;

  function updateViewportVars(): void {
    if (!scrollEl) return;
    scrollEl.style.setProperty('--scroll-left', scrollEl.scrollLeft + 'px');
    scrollEl.style.setProperty('--viewport-w', scrollEl.clientWidth + 'px');
  }

  let rafScheduled = false;
  function onScroll(): void {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      updateViewportVars();
    });
  }

  $effect(() => {
    if (!scrollEl) return;
    updateViewportVars();
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(updateViewportVars);
    ro.observe(scrollEl);
    return () => {
      scrollEl?.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  });

  function jumpToToday(): void {
    if (!scrollEl) return;
    scrollEl.scrollTo({ left: Math.max(0, todayPx - scrollEl.clientWidth / 2), behavior: 'smooth' });
  }

  $effect(() => {
    if (!scrollEl || didCenter) return;
    if (totalWidth <= 0) return;
    scrollEl.scrollLeft = Math.max(0, todayPx - scrollEl.clientWidth / 2);
    didCenter = true;
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    const handler = (): void => jumpToToday();
    window.addEventListener('cal:jump-today', handler);
    return () => window.removeEventListener('cal:jump-today', handler);
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event): void => {
      if (!scrollEl) return;
      const detail = (e as CustomEvent<{ dir: number }>).detail;
      const dir = detail?.dir ?? 1;
      scrollEl.scrollBy({ left: dir * scrollEl.clientWidth * 0.9, behavior: 'smooth' });
    };
    window.addEventListener('cal:scroll-page', handler);
    return () => window.removeEventListener('cal:scroll-page', handler);
  });

  const ZOOM_ORDER: Zoom[] = ['month', 'quarter', 'half-year', 'year'];
  function shiftZoom(dir: -1 | 1): void {
    const i = ZOOM_ORDER.indexOf(zoom.value);
    const next = i + dir;
    if (next >= 0 && next < ZOOM_ORDER.length) zoom.value = ZOOM_ORDER[next]!;
  }

  $effect(() => {
    if (!scrollEl) return;
    const handle = pinchZoom(scrollEl, {
      onZoomIn: () => shiftZoom(-1),
      onZoomOut: () => shiftZoom(1),
    });
    return () => handle.destroy();
  });

  $effect(() => {
    if (!scrollEl || !currentMatchUid) return;
    const ev = matches[search.currentIndex]?.event;
    if (!ev) return;
    const px = dateToPx(ev.start, rangeStart, pxPerDay);
    scrollEl.scrollLeft = Math.max(0, px - scrollEl.clientWidth / 2);
  });
</script>

<main
  id="timeline"
  bind:this={scrollEl}
  data-zoom={zoom.value}
  data-search-active={searchActive ? 'true' : null}
>
  <header id="time-header" style="width: {totalWidth}px">
    <TimeHeader {rangeStart} {rangeEnd} {pxPerDay} {scrollEl} />
  </header>
  <div class="rows">
    {#each orderedFeeds as feed (feed.id)}
      <Row
        {feed}
        events={displayByFeed[feed.id] ?? []}
        {rangeStart}
        {pxPerDay}
        bodyHeight={rowBodyHeights[feed.id] ?? LANE_HEIGHT + ROW_PADDING_PX * 2}
        {matchUids}
        {currentMatchUid}
        {scrollEl}
        {todayPx}
        {totalWidth}
        {monthStartsPx}
      />
    {/each}
  </div>
</main>

<style>
  #timeline {
    overflow: auto;
    height: calc(100dvh - 50px);
    background: var(--paper);
    display: flex;
    flex-direction: column;
  }
  #time-header {
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--paper);
    border-bottom: 1px solid var(--ink);
    height: 58px;
    flex-shrink: 0;
  }
  .rows {
    display: flex;
    flex-direction: column;
    padding: 8px 0 16px 0;
    flex: 1 0 auto;
    width: max-content;
    min-width: 100%;
  }
</style>
