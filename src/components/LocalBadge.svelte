<script lang="ts">
  import Icon from './Icon.svelte';

  type Props = { size?: number; linked?: boolean };
  const { size = 12, linked = false }: Props = $props();

  const label = $derived(linked ? 'Linked to a URL' : 'Local — not synced to a URL');
</script>

<span class="local-badge" title={label} aria-label={label} role="img">
  <Icon name={linked ? 'link' : 'unlink'} {size} />
</span>

<style>
  .local-badge {
    display: inline-flex;
    align-items: center;
    opacity: 0.5;
    flex: none;
  }
</style>
