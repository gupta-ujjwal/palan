# Plant Care MWeb App — Implementation Plan

**Date:** 2026-08-09  
**Spec:** docs/superpowers/specs/2026-08-09-plant-care-mweb-design.md  
**Approach:** Monolithic Svelte SPA

---

## Phase 1: Project Scaffold, Types & Database

### Task 1.1 — Scaffold Vite + Svelte + TS project

```bash
cd /home/vishal/juspay/Playground/plants
npm create vite@latest . -- --template svelte-ts
```

If prompted about non-empty directory, choose "Ignore files and continue".

### Task 1.2 — Install dependencies

```bash
npm install dexie uuid
npm install -D @types/uuid
```

### Task 1.3 — Configure Vite for GitHub Pages

**File:** `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  base: '/plants/',
  build: {
    outDir: 'dist',
  },
})
```

### Task 1.4 — TypeScript types for plant schema

**File:** `src/lib/types/plant.ts`

```ts
export interface PlantImage {
  type: 'url' | 'base64'
  value: string
  label?: string
}

export interface WateringSchedule {
  frequencyDays: number
  lastDone?: string
  notes?: string
}

export interface FertilizingSchedule {
  frequencyDays: number
  lastDone?: string
  fertilizerType?: string
  notes?: string
}

export interface RepottingSchedule {
  frequencyDays: number
  lastDone?: string
  potSize?: string
  soilType?: string
}

export interface PruningSchedule {
  frequencyDays: number
  lastDone?: string
  notes?: string
}

export interface CareSchedule {
  watering: WateringSchedule
  fertilizing?: FertilizingSchedule
  repotting?: RepottingSchedule
  pruning?: PruningSchedule
}

export interface Environment {
  light?: string
  humidity?: string
  temperature?: string
  pruningStyle?: string
  notes?: string
}

export type PestSeverity = 'mild' | 'moderate' | 'severe'

export interface PestEntry {
  date: string
  pest: string
  severity?: PestSeverity
  treatment?: string
  resolved?: boolean
  resolvedDate?: string
  notes?: string
}

export type CareAction = 'watering' | 'fertilizing' | 'repotting' | 'pruning'

export interface HealthLogEntry {
  date: string
  action: CareAction
  note?: string
}

export interface Plant {
  id: string
  name: string
  nickname?: string
  species?: string
  type: string
  acquiredDate?: string
  location?: string
  images?: PlantImage[]
  careSchedule: CareSchedule
  environment?: Environment
  pestTracking?: PestEntry[]
  healthLog?: HealthLogEntry[]
  notes?: string
  metadata?: Record<string, unknown>
}

export interface AppSettings {
  id: string
  notificationsEnabled: boolean
  notificationTime: string
  mutedPlants: string[]
}
```

### Task 1.5 — Dexie database setup

**File:** `src/lib/db/database.ts`

```ts
import Dexie, { type Table } from 'dexie'
import type { Plant, AppSettings } from '../types/plant'

export class PlantCareDB extends Dexie {
  plants!: Table<Plant, string>
  appSettings!: Table<AppSettings, string>

  constructor() {
    super('PlantCareDB')
    this.version(1).stores({
      plants: 'id, name, type, location',
      appSettings: 'id',
    })
  }
}

export const db = new PlantCareDB()
```

### Task 1.6 — Plant CRUD queries

**File:** `src/lib/db/plants.ts`

```ts
import { db } from './database'
import type { Plant } from '../types/plant'

export async function getAllPlants(): Promise<Plant[]> {
  return db.plants.toArray()
}

export async function getPlantById(id: string): Promise<Plant | undefined> {
  return db.plants.get(id)
}

export async function savePlant(plant: Plant): Promise<string> {
  return db.plants.put(plant)
}

export async function deletePlant(id: string): Promise<void> {
  await db.plants.delete(id)
}

export async function findDuplicate(name: string, species?: string): Promise<Plant[]> {
  let query = db.plants.where('name').equals(name)
  const results = await query.toArray()
  if (species) {
    return results.filter(p => p.species === species)
  }
  return results
}
```

### Task 1.7 — Care log & pest queries

**File:** `src/lib/db/careLog.ts`

```ts
import { db } from './database'
import type { HealthLogEntry, CareAction, Plant } from '../types/plant'
import { v4 as uuidv4 } from 'uuid'

export async function logCareAction(
  plantId: string,
  action: CareAction,
  date: string,
  note?: string
): Promise<void> {
  const plant = await db.plants.get(plantId)
  if (!plant) return

  const entry: HealthLogEntry = { date, action, note }
  const healthLog = plant.healthLog ?? []
  healthLog.push(entry)

  const careSchedule = { ...plant.careSchedule }
  const scheduleEntry = careSchedule[action]
  if (scheduleEntry) {
    scheduleEntry.lastDone = date
  }

  await db.plants.update(plantId, { healthLog, careSchedule })
}

export async function addPestEntry(
  plantId: string,
  entry: Omit<import('../types/plant').PestEntry, never>
): Promise<void> {
  const plant = await db.plants.get(plantId)
  if (!plant) return
  const pestTracking = plant.pestTracking ?? []
  pestTracking.push(entry)
  await db.plants.update(plantId, { pestTracking })
}

export async function resolvePestEntry(
  plantId: string,
  index: number,
  resolvedDate: string
): Promise<void> {
  const plant = await db.plants.get(plantId)
  if (!plant || !plant.pestTracking) return
  plant.pestTracking[index].resolved = true
  plant.pestTracking[index].resolvedDate = resolvedDate
  await db.plants.update(plantId, { pestTracking: plant.pestTracking })
}

export async function getAllSettings() {
  return db.appSettings.get('settings')
}

export async function saveSettings(settings: import('../types/plant').AppSettings): Promise<void> {
  await db.appSettings.put(settings)
}

export async function initDefaultSettings(): Promise<void> {
  const existing = await db.appSettings.get('settings')
  if (!existing) {
    await db.appSettings.put({
      id: 'settings',
      notificationsEnabled: false,
      notificationTime: '09:00',
      mutedPlants: [],
    })
  }
}
```

### Task 1.8 — Verify build

```bash
npm run build
```

**Expected:** Clean build with no errors.

**Commit:** `feat: scaffold project, types, and database layer`

---

## Phase 2: Utility Functions

### Task 2.1 — Date helpers

**File:** `src/lib/utils/dates.ts`

```ts
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00').getTime()
  const b = new Date(to + 'T00:00:00').getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

export function isPast(dateStr: string): boolean {
  return dateStr < todayISO()
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayISO()
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function relativeDays(dateStr: string): string {
  const diff = daysBetween(todayISO(), dateStr)
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''} overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff} days`
}
```

### Task 2.2 — Schedule calculator

**File:** `src/lib/utils/schedule.ts`

```ts
import type { Plant, CareAction } from '../types/plant'
import { todayISO, addDays, daysBetween, isPast } from './dates'

export interface Task {
  plantId: string
  plantName: string
  plantNickname?: string
  plantImage?: string
  action: CareAction
  dueDate: string
  daysOverdue: number
}

export function getNextDueDate(
  lastDone: string | undefined,
  frequencyDays: number,
  fallbackDate: string
): string {
  const base = lastDone ?? fallbackDate
  return addDays(base, frequencyDays)
}

export function getTasksForPlant(plant: Plant): Task[] {
  const tasks: Task[] = []
  const today = todayISO()
  const fallback = plant.acquiredDate ?? today

  const careTypes: CareAction[] = ['watering', 'fertilizing', 'repotting', 'pruning']

  for (const action of careTypes) {
    const schedule = plant.careSchedule[action]
    if (!schedule || !schedule.frequencyDays) continue

    let lastDone = schedule.lastDone ?? fallback
    if (daysBetween(lastDone, today) < 0) {
      lastDone = today
    }

    const dueDate = addDays(lastDone, schedule.frequencyDays)
    const diff = daysBetween(today, dueDate)

    if (diff <= 0) {
      tasks.push({
        plantId: plant.id,
        plantName: plant.name,
        plantNickname: plant.nickname,
        plantImage: plant.images?.[0]?.value,
        action,
        dueDate,
        daysOverdue: Math.abs(diff),
      })
    }
  }

  return tasks
}

