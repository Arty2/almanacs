<script lang="ts">
  type Props = {
    icon: string;
    label: string;
    pressed?: boolean;
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    title?: string;
    variant?: 'default' | 'ghost';
  };
  const {
    icon,
    label,
    pressed,
    disabled,
    onclick,
    title,
    variant = 'default',
  }: Props = $props();
</script>

<button
  type="button"
  class="icon-button"
  data-variant={variant}
  aria-label={label}
  aria-pressed={pressed === undefined ? undefined : pressed}
  title={title ?? label}
  {disabled}
  {onclick}
>
  {@html icon}
</button>

<style>
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    cursor: pointer;
    flex-shrink: 0;
  }
  .icon-button[data-variant='ghost'] {
    border-color: transparent;
  }
  .icon-button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
  }
  .icon-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .icon-button :global(svg) {
    display: block;
    width: 20px;
    height: 20px;
  }
</style>
