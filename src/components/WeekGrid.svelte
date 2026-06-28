<script lang="ts">
  import WeekEvent from './WeekEvent.svelte';
  import { config, search, displayEventsFor } from '../lib/state.svelte';
  import { getMatchUids, getCurrentMatchUid } from '../lib/search-state.svelte';
  import { clock } from '../lib/clock.svelte';
  import { zonedParts, dayLimitMinutes, offsetMinutes, formatTimezoneLabel } from '../lib/format';
  import { packLanes } from '../lib/layout';
  import { MS_PER_DAY } from '../lib/time';
  import type { CalendarFeed, DisplayEvent } from '../lib/types';

  // `today` is accepted for parity with the timeline (and so the grid re-derives
  // when the device day rolls over); the day columns themselves are anchored to
  // the primary zone's calendar day, derived from clock.now below.
  type Props = { today: Date; feedsById: Record<string, CalendarFeed> };
  const { today, feedsById }: Props = $props();

  // The grid renders a horizontally-scrollable window of days around today, so
  // the user can scroll left/right to reach past and future dates. The body opens
  // scrolled to today's column at the day-area's left edge.
  const PAST_DAYS = 7;
  const FUTURE_DAYS = 28;
  const NUM_DAYS = PAST_DAYS + 1 + FUTURE_DAYS;

  // Base metrics scaled by the font-size setting, mirroring the timeline's
  // fontScale pattern so the grid grows with larger text.
  const fontScale = $derived(config.fontSize / 14);
  const HOUR_H = $derived(Math.round(44 * fontScale));
  // Narrow hour-label columns (two of them, left gutter).
  const GUTTER_W = $derived(Math.round(30 * fontScale));
  const MIN_DAY_W = $derived(Math.round(96 * fontScale));
  const ALLDAY_ROW_H = $derived(Math.round(20 * fontScale));
  const MIN_BLOCK_H = 14;
  const bodyH = $derived(24 * HOUR_H);

  const tzTop = $derived(config.weekTzTop);
  const tzBottom = $derived(config.weekTzBottom);

  // Day-column width: fit seven across the visible day area, but never below a
  // legibility floor — so wide viewports show a week at a glance while the full
  // window stays reachable by horizontal scroll (and narrow screens scroll too).
  let viewW = $state(0);
  const dayW = $derived.by(() => {
    if (viewW <= 0) return MIN_DAY_W;
    return Math.max(MIN_DAY_W, Math.round((viewW - GUTTER_W * 2) / 7));
  });
  const gutterW2 = $derived(GUTTER_W * 2);
  const daysW = $derived(NUM_DAYS * dayW);
  const contentW = $derived(gutterW2 + daysW);

  function pad(n: number): string {
    return n < 10 ? '0' + n : String(n);
  }

  function weekdayShort(d: Date): string {
    const tag = config.locale === 'el' ? 'el' : 'en-US';
    return d.toLocaleString(tag, { weekday: 'short', timeZone: 'UTC' });
  }

  // UTC-midnight anchor for the primary-zone calendar day an instant falls on —
  // the basis for both the day columns and per-event day placement.
  function primaryAnchorMs(date: Date): number {
    const p = zonedParts(date, tzTop);
    return Date.UTC(p.y, p.m - 1, p.d);
  }
  // Re-anchored each time the day rolls over (clock.now / today drive this).
  const primaryTodayMs = $derived.by(() => {
    void today;
    return primaryAnchorMs(new Date(clock.now));
  });
  function dayIndexOf(date: Date): number {
    return Math.round((primaryAnchorMs(date) - primaryTodayMs) / MS_PER_DAY);
  }
  // Column index within the rendered window (today sits at PAST_DAYS).
  function colIndexOf(date: Date): number {
    return dayIndexOf(date) + PAST_DAYS;
  }

  // The rendered day columns: today − PAST_DAYS … today + FUTURE_DAYS.
  const days = $derived.by(() => {
    const out: { date: Date; label: string; isToday: boolean }[] = [];
    for (let i = 0; i < NUM_DAYS; i++) {
      const d = new Date(primaryTodayMs + (i - PAST_DAYS) * MS_PER_DAY);
      out.push({ date: d, label: weekdayShort(d) + ' ' + d.getUTCDate(), isToday: i === PAST_DAYS });
    }
    return out;
  });

  // Every visible feed merged (the week grid has no per-feed rows). Matches the
  // timeline's visibility rule: time-limit-hidden events drop, but Hidden-style
  // events still render as a faint placeholder.
  const visibleEvents = $derived.by<DisplayEvent[]>(() => {
    const out: DisplayEvent[] = [];
    for (const feed of config.feeds) {
      if (feed.hidden) continue;
      for (const e of displayEventsFor(feed.id)) {
        if (e.hidden && e.styleVariant !== 'hidden') continue;
        out.push(e);
      }
    }
    return out;
  });

  const matchUids = $derived(getMatchUids());
  const currentMatchUid = $derived(getCurrentMatchUid());

  type TimedBlock = {
    ev: DisplayEvent;
    startMin: number;
    endMin: number;
    lane: number;
    laneCount: number;
  };

  // Timed events grouped into their start day's column, then packed into
  // side-by-side sub-columns by their [startMin, endMin) overlap. Overnight
  // events are clipped to the start column's midnight (continuation noted as a
  // future enhancement).
  const timedByDay = $derived.by<TimedBlock[][]>(() => {
    const cols: { ev: DisplayEvent; startMin: number; endMin: number }[][] = Array.from(
      { length: NUM_DAYS },
      () => [],
    );
    for (const ev of visibleEvents) {
      if (ev.allDay) continue;
      const idx = colIndexOf(ev.start);
      if (idx < 0 || idx >= NUM_DAYS) continue;
      const startMin = zonedParts(ev.start, tzTop).minutes;
      const sameDay = colIndexOf(ev.end) === idx;
      let endMin = sameDay ? zonedParts(ev.end, tzTop).minutes : 1440;
      if (endMin < startMin) endMin = 1440; // overnight / malformed → clip to midnight
      cols[idx]!.push({ ev, startMin, endMin });
    }
    return cols.map((items) => {
      const { packed, laneCount } = packLanes(items);
      return packed.map(({ item, lane }) => ({
        ev: item.ev,
        startMin: item.startMin,
        endMin: item.endMin,
        lane,
        laneCount,
      }));
    });
  });

  function blockPlacement(b: TimedBlock): string {
    const top = (b.startMin / 60) * HOUR_H;
    const height = Math.max(MIN_BLOCK_H, ((b.endMin - b.startMin) / 60) * HOUR_H);
    const width = 100 / b.laneCount;
    const left = b.lane * width;
    return `top:${top}px; height:${height}px; left:${left}%; width:${width}%;`;
  }

  // All-day events span the day columns they cover (clamped to the window) and
  // stack into rows so concurrent ones don't overlap.
  const allDayLayout = $derived.by(() => {
    const items: { from: number; span: number; ev: DisplayEvent; startMin: number; endMin: number }[] = [];
    for (const ev of visibleEvents) {
      if (!ev.allDay) continue;
      const startIdx = colIndexOf(ev.start);
      const lastIdx = colIndexOf(new Date(Math.max(ev.start.getTime(), ev.end.getTime() - 1)));
      if (lastIdx < 0 || startIdx >= NUM_DAYS) continue;
      const from = Math.max(0, startIdx);
      const to = Math.min(NUM_DAYS - 1, lastIdx);
      items.push({ from, span: to - from + 1, ev, startMin: from, endMin: to + 1 });
    }
    const { packed, laneCount } = packLanes(items);
    const rows = packed.map(({ item, lane }) => ({ ev: item.ev, from: item.from, span: item.span, lane }));
    return { rows, laneCount };
  });

  const allDayHeight = $derived(Math.max(1, allDayLayout.laneCount) * ALLDAY_ROW_H);

  function allDayPlacement(r: { from: number; span: number; lane: number }): string {
    const left = (r.from / NUM_DAYS) * 100;
    const width = (r.span / NUM_DAYS) * 100;
    const top = r.lane * ALLDAY_ROW_H;
    return `top:${top}px; height:${ALLDAY_ROW_H - 1}px; left:${left}%; width:${width}%;`;
  }

  // Gutter hour labels. Column A is the primary zone's own hours (row h = hour h);
  // column B shows the secondary zone's wall-clock for the same instant, offset by
  // the two zones' difference (handles fractional offsets via the minutes label).
  const tzDiffMin = $derived.by(() => {
    const at = new Date(clock.now);
    const a = offsetMinutes(tzTop, at, config.dst);
    const b = offsetMinutes(tzBottom, at, config.dst);
    if (a == null || b == null) return 0;
    return b - a;
  });

  function hourLabel(totalMin: number): string {
    const m = (((totalMin % 1440) + 1440) % 1440) | 0;
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (config.timeFormat === '12h') {
      const ampm = h < 12 ? 'a' : 'p';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      return min ? `${h12}:${pad(min)}${ampm}` : `${h12}${ampm}`;
    }
    return min ? `${pad(h)}:${pad(min)}` : pad(h);
  }

  // Compact UTC-offset badge for a gutter column header (e.g. "+3", "−4:30").
  function offsetBadge(tz: string): string {
    const o = offsetMinutes(tz, new Date(clock.now), config.dst);
    if (o == null) return '';
    const sign = o < 0 ? '−' : '+';
    const abs = Math.abs(o);
    const h = Math.floor(abs / 60);
    const min = abs % 60;
    return min ? `${sign}${h}:${pad(min)}` : `${sign}${h}`;
  }
  const tzBadgeTop = $derived(offsetBadge(tzTop));
  const tzBadgeBottom = $derived(offsetBadge(tzBottom));
  const tzTitleTop = $derived(formatTimezoneLabel(tzTop, config.dst));
  const tzTitleBottom = $derived(formatTimezoneLabel(tzBottom, config.dst));

  const hours = $derived(Array.from({ length: 24 }, (_, h) => h));

  // Hour gridlines as a repeating gradient — one line per hour.
  const gridLines = $derived(
    `repeating-linear-gradient(to bottom, var(--ink-faint) 0, var(--ink-faint) var(--border-w), transparent var(--border-w), transparent ${HOUR_H}px)`,
  );

  // Live now-line position, in primary-zone minutes.
  const nowMin = $derived(zonedParts(new Date(clock.now), tzTop).minutes);
  const nowTop = $derived((nowMin / 60) * HOUR_H);
  const nowMs = $derived(clock.now);

  // One-shot open scroll: vertically to working hours (or the current hour if
  // later), horizontally to today's column at the day-area's left edge. Guarded
  // so it never fights the user's own scrolling afterwards.
  let scrollBody: HTMLElement | undefined = $state();
  let didScroll = false;
  $effect(() => {
    if (didScroll || !scrollBody || viewW <= 0) return;
    const morningMin = dayLimitMinutes(config.morningLimit, 8 * 60);
    const cur = zonedParts(new Date(clock.now), tzTop).minutes;
    const targetMin = Math.max(morningMin, cur);
    // Lead in by one hour so the target row isn't flush against the sticky header.
    scrollBody.scrollTop = Math.max(0, (targetMin / 60) * HOUR_H - HOUR_H);
    scrollBody.scrollLeft = PAST_DAYS * dayW;
    didScroll = true;
  });

  const dayCols = $derived(`repeat(${NUM_DAYS}, ${dayW}px)`);
