<script lang="ts">
  import IconButton from './IconButton.svelte';
  import {
    selection,
    clearSelection,
    events,
    pushLog,
  } from '../lib/state.svelte';
  import { buildIcsBundleDownload } from '../lib/calendar-links';
  import type { ParsedEvent } from '../lib/types';

  function gatherSelected(): ParsedEvent[] {
    const out: ParsedEvent[] = [];
    for (const list of Object.values(events.byFeed)) {
      for (const ev of list) {
        if (selection.uids.has(ev.uid)) out.push(ev);
      }
    }
    return out;
  }

  function downloadIcs(): void {
    const evs = gatherSelected();
    if (evs.length === 0) {
      pushLog('Nothing to export', 'warn');
      return;
    }
    const { blob, filename } = buildIcsBundleDownload(evs);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    pushLog(`Exported ${evs.length} event${evs.length === 1 ? '' : 's'}`);
  }
</script>

<div class="selection-bar" role="region" aria-label="Selection actions">
  <span class="count" aria-live="polite">
    {selection.uids.size} selected
  </span>
  <div class="actions">
    <IconButton
      icon="share"
      label="Export selected as .ics"
      onclick={downloadIcs}
      disabled={selection.uids.size === 0}
    />
    <IconButton
      icon="close"
      label="Clear selection"
      variant="ghost"
      onclick={clearSelection}
    />
  </div>
</div>

<style>
  .selection-bar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 12px;
    background: var(--paper);
    border-bottom: 1px solid var(--ink);
    box-shadow: inset 0 -2px 0 var(--accent);
  }
  .count {
    font-weight: 600;
    font-size: 13px;
    color: var(--ink);
  }
  .actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
</style>