export function getAllTasks(plants: Plant[]): Task[] {
  return plants.flatMap(getTasksForPlant).sort((a, b) => b.daysOverdue - a.daysOverdue)
}

export function getOverdueTasks(plants: Plant[]): Task[] {
  return getAllTasks(plants).filter(t => t.daysOverdue > 0)
}

export function getTodayTasks(plants: Plant[]): Task[] {
  return getAllTasks(plants).filter(t => t.daysOverdue === 0)
}

export function getUpcomingTasks(plants: Plant[], days = 3): Task[] {
  const allTasks = getAllTasks(plants)
  return allTasks.filter(t => t.daysOverdue === 0 ? false : daysBetween(todayISO(), t.dueDate) <= days && daysBetween(todayISO(), t.dueDate) > 0)
}
```

### Task 2.3 — JSON importer with validation

**File:** `src/lib/utils/jsonImporter.ts`

```ts
import type { Plant, CareSchedule, CareAction } from '../types/plant'
import { v4 as uuidv4 } from 'uuid'
import { todayISO } from './dates'

export interface ImportResult {
  success: boolean
  plant?: Plant
  warnings: string[]
  errors: string[]
}

export function validateAndImport(raw: unknown): ImportResult {
  const warnings: string[] = []
  const errors: string[] = []

  if (typeof raw !== 'object' || raw === null) {
    return { success: false, warnings, errors: ['Invalid JSON: not an object'] }
  }

  const obj = raw as Record<string, unknown>

  if (!obj.name || typeof obj.name !== 'string') {
    errors.push('Missing required field: name')
  }
  if (!obj.type || typeof obj.type !== 'string') {
    errors.push('Missing required field: type')
  }
  if (!obj.careSchedule || typeof obj.careSchedule !== 'object') {
    errors.push('Missing required field: careSchedule')
  } else {
    const cs = obj.careSchedule as Record<string, unknown>
    if (!cs.watering || typeof cs.watering !== 'object') {
      errors.push('careSchedule.watering is required')
    }
  }

  if (errors.length > 0) {
    return { success: false, warnings, errors }
  }

  const knownKeys = new Set([
    'name', 'nickname', 'species', 'type', 'acquiredDate', 'location',
    'images', 'careSchedule', 'environment', 'pestTracking', 'healthLog', 'notes'
  ])

  const metadata: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (!knownKeys.has(key)) {
      metadata[key] = obj[key]
      warnings.push(`Unknown field preserved in metadata: ${key}`)
    }
  }

  const fallbackDate = (obj.acquiredDate as string) ?? todayISO()
  const careSchedule = obj.careSchedule as CareSchedule

  for (const action of ['watering', 'fertilizing', 'repotting', 'pruning'] as CareAction[]) {
    const entry = careSchedule[action as keyof CareSchedule]
    if (entry && entry.lastDone) {
      if (new Date(entry.lastDone).toString() === 'Invalid Date') {
        warnings.push(`${action}.lastDone is not a valid date, using fallback`)
        entry.lastDone = fallbackDate
      }
    }
  }

  const plant: Plant = {
    id: uuidv4(),
    name: obj.name as string,
    nickname: obj.nickname as string | undefined,
    species: obj.species as string | undefined,
    type: obj.type as string,
    acquiredDate: obj.acquiredDate as string | undefined,
    location: obj.location as string | undefined,
    images: obj.images as Plant['images'],
    careSchedule,
    environment: obj.environment as Plant['environment'],
    pestTracking: obj.pestTracking as Plant['pestTracking'],
    healthLog: obj.healthLog as Plant['healthLog'] ?? [],
    notes: obj.notes as string | undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  }

  return { success: true, plant, warnings, errors }
}
```

**Commit:** `feat: date, schedule, and JSON import utilities`

---

## Phase 3: Svelte Stores

### Task 3.1 — Plants store

**File:** `src/lib/stores/plants.ts`

```ts
import { writable, type Writable } from 'svelte/store'
import type { Plant } from '../types/plant'
import { getAllPlants, savePlant, deletePlant } from '../db/plants'
import { logCareAction } from '../db/careLog'
import type { CareAction } from '../types/plant'

export const plants: Writable<Plant[]> = writable([])
export const plantsLoading: Writable<boolean> = writable(false)

export async function loadPlants(): Promise<void> {
  plantsLoading.set(true)
  const all = await getAllPlants()
  plants.set(all)
  plantsLoading.set(false)
}

export async function addPlant(plant: Plant): Promise<void> {
  await savePlant(plant)
  await loadPlants()
}

export async function updatePlant(plant: Plant): Promise<void> {
  await savePlant(plant)
  await loadPlants()
}

export async function removePlant(id: string): Promise<void> {
  await deletePlant(id)
  await loadPlants()
}

export async function completeTask(
  plantId: string,
  action: CareAction,
  date: string,
  note?: string
): Promise<void> {
  await logCareAction(plantId, action, date, note)
  await loadPlants()
}
```

### Task 3.2 — Tasks store (derived)

**File:** `src/lib/stores/tasks.ts`

```ts
import { derived } from 'svelte/store'
import { plants } from './plants'
import {
  getAllTasks,
  getOverdueTasks,
  getTodayTasks,
  getUpcomingTasks,
  type Task,
} from '../utils/schedule'

export const allTasks = derived(plants, ($plants) => getAllTasks($plants))
export const overdueTasks = derived(plants, ($plants) => getOverdueTasks($plants))
export const todayTasks = derived(plants, ($plants) => getTodayTasks($plants))
export const upcomingTasks = derived(plants, ($plants) => getUpcomingTasks($plants))

export const taskStats = derived(
  [overdueTasks, todayTasks, plants],
  ([$overdue, $today, $plants]) => ({
    totalPlants: $plants.length,
    overdueCount: $overdue.length,
    todayCount: $today.length,
  })
)

export const unresolvedPests = derived(plants, ($plants) =>
  $plants
    .filter((p) => p.pestTracking?.some((e) => !e.resolved))
    .map((p) => ({
      plantId: p.id,
      plantName: p.nickname ?? p.name,
      pests: p.pestTracking!.filter((e) => !e.resolved),
    }))
)
```

**Commit:** `feat: reactive stores for plants and tasks`

---

## Phase 4: Core Components

### Task 4.1 — BottomNav component

**File:** `src/lib/components/BottomNav.svelte`

```svelte
<script lang="ts">
  import type { Component } from 'svelte'

  interface Props {
    activeTab: 'tasks' | 'plants' | 'settings'
    onNavigate: (tab: 'tasks' | 'plants' | 'settings') => void
  }

  let { activeTab, onNavigate }: Props = $props()

  const tabs = [
    { id: 'tasks', label: 'Tasks', icon: '✓' },
    { id: 'plants', label: 'Plants', icon: '🌿' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ] as const
</script>

<nav class="bottom-nav">
  {#each tabs as tab}
    <button
      class="nav-item"
      class:active={activeTab === tab.id}
      onclick={() => onNavigate(tab.id)}
    >
      <span class="nav-icon">{tab.icon}</span>
      <span class="nav-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    padding: 0.25rem 0;
    z-index: 100;
    max-width: 600px;
    margin: 0 auto;
  }
  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 0.5rem;
    border: none;
    background: none;
    color: var(--text-muted);
    min-height: 56px;
    cursor: pointer;
    transition: color 0.2s;
  }
  .nav-item.active { color: var(--primary); }
  .nav-icon { font-size: 1.25rem; }
  .nav-label { font-size: 0.75rem; }
