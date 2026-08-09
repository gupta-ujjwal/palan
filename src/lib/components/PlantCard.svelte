<script lang="ts">
  import type { Plant } from '../types/plant'
  import { CARE_TYPE_LABELS } from '../types/plant'
  import { getTaskStatus } from '../utils/schedule'
  import { formatDate } from '../utils/dates'

  let { plant, onSelect }: { plant: Plant; onSelect: (id: string) => void } = $props()

  let nextTask = $derived(
    (() => {
      const types = ['watering', 'fertilizing', 'repotting', 'pruning'] as const
      let earliest: { careType: string; nextDue: Date; isOverdue: boolean } | null = null
      for (const ct of types) {
        const status = getTaskStatus(plant, ct)
        if (!status) continue
        if (!earliest || status.nextDue < earliest.nextDue) {
          earliest = { careType: ct, nextDue: status.nextDue, isOverdue: status.isOverdue }
        }
      }
      return earliest
    })(),
  )

  let thumbnail = $derived(plant.images?.find((i) => i.type === 'url') || plant.images?.[0])
</script>

<button class="plant-card" onclick={() => onSelect(plant.id)}>
  <div class="card-image">
    {#if thumbnail}
      <img src={thumbnail.value} alt={plant.name} loading="lazy" />
    {:else}
      <div class="placeholder">🌿</div>
    {/if}
  </div>
  <div class="card-body">
    <h3 class="plant-name">{plant.name}</h3>
    {#if plant.nickname}
      <p class="plant-nickname">{plant.nickname}</p>
    {/if}
    {#if nextTask}
      <span class="task-badge" class:overdue={nextTask.isOverdue}>
        {CARE_TYPE_LABELS[nextTask.careType as keyof typeof CARE_TYPE_LABELS]}
      </span>
    {/if}
  </div>
</button>

<style>
  .plant-card {
    display: flex;
    flex-direction: column;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    border: none;
    text-align: left;
    padding: 0;
    transition:
      transform 0.15s,
      box-shadow 0.15s;
  }

  .plant-card:active {
    transform: scale(0.98);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .card-image {
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    background: #e9ecef;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    background: linear-gradient(135deg, #74c69d, #2d6a4f);
  }

  .card-body {
    padding: 0.75rem;
  }

  .plant-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #212529;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .plant-nickname {
    margin: 0.125rem 0;
    font-size: 0.8rem;
    color: #6c757d;
  }

  .task-badge {
    display: inline-block;
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: #74c69d;
    color: #ffffff;
    margin-top: 0.25rem;
  }

  .task-badge.overdue {
    background: #e63946;
  }
</style>
