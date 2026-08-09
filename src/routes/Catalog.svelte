<script lang="ts">
  import { plantsStore } from '../lib/stores/plants'
  import PlantCard from '../lib/components/PlantCard.svelte'
  import JsonImport from '../lib/components/JsonImport.svelte'
  import { getTaskStatus } from '../lib/utils/schedule'
  import type { CareType, Plant } from '../lib/types/plant'

  let { onSelectPlant } = $props()

  let searchQuery = $state('')
  let selectedType = $state('All')
  let sortBy = $state<'name' | 'nextTask' | 'recent'>('name')
  let showImport = $state(false)
  let plantTypes = $state<string[]>([])

  $effect(() => {
    const unsub = plantsStore.subscribe((plants) => {
      plantTypes = [...new Set(plants.map((p) => p.type))].sort()
    })
    return unsub
  })

  function earliestNextDue(plant: Plant, careTypes: CareType[]): number {
    let earliest = Infinity
    for (const ct of careTypes) {
      const status = getTaskStatus(plant, ct)
      if (status) {
        const time = status.nextDue.getTime()
        if (time < earliest) earliest = time
      }
    }
    return earliest
  }

  let filteredPlants = $derived(
    (() => {
      let result = $plantsStore

      if (selectedType !== 'All') {
        result = result.filter((p) => p.type === selectedType)
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.nickname?.toLowerCase().includes(q) ?? false) ||
            (p.species?.toLowerCase().includes(q) ?? false),
        )
      }

      const sorted = [...result]
      if (sortBy === 'name') {
        sorted.sort((a, b) => a.name.localeCompare(b.name))
      } else if (sortBy === 'recent') {
        sorted.sort((a, b) => (b.acquiredDate || '').localeCompare(a.acquiredDate || ''))
      } else if (sortBy === 'nextTask') {
        const careTypes: CareType[] = ['watering', 'fertilizing', 'repotting', 'pruning']
        sorted.sort((a, b) => {
          const aNext = earliestNextDue(a, careTypes)
          const bNext = earliestNextDue(b, careTypes)
          return aNext - bNext
        })
      }

      return sorted
    })(),
  )

  function toggleImport() {
    showImport = !showImport
  }
</script>

<div class="catalog">
  <header class="catalog-header">
    <h1>Plants</h1>
    <button class="fab" onclick={toggleImport} aria-label="Import plant">
      {showImport ? '✕' : '+'}
    </button>
  </header>

  {#if showImport}
    <JsonImport onImported={() => (showImport = false)} />
  {/if}

  <div class="search-bar">
    <input type="text" placeholder="Search plants..." bind:value={searchQuery} />
  </div>

  {#if plantTypes.length > 0}
    <div class="filter-chips">
      <button
        class="chip"
        class:active={selectedType === 'All'}
        onclick={() => (selectedType = 'All')}
      >
        All
      </button>
      {#each plantTypes as type}
        <button
          class="chip"
          class:active={selectedType === type}
          onclick={() => (selectedType = type)}
        >
          {type}
        </button>
      {/each}
    </div>
  {/if}

  <div class="sort-bar">
    <label for="sort">Sort by:</label>
    <select id="sort" bind:value={sortBy}>
      <option value="name">Name</option>
      <option value="nextTask">Next Task</option>
      <option value="recent">Recently Added</option>
    </select>
  </div>

  {#if filteredPlants.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🪴</div>
      {#if $plantsStore.length === 0}
        <p>No plants yet. Tap + to import your first plant.</p>
      {:else}
        <p>No plants match your search.</p>
      {/if}
    </div>
  {:else}
    <div class="plant-grid">
      {#each filteredPlants as plant (plant.id)}
        <PlantCard {plant} onSelect={onSelectPlant} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .catalog {
    padding: 1rem;
    padding-bottom: 80px;
  }

  .catalog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .catalog-header h1 {
    margin: 0;
    font-size: 1.75rem;
    color: #212529;
  }

  .fab {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: #2d6a4f;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(45, 106, 79, 0.3);
    transition: transform 0.15s;
  }

  .fab:active {
    transform: scale(0.95);
  }

  .search-bar {
    margin-bottom: 0.75rem;
  }

  .search-bar input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 12px;
    font-size: 1rem;
    background: #ffffff;
  }

  .filter-chips {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    -webkit-overflow-scrolling: touch;
  }

  .chip {
    flex-shrink: 0;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    border: 1px solid #ced4da;
    background: #ffffff;
    color: #495057;
    font-size: 0.85rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .chip.active {
    background: #2d6a4f;
    color: white;
    border-color: #2d6a4f;
  }

  .sort-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: #6c757d;
  }

  .sort-bar select {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 0.85rem;
    background: #ffffff;
  }

  .plant-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: #6c757d;
  }

  @media (min-width: 600px) {
    .plant-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
