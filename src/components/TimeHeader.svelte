<script lang="ts">
  import { zoom, config } from '../lib/state.svelte';
  import { dateToPx } from '../lib/layout';
  import { HEADER_TIERS, ticksBetween, formatTier, tierToGranularity, addDays } from '../lib/time';
  import { formatMonth, formatDayInitial, isWeekend } from '../lib/format';
  import type { Tier } from '../lib/time';

  type Props = { rangeStart: Date; rangeEnd: Date; pxPerDay: number; scrollEl: HTMLElement | undefined };
  const { rangeStart, rangeEnd, pxPerDay }: Props = $props();

  type Band = { date: Date; left: number; width: number; label: string };
  type TierData = { tier: Tier; bands: Band[] };

  function labelFor(d: Date, tier: Tier): string {
    if (tier === 'month') return formatMonth(d, config.locale, 'short');
    return formatTier(d, tier);
  }

  const tiers = $derived.by<TierData[]>(() => {
    const cfg = HEADER_TIERS[zoom.value];
    return cfg.map((tier) => {
      const ticks = ticksBetween(rangeStart, rangeEnd, tierToGranularity(tier));
      const bands: Band[] = ticks.map((d, i) => {
        const next = ticks[i + 1] ?? rangeEnd;
        return {
          date: d,
          left: dateToPx(d, rangeStart, pxPerDay),
          width: dateToPx(next, rangeStart, pxPerDay) - dateToPx(d, rangeStart, pxPerDay),
          label: labelFor(d, tier),
        };
      });
      return { tier, bands };
    });
  });

  const showDayLetters = $derived(zoom.value === 'month');
  const dayBands = $derived.by<Band[]>(() => {
    if (!showDayLetters) return [];
    const days = ticksBetween(rangeStart, rangeEnd, 'day');
    return days.map((d) => ({
      date: d,
      left: dateToPx(d, rangeStart, pxPerDay),
      width: pxPerDay,
      label: formatDayInitial(d, config.locale),
    }));
  });

  const weekendBands = $derived.by(() => {
    if (!showDayLetters) return [] as { left: number; width: number }[];
    const days = ticksBetween(rangeStart, rangeEnd, 'day');
    const out: { left: number; width: number }[] = [];
    for (const d of days) {
      if (isWeekend(d)) {
        out.push({ left: dateToPx(d, rangeStart, pxPerDay), width: pxPerDay });
      }
    }
    return out;
  });

  const monthStarts = $derived.by(() => {
    const months = ticksBetween(addDays(rangeStart, 1), rangeEnd, 'month');
    return months.map((d) => dateToPx(d, rangeStart, pxPerDay));
  });
</script>

<div class="tiers">
  {#each tiers as t (t.tier)}
    <div class="tier" data-tier={t.tier}>
      {#if t.tier === 'day' && showDayLetters}
        {#each weekendBands as wb, i (i)}
          <i class="weekend" style="left: {wb.left}px; width: {wb.width}px"></i>
        {/each}
        {#each dayBands as b (b.date.toISOString())}
          <div class="band" data-weekend={isWeekend(b.date) ? 'true' : null} style="left: {b.left}px; width: {b.width}px">
            <time datetime={b.date.toISOString()} class="day-letter">{b.label}</time>
          </div>
        {/each}
      {:else}
        {#each t.bands as b (b.date.toISOString())}
          <div class="band" style="left: {b.left}px; width: {b.width}px">
            <time datetime={b.date.toISOString()}>{b.label}</time>
          </div>
        {/each}
      {/if}
    </div>
  {/each}
</div>
{#each monthStarts as mx, i (i)}
  <i class="month-line" style="left: {mx}px"></i>
{/each}

<style>
  .tiers {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .tier {
    position: relative;
    flex: 1 1 0;
    border-bottom: 1px solid var(--ink-faint);
    overflow: hidden;
  }
  .tier:last-child {
    border-bottom: none;
  }
  .band {
    position: absolute;
    top: 0;
    height: 100%;
    border-left: 1px solid var(--ink-faint);
    box-sizing: border-box;
    overflow: visible;
  }
  .band[data-weekend='true'] {
    background: var(--weekend-bg);
  }
  .weekend {
    position: absolute;
    top: 0;
    height: 100%;
    background: var(--weekend-bg);
    pointer-events: none;
    z-index: 0;
  }
  time {
    position: sticky;
    left: 0;
    display: inline-block;
    padding: 1px 6px;
    font-size: 11px;
    line-height: 1.5;
    white-space: nowrap;
    background: inherit;
    color: var(--ink);
    z-index: 1;
  }
  [data-tier='year'] time {
    font-weight: 700;
    font-size: 12px;
    background: var(--paper);
  }
  [data-tier='quarter'] time,
  [data-tier='month'] time {
    background: var(--paper);
  }
  [data-tier='day'] time {
    font-size: 10px;
    padding: 1px 2px;
    text-align: center;
    width: 100%;
    box-sizing: border-box;
    position: static;
  }
  .day-letter {
    color: var(--ink-muted);
  }
  .month-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
    border-left: 2px solid var(--ink);
    pointer-events: none;
    z-index: 0;
  }
</style>
