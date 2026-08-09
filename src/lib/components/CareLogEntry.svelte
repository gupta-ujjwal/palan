<script lang="ts">
  import type { HealthLogEntry } from '../types/plant'
  import { CARE_TYPE_ICONS, CARE_TYPE_LABELS } from '../types/plant'
  import { formatDate } from '../utils/dates'

  let { entry }: { entry: HealthLogEntry } = $props()
</script>

<div class="log-entry">
  <div class="log-icon">{CARE_TYPE_ICONS[entry.action]}</div>
  <div class="log-content">
    <div class="log-header">
      <span class="log-action">{CARE_TYPE_LABELS[entry.action]}</span>
      <span class="log-date">{formatDate(entry.date)}</span>
    </div>
    {#if entry.note}
      <p class="log-note">{entry.note}</p>
    {/if}
  </div>
</div>

<style>
  .log-entry {
    display: flex;
    gap: 0.75rem;
    padding: 0.5rem 0;
    position: relative;
  }

  .log-entry:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 1rem;
    top: 2.5rem;
    bottom: -0.5rem;
    width: 2px;
    background: #e9ecef;
  }

  .log-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: #f8f9fa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
    z-index: 1;
    border: 2px solid #e9ecef;
  }

  .log-content {
    flex: 1;
    padding-top: 0.125rem;
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .log-action {
    font-weight: 600;
    font-size: 0.9rem;
    color: #212529;
  }

  .log-date {
    font-size: 0.8rem;
    color: #6c757d;
  }

  .log-note {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: #6c757d;
  }
</style>
