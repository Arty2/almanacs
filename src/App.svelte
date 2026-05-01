<script lang="ts">
  import Toolbar from './components/Toolbar.svelte';
  import Timeline from './components/Timeline.svelte';
  import EventModal from './components/EventModal.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import { config, events, ui, zoom } from './lib/state.svelte';
  import { today } from './lib/today.svelte';
  import { saveConfig } from './lib/storage';
  import { fetchAndParseFeed } from './lib/ics';
  import { rangeForToday } from './lib/layout';
  import { readUrlState, applyUrlState } from './lib/url';
  import type { Zoom } from './lib/types';

  const range = $derived(rangeForToday(today.value));

  async function loadAllFeeds(): Promise<void> {
    ui.loading = true;
    ui.error = null;
    try {
      await Promise.all(
        config.feeds.map(async (feed) => {
          try {
            const parsed = await fetchAndParseFeed(feed.source, range.start, range.end);
            events.byFeed[feed.id] = parsed;
          } catch (err) {
            console.error('Failed to load feed', feed.id, err);
            events.byFeed[feed.id] = [];
          }
        }),
      );
    } finally {
      ui.loading = false;
    }
  }

  const initial = readUrlState();
  if (initial.zoom) zoom.value = initial.zoom;
  if (initial.locale) config.locale = initial.locale;
  if (initial.dateFormat) config.dateFormat = initial.dateFormat;
  if (initial.theme) config.theme = initial.theme;

  $effect(() => {
    void loadAllFeeds();
  });

  $effect(() => {
    saveConfig(config);
  });

  $effect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (config.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', config.theme);
  });

  $effect(() => {
    applyUrlState({
      zoom: zoom.value,
      locale: config.locale,
      dateFormat: config.dateFormat,
      theme: config.theme,
    });
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    const handler = (): void => {
      const next = readUrlState();
      if (next.zoom) zoom.value = next.zoom;
      if (next.locale) config.locale = next.locale;
      if (next.dateFormat) config.dateFormat = next.dateFormat;
      if (next.theme) config.theme = next.theme;
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  });

  const ZOOM_ORDER: Zoom[] = ['month', 'quarter', 'half-year', 'year'];

  function cycleZoom(dir: -1 | 1): void {
    const i = ZOOM_ORDER.indexOf(zoom.value);
    const next = i + dir;
    if (next >= 0 && next < ZOOM_ORDER.length) zoom.value = ZOOM_ORDER[next]!;
  }

  function onKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    const inField =
      !!target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (e.key === 'Escape') {
      if (ui.modalEvent) ui.modalEvent = null;
      else if (ui.settingsOpen) ui.settingsOpen = false;
      return;
    }
    if (inField) return;
    if (e.key === 't' || e.key === 'T') {
      window.dispatchEvent(new CustomEvent('cal:jump-today'));
      e.preventDefault();
    } else if (e.key === '/') {
      const search = document.querySelector('input[type="search"]') as HTMLInputElement | null;
      search?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      window.dispatchEvent(new CustomEvent('cal:scroll-page', { detail: { dir: -1 } }));
    } else if (e.key === 'ArrowRight') {
      window.dispatchEvent(new CustomEvent('cal:scroll-page', { detail: { dir: 1 } }));
    } else if (e.key === '[') {
      cycleZoom(-1);
    } else if (e.key === ']') {
      cycleZoom(1);
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<Toolbar onRefresh={loadAllFeeds} />
<Timeline rangeStart={range.start} rangeEnd={range.end} today={today.value} />
<EventModal />
{#if ui.settingsOpen}
  <SettingsPanel onClose={() => (ui.settingsOpen = false)} onRefresh={loadAllFeeds} />
{/if}
