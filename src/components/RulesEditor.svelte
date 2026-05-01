<script lang="ts">
  import IconButton from './IconButton.svelte';
  import { config } from '../lib/state.svelte';
  import { makeRule } from '../lib/rules';
  import { icons } from '../lib/icons';
  import type { StyleVariant } from '../lib/types';

  const styleOptions: { id: StyleVariant; label: string }[] = [
    { id: 'none', label: 'No style' },
    { id: 'inverted-dashed', label: 'Inverted, dashed' },
    { id: 'inverted-strike', label: 'Inverted, strike' },
    { id: 'muted', label: 'Muted' },
    { id: 'highlight', label: 'Highlight' },
    { id: 'hidden', label: 'Hidden' },
  ];

  function add(): void {
    config.rules = [...config.rules, makeRule()];
  }
  function remove(id: string): void {
    config.rules = config.rules.filter((r) => r.id !== id);
  }
</script>

<div class="rules">
  {#if config.rules.length === 0}
    <p class="empty">No rules yet. Rules let you rename strings inside event titles, descriptions, and locations — and apply a style to events that match.</p>
  {/if}
  {#each config.rules as rule (rule.id)}
    <div class="rule">
      <input type="text" placeholder="find" bind:value={rule.find} aria-label="Find" />
      <input type="text" placeholder="replace" bind:value={rule.replace} aria-label="Replace" />
      <select bind:value={rule.style} aria-label="Style">
        {#each styleOptions as o (o.id)}
          <option value={o.id}>{o.label}</option>
        {/each}
      </select>
      <IconButton icon={icons.trash} label="Delete rule" variant="ghost" onclick={() => remove(rule.id)} />
    </div>
  {/each}
  <button type="button" class="add" onclick={add}>
    <span class="plus">{@html icons.plus}</span>
    Add rule
  </button>
</div>

<style>
  .rules {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  .empty {
    margin: 0;
    font-size: 12px;
    color: var(--ink-muted);
  }
  .rule {
    display: grid;
    grid-template-columns: 1fr 1fr auto auto;
    gap: 0.35em;
    align-items: center;
  }
  .rule input, .rule select {
    width: 100%;
    min-width: 0;
  }
  .add {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    align-self: flex-start;
    padding: 4px 10px;
  }
  .plus :global(svg) {
    width: 16px;
    height: 16px;
  }
  @media (max-width: 480px) {
    .rule {
      grid-template-columns: 1fr 1fr;
      grid-template-areas: 'find replace' 'style trash';
    }
  }
</style>
