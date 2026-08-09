import { writable } from 'svelte/store'
import type { Plant } from '../types/plant'
import { getAllPlants, addPlant, updatePlant, deletePlant } from '../db/plants'

function createPlantsStore() {
  const { subscribe, set, update } = writable<Plant[]>([])
  let loaded = false

  async function load() {
    if (loaded) return
    const plants = await getAllPlants()
    set(plants)
    loaded = true
  }

  async function add(plant: Plant) {
    await addPlant(plant)
    update((plants) => [...plants, plant])
  }

  async function save(plant: Plant) {
    await updatePlant(plant)
    update((plants) => plants.map((p) => (p.id === plant.id ? plant : p)))
  }

  async function remove(id: string) {
    await deletePlant(id)
    update((plants) => plants.filter((p) => p.id !== id))
  }

  async function reload() {
    const plants = await getAllPlants()
    set(plants)
  }

  function reset() {
    set([])
    loaded = false
  }

  return {
    subscribe,
    load,
    add,
    save,
    remove,
    reload,
    reset,
  }
}

export const plantsStore = createPlantsStore()
