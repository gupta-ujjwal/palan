<script lang="ts">
  import { dueTasks, overdueTasks, todayTasks, upcomingTasks, taskStats } from '../lib/stores/tasks'
  import { plantsStore } from '../lib/stores/plants'
  import { getUnresolvedPests, logCareAction } from '../lib/db/careLog'
  import TaskItem from '../lib/components/TaskItem.svelte'
  import PestAlert from '../lib/components/PestAlert.svelte'
  import { today as todayDate, formatDate } from '../lib/utils/dates'
  import type { CareTask } from '../lib/types/plant'

  let { onSelectPlant, onNavigate } = $props()

  let pestInfo = $state<{ count: number; plantNames: string[] }>({ count: 0, plantNames: [] })

  let todayStr = $derived(formatDate(todayDate().toISOString()))

  $effect(() => {
    const unsub = plantsStore.subscribe(async (plants) => {
      const unresolved = await getUnresolvedPests(plants)
      pestInfo = {
        count: unresolved.length,
        plantNames: [...new Set(unresolved.map((u) => u.plantName))],
      }
    })
    return unsub
  })

  async function handleDone(task: CareTask) {
    await logCareAction(task.plantId, task.careType)
    await plantsStore.reload()
  }

  function handlePestView() {
    onNavigate('plants')
  }
</script>

<div class="dashboard">
  <header class="dash-header">
    <div class="brand">
      <img src="/plants/favicon.svg" alt="Palan" class="brand-logo" />
      <h1>Today</h1>
    </div>
    <p class="date">{todayStr}</p>
    <div class="stats">
      <div class="stat">
        <span class="stat-value">{$taskStats.totalPlants}</span>
        <span class="stat-label">Plants</span>
      </div>
      <div class="stat">
        <span class="stat-value">{$taskStats.tasksToday}</span>
        <span class="stat-label">Today</span>
      </div>
      <div class="stat stat-overdue">
        <span class="stat-value">{$taskStats.tasksOverdue}</span>
        <span class="stat-label">Overdue</span>
      </div>
    </div>
  </header>

  {#if pestInfo.count > 0}
    <PestAlert count={pestInfo.count} plantNames={pestInfo.plantNames} onView={handlePestView} />
  {/if}

  {#if $taskStats.totalPlants === 0}
    <div class="empty-state">
      <div class="empty-icon">🌱</div>
      <h2>Get Started</h2>
      <p>Add a plant to begin tracking its care.</p>
      <button class="btn-primary" onclick={() => onNavigate('plants')}>
        Import Your First Plant
      </button>
    </div>
  {:else if $dueTasks.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🎉</div>
      <h2>All Caught Up!</h2>
      <p>Your plants are happy. No tasks today.</p>
    </div>
  {:else}
    {#if $overdueTasks.length > 0}
      <section class="task-section overdue-section">
        <h2 class="section-title overdue">Overdue</h2>
        {#each $overdueTasks as task (task.plantId + task.careType)}
          <div class="task-wrapper">
            <button class="plant-link" onclick={() => onSelectPlant(task.plantId)}>
              <TaskItem {task} onDone={handleDone} />
            </button>
          </div>
        {/each}
      </section>
    {/if}

    {#if $todayTasks.length > 0}
      <section class="task-section today-section">
        <h2 class="section-title today">Today</h2>
        {#each $todayTasks as task (task.plantId + task.careType)}
          <div class="task-wrapper">
            <button class="plant-link" onclick={() => onSelectPlant(task.plantId)}>
              <TaskItem {task} onDone={handleDone} />
            </button>
          </div>
        {/each}
      </section>
    {/if}

    {#if $upcomingTasks.length > 0}
      <section class="task-section upcoming-section">
        <h2 class="section-title upcoming">Upcoming</h2>
        {#each $upcomingTasks as task (task.plantId + task.careType)}
          <div class="task-wrapper">
            <button class="plant-link" onclick={() => onSelectPlant(task.plantId)}>
              <TaskItem {task} onDone={handleDone} />
            </button>
          </div>
        {/each}
      </section>
    {/if}
  {/if}
</div>

<style>
  .dashboard {
    padding: 1rem;
    padding-bottom: 80px;
  }

  .dash-header {
    margin-bottom: 1rem;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .brand-logo {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }

  .dash-header h1 {
    margin: 0;
    font-size: 1.75rem;
    color: #212529;
  }

  .date {
    margin: 0.25rem 0;
    color: #6c757d;
    font-size: 0.9rem;
  }

  .stats {
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem 1rem;
    background: #f8f9fa;
    border-radius: 12px;
    min-width: 72px;
  }

  .stat-overdue {
    background: #fde8e8;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #212529;
  }

  .stat-overdue .stat-value {
    color: #e63946;
  }

  .stat-label {
    font-size: 0.7rem;
    color: #6c757d;
    text-transform: uppercase;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .empty-state h2 {
    margin: 0.5rem 0;
    color: #212529;
  }

  .empty-state p {
    color: #6c757d;
    margin-bottom: 1rem;
  }

  .btn-primary {
    background: #2d6a4f;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
  }

  .task-section {
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
    padding-left: 0.25rem;
  }

  .section-title.overdue {
    color: #e63946;
  }

  .section-title.today {
    color: #2d6a4f;
  }

  .section-title.upcoming {
    color: #6c757d;
  }

  .task-wrapper {
    margin-bottom: 0.5rem;
  }

  .plant-link {
    display: block;
    width: 100%;
    border: none;
    background: none;
    padding: 0;
    text-align: left;
    cursor: pointer;
  }

  .upcoming-section {
    opacity: 0.75;
  }
</style>