</style>
```

### Task 4.2 — TaskItem component

**File:** `src/lib/components/TaskItem.svelte`

```svelte
<script lang="ts">
  import type { Task } from '../utils/schedule'
  import type { CareAction } from '../types/plant'
  import { relativeDays } from '../utils/dates'
  import { todayISO } from '../utils/dates'

  interface Props {
    task: Task
    onDone: (plantId: string, action: CareAction) => void
  }

  let { task, onDone }: Props = $props()

  const actionLabels: Record<CareAction, string> = {
    watering: '💧 Water',
    fertilizing: '🌱 Fertilize',
    repotting: '🪴 Repot',
    pruning: '✂️ Prune',
  }

  let done = $state(false)

  function handleDone() {
    onDone(task.plantId, task.action)
    done = true
  }
</script>

<div class="task-item" class:overdue={task.daysOverdue > 0} class:done>
  {#if task.plantImage}
    <img src={task.plantImage} alt={task.plantName} class="task-thumb" />
  {:else}
    <div class="task-thumb placeholder">🌿</div>
  {/if}
  <div class="task-info">
    <div class="task-name">{task.plantNickname ?? task.plantName}</div>
    <div class="task-action">{actionLabels[task.action]}</div>
    <div class="task-due" class:overdue-text={task.daysOverdue > 0}>
      {relativeDays(task.dueDate)}
    </div>
  </div>
  {#if !done}
    <button class="done-btn" onclick={handleDone}>Done</button>
  {:else}
    <span class="done-check">✓</span>
  {/if}
</div>

<style>
  .task-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    transition: opacity 0.3s;
  }
  .task-item.overdue { border-left: 3px solid var(--danger); }
  .task-item.done { opacity: 0.5; }
  .task-thumb {
    width: 44px; height: 44px;
    border-radius: 8px;
    object-fit: cover;
  }
  .task-thumb.placeholder {
    display: flex; align-items: center; justify-content: center;
    background: var(--primary-light);
  }
  .task-info { flex: 1; }
  .task-name { font-weight: 600; font-size: 0.9rem; }
  .task-action { font-size: 0.85rem; color: var(--text-muted); }
  .task-due { font-size: 0.75rem; color: var(--text-muted); }
  .overdue-text { color: var(--danger); font-weight: 600; }
  .done-btn {
    min-height: 36px; padding: 0 1rem;
    border: none; border-radius: 8px;
    background: var(--primary); color: white;
    font-weight: 600; font-size: 0.85rem;
    cursor: pointer;
  }
  .done-check { color: var(--primary); font-size: 1.25rem; }
</style>
```

### Task 4.3 — PlantCard component

**File:** `src/lib/components/PlantCard.svelte`

```svelte
<script lang="ts">
  import type { Plant } from '../types/plant'
  import { getTasksForPlant } from '../utils/schedule'
  import { relativeDays } from '../utils/dates'

  interface Props {
    plant: Plant
    onClick: (id: string) => void
  }

  let { plant, onClick }: Props = $props()

  const nextTask = $derived(getTasksForPlant(plant)[0])
  const image = $derived(plant.images?.[0]?.value)
</script>

<button class="plant-card" onclick={() => onClick(plant.id)}>
  {#if image}
    <img src={image} alt={plant.name} class="card-img" />
  {:else}
    <div class="card-img placeholder">🌿</div>
  {/if}
  <div class="card-body">
    <div class="card-name">{plant.nickname ?? plant.name}</div>
    {#if plant.nickname}<div class="card-species">{plant.name}</div>{/if}
    {#if nextTask}
      <div class="card-task" class:overdue={nextTask.daysOverdue > 0}>
        {relativeDays(nextTask.dueDate)}
      </div>
    {/if}
  </div>
</button>

<style>
  .plant-card {
    display: flex; flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 12px; overflow: hidden;
    background: var(--bg-surface);
    cursor: pointer; text-align: left;
    padding: 0; width: 100%;
  }
  .card-img { width: 100%; height: 120px; object-fit: cover; }
  .card-img.placeholder {
    display: flex; align-items: center; justify-content: center;
    background: var(--primary-light); font-size: 2rem;
  }
  .card-body { padding: 0.5rem; }
  .card-name { font-weight: 600; font-size: 0.85rem; }
  .card-species { font-size: 0.7rem; color: var(--text-muted); }
  .card-task {
    font-size: 0.7rem; color: var(--text-muted);
    margin-top: 2px;
  }
  .card-task.overdue { color: var(--danger); font-weight: 600; }
</style>
```

**Commit:** `feat: bottom nav, task item, and plant card components`

### Task 4.4 — JsonImport component

**File:** `src/lib/components/JsonImport.svelte`

```svelte
<script lang="ts">
  import { validateAndImport, type ImportResult } from '../utils/jsonImporter'
  import { addPlant } from '../stores/plants'
  import { findDuplicate } from '../db/plants'
  import type { Plant } from '../types/plant'

  interface Props {
    onImported?: () => void
  }
  let { onImported }: Props = $props()

  let result = $state<ImportResult | null>(null)
  let fileName = $state('')
  let pendingPlant = $state<Plant | null>(null)
  let showDuplicate = $state(false)

  async function handleFile(e: Event) {
    const input = e.target as HTMLInputElement
    if (!input.files?.[0]) return
    fileName = input.files[0].name
    try {
      const text = await input.files[0].text()
      const raw = JSON.parse(text)
      result = validateAndImport(raw)
      if (result.success && result.plant) {
        const dupes = await findDuplicate(result.plant.name, result.plant.species)
        if (dupes.length > 0) {
          showDuplicate = true
          pendingPlant = result.plant
        } else {
          await addPlant(result.plant)
          onImported?.()
        }
      }
    } catch (err) {
      result = {
        success: false,
        warnings: [],
        errors: [`Failed to parse ${fileName}: ${err}`],
      }
    }
  }

  async function importAnyway() {
    if (pendingPlant) {
      await addPlant(pendingPlant)
      pendingPlant = null
      showDuplicate = false
      onImported?.()
    }
  }
</script>

<div class="json-import">
  <label class="import-label">
    <input type="file" accept=".json" onchange={handleFile} class="file-input" />
    <span class="import-btn">📄 Import Plant JSON</span>
  </label>

  {#if result?.errors.length}
    <div class="import-errors">
      {#each result.errors as err}<p>{err}</p>{/each}
    </div>
  {/if}

  {#if result?.warnings.length}
    <div class="import-warnings">
      {#each result.warnings as w}<p>⚠ {w}</p>{/each}
    </div>
  {/if}

  {#if showDuplicate}
    <div class="dup-warning">
      <p>A plant with this name and species already exists.</p>
      <button onclick={importAnyway}>Import as duplicate</button>
      <button onclick={() => { showDuplicate = false; pendingPlant = null; }}>Skip</button>
    </div>
  {/if}
</div>

<style>
  .file-input { display: none; }
  .import-btn {
    display: inline-block; padding: 0.625rem 1rem;
    background: var(--primary); color: white;
    border-radius: 8px; font-weight: 600;
    font-size: 0.85rem; cursor: pointer;
  }
  .import-errors {
    margin-top: 0.5rem; padding: 0.5rem;
    background: var(--danger-light); border-radius: 8px;
    color: var(--danger); font-size: 0.8rem;
  }
  .import-warnings {
    margin-top: 0.5rem; padding: 0.5rem;
    background: var(--warning-light); border-radius: 8px;
    font-size: 0.8rem;
  }
  .dup-warning {
    margin-top: 0.5rem; padding: 0.5rem;
    background: var(--warning-light); border-radius: 8px;
    font-size: 0.8rem; text-align: center;
  }
  .dup-warning button {
    margin: 0.25rem; padding: 0.375rem 0.75rem;
    border: 1px solid var(--border); border-radius: 6px;
    background: var(--bg-surface); cursor: pointer;
  }
</style>
```

### Task 4.5 — PestAlert component

**File:** `src/lib/components/PestAlert.svelte`

```svelte
<script lang="ts">
  interface Props {
    count: number
    onClick: () => void
  }
  let { count, onClick }: Props = $props()
</script>

{#if count > 0}
  <button class="pest-alert" onclick={onClick}>
    🐛 {count} plant{count > 1 ? 's' : ''} have active pest issues — Tap to view
  </button>
{/if}

<style>
  .pest-alert {
    width: 100%; padding: 0.625rem;
    background: var(--warning-light);
    border: 1px solid var(--warning);
    border-radius: 8px; color: var(--warning-dark);
    font-size: 0.85rem; font-weight: 500;
    cursor: pointer; text-align: left;
  }
</style>
```

### Task 4.6 — ImageGallery component

**File:** `src/lib/components/ImageGallery.svelte`

```svelte
<script lang="ts">
  import type { PlantImage } from '../types/plant'

  interface Props {
    images: PlantImage[]
  }
  let { images }: Props = $props()
  let enlarged = $state<number | null>(null)
</script>

<div class="gallery">
  {#each images as img, i}
    <button class="thumb" onclick={() => (enlarged = i)}>
      <img src={img.value} alt={img.label ?? ''} />
    </button>
  {/each}
</div>

{#if enlarged !== null}
  <div class="overlay" onclick={() => (enlarged = null)} role="button" tabindex={0}>
    <img src={images[enlarged].value} alt={images[enlarged].label ?? ''} class="enlarged" />
    <p class="overlay-label">{images[enlarged].label ?? ''}</p>
  </div>
{/if}

<style>
  .gallery {
    display: flex; gap: 0.5rem;
    overflow-x: auto; padding: 0.25rem 0;
  }
  .thumb {
    flex-shrink: 0; width: 80px; height: 80px;
    border: 1px solid var(--border); border-radius: 8px;
    overflow: hidden; padding: 0; cursor: pointer;
    background: none;
  }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 200; padding: 1rem;
  }
  .enlarged { max-width: 90%; max-height: 80vh; border-radius: 12px; }
  .overlay-label { color: white; margin-top: 0.5rem; font-size: 0.9rem; }
</style>
```

### Task 4.7 — CareLogEntry component

**File:** `src/lib/components/CareLogEntry.svelte`

```svelte
<script lang="ts">
  import type { HealthLogEntry } from '../types/plant'
  import { formatDate } from '../utils/dates'

  interface Props {
    entry: HealthLogEntry
  }
  let { entry }: Props = $props()

  const actionIcons: Record<string, string> = {
    watering: '💧', fertilizing: '🌱', repotting: '🪴', pruning: '✂️',
  }
</script>

<div class="log-entry">
  <span class="log-icon">{actionIcons[entry.action] ?? '•'}</span>
  <span class="log-date">{formatDate(entry.date)}</span>
  <span class="log-action">{entry.action}</span>
  {#if entry.note}<span class="log-note">{entry.note}</span>{/if}
</div>

<style>
  .log-entry {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem; border-bottom: 1px solid var(--border);
    font-size: 0.85rem;
  }
  .log-icon { font-size: 1.1rem; }
  .log-date { color: var(--text-muted); font-size: 0.8rem; min-width: 100px; }
  .log-action { text-transform: capitalize; }
  .log-note { color: var(--text-muted); font-style: italic; }
</style>
```

**Commit:** `feat: JSON import, pest alert, image gallery, care log components`

---

## Phase 5: Route Components

### Task 5.1 — Dashboard route

**File:** `src/routes/Dashboard.svelte`

```svelte
<script lang="ts">
  import { todayTasks, overdueTasks, upcomingTasks, taskStats, unresolvedPests } from '../stores/tasks'
  import { completeTask } from '../stores/plants'
  import { todayISO, formatDate } from '../utils/dates'
  import TaskItem from '../lib/components/TaskItem.svelte'
  import PestAlert from '../lib/components/PestAlert.svelte'

  interface Props {
    onNavigate: (tab: 'plants' | 'settings') => void
  }
  let { onNavigate }: Props = $props()

  const stats = $derived($taskStats)
  const pests = $derived($unresolvedPests)

  async function handleDone(plantId: string, action: import('../types/plant').CareAction) {
    await completeTask(plantId, action, todayISO())
  }
</script>

<div class="dashboard">
  <header class="dash-header">
    <h1>Today</h1>
    <p class="date">{formatDate(todayISO())}</p>
    <div class="stats">
      <span>{stats.totalPlants} plants</span>
      <span class={stats.overdueCount > 0 ? 'stat-danger' : ''}>{stats.overdueCount} overdue</span>
      <span>{stats.todayCount} due today</span>
    </div>
  </header>

  {#if pests.length > 0}
    <PestAlert count={pests.length} onClick={() => onNavigate('plants')} />
  {/if}

  {#if stats.totalPlants === 0}
    <div class="empty">
      <p>🌱</p>
      <p>Add a plant to get started.</p>
      <button class="cta" onclick={() => onNavigate('plants')}>Import your first plant</button>
    </div>
  {:else if stats.overdueCount === 0 && stats.todayCount === 0}
    <div class="empty">
      <p>🌿</p>
      <p>No tasks today! Your plants are happy.</p>
    </div>
  {:else}
    {#if $overdueTasks.length > 0}
      <section class="task-section">
        <h2 class="section-title danger">Overdue</h2>
        {#each $overdueTasks as task (task.plantId + task.action)}
          <TaskItem {task} onDone={handleDone} />
        {/each}
      </section>
    {/if}

    {#if $todayTasks.length > 0}
      <section class="task-section">
        <h2 class="section-title success">Today</h2>
        {#each $todayTasks as task (task.plantId + task.action)}
          <TaskItem {task} onDone={handleDone} />
        {/each}
      </section>
    {/if}

    {#if $upcomingTasks.length > 0}
      <section class="task-section">
        <h2 class="section-title muted">Upcoming</h2>
        {#each $upcomingTasks as task (task.plantId + task.action)}
          <TaskItem {task} onDone={handleDone} />
        {/each}
      </section>
    {/if}
  {/if}
</div>

<style>
  .dashboard { padding: 1rem; padding-bottom: 80px; }
  .dash-header { margin-bottom: 1rem; }
  .dash-header h1 { font-size: 1.5rem; margin: 0; }
  .date { color: var(--text-muted); font-size: 0.85rem; margin: 0; }
  .stats { display: flex; gap: 1rem; margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted); }
  .stat-danger { color: var(--danger); font-weight: 600; }
  .task-section { margin-bottom: 1.5rem; }
  .section-title {
    font-size: 0.9rem; text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 0.5rem;
  }
  .section-title.danger { color: var(--danger); }
  .section-title.success { color: var(--primary); }
  .section-title.muted { color: var(--text-muted); }
  .empty {
    text-align: center; padding: 3rem 1rem;
    color: var(--text-muted);
  }
  .empty p { font-size: 1.5rem; margin: 0.5rem 0; }
  .cta {
    margin-top: 1rem; padding: 0.625rem 1.25rem;
    background: var(--primary); color: white;
    border: none; border-radius: 8px;
    font-weight: 600; cursor: pointer;
  }
</style>
```

### Task 5.2 — Catalog route

**File:** `src/routes/Catalog.svelte`

```svelte
<script lang="ts">
  import { plants } from '../stores/plants'
  import PlantCard from '../lib/components/PlantCard.svelte'
  import JsonImport from '../lib/components/JsonImport.svelte'
  import { getTasksForPlant } from '../utils/schedule'

  interface Props {
    onSelectPlant: (id: string) => void
  }
  let { onSelectPlant }: Props = $props()

  let search = $state('')
  let filterType = $state('all')

  const plantTypes = $derived(
    ['all', ...new Set($plants.map((p) => p.type))]
  )

  const filtered = $derived(
    $plants
      .filter((p) => filterType === 'all' || p.type === filterType)
      .filter(
        (p) =>
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.nickname?.toLowerCase().includes(search.toLowerCase()) ||
          p.species?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  )
</script>

<div class="catalog">
  <div class="catalog-header">
    <input
      type="search"
      placeholder="Search plants..."
      bind:value={search}
      class="search-bar"
    />
    <div class="filter-chips">
      {#each plantTypes as t}
        <button
          class="chip"
          class:active={filterType === t}
          onclick={() => (filterType = t)}
        >
          {t}
        </button>
      {/each}
    </div>
  </div>

  {#if $plants.length === 0}
    <div class="empty">
      <p>🌱</p>
      <p>No plants yet. Import a JSON file to get started.</p>
    </div>
  {:else if filtered.length === 0}
    <p class="empty">No plants match your search.</p>
  {:else}
    <div class="grid">
      {#each filtered as plant (plant.id)}
        <PlantCard {plant} onClick={onSelectPlant} />
      {/each}
    </div>
  {/if}

  <div class="fab">
    <JsonImport />
  </div>
</div>

<style>
  .catalog { padding: 1rem; padding-bottom: 80px; }
  .catalog-header { margin-bottom: 1rem; position: sticky; top: 0; background: var(--bg); z-index: 10; }
  .search-bar {
    width: 100%; padding: 0.625rem;
    border: 1px solid var(--border); border-radius: 8px;
    font-size: 0.9rem; background: var(--bg-surface);
  }
  .filter-chips { display: flex; gap: 0.5rem; margin-top: 0.5rem; overflow-x: auto; }
  .chip {
    padding: 0.25rem 0.75rem; border: 1px solid var(--border);
    border-radius: 16px; background: var(--bg-surface);
    font-size: 0.75rem; cursor: pointer; white-space: nowrap;
  }
  .chip.active { background: var(--primary); color: white; border-color: var(--primary); }
  .grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .empty { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
  .empty p { font-size: 1.5rem; margin: 0.5rem 0; }
  .fab { position: fixed; bottom: 72px; right: 1rem; z-index: 50; }
</style>
```

**Commit:** `feat: dashboard and catalog routes`

### Task 5.3 — PlantDetail route

**File:** `src/routes/PlantDetail.svelte`

```svelte
<script lang="ts">
  import type { Plant, CareAction } from '../types/plant'
  import { formatDate, todayISO } from '../utils/dates'
  import { getNextDueDate } from '../utils/schedule'
  import { completeTask } from '../stores/plants'
  import { addPestEntry, resolvePestEntry } from '../db/careLog'
  import ImageGallery from '../lib/components/ImageGallery.svelte'
  import CareLogEntry from '../lib/components/CareLogEntry.svelte'

  interface Props {
    plant: Plant
    onEdit: (id: string) => void
    onBack: () => void
  }
  let { plant, onEdit, onBack }: Props = $props()

  const careTypes: CareAction[] = ['watering', 'fertilizing', 'repotting', 'pruning']
  const actionLabels: Record<CareAction, string> = {
    watering: '💧 Watering', fertilizing: '🌱 Fertilizing',
    repotting: '🪴 Repotting', pruning: '✂️ Pruning',
  }

  function getDueDate(action: CareAction): string {
    const s = plant.careSchedule[action]
    if (!s) return '—'
    return getNextDueDate(s.lastDone, s.frequencyDays, plant.acquiredDate ?? todayISO())
  }

  async function logAction(action: CareAction) {
    await completeTask(plant.id, action, todayISO())
  }

  async function handleAddPest() {
    const entry = {
      date: todayISO(),
      pest: 'Unknown',
      severity: 'mild' as const,
      resolved: false,
    }
    await addPestEntry(plant.id, entry)
  }

  async function handleResolvePest(index: number) {
    await resolvePestEntry(plant.id, index, todayISO())
  }

  function exportPlant() {
    const blob = new Blob([JSON.stringify(plant, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${plant.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const log = $derived([...(plant.healthLog ?? [])].reverse())
</script>

<div class="detail">
  <button class="back-btn" onclick={onBack}>← Back</button>

  <div class="hero">
    {#if plant.images?.length}
      <img src={plant.images[0].value} alt={plant.name} class="hero-img" />
    {:else}
      <div class="hero-img placeholder">🌿</div>
    {/if}
    <h1>{plant.name}</h1>
    {#if plant.nickname}<p class="nickname">"{plant.nickname}"</p>{/if}
    {#if plant.species}<p class="species">{plant.species}</p>{/if}
  </div>

  <div class="chips">
    {#if plant.location}<span class="info-chip">📍 {plant.location}</span>{/if}
    {#if plant.environment?.light}<span class="info-chip">☀ {plant.environment.light}</span>{/if}
    {#if plant.environment?.humidity}<span class="info-chip">💧 {plant.environment.humidity}</span>{/if}
    {#if plant.environment?.temperature}<span class="info-chip">🌡 {plant.environment.temperature}</span>{/if}
  </div>

  <section class="care-section">
    <h2>Care Schedule</h2>
    {#each careTypes as action}
      {#if plant.careSchedule[action]}
        <div class="care-card">
          <div class="care-header">
            <span class="care-label">{actionLabels[action]}</span>
            <span class="care-due">{formatDate(getDueDate(action))}</span>
          </div>
          <div class="care-details">
            <span>Every {plant.careSchedule[action]!.frequencyDays} days</span>
            <span>Last: {formatDate(plant.careSchedule[action]!.lastDone)}</span>
          </div>
          {#if plant.careSchedule[action]!.notes}
            <p class="care-notes">{plant.careSchedule[action]!.notes}</p>
          {/if}
          <button class="log-btn" onclick={() => logAction(action)}>Log {action}</button>
        </div>
      {/if}
    {/each}
  </section>

  {#if plant.pestTracking?.length}
    <section class="pest-section">
      <h2>Pest Tracking</h2>
      {#each plant.pestTracking as pest, i}
        <div class="pest-entry" class:unresolved={!pest.resolved}>
          <span class="pest-name">{pest.pest}</span>
          <span class="pest-date">{formatDate(pest.date)}</span>
          {#if pest.severity}<span class="pest-sev">{pest.severity}</span>{/if}
          {#if !pest.resolved}
            <button class="resolve-btn" onclick={() => handleResolvePest(i)}>Resolve</button>
          {:else}
            <span class="resolved-tag">✓ Resolved</span>
          {/if}
        </div>
      {/each}
    </section>
  {/if}

  {#if log.length > 0}
    <section class="log-section">
      <h2>Health Log</h2>
      {#each log as entry}
        <CareLogEntry {entry} />
      {/each}
    </section>
  {/if}

  {#if plant.images && plant.images.length > 1}
    <section class="gallery-section">
      <h2>Images</h2>
      <ImageGallery images={plant.images} />
    </section>
  {/if}

  {#if plant.notes}
    <section class="notes-section">
      <h2>Notes</h2>
      <p>{plant.notes}</p>
    </section>
  {/if}

  <div class="action-row">
    <button class="action-btn" onclick={() => onEdit(plant.id)}>✏ Edit</button>
    <button class="action-btn" onclick={exportPlant}>📤 Export</button>
  </div>
</div>

<style>
  .detail { padding: 1rem; padding-bottom: 80px; }
  .back-btn {
    border: none; background: none; color: var(--primary);
    font-size: 0.9rem; cursor: pointer; margin-bottom: 0.5rem;
  }
  .hero { text-align: center; margin-bottom: 1rem; }
  .hero-img {
    width: 100%; height: 200px; object-fit: cover;
    border-radius: 12px; margin-bottom: 0.5rem;
  }
  .hero-img.placeholder {
    display: flex; align-items: center; justify-content: center;
    background: var(--primary-light); font-size: 3rem;
  }
  .hero h1 { font-size: 1.25rem; margin: 0; }
  .nickname, .species { color: var(--text-muted); font-size: 0.85rem; margin: 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
  .info-chip {
    padding: 0.25rem 0.625rem; background: var(--bg-surface);
    border: 1px solid var(--border); border-radius: 16px;
    font-size: 0.75rem;
  }
  section { margin-bottom: 1.5rem; }
  h2 { font-size: 1rem; margin-bottom: 0.5rem; }
  .care-card {
    padding: 0.75rem; border: 1px solid var(--border);
    border-radius: 12px; margin-bottom: 0.5rem;
    background: var(--bg-surface);
  }
  .care-header { display: flex; justify-content: space-between; }
  .care-label { font-weight: 600; font-size: 0.9rem; }
  .care-due { font-size: 0.8rem; color: var(--primary); }
  .care-details { display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }
  .care-notes { font-size: 0.8rem; color: var(--text-muted); margin: 0.25rem 0; }
  .log-btn {
    margin-top: 0.5rem; padding: 0.375rem 0.75rem;
    background: var(--primary-light); color: var(--primary-dark);
    border: none; border-radius: 6px; font-size: 0.8rem;
    cursor: pointer; font-weight: 500;
  }
  .pest-entry {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem; border-bottom: 1px solid var(--border);
    font-size: 0.85rem;
  }
  .pest-entry.unresolved { background: var(--danger-light); border-radius: 8px; }
  .pest-name { font-weight: 600; }
  .pest-date { color: var(--text-muted); font-size: 0.75rem; }
  .pest-sev { text-transform: capitalize; font-size: 0.75rem; color: var(--warning-dark); }
  .resolve-btn {
    margin-left: auto; padding: 0.25rem 0.5rem;
    border: 1px solid var(--border); border-radius: 4px;
    background: var(--bg-surface); font-size: 0.75rem; cursor: pointer;
  }
  .resolved-tag { color: var(--primary); font-size: 0.75rem; margin-left: auto; }
  .action-row { display: flex; gap: 0.75rem; margin-top: 1rem; }
  .action-btn {
    flex: 1; padding: 0.625rem;
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--bg-surface); font-size: 0.85rem;
    cursor: pointer;
  }
</style>
```

**Commit:** `feat: plant detail route`

### Task 5.4 — PlantEdit route

**File:** `src/routes/PlantEdit.svelte`

```svelte
<script lang="ts">
  import type { Plant, CareAction } from '../types/plant'
  import { updatePlant } from '../stores/plants'
  import { todayISO } from '../utils/dates'

  interface Props {
    plant: Plant
    onBack: () => void
  }
  let { plant, onBack }: Props = $props()

  let formData = $state<Plant>(structuredClone($state.snapshot(plant)))
  const careTypes: CareAction[] = ['watering', 'fertilizing', 'repotting', 'pruning']

  async function handleSave() {
    await updatePlant(formData)
    onBack()
  }
</script>

<div class="edit">
  <button class="back-btn" onclick={onBack}>← Cancel</button>
  <h1>Edit Plant</h1>

  <section class="form-section">
    <h2>Basic Info</h2>
    <label>Name<input bind:value={formData.name} /></label>
    <label>Nickname<input bind:value={formData.nickname} /></label>
    <label>Species<input bind:value={formData.species} /></label>
    <label>Type<input bind:value={formData.type} /></label>
    <label>Location<input bind:value={formData.location} /></label>
    <label>Acquired Date<input type="date" bind:value={formData.acquiredDate} /></label>
  </section>

  <section class="form-section">
    <h2>Care Schedule</h2>
    {#each careTypes as action}
      {#if formData.careSchedule[action]}
        <div class="care-edit">
          <h3>{action}</h3>
          <label>Frequency (days)
            <input type="number" bind:value={formData.careSchedule[action]!.frequencyDays} />
          </label>
          <label>Last Done
            <input type="date" bind:value={formData.careSchedule[action]!.lastDone} />
          </label>
          {#if action === 'fertilizing' && formData.careSchedule.fertilizing}
            <label>Fertilizer type
              <input bind:value={formData.careSchedule.fertilizing!.fertilizerType} />
            </label>
          {/if}
          {#if action === 'repotting' && formData.careSchedule.repotting}
            <label>Pot size<input bind:value={formData.careSchedule.repotting!.potSize} /></label>
            <label>Soil type<input bind:value={formData.careSchedule.repotting!.soilType} /></label>
          {/if}
          <label>Notes
            <textarea bind:value={formData.careSchedule[action]!.notes}></textarea>
          </label>
        </div>
      {/if}
    {/each}
  </section>

  <section class="form-section">
    <h2>Environment</h2>
    {#if !formData.environment}
      {@const formData2 = formData; formData2.environment = {}}
    {/if}
    <label>Light<input bind:value={formData.environment!.light} /></label>
    <label>Humidity<input bind:value={formData.environment!.humidity} /></label>
    <label>Temperature<input bind:value={formData.environment!.temperature} /></label>
    <label>Pruning style<input bind:value={formData.environment!.pruningStyle} /></label>
    <label>Notes<textarea bind:value={formData.environment!.notes}></textarea></label>
  </section>

  <section class="form-section">
    <h2>Notes</h2>
    <label><textarea bind:value={formData.notes}></textarea></label>
  </section>

  <button class="save-btn" onclick={handleSave}>Save Changes</button>
</div>

<style>
  .edit { padding: 1rem; padding-bottom: 80px; }
  .back-btn {
    border: none; background: none; color: var(--primary);
    font-size: 0.9rem; margin-bottom: 0.5rem; cursor: pointer;
  }
  h1 { font-size: 1.25rem; margin-bottom: 1rem; }
  .form-section {
    margin-bottom: 1.5rem; padding: 0.75rem;
    border: 1px solid var(--border); border-radius: 12px;
    background: var(--bg-surface);
  }
  .form-section h2 { font-size: 0.9rem; margin-bottom: 0.5rem; }
  .care-edit h3 {
    text-transform: capitalize; font-size: 0.85rem;
    margin-top: 0.75rem; margin-bottom: 0.25rem;
  }
  label {
    display: block; margin-bottom: 0.5rem;
    font-size: 0.8rem; color: var(--text-muted);
  }
  input, textarea {
    display: block; width: 100%; margin-top: 0.25rem;
    padding: 0.5rem; border: 1px solid var(--border);
    border-radius: 6px; font-size: 0.9rem;
    background: var(--bg);
  }
  textarea { min-height: 60px; resize: vertical; }
  .save-btn {
    width: 100%; padding: 0.75rem;
    background: var(--primary); color: white;
    border: none; border-radius: 8px;
    font-weight: 600; font-size: 0.95rem;
    cursor: pointer;
  }
</style>
```

### Task 5.5 — Settings route

**File:** `src/routes/Settings.svelte`

```svelte
<script lang="ts">
  import { getAllSettings, saveSettings } from '../db/careLog'
  import { getAllPlants } from '../db/plants'
  import type { AppSettings } from '../types/plant'
  import { onMount } from 'svelte'

  let settings = $state<AppSettings>({
    id: 'settings',
    notificationsEnabled: false,
    notificationTime: '09:00',
    mutedPlants: [],
  })
  let allPlants = $state<{ id: string; name: string; nickname?: string }[]>([])

  onMount(async () => {
    const s = await getAllSettings()
    if (s) settings = s
    allPlants = (await getAllPlants()).map((p) => ({
      id: p.id, name: p.name, nickname: p.nickname,
    }))
  })

  async function toggleNotifications() {
    settings.notificationsEnabled = !settings.notificationsEnabled
    if (settings.notificationsEnabled && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      settings.notificationsEnabled = perm === 'granted'
    }
    await saveSettings(settings)
  }

  async function updateTime() {
    await saveSettings(settings)
  }

  async function toggleMute(plantId: string) {
    if (settings.mutedPlants.includes(plantId)) {
      settings.mutedPlants = settings.mutedPlants.filter((id) => id !== plantId)
    } else {
      settings.mutedPlants = [...settings.mutedPlants, plantId]
    }
    await saveSettings(settings)
  }

  async function exportAll() {
    const plants = await getAllPlants()
    const blob = new Blob([JSON.stringify(plants, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plant-care-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function clearAll() {
    if (!confirm('Delete ALL plant data? This cannot be undone.')) return
    const { db } = await import('../db/database')
    await db.plants.clear()
    location.reload()
  }
</script>

<div class="settings">
  <h1>Settings</h1>

  <section class="settings-section">
    <h2>Notifications</h2>
    <div class="setting-row">
      <span>Enable push notifications</span>
      <label class="toggle">
        <input type="checkbox" checked={settings.notificationsEnabled} onchange={toggleNotifications} />
        <span class="slider"></span>
      </label>
    </div>
    <div class="setting-row">
      <span>Notification time</span>
      <input type="time" bind:value={settings.notificationTime} onchange={updateTime} />
    </div>
  </section>

  {#if allPlants.length > 0}
    <section class="settings-section">
      <h2>Per-Plant Notifications</h2>
      {#each allPlants as p}
        <div class="setting-row">
          <span>{p.nickname ?? p.name}</span>
          <label class="toggle">
            <input
              type="checkbox"
              checked={!settings.mutedPlants.includes(p.id)}
              onchange={() => toggleMute(p.id)}
            />
            <span class="slider"></span>
          </label>
        </div>
      {/each}
    </section>
  {/if}

  <section class="settings-section">
    <h2>Data</h2>
    <button class="data-btn" onclick={exportAll}>📤 Export all data</button>
    <button class="data-btn danger" onclick={clearAll}>🗑 Clear all data</button>
  </section>

  <section class="settings-section about">
    <h2>About</h2>
    <p>Plant Care MWeb v1.0</p>
    <p>Offline-first plant care manager.</p>
  </section>
</div>

<style>
  .settings { padding: 1rem; padding-bottom: 80px; }
  h1 { font-size: 1.5rem; margin-bottom: 1rem; }
  .settings-section {
    margin-bottom: 1rem; padding: 0.75rem;
    border: 1px solid var(--border); border-radius: 12px;
    background: var(--bg-surface);
  }
  .settings-section h2 { font-size: 0.9rem; margin-bottom: 0.5rem; }
  .setting-row {
    display: flex; justify-content: space-between;
    align-items: center; padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.85rem;
  }
  .setting-row:last-child { border-bottom: none; }
  .toggle {
    position: relative; width: 44px; height: 24px;
    display: inline-block;
  }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute; inset: 0;
    background: var(--border); border-radius: 12px;
    cursor: pointer; transition: 0.3s;
  }
  .slider::before {
    content: ''; position: absolute;
    width: 18px; height: 18px; left: 3px; top: 3px;
    background: white; border-radius: 50%; transition: 0.3s;
  }
  .toggle input:checked + .slider { background: var(--primary); }
  .toggle input:checked + .slider::before { transform: translateX(20px); }
  .data-btn {
    display: block; width: 100%; padding: 0.625rem;
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--bg-surface); font-size: 0.85rem;
    cursor: pointer; margin-bottom: 0.5rem;
  }
  .data-btn.danger { color: var(--danger); border-color: var(--danger); }
  .about p { font-size: 0.8rem; color: var(--text-muted); margin: 0.25rem 0; }
</style>
```

**Commit:** `feat: plant edit and settings routes`

---

## Phase 6: Notifications

### Task 6.1 — Service worker

**File:** `public/sw.js`

```js
const CACHE_NAME = 'plant-care-v1'
const NOTIFICATION_TAG = 'plant-care-daily'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'plant-care-check') {
    event.waitUntil(checkAndNotify())
  }
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CHECK_TASKS') {
    event.waitUntil(checkAndNotify())
  }
})

async function checkAndNotify() {
  try {
    const db = await openDB()
    const settings = await getSettings(db)
    if (!settings?.notificationsEnabled) return

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const lastNotified = await getLastNotified(db)

    if (lastNotified === today) return

    const [hours, minutes] = (settings.notificationTime || '09:00').split(':')
    const notifyHour = parseInt(hours)
    const notifyMinute = parseInt(minutes)

    if (now.getHours() < notifyHour ||
        (now.getHours() === notifyHour && now.getMinutes() < notifyMinute)) {
      return
    }

    const plants = await getAllPlants(db)
    const tasks = getDueTasks(plants)

    if (tasks.length > 0) {
      const actionLabels = {
        watering: 'watering', fertilizing: 'fertilizing',
        repotting: 'repotting', pruning: 'pruning',
      }
      const body = tasks
        .slice(0, 5)
        .map((t) => `${t.plantName} needs ${actionLabels[t.action]}`)
        .join(', ')

      await self.registration.showNotification('Plant Care: ' + tasks.length + ' tasks today', {
        body,
        tag: NOTIFICATION_TAG,
        icon: '/plants/icon.png',
        requireInteraction: false,
      })
    }

    await setLastNotified(db, today)
  } catch (err) {
    console.error('SW notification check failed:', err)
  }
}

function getDueTasks(plants) {
  const today = new Date().toISOString().split('T')[0]
  const tasks = []
  for (const plant of plants) {
    if (!plant.careSchedule) continue
    const careTypes = ['watering', 'fertilizing', 'repotting', 'pruning']
    for (const action of careTypes) {
      const s = plant.careSchedule[action]
      if (!s || !s.frequencyDays) continue
      let lastDone = s.lastDone || plant.acquiredDate || today
      const due = addDays(lastDone, s.frequencyDays)
      if (due <= today) {
        tasks.push({ plantName: plant.nickname || plant.name, action })
      }
    }
  }
  return tasks
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('PlantCareDB')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getSettings(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('appSettings', 'readonly')
    const store = tx.objectStore('appSettings')
    const req = store.get('settings')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getAllPlants(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('plants', 'readonly')
    const store = tx.objectStore('plants')
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getLastNotified(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('appSettings', 'readonly')
    const store = tx.objectStore('appSettings')
    const req = store.get('lastNotified')
    req.onsuccess = () => resolve(req.result?.value || null)
    req.onerror = () => reject(req.error)
  })
}

function setLastNotified(db, date) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('appSettings', 'readwrite')
    const store = tx.objectStore('appSettings')
    store.put({ id: 'lastNotified', value: date })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
```

### Task 6.2 — Notifier (permission + scheduling)

**File:** `src/lib/notifications/notifier.ts`

```ts
import { getAllSettings } from '../db/careLog'
import { getAllPlants } from '../db/plants'
import { getTodayTasks, type Task } from '../utils/schedule'
import { todayISO } from '../utils/dates'

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/plants/sw.js')
    return reg
  } catch (err) {
    console.error('SW registration failed:', err)
    return null
  }
}

export async function tryPeriodicSync(reg: ServiceWorkerRegistration): Promise<void> {
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName })
    if (state(state(status).state) === 'granted') {
      const registrations = await reg.periodicSync.getTags()
      if (!registrations.includes('plant-care-check')) {
        await reg.periodicSync.register('plant-care-check', {
          minInterval: 12 * 60 * 60 * 1000,
        })
      }
    }
  } catch {
    // Periodic Sync not supported — fallback to timer
  }
}

function state(s: PermissionStatus) {
  return s
}

export function startNotificationTimer(): number {
  return window.setInterval(async () => {
    await checkAndNotifyFromApp()
  }, 15 * 60 * 1000)
}

export async function checkAndNotifyFromApp(): Promise<void> {
  const settings = await getAllSettings()
  if (!settings?.notificationsEnabled) return

  const now = new Date()
  const today = todayISO()

  const [h, m] = (settings.notificationTime || '09:00').split(':').map(Number)
  if (now.getHours() < h || (now.getHours() === h && now.getMinutes() < m)) return

  const plants = await getAllPlants()
  const tasks = getTodayTasks(plants).filter(
    (t) => !settings.mutedPlants.includes(t.plantId)
  )

  if (tasks.length === 0) return

  const key = `notified_${today}`
  if (localStorage.getItem(key)) return
  localStorage.setItem(key, '1')

  const body = tasks
    .slice(0, 5)
    .map((t) => `${t.plantNickname ?? t.plantName} needs ${t.action}`)
    .join(', ')

  const reg = await navigator.serviceWorker?.getRegistration()
  if (reg) {
    await reg.showNotification(`Plant Care: ${tasks.length} tasks today`, {
      body,
      tag: 'plant-care-daily',
      icon: '/plants/icon.png',
    })
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`Plant Care: ${tasks.length} tasks today`, {
      body,
      tag: 'plant-care-daily',
    })
  }
}
```

**Commit:** `feat: service worker and notification system`

---

## Phase 7: App Shell, Styling, PWA & Deployment

### Task 7.1 — Global CSS variables and reset

**File:** `src/app.css`

```css
:root {
  --primary: #2d6a4f;
  --primary-light: #d8f3dc;
  --primary-dark: #1b4332;
  --bg: #f8f9fa;
  --bg-surface: #ffffff;
  --border: #e9ecef;
  --text: #212529;
  --text-muted: #6c757d;
  --danger: #e63946;
  --danger-light: #fce8ea;
  --warning: #f4a261;
  --warning-light: #fef3e2;
  --warning-dark: #bc6b25;
  --radius: 12px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

#app {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
}

button {
  font-family: inherit;
}

input, textarea {
  font-family: inherit;
}

::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}
```

### Task 7.2 — App.svelte (shell with tab navigation)

**File:** `src/App.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { loadPlants, plants } from './lib/stores/plants'
  import { initDefaultSettings } from './lib/db/careLog'
  import { registerServiceWorker, tryPeriodicSync, startNotificationTimer } from './lib/notifications/notifier'
  import BottomNav from './lib/components/BottomNav.svelte'
  import Dashboard from './routes/Dashboard.svelte'
  import Catalog from './routes/Catalog.svelte'
  import PlantDetail from './routes/PlantDetail.svelte'
  import PlantEdit from './routes/PlantEdit.svelte'
  import Settings from './routes/Settings.svelte'
  import { getPlantById } from './lib/db/plants'
  import type { Plant } from './lib/types/plant'

  type View =
    | { tab: 'tasks' }
    | { tab: 'plants' }
    | { tab: 'settings' }
    | { tab: 'detail'; plantId: string }
    | { tab: 'edit'; plantId: string }

  let view = $state<View>({ tab: 'tasks' })
  let selectedPlant = $state<Plant | null>(null)

  onMount(async () => {
    await initDefaultSettings()
    await loadPlants()

    const reg = await registerServiceWorker()
    if (reg) {
      await tryPeriodicSync(reg)
      startNotificationTimer()
    }
  })

  function navigate(tab: 'tasks' | 'plants' | 'settings') {
    view = { tab }
  }

  async function selectPlant(id: string) {
    selectedPlant = (await getPlantById(id)) ?? null
    if (selectedPlant) view = { tab: 'detail', plantId: id }
  }

  async function editPlant(id: string) {
    selectedPlant = (await getPlantById(id)) ?? null
    if (selectedPlant) view = { tab: 'edit', plantId: id }
  }

  async function refreshPlant() {
    if (view.tab === 'detail' || view.tab === 'edit') {
      selectedPlant = (await getPlantById(view.plantId)) ?? null
    }
  }

  const activeTab = $derived(
    view.tab === 'tasks' ? 'tasks' :
    view.tab === 'plants' || view.tab === 'detail' || view.tab === 'edit' ? 'plants' :
    'settings'
  )
</script>

{#if view.tab === 'tasks'}
  <Dashboard onNavigate={navigate} />
{:else if view.tab === 'plants'}
  <Catalog onSelectPlant={selectPlant} />
{:else if view.tab === 'settings'}
  <Settings />
{:else if view.tab === 'detail' && selectedPlant}
  <PlantDetail
    plant={selectedPlant}
    onEdit={editPlant}
    onBack={() => { view = { tab: 'plants' } }}
  />
{:else if view.tab === 'edit' && selectedPlant}
  <PlantEdit
    plant={selectedPlant}
    onBack={async () => {
      await refreshPlant()
      if (selectedPlant) view = { tab: 'detail', plantId: selectedPlant.id }
    }}
  />
{/if}

{#if view.tab !== 'detail' && view.tab !== 'edit'}
  <BottomNav activeTab={activeTab} onNavigate={navigate} />
{/if}
```

### Task 7.3 — Entry point (main.ts)

**File:** `src/main.ts`

```ts
import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
```

### Task 7.4 — PWA manifest

**File:** `public/manifest.json`

```json
{
  "name": "Plant Care",
  "short_name": "PlantCare",
  "description": "Offline-first plant care manager",
  "start_url": "/plants/",
  "scope": "/plants/",
  "display": "standalone",
  "background_color": "#f8f9fa",
  "theme_color": "#2d6a4f",
  "icons": [
    {
      "src": "/plants/icon.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/plants/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Task 7.5 — Link manifest in index.html

**File:** `index.html` — add inside `<head>`:

```html
<link rel="manifest" href="/plants/manifest.json" />
<meta name="theme-color" content="#2d6a4f" />
<link rel="apple-touch-icon" href="/plants/icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Plant Care" />
```

Also ensure the `<div id="app"></div>` body structure is correct from the Vite template.

### Task 7.6 — App icon placeholder

Create a simple green leaf icon at `public/icon.png` (192x192) and `public/icon-512.png` (512x512). Use any image generator or a simple SVG-to-PNG. A minimal SVG placeholder:

**File:** `public/icon.svg` (reference only — convert to PNG)

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="#2d6a4f" rx="32"/>
  <text x="96" y="130" font-size="100" text-anchor="middle" fill="#d8f3dc">🌿</text>
</svg>
```

### Task 7.7 — Verify build and dev server

```bash
npm run build
npm run preview
```

**Expected:** Build succeeds, preview loads at `/plants/` with dashboard showing empty state.

### Task 7.8 — Sample plant JSON for testing

**File:** `public/sample-plant.json`

```json
{
  "name": "Monstera Deliciosa",
  "nickname": "Monsty",
  "species": "Monstera deliciosa",
  "type": "Tropical",
  "acquiredDate": "2024-03-15",
  "location": "Living Room",
  "images": [],
  "careSchedule": {
    "watering": {
      "frequencyDays": 7,
      "lastDone": "2026-08-01",
      "notes": "Check soil moisture before watering"
    },
    "fertilizing": {
      "frequencyDays": 30,
      "lastDone": "2026-07-15",
      "fertilizerType": "Balanced 10-10-10",
      "notes": "Dilute to half strength"
    },
    "repotting": {
      "frequencyDays": 365,
      "lastDone": "2024-03-15",
      "potSize": "6 inch",
      "soilType": "Well-draining potting mix"
    },
    "pruning": {
      "frequencyDays": 90,
      "lastDone": "2026-06-01",
      "notes": "Remove yellowing leaves"
    }
  },
  "environment": {
    "light": "Bright indirect",
    "humidity": "Medium (40-60%)",
    "temperature": "18-27C"
  },
  "pestTracking": [],
  "healthLog": [],
  "notes": "Loves the corner spot by the window."
}
```

### Task 7.9 — GitHub Pages deployment workflow

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Task 7.10 — Final verification checklist

- [ ] `npm run build` succeeds with no errors
- [ ] Dev server loads — dashboard shows empty state
- [ ] Import `public/sample-plant.json` — plant appears in catalog
- [ ] Dashboard shows overdue/today tasks for the imported plant
- [ ] Tap "Done" on a task — it disappears, health log updated
- [ ] Open plant detail — all sections render
- [ ] Edit plant — changes persist after save
- [ ] Settings — notification toggle works
- [ ] Export all data — downloads JSON file
- [ ] Bottom nav switches between all 3 tabs

**Commit:** `feat: app shell, global styles, PWA manifest, deployment workflow`

---

## Execution Summary

| Phase | Tasks | Commit |
|-------|-------|--------|
| 1 | Scaffold, types, database | `feat: scaffold project, types, and database layer` |
| 2 | Date, schedule, JSON import utils | `feat: date, schedule, and JSON import utilities` |
| 3 | Svelte stores | `feat: reactive stores for plants and tasks` |
| 4 | 7 components | `feat: bottom nav, task item, and plant card components` + `feat: JSON import, pest alert, image gallery, care log components` |
| 5 | 5 routes | `feat: dashboard and catalog routes` + `feat: plant detail route` + `feat: plant edit and settings routes` |
| 6 | SW + notifier | `feat: service worker and notification system` |
| 7 | App shell, PWA, deploy | `feat: app shell, global styles, PWA manifest, deployment workflow` |

**Total: 7 phases, 28 tasks, 8 commits.**

### Execution Approach

Recommended: **subagent-driven** — dispatch each phase as a separate subagent, verify build between phases. Phases 1-3 are foundational (no UI to test). Phases 4-5 can be split further. Phases 6-7 are independent and can run in parallel after Phase 5.
