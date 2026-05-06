<script lang="ts">
  import IconButton from './IconButton.svelte';
  import { ui, config, events } from '../lib/state.svelte';
  import { formatDateLong } from '../lib/format';

  let dialog: HTMLDialogElement | undefined = $state();
  let showRaw = $state(false);

  $effect(() => {
    if (!dialog) return;
    if (ui.modalEvent && !dialog.open) {
      dialog.showModal();
      showRaw = false;
    }
    if (!ui.modalEvent && dialog.open) dialog.close();
  });

  function close(): void {
    ui.modalEvent = null;
  }

  function onClick(e: MouseEvent): void {
    if (e.target === dialog) close();
  }

  function formatStart(d: Date, allDay: boolean): string {
    if (allDay) return formatDateLong(d, config.locale);
    return formatDateLong(d, config.locale) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  let pressTimer: ReturnType<typeof setTimeout> | null = null;

  function startPress(): void {
    if (!ui.modalEvent) return;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      pressTimer = null;
      showRaw = !showRaw;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
    }, 500);
  }

  function cancelPress(): void {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  async function copyRaw(raw: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(raw);
      ui.toast = 'Raw event copied';
      setTimeout(() => {
        if (ui.toast === 'Raw event copied') ui.toast = null;
      }, 2000);
    } catch {
      ui.toast = 'Copy failed';
      setTimeout(() => {
        if (ui.toast === 'Copy failed') ui.toast = null;
      }, 2000);
    }
  }
</script>

<dialog bind:this={dialog} onclose={close} onclick={onClick}>
  {#if ui.modalEvent}
    {@const ev = ui.modalEvent}
    {@const raw = events.rawByUid[ev.uid] ?? null}
    <article
      onpointerdown={startPress}
      onpointerup={cancelPress}
      onpointercancel={cancelPress}
      onpointerleave={cancelPress}
    >
      <header>
        <h2>{ev.displayTitle}</h2>
        {#if raw}
          <button
            type="button"
            class="raw-toggle"
            aria-pressed={showRaw}
            onclick={() => (showRaw = !showRaw)}
            title="Toggle raw iCal view (or long-press)"
          >{'{}'}</button>
        {/if}
        <IconButton icon="close" label="Close" variant="ghost" onclick={close} />
      </header>
      {#if showRaw && raw}
        <div class="raw-block">
          <pre><code>{raw}</code></pre>
          <button type="button" class="copy-btn" onclick={() => void copyRaw(raw)}>Copy raw</button>
        </div>
      {:else}
        <p><time datetime={ev.start.toISOString()}>{formatStart(ev.start, ev.allDay)}</time></p>
        {#if ev.displayLocation}<p><strong>Location:</strong> {ev.displayLocation}</p>{/if}
        {#if ev.displayDescription}<p class="desc">{ev.displayDescription}</p>{/if}
        {#if ev.url}<p><a href={ev.url} target="_blank" rel="noopener">Open source</a></p>{/if}
        {#if raw}<p class="hint">Long-press anywhere to see raw iCal</p>{/if}
      {/if}
    </article>
  {/if}
</dialog>

<style>
  dialog {
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    padding: 0;
    width: min(600px, calc(100vw - 1rem));
    max-height: calc(100dvh - 2rem);
    overflow: auto;
    box-sizing: border-box;
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    user-select: none;
    -webkit-user-select: none;
  }
  article {
    padding: 1em;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5em;
    border-bottom: 1px solid var(--ink-faint);
    padding-bottom: 0.5em;
    margin-bottom: 0.5em;
  }
  header h2 {
    flex: 1 1 auto;
    margin: 0;
    font-size: 1.15em;
  }
  .raw-toggle {
    flex: 0 0 auto;
    font-family: var(--mono);
    font-size: 12px;
    height: 26px;
    padding: 0 8px;
    border: 1px solid var(--ink-faint);
    background: var(--paper);
    color: var(--ink);
    cursor: pointer;
  }
  .raw-toggle[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
  }
  .desc {
    white-space: pre-wrap;
  }
  time {
    font-family: var(--mono);
  }
  .raw-block {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  .raw-block pre {
    margin: 0;
    padding: 0.6em 0.8em;
    border: 1px solid var(--ink-faint);
    background: var(--paper-2);
    overflow: auto;
    max-height: 60dvh;
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .copy-btn {
    align-self: flex-start;
    height: 28px;
    padding: 0 12px;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    cursor: pointer;
    font-size: 12px;
  }
  .hint {
    color: var(--ink-muted);
    font-size: 11px;
    margin-top: 0.5em;
  }
</style>
