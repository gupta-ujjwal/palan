<script lang="ts">
  import type { PestEntry } from '../types/plant'

  let { count, plantNames, onView } = $props()
</script>

{#if count > 0}
  <button class="pest-alert" onclick={onView}>
    <span class="alert-icon">🐛</span>
    <span class="alert-text">
      {count} plant{count > 1 ? 's have' : ' has'} active pest issues
      {#if plantNames.length > 0}
        — {plantNames.slice(0, 2).join(', ')}{#if plantNames.length > 2}
          +{plantNames.length - 2} more{/if}
      {/if}
    </span>
    <span class="alert-arrow">→</span>
  </button>
{/if}

<style>
  .pest-alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    background: #fde8e8;
    border: 1px solid #e63946;
    border-radius: 12px;
    padding: 0.75rem 1rem;
    cursor: pointer;
    text-align: left;
    color: #212529;
    font-size: 0.9rem;
    transition: background 0.2s;
  }

  .pest-alert:active {
    background: #fbd5d5;
  }

  .alert-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .alert-text {
    flex: 1;
  }

  .alert-arrow {
    color: #e63946;
    font-weight: 600;
  }
</style>
