import { writable } from 'svelte/store'
import type { GardenState } from '../types/plant'
import { db, DEFAULT_GARDEN_STATE } from '../db/database'

function createGardenStore() {
  const { subscribe, set } = writable<GardenState>({ ...DEFAULT_GARDEN_STATE })

  async function load() {
    const existing = await db.gardenState.get('garden')
    if (existing) set(existing)
  }

  async function save(next: GardenState) {
    await db.gardenState.put(next)
    set(next)
  }

  async function reset() {
    await db.gardenState.clear()
    set({ ...DEFAULT_GARDEN_STATE })
  }

  return { subscribe, load, save, reset }
}

export const gardenStore = createGardenStore()
