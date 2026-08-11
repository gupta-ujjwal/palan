<script lang="ts">
  import type { CareTask } from '../types/plant'
  import { CARE_TYPE_ICONS, CARE_TYPE_LABELS } from '../types/plant'

  let { task, onDone }: { task: CareTask; onDone: (task: CareTask) => void } = $props()
</script>

<div class="task-item" class:overdue={task.isOverdue}>
  <div class="task-thumbnail">
    {#if task.plantImage}
      <img src={task.plantImage.value} alt={task.plantName} loading="lazy" />
    {:else}
      <div class="placeholder">🌿</div>
    {/if}
  </div>
  <div class="task-info">
    <div class="task-top">
      <span class="task-icon">{CARE_TYPE_ICONS[task.careType]}</span>
      <span class="task-type">{CARE_TYPE_LABELS[task.careType]}</span>
    </div>
    <p class="task-plant">{task.plantNickname || task.plantName}</p>
    {#if task.isOverdue}
      <span class="task-due overdue"
        >{Math.abs(task.daysUntilDue)} day{Math.abs(task.daysUntilDue) > 1 ? 's' : ''} overdue</span
      >
    {:else if task.daysUntilDue === 0}
      <span class="task-due today">Due today</span>
    {:else}
      <span class="task-due">In {task.daysUntilDue} day{task.daysUntilDue > 1 ? 's' : ''}</span>
    {/if}
  </div>
  <button
    class="done-btn"
    onclick={(e) => {
      e.stopPropagation()
      onDone(task)
    }}
    aria-label="Mark done"
  >
    ✓
  </button>
</div>

<style>
  .task-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #ffffff;
    border-radius: 12px;
    padding: 0.75rem;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    border-left: 4px solid #74c69d;
  }

  .task-item.overdue {
    border-left-color: #e63946;
  }

  .task-thumbnail {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
    background: #e9ecef;
  }

  .task-thumbnail img {
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
    font-size: 1.5rem;
    background: linear-gradient(135deg, #74c69d, #2d6a4f);
  }

  .task-info {
    flex: 1;
    min-width: 0;
  }

  .task-top {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .task-icon {
    font-size: 1rem;
  }

  .task-type {
    font-size: 0.8rem;
    color: #6c757d;
    font-weight: 500;
  }

  .task-plant {
    margin: 0.125rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #212529;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .task-due {
    font-size: 0.75rem;
    color: #6c757d;
  }

  .task-due.overdue {
    color: #e63946;
    font-weight: 600;
  }

  .task-due.today {
    color: #2d6a4f;
    font-weight: 600;
  }

  .done-btn {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: #2d6a4f;
    color: white;
    font-size: 1.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.2s,
      transform 0.1s;
  }

  .done-btn:active {
    transform: scale(0.95);
    background: #74c69d;
  }
</style>
