<script lang="ts">
  import { plantsStore } from '../lib/stores/plants'
  import { getPlant } from '../lib/db/plants'
  import { logCareAction, addPestEntry, updatePestEntry } from '../lib/db/careLog'
  import CareLogEntry from '../lib/components/CareLogEntry.svelte'
  import ImageGallery from '../lib/components/ImageGallery.svelte'
  import { CARE_TYPE_LABELS, CARE_TYPE_ICONS, CARE_TYPES } from '../lib/types/plant'
  import type { CareType, Plant } from '../lib/types/plant'
  import { getTaskStatus } from '../lib/utils/schedule'
  import { formatDate, toISODate } from '../lib/utils/dates'

  let { plantId, onEdit, onBack } = $props()

  let plant = $state<Plant | null>(null)
  let showPestForm = $state(false)
  let pestForm = $state({
    pest: '',
    severity: 'mild' as 'mild' | 'moderate' | 'severe',
    treatment: '',
    notes: '',
  })

  $effect(() => {
    const load = async () => {
      plant = (await getPlant(plantId)) ?? null
    }
    load()
  })

  function getCareStatus(careType: CareType) {
    if (!plant) return null
    return getTaskStatus(plant, careType)
  }

  async function handleLogAction(careType: CareType) {
    if (!plant) return
    await logCareAction(plant.id, careType)
    plant = (await getPlant(plantId)) ?? null
    await plantsStore.reload()
  }

  async function handleAddPest() {
    if (!plant || !pestForm.pest) return
    await addPestEntry(plant.id, {
      date: toISODate(new Date()),
      pest: pestForm.pest,
      severity: pestForm.severity,
      treatment: pestForm.treatment || undefined,
      notes: pestForm.notes || undefined,
      resolved: false,
    })
    plant = (await getPlant(plantId)) ?? null
    await plantsStore.reload()
    showPestForm = false
    pestForm = { pest: '', severity: 'mild', treatment: '', notes: '' }
  }

  async function handleResolvePest(index: number) {
    if (!plant) return
    await updatePestEntry(plant.id, index, {
      resolved: true,
      resolvedDate: toISODate(new Date()),
    })
    plant = (await getPlant(plantId)) ?? null
    await plantsStore.reload()
  }

  function handleExport() {
    if (!plant) return
    const blob = new Blob([JSON.stringify(plant, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${plant.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  let heroImage = $derived(plant?.images?.find((i) => i.type === 'url') || plant?.images?.[0])
  let healthLog = $derived([...(plant?.healthLog || [])].reverse())
</script>

{#if plant}
  <div class="plant-detail">
    <header class="detail-header">
      <button class="back-btn" onclick={onBack}>← Back</button>
      <div class="header-actions">
        <button class="icon-btn" onclick={() => onEdit(plant!.id)} aria-label="Edit">✏️</button>
        <button class="icon-btn" onclick={handleExport} aria-label="Export">📥</button>
      </div>
    </header>

    <div class="hero">
      {#if heroImage}
        <img src={heroImage.value} alt={plant.name} />
      {:else}
        <div class="hero-placeholder">🌿</div>
      {/if}
    </div>

    <div class="detail-body">
      <h1 class="plant-name">{plant.name}</h1>
      {#if plant.nickname}
        <p class="plant-nickname">"{plant.nickname}"</p>
      {/if}
      {#if plant.species}
        <p class="plant-species">{plant.species}</p>
      {/if}

      <div class="info-chips">
        {#if plant.location}
          <span class="chip">📍 {plant.location}</span>
        {/if}
        {#if plant.environment?.light}
          <span class="chip">☀️ {plant.environment.light}</span>
        {/if}
        {#if plant.environment?.humidity}
          <span class="chip">💧 {plant.environment.humidity}</span>
        {/if}
        {#if plant.environment?.temperature}
          <span class="chip">🌡️ {plant.environment.temperature}</span>
        {/if}
      </div>

      <section class="section">
        <h2 class="section-heading">Care Schedule</h2>
        <div class="care-cards">
          {#each CARE_TYPES as ct}
            {@const status = getCareStatus(ct)}
            {@const entry = plant.careSchedule[ct]}
            {#if entry}
              <div
                class="care-card"
                class:overdue={status?.isOverdue}
                class:due-today={status?.daysUntilDue === 0 && !status?.isOverdue}
              >
                <div class="care-header">
                  <span class="care-icon">{CARE_TYPE_ICONS[ct]}</span>
                  <span class="care-type">{CARE_TYPE_LABELS[ct]}</span>
                </div>
                <div class="care-details">
                  <p class="care-freq">Every {entry.frequencyDays} days</p>
                  {#if entry.lastDone}
                    <p class="care-last">Last: {formatDate(entry.lastDone)}</p>
                  {/if}
                  {#if status}
                    {#if status.isOverdue}
                      <p class="care-due overdue">{Math.abs(status.daysUntilDue)}d overdue</p>
                    {:else if status.daysUntilDue === 0}
                      <p class="care-due today">Due today</p>
                    {:else}
                      <p class="care-due">In {status.daysUntilDue}d</p>
                    {/if}
                  {/if}
                </div>
                <button class="log-btn" onclick={() => handleLogAction(ct)}>
                  Log {CARE_TYPE_LABELS[ct].toLowerCase()}
                </button>
              </div>
            {/if}
          {/each}
        </div>
      </section>

      {#if plant.pestTracking && plant.pestTracking.length > 0}
        <section class="section">
          <h2 class="section-heading">Pest Tracking</h2>
          {#each plant.pestTracking as pest, i}
            <div class="pest-entry" class:unresolved={!pest.resolved}>
              <div class="pest-header">
                <span class="pest-name">🐛 {pest.pest}</span>
                {#if pest.severity}
                  <span class="pest-severity {pest.severity}">{pest.severity}</span>
                {/if}
              </div>
              <p class="pest-date">Noticed: {formatDate(pest.date)}</p>
              {#if pest.treatment}
                <p class="pest-treatment">Treatment: {pest.treatment}</p>
              {/if}
              {#if pest.notes}
                <p class="pest-notes">{pest.notes}</p>
              {/if}
              {#if pest.resolved}
                <p class="pest-resolved">
                  ✅ Resolved {#if pest.resolvedDate}on {formatDate(pest.resolvedDate)}{/if}
                </p>
              {:else}
                <button class="resolve-btn" onclick={() => handleResolvePest(i)}
                  >Mark Resolved</button
                >
              {/if}
            </div>
          {/each}
        </section>
      {/if}

      <button class="add-pest-btn" onclick={() => (showPestForm = !showPestForm)}>
        {showPestForm ? 'Cancel' : '+ Add Pest Entry'}
      </button>

      {#if showPestForm}
        <div class="pest-form">
          <input type="text" placeholder="Pest name" bind:value={pestForm.pest} />
          <select bind:value={pestForm.severity}>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
          <input type="text" placeholder="Treatment" bind:value={pestForm.treatment} />
          <input type="text" placeholder="Notes" bind:value={pestForm.notes} />
          <button class="btn-primary" onclick={handleAddPest} disabled={!pestForm.pest}>
            Save Pest Entry
          </button>
        </div>
      {/if}

      {#if healthLog.length > 0}
        <section class="section">
          <h2 class="section-heading">Health Log</h2>
          <div class="health-log">
            {#each healthLog as entry}
              <CareLogEntry {entry} />
            {/each}
          </div>
        </section>
      {/if}

      {#if plant.images && plant.images.length > 0}
        <section class="section">
          <h2 class="section-heading">Images</h2>
          <ImageGallery images={plant.images} />
        </section>
      {/if}

      {#if plant.notes}
        <section class="section">
          <h2 class="section-heading">Notes</h2>
          <p class="plant-notes">{plant.notes}</p>
        </section>
      {/if}
    </div>
  </div>
{:else}
  <div class="loading">Loading...</div>
{/if}

<style>
  .plant-detail {
    padding-bottom: 80px;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    position: sticky;
    top: 0;
    background: #f8f9fa;
    z-index: 10;
  }

  .back-btn {
    background: none;
    border: none;
    color: #2d6a4f;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.5rem;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .icon-btn {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.5rem;
    min-width: 44px;
    min-height: 44px;
  }

  .hero {
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: #e9ecef;
  }

  .hero img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hero-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5rem;
    background: linear-gradient(135deg, #74c69d, #2d6a4f);
  }

  .detail-body {
    padding: 1rem;
  }

  .plant-name {
    margin: 0;
    font-size: 1.75rem;
    color: #212529;
  }

  .plant-nickname {
    margin: 0.25rem 0;
    font-size: 1.1rem;
    color: #6c757d;
    font-style: italic;
  }

  .plant-species {
    margin: 0.125rem 0;
    font-size: 0.9rem;
    color: #6c757d;
  }

  .info-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.75rem 0;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.65rem;
    border-radius: 999px;
    background: #e9ecef;
    font-size: 0.8rem;
    color: #495057;
  }

  .section {
    margin-top: 1.5rem;
  }

  .section-heading {
    font-size: 1.1rem;
    font-weight: 600;
    color: #212529;
    margin: 0 0 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e9ecef;
  }

  .care-cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .care-card {
    background: #ffffff;
    border-radius: 12px;
    padding: 0.75rem;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    border-left: 4px solid #74c69d;
  }

  .care-card.overdue {
    border-left-color: #e63946;
  }

  .care-card.due-today {
    border-left-color: #2d6a4f;
  }

  .care-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .care-icon {
    font-size: 1.25rem;
  }

  .care-type {
    font-weight: 600;
    color: #212529;
  }

  .care-details {
    font-size: 0.85rem;
    color: #6c757d;
  }

  .care-details p {
    margin: 0.125rem 0;
  }

  .care-due.overdue {
    color: #e63946;
    font-weight: 600;
  }

  .care-due.today {
    color: #2d6a4f;
    font-weight: 600;
  }

  .log-btn {
    margin-top: 0.5rem;
    background: #2d6a4f;
    color: white;
    border: none;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .pest-entry {
    background: #ffffff;
    border-radius: 12px;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }

  .pest-entry.unresolved {
    border-left: 4px solid #e63946;
  }

  .pest-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pest-name {
    font-weight: 600;
    color: #212529;
  }

  .pest-severity {
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    text-transform: capitalize;
  }

  .pest-severity.mild {
    background: #d4edda;
    color: #155724;
  }

  .pest-severity.moderate {
    background: #fff3cd;
    color: #856404;
  }

  .pest-severity.severe {
    background: #f8d7da;
    color: #721c24;
  }

  .pest-date,
  .pest-treatment,
  .pest-notes {
    margin: 0.25rem 0;
    font-size: 0.85rem;
    color: #6c757d;
  }

  .pest-resolved {
    color: #2d6a4f;
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }

  .resolve-btn {
    margin-top: 0.5rem;
    background: #e9ecef;
    border: none;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    color: #495057;
  }

  .add-pest-btn {
    margin-top: 0.5rem;
    background: none;
    border: 1px dashed #ced4da;
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    color: #6c757d;
    width: 100%;
    font-size: 0.9rem;
  }

  .pest-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 12px;
  }

  .pest-form input,
  .pest-form select {
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .btn-primary {
    background: #2d6a4f;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .btn-primary:disabled {
    opacity: 0.6;
  }

  .health-log {
    padding: 0.5rem 0;
  }

  .plant-notes {
    font-size: 0.9rem;
    color: #495057;
    line-height: 1.5;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #6c757d;
  }
</style>
