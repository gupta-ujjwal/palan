import { db } from './database'
import type { HealthLogAction, HealthLogEntry, PestEntry, Plant } from '../types/plant'
import { toISODate } from '../utils/dates'
import { syncScheduledNotificationsFromDb } from '../notifications/notifier'

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

  // Fire-and-forget: refresh the scheduled reminders to reflect the new lastDone.
  // Errors are swallowed so a notification failure never breaks a care log write.
  void syncScheduledNotificationsFromDb().catch(() => {})
}

export async function undoLastCareAction(
  plantId: string,
  action: HealthLogAction,
  previousLastDone: string | undefined,
): Promise<void> {
  const plant = await db.plants.get(plantId)
  if (!plant) return

  const healthLog = [...(plant.healthLog ?? [])]
  for (let i = healthLog.length - 1; i >= 0; i--) {
    if (healthLog[i].action === action) {
      healthLog.splice(i, 1)
      break
    }
  }

  const careSchedule = { ...plant.careSchedule }
  const careEntry = careSchedule[action]
  if (careEntry) {
    const next = { ...careEntry }
    if (previousLastDone === undefined) {
      delete next.lastDone
    } else {
      next.lastDone = previousLastDone
    }
    careSchedule[action] = next
  }

  await db.plants.update(plantId, { healthLog, careSchedule })

  // Fire-and-forget: refresh the scheduled reminders to reflect the new lastDone.
  // Errors are swallowed so a notification failure never breaks the undo path.
  void syncScheduledNotificationsFromDb().catch(() => {})
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
