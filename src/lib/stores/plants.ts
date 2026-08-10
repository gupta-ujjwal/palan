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

  function toPlain<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }

  async function add(plant: Plant) {
    const plain = toPlain(plant)
    await addPlant(plain)
    update((plants) => [...plants, plain])
  }

  async function save(plant: Plant) {
    const plain = toPlain(plant)
    await updatePlant(plain)
    update((plants) => plants.map((p) => (p.id === plain.id ? plain : p)))
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
