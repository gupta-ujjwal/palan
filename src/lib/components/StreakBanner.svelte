<script lang="ts">
  import { computeStreak, type StreakResult } from '../engagement/streaks'
  import { plantsStore } from '../stores/plants'

  let streak = $state<StreakResult | null>(null)

  $effect(() => {
    const unsub = plantsStore.subscribe((plants) => {
      streak = computeStreak(plants)
    })
    return unsub
  })

  let hasHistory = $derived((streak?.days.length ?? 0) > 0)
</script>

{#if streak && $plantsStore.length > 0}
  <section class="streak-banner" aria-label="Care streak">
    <div class="streak-row">
      <div class="flame" aria-hidden="true">
        <span class="flame-icon" class:lit={streak.currentStreak > 0}>🔥</span>
      </div>
      <div class="streak-text">
        {#if hasHistory}
          <div class="current">
            <span class="count">{streak.currentStreak}</span>
            <span class="label">day{streak.currentStreak === 1 ? '' : 's'} streak</span>
          </div>
          {#if streak.longestStreak > streak.currentStreak}
            <span class="record">best {streak.longestStreak}</span>
          {/if}
        {:else}
          <div class="current idle">
            <span class="label">Complete today's care to start a streak</span>
          </div>
        {/if}
      </div>
      <div class="grace-pill" title="Streak freeze: one missed day per 7 days won't break your streak">
        <span class="grace-icon" aria-hidden="true">🧊</span>
        <span class="grace-count">{streak.graceTokensAvailable}</span>
      </div>
    </div>
  </section>
{/if}

<style>
  .streak-banner {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.65rem 0.85rem;
    box-shadow: var(--shadow);
    margin-bottom: 1rem;
  }

  .streak-row {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .flame {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--color-streak-light), var(--color-streak));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .flame-icon {
    font-size: 1.5rem;
    filter: grayscale(1) opacity(0.7);
    transition: filter 0.2s;
  }

  .flame-icon.lit {
    filter: none;
  }

  .streak-text {
    flex: 1;
    min-width: 0;
  }

  .current {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }

  .current .count {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-streak);
    line-height: 1;
  }

  .current .label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .current.idle .label {
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .record {
    display: inline-block;
    font-size: 0.7rem;
    color: var(--color-text-muted);
    margin-top: 0.1rem;
  }

  .grace-pill {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    background: var(--color-grace);
    color: #ffffff;
    font-weight: 700;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .grace-icon {
    font-size: 0.9rem;
  }

  @media (prefers-color-scheme: dark) {
    .grace-pill {
      color: #103c3a;
    }
  }
</style>
