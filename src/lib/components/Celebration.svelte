<script lang="ts">
  import { onDestroy } from 'svelte'
  import type { Celebration } from '../engagement/celebrations'
  import { prefersReducedMotion } from '../engagement/celebrations'

  let { celebration, onClose }: { celebration: Celebration | null; onClose: () => void } = $props()

  const SHOW_MS = 3200
  let visible = $state(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  let reducedMotion = $state(false)

  $effect(() => {
    reducedMotion = prefersReducedMotion()
  })

  $effect(() => {
    if (!celebration) {
      visible = false
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      return
    }
    visible = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      visible = false
      onClose()
    }, SHOW_MS)
  })

  onDestroy(() => {
    if (timer) clearTimeout(timer)
  })

  function dismiss() {
    if (timer) clearTimeout(timer)
    visible = false
    onClose()
  }
</script>

{#if celebration && visible}
  <button
    class="celebration"
    class:no-motion={reducedMotion}
    onclick={dismiss}
    aria-live="polite"
    aria-label="Task complete"
  >
    {#if celebration.type === 'bloom'}
      <span class="bloom" aria-hidden="true">🌸</span>
      <span class="text">Well done</span>
    {:else if celebration.type === 'fact'}
      <span class="fact-icon" aria-hidden="true">💡</span>
      <span class="text">{celebration.fact}</span>
    {:else if celebration.type === 'badge'}
      <span class="badge-icon" aria-hidden="true">{celebration.badgeIcon}</span>
      <span class="text">Milestone reached: <strong>{celebration.badgeLabel}</strong></span>
    {/if}
  </button>
{/if}

<style>
  .celebration {
    position: fixed;
    bottom: 96px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1.1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    border-top: 3px solid var(--color-celebration);
    max-width: min(90vw, 480px);
    font-size: 0.9rem;
    color: var(--color-text);
    animation: pop 0.25s ease-out;
  }

  .celebration.no-motion {
    animation: none;
  }

  @keyframes pop {
    from {
      transform: translateX(-50%) scale(0.85);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) scale(1);
      opacity: 1;
    }
  }

  .bloom {
    font-size: 1.4rem;
    display: inline-block;
    animation: spin 0.6s ease-out;
  }

  .celebration.no-motion .bloom {
    animation: none;
  }

  @keyframes spin {
    from {
      transform: rotate(-20deg) scale(0.4);
    }
    to {
      transform: rotate(0deg) scale(1);
    }
  }

  .fact-icon,
  .badge-icon {
    font-size: 1.3rem;
    flex-shrink: 0;
  }

  .text {
    line-height: 1.35;
    text-align: left;
  }

  .text strong {
    color: var(--color-celebration);
  }
</style>
