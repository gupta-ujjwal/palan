<script lang="ts">
  import {
    validatePlant,
    normalizePlant,
    parseJSON,
    isDuplicatePlant,
    type ValidationResult,
  } from '../utils/jsonImporter'
  import { plantsStore } from '../stores/plants'
  import { samplePlants } from '../data/samplePlants'
  import { plantJsonSchema } from '../data/plantSchema'
  import type { Plant } from '../types/plant'

  let { onImported } = $props()

  let fileInput: HTMLInputElement
  let results: { fileName: string; validation: ValidationResult; plant: Plant | null }[] = $state(
    [],
  )
  let error: string | null = $state(null)
  let importing = $state(false)
  let importSummary = $state<string | null>(null)

  function generateId(): string {
    if ('crypto' in window && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `plant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  async function handleFile(file: File) {
    error = null
    results = []
    importSummary = null

    const text = await file.text()
    const parsed = parseJSON(text)

    if (!parsed.success) {
      error = `Failed to parse ${file.name}: ${parsed.error}`
      return
    }

    const data = parsed.data
    const items: unknown[] = Array.isArray(data) ? data : [data]

    if (Array.isArray(data) && data.length === 0) {
      error = `${file.name} contains an empty array`
      return
    }

    await plantsStore.load()
    let existing: Plant[] = []
    plantsStore.subscribe((value) => {
      existing = value
    })()

    for (const item of items) {
      const validation = validatePlant(item)
      let plant: Plant | null = null

      if (validation.errors.length === 0) {
        plant = normalizePlant(item, generateId)
        if (isDuplicatePlant(existing, plant)) {
          validation.warnings.push(
            'Duplicate: a plant with the same name and species already exists',
          )
        }
      }

      results.push({ fileName: file.name, validation, plant })
    }
  }

  async function handleImportAll() {
    importing = true
    let imported = 0
    let skipped = 0

    try {
      for (const r of results) {
        if (r.plant) {
          await plantsStore.add(r.plant)
          imported++
        } else {
          skipped++
        }
      }
      importSummary = `Imported ${imported} plant${imported !== 1 ? 's' : ''}${
        skipped > 0 ? `, skipped ${skipped} with errors` : ''
      }`
      results = []
      if (fileInput) fileInput.value = ''
      onImported?.()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to import plants'
    } finally {
      importing = false
    }
  }

  async function handleImportOne(index: number) {
    const r = results[index]
    if (!r || !r.plant) return

    try {
      await plantsStore.add(r.plant)
      results = results.filter((_, i) => i !== index)
      if (results.length === 0) {
        if (fileInput) fileInput.value = ''
        onImported?.()
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to import plant'
    }
  }

  async function handleLoadSamples() {
    error = null
    results = []
    importSummary = null

    await plantsStore.load()
    let existing: Plant[] = []
    plantsStore.subscribe((value) => {
      existing = value
    })()

    for (const item of samplePlants) {
      const validation = validatePlant(item)
      const plant = normalizePlant(item, generateId)
      if (isDuplicatePlant(existing, plant)) {
        validation.warnings.push('Duplicate: a plant with the same name and species already exists')
      }
      results.push({ fileName: 'sample-plants.json', validation, plant })
    }
  }

  function handleDownloadSchema() {
    const blob = new Blob([JSON.stringify(plantJsonSchema, null, 2)], {
      type: 'application/schema+json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plant-schema.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDismiss() {
    results = []
    error = null
    importSummary = null
    if (fileInput) fileInput.value = ''
  }

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      handleFile(input.files[0])
    }
  }

  let validCount = $derived(results.filter((r) => r.plant !== null).length)
  let errorCount = $derived(results.filter((r) => r.plant === null).length)
</script>

<div class="json-import">
  <div class="import-actions">
    <input
      bind:this={fileInput}
      type="file"
      accept=".json,application/json"
      onchange={onFileChange}
      class="file-input"
    />
    <div class="quick-actions">
      <button class="btn-outline" onclick={handleLoadSamples}> 🌱 Load Sample Plants </button>
      <button class="btn-outline" onclick={handleDownloadSchema}> 📋 Download Schema </button>
    </div>
  </div>

  {#if error}
    <div class="alert alert-error">
      <p>{error}</p>
      <button class="btn-link" onclick={handleDismiss}>Dismiss</button>
    </div>
  {/if}

  {#if importSummary}
    <div class="alert alert-success">
      <p>{importSummary}</p>
    </div>
  {/if}

  {#if results.length > 0}
    <div class="alert alert-info">
      <div class="results-header">
        <h4>{results.length} plant{results.length !== 1 ? 's' : ''} found</h4>
        <div class="result-counts">
          <span class="count-valid">{validCount} valid</span>
          {#if errorCount > 0}
            <span class="count-error">{errorCount} with errors</span>
          {/if}
        </div>
      </div>

      <div class="plant-results">
        {#each results as r, i}
          <div class="plant-result" class:has-errors={r.plant === null}>
            <div class="plant-result-header">
              <span class="plant-result-name">{r.plant?.name || 'Invalid plant'}</span>
              {#if r.plant}
                <span class="badge badge-valid">Valid</span>
              {:else}
                <span class="badge badge-error"
                  >{r.validation.errors.length} error{r.validation.errors.length !== 1
                    ? 's'
                    : ''}</span
                >
              {/if}
            </div>

            {#if r.validation.warnings.length > 0}
              <ul class="warnings">
                {#each r.validation.warnings as warn}
                  <li>{warn}</li>
                {/each}
              </ul>
            {/if}

            {#if r.validation.errors.length > 0}
              <ul class="errors">
                {#each r.validation.errors as err}
                  <li>{err}</li>
                {/each}
              </ul>
            {/if}

            {#if r.validation.unknownFields.length > 0}
              <p class="unknown-fields">
                Unknown fields preserved: {r.validation.unknownFields.join(', ')}
              </p>
            {/if}

            {#if r.plant}
              <button class="btn-small" onclick={() => handleImportOne(i)}>Import this plant</button
              >
            {/if}
          </div>
        {/each}
      </div>

      {#if validCount > 0}
        <div class="alert-actions">
          <button class="btn-primary" onclick={handleImportAll} disabled={importing}>
            {importing
              ? 'Importing...'
              : `Import ${validCount} Plant${validCount !== 1 ? 's' : ''}`}
          </button>
          <button class="btn-secondary" onclick={handleDismiss}>Cancel</button>
        </div>
      {:else}
        <button class="btn-secondary" onclick={handleDismiss}>Dismiss</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .json-import {
    width: 100%;
  }

  .import-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px dashed #ced4da;
    border-radius: 12px;
    background: #f8f9fa;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .quick-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-outline {
    flex: 1;
    background: transparent;
    border: 1px solid #2d6a4f;
    color: #2d6a4f;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .btn-outline:active {
    background: #f0f7f4;
  }

  .alert {
    margin-top: 0.75rem;
    padding: 1rem;
    border-radius: 12px;
  }

  .alert-error {
    background: #fde8e8;
    border: 1px solid #e63946;
  }

  .alert-success {
    background: #d4edda;
    border: 1px solid #2d6a4f;
  }

  .alert-info {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
  }

  .alert h4 {
    margin: 0;
    font-size: 1rem;
    color: #212529;
  }

  .btn-link {
    background: none;
    border: none;
    color: #e63946;
    cursor: pointer;
    font-size: 0.85rem;
    text-decoration: underline;
    margin-top: 0.5rem;
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .result-counts {
    display: flex;
    gap: 0.75rem;
    font-size: 0.8rem;
  }

  .count-valid {
    color: #2d6a4f;
    font-weight: 600;
  }

  .count-error {
    color: #e63946;
    font-weight: 600;
  }

  .plant-results {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .plant-result {
    background: #ffffff;
    border-radius: 8px;
    padding: 0.75rem;
    border: 1px solid #e9ecef;
  }

  .plant-result.has-errors {
    border-color: #f4a261;
    background: #fffaf5;
  }

  .plant-result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .plant-result-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: #212529;
  }

  .badge {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    font-weight: 600;
  }

  .badge-valid {
    background: #d4edda;
    color: #155724;
  }

  .badge-error {
    background: #fde8e8;
    color: #721c24;
  }

  .warnings,
  .errors {
    margin: 0.25rem 0 0;
    padding-left: 1.25rem;
    font-size: 0.8rem;
  }

  .warnings li {
    color: #f4a261;
  }

  .errors li {
    color: #e63946;
  }

  .unknown-fields {
    font-size: 0.75rem;
    color: #6c757d;
    margin: 0.25rem 0 0;
  }

  .btn-small {
    margin-top: 0.5rem;
    background: #2d6a4f;
    color: white;
    border: none;
    padding: 0.3rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .alert-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .btn-primary {
    background: #2d6a4f;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #e9ecef;
    color: #495057;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
  }
</style>
