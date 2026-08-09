import { db } from './database'
import type { HealthLogAction, HealthLogEntry, PestEntry, Plant } from '../types/plant'
import { toISODate } from '../utils/dates'

export async function logCareAction(
  plantId: string,
  action: HealthLogAction,
  note?: string,
): Promise<void> {
  const plant = await db.plants.get(plantId)
  if (!plant) return

  const todayStr = toISODate(new Date())
  const entry: HealthLogEntry = { date: todayStr, action }
  if (note) entry.note = note

  const healthLog = plant.healthLog || []
  healthLog.push(entry)

  const careSchedule = { ...plant.careSchedule }
  const careEntry = careSchedule[action]
  if (careEntry) {
    careSchedule[action] = { ...careEntry, lastDone: todayStr }
  }

  await db.plants.update(plantId, { healthLog, careSchedule })
}

export async function addPestEntry(plantId: string, entry: PestEntry): Promise<void> {
  const plant = await db.plants.get(plantId)
  if (!plant) return

  const pestTracking = plant.pestTracking || []
  pestTracking.push(entry)

  await db.plants.update(plantId, { pestTracking })
}

export async function updatePestEntry(
  plantId: string,
  index: number,
  updates: Partial<PestEntry>,
): Promise<void> {
  const plant = await db.plants.get(plantId)
  if (!plant || !plant.pestTracking) return

  const pestTracking = [...plant.pestTracking]
  if (index < 0 || index >= pestTracking.length) return
  pestTracking[index] = { ...pestTracking[index], ...updates }

  await db.plants.update(plantId, { pestTracking })
}

export async function getUnresolvedPests(
  plants: Plant[],
): Promise<{ plantId: string; plantName: string; entry: PestEntry; index: number }[]> {
  const result: { plantId: string; plantName: string; entry: PestEntry; index: number }[] = []
  for (const plant of plants) {
    if (!plant.pestTracking) continue
    for (let i = 0; i < plant.pestTracking.length; i++) {
      const entry = plant.pestTracking[i]
      if (!entry.resolved) {
        result.push({ plantId: plant.id, plantName: plant.name, entry, index: i })
      }
    }
  }
  return result
}
