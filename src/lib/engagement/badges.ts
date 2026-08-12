import type { BadgeId, GardenState, Plant } from '../types/plant'
import { computeStreak } from './streaks'
import { parseISODate, daysBetween, toISODate } from '../utils/dates'

export interface BadgeDefinition {
  id: BadgeId
  icon: string
  label: string
  description: string
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-plant',
    icon: '🌱',
    label: 'First Plant',
    description: 'Added your first plant to the garden.',
  },
  {
    id: 'streak-7',
    icon: '🔥',
    label: 'Week of Care',
    description: 'Kept a 7-day care streak alive.',
  },
  {
    id: 'streak-30',
    icon: '🏅',
    label: 'Month of Care',
    description: 'Kept a 30-day care streak alive.',
  },
  {
    id: 'streak-100',
    icon: '🏆',
    label: 'Centurion',
    description: 'Kept a 100-day care streak alive.',
  },
  {
    id: 'pest-free-30',
    icon: '🛡️',
    label: 'Pest-Free Month',
    description: '30 days without an unresolved pest on any plant.',
  },
  {
    id: 'full-garden-water',
    icon: '💧',
    label: 'Full Sweep',
    description: 'Every plant watered on the same day.',
  },
  {
    id: 'ten-plants',
    icon: '🪴',
    label: 'Growing Family',
    description: '10 plants in your collection.',
  },
  {
    id: 'first-rescue',
    icon: '🩹',
    label: 'First Rescue',
    description: 'Successfully resolved a pest infestation.',
  },
]

export interface UnlockedBadgeRecord {
  id: BadgeId
  unlockedAt: string
}

export interface BadgeCheckOutput {
  unlocked: UnlockedBadgeRecord[]
  newlyUnlocked: UnlockedBadgeRecord[]
}

export function computeUnlockedBadges(
  plants: Plant[],
  state: GardenState,
  now: Date = new Date(),
): BadgeCheckOutput {
  const already = new Set(state.unlockedBadges.map((b) => b.id))
  const todayIso = toISODate(now)
  const newlyUnlocked: UnlockedBadgeRecord[] = []
  const push = (id: BadgeId) => {
    if (already.has(id)) return
    already.add(id)
    newlyUnlocked.push({ id, unlockedAt: todayIso })
  }

  if (plants.length >= 1) push('first-plant')
  if (plants.length >= 10) push('ten-plants')

  const streak = computeStreak(plants, { now })
  if (streak.currentStreak >= 7) push('streak-7')
  if (streak.currentStreak >= 30) push('streak-30')
  if (streak.currentStreak >= 100) push('streak-100')

  if (plants.length > 0) {
    const anyUnresolved = plants.some((p) => (p.pestTracking ?? []).some((e) => !e.resolved))
    const oldest = plants.reduce<number | null>((acc, p) => {
      const iso = p.acquiredDate ?? p.careSchedule.watering.lastDone
      const d = iso ? parseISODate(iso) : null
      if (!d) return acc
      const diff = daysBetween(d, now)
      return acc === null ? diff : Math.max(acc, diff)
    }, null)
    if (!anyUnresolved && oldest !== null && oldest >= 30) push('pest-free-30')
  }

  for (const plant of plants) {
    if ((plant.pestTracking ?? []).some((e) => e.resolved)) {
      push('first-rescue')
      break
    }
  }

  if (plants.length > 0) {
    const wateringDays = new Map<string, Set<string>>()
    for (const plant of plants) {
      for (const entry of plant.healthLog ?? []) {
        if (entry.action !== 'watering') continue
        const set = wateringDays.get(entry.date) ?? new Set<string>()
        set.add(plant.id)
        wateringDays.set(entry.date, set)
      }
    }
    const allPlantIds = new Set(plants.map((p) => p.id))
    let fullSweep = false
    for (const ids of wateringDays.values()) {
      if (ids.size === allPlantIds.size) {
        fullSweep = true
        break
      }
    }
    if (fullSweep) push('full-garden-water')
  }

  return { unlocked: [...state.unlockedBadges, ...newlyUnlocked], newlyUnlocked }
}
