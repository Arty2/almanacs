<script lang="ts">
  import IconButton from './IconButton.svelte';
  import RulesEditor from './RulesEditor.svelte';
  import { config } from '../lib/state.svelte';
  import { exportConfig, importConfig, defaultConfig } from '../lib/storage';
  import { feedIdFor } from '../lib/ics';
  import { icons } from '../lib/icons';
  import type { CalendarFeed, DateFormat, Locale, Theme } from '../lib/types';

  type Props = { onClose: () => void; onRefresh: () => Promise<void> };
  const { onClose, onRefresh }: Props = $props();

  let newUrl = $state('');
  let newName = $state('');
  let importError: string | null = $state(null);

  function addFeed(e: Event): void {
    e.preventDefault();
    if (!newUrl.trim()) return;
    const source = { kind: 'user' as const, url: newUrl.trim() };
    const id = feedIdFor(source);
    if (config.feeds.some((f) => f.id === id)) return;
    const feed: CalendarFeed = {
      id,
      source,
      name: newName.trim() || newUrl.trim(),
      collapsed: false,
      order: config.feeds.length,
    };
    config.feeds.push(feed);
    newUrl = '';
    newName = '';
    void onRefresh();
  }

  function removeFeed(id: string): void {
    config.feeds = config.feeds.filter((f) => f.id !== id);
  }

  function moveFeed(id: string, dir: -1 | 1): void {
    const sorted = [...config.feeds].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((f) => f.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= sorted.length) return;
    const a = sorted[idx]!;
    const b = sorted[swap]!;
    const tmp = a.order;
    a.order = b.order;
    b.order = tmp;
  }

  function downloadExport(): void {
    const json = exportConfig(config);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar-timeline-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: Event): Promise<void> {
    importError = null;
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const next = importConfig(text);
      config.feeds = next.feeds;
      config.refreshIntervalMs = next.refreshIntervalMs;
      config.theme = next.theme;
      config.locale = next.locale;
      config.dateFormat = next.dateFormat;
      config.rules = next.rules;
      void onRefresh();
    } catch (err) {
      importError = (err as Error).message;
    }
  }

  function resetToDefault(): void {
    const d = defaultConfig();
    config.feeds = d.feeds;
    config.refreshIntervalMs = d.refreshIntervalMs;
    config.theme = d.theme;
    config.locale = d.locale;
    config.dateFormat = d.dateFormat;
    config.rules = d.rules;
    void onRefresh();
  }

  const themeOptions: Theme[] = ['system', 'light', 'dark'];
  const localeOptions: { id: Locale; label: string }[] = [
    { id: 'en', label: 'English' },
    { id: 'el', label: 'Ελληνικά' },
  ];
  const formatOptions: DateFormat[] = ['YMD', 'DMY', 'MDY'];

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) onClose();
  }
</script>

<div class="backdrop" onclick={onBackdropClick} onkeydown={(e) => { if (e.key === 'Escape') onClose(); }} role="presentation">
  <aside class="panel" aria-label="Settings">
    <header>
      <h2>Settings</h2>
      <IconButton icon={icons.close} label="Close settings" variant="ghost" onclick={onClose} />
    </header>

    <section>
      <h3>Appearance</h3>
      <label class="row">
        <span>Theme</span>
        <select bind:value={config.theme}>
          {#each themeOptions as t (t)}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </label>
      <label class="row">
        <span>Language</span>
        <select bind:value={config.locale}>
          {#each localeOptions as l (l.id)}
            <option value={l.id}>{l.label}</option>
          {/each}
        </select>
      </label>
      <label class="row">
        <span>Date format</span>
        <select bind:value={config.dateFormat}>
          {#each formatOptions as f (f)}
            <option value={f}>{f}</option>
          {/each}
        </select>
      </label>
    </section>

    <section>
      <h3>Find &amp; replace</h3>
      <RulesEditor />
    </section>

    <section>
      <h3>Calendars</h3>
      <ul>
        {#each [...config.feeds].sort((a, b) => a.order - b.order) as feed (feed.id)}
          <li>
            <span>{feed.name}</span>
            <small>{feed.source.kind}</small>
            <IconButton icon={icons.arrowUp} label="Move up" variant="ghost" onclick={() => moveFeed(feed.id, -1)} />
            <IconButton icon={icons.arrowDown} label="Move down" variant="ghost" onclick={() => moveFeed(feed.id, 1)} />
            {#if feed.source.kind === 'user'}
              <IconButton icon={icons.trash} label="Remove" variant="ghost" onclick={() => removeFeed(feed.id)} />
            {/if}
          </li>
        {/each}
      </ul>
    </section>

    <section>
      <h3>Add ICS feed</h3>
      <form onsubmit={addFeed}>
        <label>URL <input type="url" bind:value={newUrl} placeholder="https://…" required /></label>
        <label>Name <input type="text" bind:value={newName} placeholder="My calendar" /></label>
        <button type="submit">Add</button>
      </form>
    </section>

    <section>
      <h3>Refresh interval</h3>
      <label>
        <input
          type="number"
          min="1"
          max="1440"
          value={Math.round(config.refreshIntervalMs / 60000)}
          onchange={(e) => (config.refreshIntervalMs = Number((e.currentTarget as HTMLInputElement).value) * 60000)}
        />
        minutes
      </label>
    </section>

    <section>
      <h3>Configuration</h3>
      <button onclick={downloadExport}>Export</button>
      <label>Import <input type="file" accept="application/json" onchange={handleImport} /></label>
      {#if importError}<p>Import failed: {importError}</p>{/if}
      <button onclick={resetToDefault}>Reset to default</button>
    </section>
  </aside>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.25);
    z-index: 20;
    display: flex;
    justify-content: flex-end;
  }
  .panel {
    width: min(360px, 100vw);
    height: 100dvh;
    background: var(--paper);
    border-left: 1px solid var(--ink);
    overflow-y: auto;
    padding: 1em;
    display: flex;
    flex-direction: column;
    gap: 0.75em;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--ink);
    padding-bottom: 0.5em;
  }
  h2 { margin: 0; }
  h3 { margin: 0.25em 0 0.5em; font-size: 1em; }
  section { margin: 0; }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.4em;
    padding: 4px 0;
    border-bottom: 1px solid var(--ink-faint);
  }
  li span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  li small { font-size: 10px; color: var(--ink-muted); }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  label.row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
  }
  label.row span {
    flex-shrink: 0;
  }
  label.row select {
    flex: 1;
  }
  @media (max-width: 640px) {
    .panel {
      width: 100vw;
    }
  }
</style>
