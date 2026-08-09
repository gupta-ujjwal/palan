<script lang="ts">
  import {
    validatePlant,
    normalizePlant,
    parseJSON,
    isDuplicatePlant,
    type ValidationResult,
  } from '../utils/jsonImporter'
  import { plantsStore } from '../stores/plants'
  import type { Plant } from '../types/plant'

  let { onImported } = $props()

  let fileInput: HTMLInputElement
  let result: { fileName: string; validation: ValidationResult; raw: unknown } | null = $state(null)
  let error: string | null = $state(null)
  let isDuplicate = $state(false)
  let importing = $state(false)

  function generateId(): string {
    if ('crypto' in window && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `plant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  async function handleFile(file: File) {
    error = null
    result = null
    isDuplicate = false

    const text = await file.text()
    const parsed = parseJSON(text)

    if (!parsed.success) {
      error = `Failed to parse ${file.name}: ${parsed.error}`
      return
    }

    const validation = validatePlant(parsed.data)

    if (!validation.valid && validation.errors.length > 0) {
      result = { fileName: file.name, validation, raw: parsed.data }
      return
    }

    const plant = normalizePlant(parsed.data, generateId)
    const existing = await plantsStore.load().then(() => {
      let plants: Plant[] = []
      plantsStore.subscribe((value) => {
        plants = value
      })()
      return plants
    })

    isDuplicate = isDuplicatePlant(existing, plant)
    result = { fileName: file.name, validation, raw: parsed.data }
    ;(result as any)._plant = plant
  }

  async function handleImport() {
    if (!result) return
    importing = true

    try {
      const plant = (result as any)._plant
      if (plant) {
        await plantsStore.add(plant)
        onImported?.(plant)
      }
      result = null
      isDuplicate = false
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to import plant'
    } finally {
      importing = false
    }
  }

  function handleDismiss() {
    result = null
    error = null
    isDuplicate = false
    if (fileInput) fileInput.value = ''
  }

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      handleFile(input.files[0])
    }
  }
</script>

<div class="json-import">
  <input
    bind:this={fileInput}
    type="file"
    accept=".json,application/json"
    onchange={onFileChange}
    class="file-input"
  />

  {#if error}
    <div class="alert alert-error">
      <p>{error}</p>
      <button onclick={handleDismiss}>Dismiss</button>
    </div>
  {/if}

  {#if result}
    <div class="alert alert-info">
      <h4>{result.fileName}</h4>

      {#if result.validation.errors.length > 0}
        <div class="validation-section">
          <p class="section-title">Errors:</p>
          <ul>
            {#each result.validation.errors as err}
              <li class="error-item">{err}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if result.validation.warnings.length > 0}
        <div class="validation-section">
          <p class="section-title">Warnings:</p>
          <ul>
            {#each result.validation.warnings as warn}
              <li class="warn-item">{warn}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if result.validation.unknownFields.length > 0}
        <div class="validation-section">
          <p class="section-title">Unknown fields (will be preserved in metadata):</p>
          <ul>
            {#each result.validation.unknownFields as field}
              <li class="info-item">{field}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if isDuplicate}
        <p class="duplicate-warning">⚠️ A plant with the same name and species already exists.</p>
      {/if}

      <div class="alert-actions">
        {#if result.validation.errors.length === 0}
          <button class="btn-primary" onclick={handleImport} disabled={importing}>
            {importing ? 'Importing...' : 'Import Plant'}
          </button>
        {:else}
          <button class="btn-secondary" onclick={handleImport} disabled={importing}>
            Import Anyway (fill defaults)
          </button>
        {/if}
        <button class="btn-secondary" onclick={handleDismiss}>Skip</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .json-import {
    width: 100%;
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

  .alert {
    margin-top: 0.75rem;
    padding: 1rem;
    border-radius: 12px;
  }

  .alert-error {
    background: #fde8e8;
    border: 1px solid #e63946;
  }

  .alert-info {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
  }

  .alert h4 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: #212529;
  }

  .validation-section {
    margin-top: 0.5rem;
  }

  .section-title {
    font-weight: 600;
    font-size: 0.85rem;
    margin: 0.25rem 0;
    color: #495057;
  }

  .validation-section ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  .error-item {
    color: #e63946;
    font-size: 0.85rem;
  }

  .warn-item {
    color: #f4a261;
    font-size: 0.85rem;
  }

  .info-item {
    color: #6c757d;
    font-size: 0.85rem;
  }

  .duplicate-warning {
    color: #f4a261;
    font-size: 0.85rem;
    margin-top: 0.5rem;
    font-weight: 500;
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