</script>

<div
  class="week-grid"
  style="height: calc(100dvh - var(--toolbar-h) - {search.open ? 'var(--toolbar-h)' : '0px'});"
>
  <!-- Each row is a flex pair [frozen-left | scrolling day-area]; the frozen
       left is position:sticky;left:0 so its containing block is the full-width
       row and it stays pinned across the whole horizontal scroll. -->
  <div class="wg-scroll" bind:this={scrollBody} bind:clientWidth={viewW}>
    <!-- Day-column headers (sticky top); the corner labels the two zones -->
    <div class="wg-header" style="width: {contentW}px;">
      <div class="wg-corner" style="width: {gutterW2}px; grid-template-columns: {GUTTER_W}px {GUTTER_W}px;">
        <span class="wg-tz" title={tzTitleTop} data-mono>{tzBadgeTop}</span>
        <span class="wg-tz wg-tz-b" title={tzTitleBottom} data-mono>{tzBadgeBottom}</span>
      </div>
      <div class="wg-days-head" style="grid-template-columns: {dayCols};">
        {#each days as d (d.date.toISOString())}
          <div class="wg-dayhead" data-current={d.isToday ? 'true' : null}>
            <span class="wg-dayhead-label">{d.label}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- All-day strip (sticky, below the headers) -->
    <div class="wg-allday" style="width: {contentW}px; top: var(--wg-header-h);">
      <div class="wg-corner wg-allday-corner" style="width: {gutterW2}px;"><span>all-day</span></div>
      <div class="wg-allday-area" style="width: {daysW}px; height: {allDayHeight}px;">
        {#each allDayLayout.rows as r (r.ev.uid)}
          <WeekEvent
            event={r.ev}
            tz={tzTop}
            feedColor={feedsById[r.ev.feedId]?.color}
            feedStyle={feedsById[r.ev.feedId]?.style}
            mode="bar"
            isMatch={matchUids.has(r.ev.uid)}
            isCurrent={currentMatchUid === r.ev.uid}
            isPast={r.ev.end.getTime() < nowMs}
            placement={allDayPlacement(r)}
          />
        {/each}
      </div>
    </div>

    <!-- Scrollable hour grid -->
    <div class="wg-body" style="width: {contentW}px; height: {bodyH}px;">
      <!-- Two stacked timezone label columns (frozen left) -->
      <div class="wg-gutter-group" style="width: {gutterW2}px; grid-template-columns: {GUTTER_W}px {GUTTER_W}px;">
        <div class="wg-gutter wg-gutter-a">
          {#each hours as h (h)}
            <span class="wg-hour" data-mono style="top: {h * HOUR_H}px;">{hourLabel(h * 60)}</span>
          {/each}
        </div>
        <div class="wg-gutter">
          {#each hours as h (h)}
            <span class="wg-hour" data-mono style="top: {h * HOUR_H}px;"
              >{hourLabel(h * 60 + tzDiffMin)}</span
            >
          {/each}
        </div>
      </div>

      <!-- Day columns -->
      <div class="wg-days" style="grid-template-columns: {dayCols};">
        {#each days as d, i (d.date.toISOString())}
          <div
            class="wg-daycol"
            data-current={d.isToday ? 'true' : null}
            style="background-image: {gridLines};"
          >
            {#each timedByDay[i] ?? [] as b (b.ev.uid)}
              <WeekEvent
                event={b.ev}
                tz={tzTop}
                feedColor={feedsById[b.ev.feedId]?.color}
                feedStyle={feedsById[b.ev.feedId]?.style}
                isMatch={matchUids.has(b.ev.uid)}
                isCurrent={currentMatchUid === b.ev.uid}
                isPast={b.ev.end.getTime() < nowMs}
                placement={blockPlacement(b)}
              />
            {/each}
            {#if d.isToday}
              <i class="wg-now-dot" style="top: {nowTop}px;" aria-hidden="true"></i>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Live now-line across the day area -->
      <i class="wg-now-line" style="top: {nowTop}px; left: {gutterW2}px;" aria-hidden="true"></i>
    </div>
  </div>
</div>

<style>
  .week-grid {
    --wg-header-h: 28px;
    display: flex;
    flex-direction: column;
    /* height is set inline so it can subtract the search toolbar when open. */
    border-top: var(--border-w) solid var(--ink);
    background: var(--paper);
    box-sizing: border-box;
    overflow: hidden;
  }
  .wg-scroll {
    flex: 1;
    /* Scrolls both axes: vertically through the hours, horizontally through the
       days. The hour gutters pin left, the day headers / all-day strip pin top. */
    overflow: auto;
    scrollbar-width: thin;
    overscroll-behavior: contain;
  }

  .wg-header {
    position: sticky;
    top: 0;
    z-index: 7;
    display: flex;
    height: var(--wg-header-h);
    background: var(--paper);
    border-bottom: var(--border-w) solid var(--ink);
  }
  .wg-corner {
    position: sticky;
    left: 0;
    z-index: 1;
    flex: 0 0 auto;
    display: grid;
    box-sizing: border-box;
    background: var(--paper);
    border-right: var(--border-w) solid var(--ink);
  }
  .wg-tz {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 3px;
    font-size: var(--fs-10);
    line-height: 1;
    color: var(--ink-muted);
    white-space: nowrap;
    overflow: hidden;
  }
  .wg-tz-b {
    border-left: var(--border-w) solid var(--ink-faint);
  }
  .wg-days-head {
    display: grid;
    flex: 0 0 auto;
  }
  .wg-dayhead {
    display: flex;
    align-items: center;
    justify-content: center;
    border-left: var(--border-w) solid var(--ink-faint);
    font-size: var(--fs-11);
    color: var(--ink);
  }
  .wg-dayhead[data-current='true'] {
    color: var(--accent);
    font-weight: 700;
  }

  .wg-allday {
    position: sticky;
    z-index: 6;
    display: flex;
    background: var(--paper);
    border-bottom: var(--border-w) solid var(--ink);
  }
  .wg-allday-corner {
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 4px;
    font-size: var(--fs-10);
    color: var(--ink-muted);
  }
  .wg-allday-area {
    position: relative;
    flex: 0 0 auto;
    min-height: 100%;
  }

  .wg-body {
    position: relative;
    display: flex;
  }
  .wg-gutter-group {
    position: sticky;
    left: 0;
    z-index: 4;
    flex: 0 0 auto;
    display: grid;
    box-sizing: border-box;
    background: var(--paper);
    border-right: var(--border-w) solid var(--ink);
  }
  .wg-gutter {
    position: relative;
  }
  .wg-gutter-a {
    border-right: var(--border-w) solid var(--ink-faint);
  }
  .wg-hour {
    position: absolute;
    right: 3px;
    transform: translateY(-50%);
    font-size: var(--fs-10);
    line-height: 1;
    color: var(--ink-muted);
    white-space: nowrap;
  }
  .wg-days {
    display: grid;
    flex: 0 0 auto;
  }
  .wg-daycol {
    position: relative;
    border-left: var(--border-w) solid var(--ink-faint);
    background-repeat: repeat;
  }
  .wg-daycol[data-current='true'] {
    background-color: color-mix(in srgb, var(--accent) 5%, transparent);
  }

  .wg-now-line {
    position: absolute;
    right: 0;
    height: 0;
    border-top: 2px solid var(--accent);
    pointer-events: none;
    z-index: 3;
  }
  .wg-now-dot {
    position: absolute;
    left: -4px;
    width: 8px;
    height: 8px;
    margin-top: -4px;
    border-radius: 50%;
    background: var(--accent);
    pointer-events: none;
    z-index: 3;
  }
</style>
