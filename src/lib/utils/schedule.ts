import type { CareSchedule, CareTask, CareType, Plant } from '../types/plant'
import { CARE_TYPES } from '../types/plant'
import { addDays, daysBetween, isFuture, parseISODate, today } from './dates'

interface CareScheduleEntry {
  frequencyDays: number
  lastDone?: string
}

function getScheduleEntry(schedule: CareSchedule, careType: CareType): CareScheduleEntry | null {
  const entry = schedule[careType]
  if (!entry || typeof entry.frequencyDays !== 'number' || entry.frequencyDays <= 0) {
    return null
  }
  return entry as CareScheduleEntry
}

function getEffectiveLastDone(entry: CareScheduleEntry, plant: Plant): Date {
  if (entry.lastDone) {
    const parsed = parseISODate(entry.lastDone)
    if (parsed) {
      if (isFuture(parsed)) {
        return today()
      }
      return parsed
    }
  }
  if (plant.acquiredDate) {
    const parsed = parseISODate(plant.acquiredDate)
    if (parsed) return parsed
  }
  return today()
}

export function getNextDueDate(plant: Plant, careType: CareType): Date | null {
  const entry = getScheduleEntry(plant.careSchedule, careType)
  if (!entry) return null

  const lastDone = getEffectiveLastDone(entry, plant)
  return addDays(lastDone, entry.frequencyDays)
}

export function getTaskStatus(
  plant: Plant,
  careType: CareType,
  now: Date = today(),
): { nextDue: Date; isOverdue: boolean; daysUntilDue: number } | null {
  const nextDue = getNextDueDate(plant, careType)
  if (!nextDue) return null

  const days = daysBetween(now, nextDue)
  const isOverdue = days < 0

  return {
    nextDue,
    isOverdue,
    daysUntilDue: days,
  }
}

export function getAllTasks(plants: Plant[], now: Date = today()): CareTask[] {
  const tasks: CareTask[] = []

  for (const plant of plants) {
    for (const careType of CARE_TYPES) {
      const status = getTaskStatus(plant, careType, now)
      if (!status) continue

      tasks.push({
        plantId: plant.id,
        plantName: plant.name,
        plantNickname: plant.nickname,
        plantImage: plant.images?.[0],
        careType,
        nextDue: status.nextDue,
        isOverdue: status.isOverdue,
        daysUntilDue: status.daysUntilDue,
      })
    }
  }

  return tasks
}

export function getDueTasks(plants: Plant[], now: Date = today()): CareTask[] {
  return getAllTasks(plants, now).filter((t) => t.isOverdue || t.daysUntilDue === 0)
}

export function getOverdueTasks(plants: Plant[], now: Date = today()): CareTask[] {
  return getAllTasks(plants, now).filter((t) => t.isOverdue)
}

export function getTodayTasks(plants: Plant[], now: Date = today()): CareTask[] {
  return getAllTasks(plants, now).filter((t) => t.daysUntilDue === 0)
}

export function getUpcomingTasks(
  plants: Plant[],
  days: number = 3,
  now: Date = today(),
): CareTask[] {
  return getAllTasks(plants, now).filter(
    (t) => !t.isOverdue && t.daysUntilDue > 0 && t.daysUntilDue <= days,
  )
}

export function sortTasksByUrgency(tasks: CareTask[]): CareTask[] {
  return [...tasks].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    return a.daysUntilDue - b.daysUntilDue
  })
}
