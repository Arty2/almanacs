<script lang="ts">
  import { ui, config, zoom, clearSelection, pushLog } from '../lib/state.svelte';
  import { buildShareUrl } from '../lib/share';

  let dialog: HTMLDialogElement | undefined = $state();
  let digits = $state(['', '', '', '']);
  let error = $state('');
  const inputs: (HTMLInputElement | undefined)[] = [];

  const mode = $derived(ui.kioskPinModal);
  const pin = $derived(digits.join(''));
  const complete = $derived(/^\d{4}$/.test(pin));

  $effect(() => {
    if (!dialog) return;
    if (mode && !dialog.open) {
      digits = ['', '', '', ''];
      error = '';
      dialog.showModal();
      queueMicrotask(() => inputs[0]?.focus());
    }
    if (!mode && dialog.open) dialog.close();
  });

  function setDigit(i: number, raw: string): void {
    const d = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    digits = next;
    if (d && i < 3) inputs[i + 1]?.focus();
  }

  function onInput(i: number, e: Event): void {
    const t = e.currentTarget as HTMLInputElement;
    setDigit(i, t.value);
    t.value = digits[i] ?? '';
  }

  function onKeydown(i: number, e: KeyboardEvent): void {
    if (e.key === 'Backspace') {
      const next = [...digits];
      if (next[i]) {
        next[i] = '';
      } else if (i > 0) {
        inputs[i - 1]?.focus();
        next[i - 1] = '';
      }
      digits = next;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputs[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 3) {
      inputs[i + 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'unlock') doUnlock();
      else doLock();
    }
  }

  function cancel(): void {
    ui.kioskPinModal = null;
  }

  function doLock(): void {
    if (!complete) {
      error = 'Enter a 4-digit PIN';
      return;
    }
    config.kioskPin = pin;
    clearSelection();
    ui.kioskPinModal = null;
  }

  async function copyLink(): Promise<void> {
    if (!complete) {
      error = 'Enter a 4-digit PIN';
      return;
    }
    config.kioskPin = pin;
    clearSelection();
    try {
      await navigator.clipboard.writeText(buildShareUrl(config, zoom.value));
      pushLog('Kiosk link copied');
    } catch {
      pushLog('Copy failed', 'error');
    }
    ui.kioskPinModal = null;
  }

  function doUnlock(): void {
    if (!complete) {
      error = 'Enter your 4-digit PIN';
      return;
    }
    if (pin === config.kioskPin) {
      config.kioskPin = null;
      ui.kioskPinModal = null;
    } else {
      error = 'Incorrect PIN';
      digits = ['', '', '', ''];
      queueMicrotask(() => inputs[0]?.focus());
    }
  }
</script>

<dialog bind:this={dialog} onclose={cancel}>
  {#if mode}
    <article>
      <header>
        <h2>{mode === 'unlock' ? 'Unlock kiosk' : 'Set kiosk PIN'}</h2>
      </header>
      <p class="hint">
        {mode === 'unlock'
          ? 'Enter your 4-digit PIN to exit kiosk mode.'
          : 'Choose a 4-digit PIN. The app locks into a read-only view until unlocked.'}
      </p>
      <div class="pin-row">
        {#each digits as digit, i (i)}
          <input
            bind:this={inputs[i]}
            class="pin-box"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            maxlength="1"
            aria-label="PIN digit {i + 1}"
            value={digit}
            oninput={(e) => onInput(i, e)}
            onkeydown={(e) => onKeydown(i, e)}
            onfocus={(e) => e.currentTarget.select()}
          />
        {/each}
      </div>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <div class="actions">
        <button type="button" class="cancel" onclick={cancel}>Cancel</button>
        <span class="actions-right">
          {#if mode === 'unlock'}
            <button type="button" class="primary" disabled={!complete} onclick={doUnlock}>Unlock</button>
          {:else}
            <button type="button" disabled={!complete} onclick={() => void copyLink()}>Copy link</button>
            <button type="button" class="primary" disabled={!complete} onclick={doLock}>Lock</button>
          {/if}
        </span>
      </div>
    </article>
  {/if}
</dialog>

<style>
  dialog {
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    padding: 0;
    width: min(360px, calc(100vw - 1rem));
    box-sizing: border-box;
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  article {
    padding: 1em;
  }
  header {
    border-bottom: 1px solid var(--ink-faint);
    padding-bottom: 0.5em;
    margin-bottom: 0.75em;
  }
  h2 {
    margin: 0;
    font-size: 1.05em;
  }
  .hint {
    margin: 0 0 1em 0;
    font-size: var(--fs-12);
    color: var(--ink-muted);
  }
  .pin-row {
    display: flex;
    gap: 0.5em;
    justify-content: center;
    margin-bottom: 0.75em;
  }
  .pin-box {
    width: 48px;
    height: 56px;
    text-align: center;
    font-family: var(--mono);
    font-size: 1.6em;
    border: var(--btn-border-w) solid var(--ink);
    border-radius: var(--btn-radius);
    background: var(--paper);
    color: var(--ink);
    box-sizing: border-box;
  }
  .pin-box:focus {
    outline: none;
    background: var(--paper-2);
  }
  .error {
    margin: 0 0 0.75em 0;
    font-size: var(--fs-12);
    color: var(--accent);
    text-align: center;
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
  }
  .actions-right {
    display: inline-flex;
    gap: 0.5em;
  }
  .actions button {
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    cursor: pointer;
    font-size: var(--fs-12);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .actions .primary {
    background: var(--ink);
    color: var(--paper);
  }
  .actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-style: dashed;
  }
</style>
