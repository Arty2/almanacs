<script lang="ts">
  import { dateToPx } from '../lib/layout';
  import { icons } from '../lib/icons';
  import type { DisplayEvent } from '../lib/types';

  type Props = {
    events: DisplayEvent[];
    rangeStart: Date;
    pxPerDay: number;
    scrollEl: HTMLElement | undefined;
  };
  const { events, rangeStart, pxPerDay, scrollEl }: Props = $props();

  function jumpRelative(direction: -1 | 1): void {
    if (!scrollEl) return;
    const center = scrollEl.scrollLeft + scrollEl.clientWidth / 2;
    const candidates = events
      .filter((e) => !e.hidden)
      .map((ev) => dateToPx(ev.start, rangeStart, pxPerDay));
    let target: number | null = null;
    if (direction === 1) {
      for (const px of candidates) if (px > center && (target === null || px < target)) target = px;
    } else {
      for (const px of candidates) if (px < center && (target === null || px > target)) target = px;
    }
    if (target !== null) {
      scrollEl.scrollTo({ left: target - scrollEl.clientWidth / 2, behavior: 'smooth' });
    }
  }
</script>

<button class="nav prev" type="button" aria-label="Previous event" onclick={() => jumpRelative(-1)}>
  {@html icons.chevronLeft}
</button>
<button class="nav next" type="button" aria-label="Next event" onclick={() => jumpRelative(1)}>
  {@html icons.chevronRight}
</button>

<style>
  .nav {
    position: absolute;
    top: 50%;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
    transform: translateY(-50%);
    border-radius: 999px;
    opacity: 0.8;
  }
  .nav.prev {
    left: calc(var(--scroll-left, 0px) + 6px);
  }
  .nav.next {
    left: calc(var(--scroll-left, 0px) + var(--viewport-w, 100%) - 38px);
  }
  .nav :global(svg) {
    width: 18px;
    height: 18px;
  }
  .nav:hover {
    background: var(--ink);
    color: var(--paper);
    opacity: 1;
  }
  .nav:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
