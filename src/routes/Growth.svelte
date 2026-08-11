<script lang="ts">
  import { plantsStore } from '../lib/stores/plants'
  import { gardenStore } from '../lib/stores/garden'
  import { computeStreak } from '../lib/engagement/streaks'
  import { computeUnlockedBadges, BADGE_DEFINITIONS, type BadgeDefinition } from '../lib/engagement/badges'
  import { computeVitality, VITALITY_METADATA } from '../lib/engagement/vitality'

  let streak = $derived(computeStreak($plantsStore))

  $effect(() => {
    const unsubPlants = plantsStore.subscribe(async (plants) => {
      const state = await new Promise<import('../lib/types/plant').GardenState>((res) => {
        const unsubG = gardenStore.subscribe((g) => res(g))
        unsubG()
      })
      const out = computeUnlockedBadges(plants, state)
      if (out.newlyUnlocked.length > 0) {
        gardenStore.save({ ...state, unlockedBadges: out.unlocked })
      }
    })
    return unsubPlants
  })

  let unlockedMap = $derived.by(() => {
    const map = new Map<string, string>()
    for (const b of $gardenStore.unlockedBadges) map.set(b.id, b.unlockedAt)
    return map
  })

  let sortedBadges = $derived.by(() => {
    const list = [...BADGE_DEFINITIONS]
    list.sort((a: BadgeDefinition, b: BadgeDefinition) => {
      const au = unlockedMap.has(a.id) ? 1 : 0
      const bu = unlockedMap.has(b.id) ? 1 : 0
      return bu - au
    })
    return list
  })

  let stageCounts = $derived.by(() => {
    const counts = { seedling: 0, sprout: 0, thriving: 0, flourishing: 0 }
    for (const plant of $plantsStore) {
      const v = computeVitality(plant)
      counts[v.stage]++
    }
    return counts
  })
</script>

<div class="growth">
  <header>
    <h1>Growth</h1>
    <p class="subtitle">Your garden's story so far</p>
  </header>

  <section class="card stats-card" aria-label="Streaks">
    <h2>Care Streaks</h2>
    <div class="stat-grid">
      <div class="stat">
        <span class="stat-value">🔥 {streak.currentStreak}</span>
        <span class="stat-label">current days</span>
      </div>
      <div class="stat">
        <span class="stat-value">🏆 {streak.longestStreak}</span>
        <span class="stat-label">best streak</span>
      </div>
      <div class="stat">
        <span class="stat-value">🧊 {streak.graceTokensAvailable}</span>
        <span class="stat-label">grace tokens</span>
      </div>
    </div>
  </section>

  <section class="card" aria-label="Garden vitality">
    <h2>Garden Vitality</h2>
    {#if $plantsStore.length === 0}
      <p class="empty">Add your first plant to start growing.</p>
    {:else}
      <div class="stage-bars">
        {#each ['seedling', 'sprout', 'thriving', 'flourishing'] as stage}
          {@const meta = VITALITY_METADATA[stage as keyof typeof VITALITY_METADATA]}
          <div class="stage-bar">
            <span class="stage-icon">{meta.icon}</span>
            <div class="stage-track">
              <div
                class="stage-fill {meta.shapeClass}"
                style="width: {($plantsStore.length === 0 ? 0 : (stageCounts[stage as keyof typeof stageCounts] / $plantsStore.length) * 100).toFixed(0)}%"
              ></div>
            </div>
            <span class="stage-count">{stageCounts[stage as keyof typeof stageCounts]}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="card" aria-label="Badges">
    <h2>Badges</h2>
    {#if $plantsStore.length === 0}
      <p class="empty">Badges unlock as you care for plants.</p>
    {:else}
      <ul class="badge-list">
        {#each sortedBadges as badge (badge.id)}
          {@const unlockedAt = unlockedMap.get(badge.id)}
          <li class="badge" class:locked={!unlockedAt}>
            <span class="badge-icon" aria-hidden="true">{badge.icon}</span>
            <div class="badge-text">
              <span class="badge-label">{badge.label}</span>
              <span class="badge-desc">{badge.description}</span>
              {#if unlockedAt}
                <span class="badge-date">Unlocked {unlockedAt}</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .growth {
    padding: 1rem;
    padding-bottom: 80px;
  }

  header h1 {
    margin: 0 0 0.25rem;
    font-size: 1.75rem;
    color: #212529;
  }

  .subtitle {
    margin: 0 0 1rem;
    color: #6c757d;
    font-size: 0.9rem;
  }

  .card {
    background: #ffffff;
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }

  .card h2 {
    margin: 0 0 0.75rem;
    font-size: 1.05rem;
    color: #212529;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .stat {
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: #2d6a4f;
  }

  .stat-label {
    display: block;
    font-size: 0.7rem;
    color: #6c757d;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.15rem;
  }

  .empty {
    color: #6c757d;
    font-size: 0.9rem;
    margin: 0;
  }

  .stage-bars {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stage-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .stage-icon {
    font-size: 1.25rem;
    width: 28px;
    text-align: center;
    flex-shrink: 0;
  }

  .stage-track {
    flex: 1;
    height: 12px;
    background: #f1f3f5;
    border-radius: 999px;
    overflow: hidden;
  }

  .stage-fill {
    height: 100%;
    transition: width 0.3s;
  }

  .stage-fill.stage-seedling {
    background: #b7e4c7;
  }

  .stage-fill.stage-sprout {
    background: #74c69d;
  }

  .stage-fill.stage-thriving {
    background: #2d6a4f;
  }

  .stage-fill.stage-flourishing {
    background: #b565a7;
  }

  .stage-count {
    font-size: 0.9rem;
    font-weight: 700;
    color: #212529;
    width: 24px;
    text-align: right;
  }

  .badge-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .badge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    background: #f8f9fa;
    border-radius: 10px;
    border-left: 4px solid #b565a7;
  }

  .badge.locked {
    opacity: 0.55;
    border-left-color: #adb5bd;
  }

  .badge-icon {
    font-size: 1.6rem;
    flex-shrink: 0;
  }

  .badge.locked .badge-icon {
    filter: grayscale(1);
  }

  .badge-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .badge-label {
    font-weight: 600;
    color: #212529;
    font-size: 0.95rem;
  }

  .badge-desc {
    font-size: 0.8rem;
    color: #6c757d;
  }

  .badge-date {
    font-size: 0.7rem;
    color: #b565a7;
    margin-top: 0.15rem;
  }
</style>
