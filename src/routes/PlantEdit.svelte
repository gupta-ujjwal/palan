<script lang="ts">
  import { plantsStore } from '../lib/stores/plants'
  import { getPlant } from '../lib/db/plants'
  import { CARE_TYPES, CARE_TYPE_LABELS } from '../lib/types/plant'
  import type { Plant, CareType } from '../lib/types/plant'

  let { plantId, onBack } = $props()

  let plant = $state<Plant | null>(null)
  let formData = $state<Plant | null>(null)

  $effect(() => {
    const load = async () => {
      plant = (await getPlant(plantId)) ?? null
      formData = plant ? structuredClone(plant) : null
    }
    load()
  })

  async function handleSave() {
    if (!formData) return
    await plantsStore.save(formData)
    onBack()
  }

  function handleCancel() {
    onBack()
  }

  function updateCareField(careType: CareType, field: string, value: string | number) {
    if (!formData) return
    const entry = formData.careSchedule[careType]
    if (entry) {
      ;(entry as unknown as Record<string, unknown>)[field] = value
    }
  }

  function updateField(field: keyof Plant, value: string) {
    if (!formData) return
    ;(formData as unknown as Record<string, unknown>)[field] = value || undefined
  }
</script>

{#if formData}
  <div class="plant-edit">
    <header class="edit-header">
      <button class="back-btn" onclick={handleCancel}>← Cancel</button>
      <h1>Edit Plant</h1>
      <button class="save-btn" onclick={handleSave}>Save</button>
    </header>

    <div class="edit-body">
      <section class="form-section">
        <h2>Basic Info</h2>
        <label>
          Name*
          <input
            type="text"
            value={formData.name}
            oninput={(e) => updateField('name', e.currentTarget.value)}
          />
        </label>
        <label>
          Nickname
          <input
            type="text"
            value={formData.nickname || ''}
            oninput={(e) => updateField('nickname', e.currentTarget.value)}
          />
        </label>
        <label>
          Species
          <input
            type="text"
            value={formData.species || ''}
            oninput={(e) => updateField('species', e.currentTarget.value)}
          />
        </label>
        <label>
          Type*
          <input
            type="text"
            value={formData.type}
            oninput={(e) => updateField('type', e.currentTarget.value)}
          />
        </label>
        <label>
          Acquired Date
          <input
            type="date"
            value={formData.acquiredDate || ''}
            oninput={(e) => updateField('acquiredDate', e.currentTarget.value)}
          />
        </label>
        <label>
          Location
          <input
            type="text"
            value={formData.location || ''}
            oninput={(e) => updateField('location', e.currentTarget.value)}
          />
        </label>
      </section>

      <section class="form-section">
        <h2>Care Schedule</h2>
        {#each CARE_TYPES as ct}
          {@const entry = formData.careSchedule[ct]}
          {#if entry}
            <div class="care-edit">
              <h3>{CARE_TYPE_LABELS[ct]}</h3>
              <label>
                Frequency (days)
                <input
                  type="number"
                  min="1"
                  value={entry.frequencyDays}
                  oninput={(e) =>
                    updateCareField(ct, 'frequencyDays', parseInt(e.currentTarget.value) || 0)}
                />
              </label>
              <label>
                Last Done
                <input
                  type="date"
                  value={entry.lastDone || ''}
                  oninput={(e) => updateCareField(ct, 'lastDone', e.currentTarget.value)}
                />
              </label>
              {#if 'notes' in entry}
                <label>
                  Notes
                  <input
                    type="text"
                    value={entry.notes || ''}
                    oninput={(e) => updateCareField(ct, 'notes', e.currentTarget.value)}
                  />
                </label>
              {/if}
            </div>
          {/if}
        {/each}
      </section>

      <section class="form-section">
        <h2>Environment</h2>
        <label>
          Light
          <input
            type="text"
            value={formData.environment?.light || ''}
            oninput={(e) => {
              if (formData) {
                if (!formData.environment) formData.environment = {}
                formData.environment.light = e.currentTarget.value
              }
            }}
          />
        </label>
        <label>
          Humidity
          <input
            type="text"
            value={formData.environment?.humidity || ''}
            oninput={(e) => {
              if (formData) {
                if (!formData.environment) formData.environment = {}
                formData.environment.humidity = e.currentTarget.value
              }
            }}
          />
        </label>
        <label>
          Temperature
          <input
            type="text"
            value={formData.environment?.temperature || ''}
            oninput={(e) => {
              if (formData) {
                if (!formData.environment) formData.environment = {}
                formData.environment.temperature = e.currentTarget.value
              }
            }}
          />
        </label>
        <label>
          Pruning Style
          <input
            type="text"
            value={formData.environment?.pruningStyle || ''}
            oninput={(e) => {
              if (formData) {
                if (!formData.environment) formData.environment = {}
                formData.environment.pruningStyle = e.currentTarget.value
              }
            }}
          />
        </label>
        <label>
          Environment Notes
          <textarea
            oninput={(e) => {
              if (formData) {
                if (!formData.environment) formData.environment = {}
                formData.environment.notes = e.currentTarget.value
              }
            }}>{formData.environment?.notes || ''}</textarea
          >
        </label>
      </section>

      <section class="form-section">
        <h2>Notes</h2>
        <textarea
          class="notes-area"
          value={formData.notes || ''}
          oninput={(e) => updateField('notes', e.currentTarget.value)}
        ></textarea>
      </section>
    </div>
  </div>
{:else}
  <div class="loading">Loading...</div>
{/if}

<style>
  .plant-edit {
    padding-bottom: 80px;
  }

  .edit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    position: sticky;
    top: 0;
    background: #f8f9fa;
    z-index: 10;
  }

  .edit-header h1 {
    font-size: 1.1rem;
    margin: 0;
    color: #212529;
  }

  .back-btn {
    background: none;
    border: none;
    color: #6c757d;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.5rem;
  }

  .save-btn {
    background: #2d6a4f;
    color: white;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .edit-body {
    padding: 1rem;
  }

  .form-section {
    margin-bottom: 1.5rem;
  }

  .form-section h2 {
    font-size: 1.1rem;
    color: #212529;
    margin: 0 0 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e9ecef;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
    color: #495057;
    font-weight: 500;
  }

  input,
  textarea {
    padding: 0.6rem;
    border: 1px solid #ced4da;
    border-radius: 8px;
    font-size: 1rem;
    background: #ffffff;
    color: #212529;
  }

  textarea {
    min-height: 80px;
    resize: vertical;
  }

  .care-edit {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .care-edit h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: #2d6a4f;
  }

  .notes-area {
    min-height: 100px;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #6c757d;
  }
</style>
