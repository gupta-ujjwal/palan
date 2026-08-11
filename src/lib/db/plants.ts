import { db } from './database'
import type { Plant } from '../types/plant'

export async function getAllPlants(): Promise<Plant[]> {
  return db.plants.toArray()
}

export async function getPlant(id: string): Promise<Plant | undefined> {
  return db.plants.get(id)
}

export async function addPlant(plant: Plant): Promise<void> {
  await db.plants.add(plant)
}

export async function updatePlant(plant: Plant): Promise<void> {
  await db.plants.put(plant)
}

export async function deletePlant(id: string): Promise<void> {
  await db.plants.delete(id)
}

export async function getPlantsByType(type: string): Promise<Plant[]> {
  return db.plants.where('type').equals(type).toArray()
}

export async function searchPlants(query: string): Promise<Plant[]> {
  const all = await db.plants.toArray()
  const lower = query.toLowerCase()
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      (p.nickname?.toLowerCase().includes(lower) ?? false) ||
      (p.species?.toLowerCase().includes(lower) ?? false) ||
      (p.location?.toLowerCase().includes(lower) ?? false),
  )
}

export async function getPlantTypes(): Promise<string[]> {
  const all = await db.plants.toArray()
  return [...new Set(all.map((p) => p.type))].sort()
}

export async function exportAllData(): Promise<Plant[]> {
  return db.plants.toArray()
}

export async function clearAllData(): Promise<void> {
  await db.plants.clear()
  await db.appSettings.clear()
  await db.gardenState.clear()
}
