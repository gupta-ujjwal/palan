import type { Plant } from '../types/plant'
import { parseISODate, daysBetween } from '../utils/dates'

export type VitalityStage = 'seedling' | 'sprout' | 'thriving' | 'flourishing'

export const VITALITY_METADATA: Record<
  VitalityStage,
  { icon: string; label: string; shapeClass: string }
> = {
  seedling: { icon: '🌱', label: 'Seedling', shapeClass: 'stage-seedling' },
  sprout: { icon: '🌿', label: 'Sprout', shapeClass: 'stage-sprout' },
  thriving: { icon: '🪴', label: 'Thriving', shapeClass: 'stage-thriving' },
  flourishing: { icon: '🌸', label: 'Flourishing', shapeClass: 'stage-flourishing' },
}

export interface Vitality {
  stage: VitalityStage
  score: number
  onTimeRate: number
  pestResolutionRate: number
  careActivityRate: number
}

const ON_TIME_WEIGHT = 0.5
const PEST_WEIGHT = 0.2
const ACTIVITY_WEIGHT = 0.3

const THRIVING_THRESHOLD = 70
const FLOURISHING_THRESHOLD = 88
const SPROUT_THRESHOLD = 30

const LOOKBACK_DAYS = 30
const ACTIVE_DAYS_PER_WEEK = 1

export function computeVitality(plant: Plant, now: Date = new Date()): Vitality {
  const log = (plant.healthLog ?? []).filter((e) => parseISODate(e.date) !== null)
  const pests = plant.pestTracking ?? []

  if (log.length === 0) {
    return {
      stage: 'seedling',
      score: 0,
      onTimeRate: 0,
      pestResolutionRate: 1,
      careActivityRate: 0,
    }
  }

  const recentWaterings = log.filter((e) => {
    if (e.action !== 'watering') return false
    const d = parseISODate(e.date)
    if (!d) return false
    const diff = daysBetween(d, now)
    return diff >= 0 && diff <= LOOKBACK_DAYS
  }).length

  const dueWaterings = Math.max(1, Math.floor(LOOKBACK_DAYS / plant.careSchedule.watering.frequencyDays))
  const onTimeRate = clamp01(recentWaterings / dueWaterings)

  const pestResolutionRate =
    pests.length === 0
      ? 1
      : clamp01(pests.filter((p) => p.resolved).length / Math.max(1, pests.length))

  const recentCompletions = log.filter((e) => {
    const d = parseISODate(e.date)
    if (!d) return false
    const diff = daysBetween(d, now)
    return diff >= 0 && diff <= LOOKBACK_DAYS
  }).length
  const careActivityRate = clamp01(recentCompletions / (LOOKBACK_DAYS / 7) / ACTIVE_DAYS_PER_WEEK)

  const weighted =
    onTimeRate * ON_TIME_WEIGHT + pestResolutionRate * PEST_WEIGHT + careActivityRate * ACTIVITY_WEIGHT
  const openPestPenalty = pests.some((p) => !p.resolved) ? 15 : 0
  const score = Math.max(0, Math.min(100, Math.round(weighted * 100 - openPestPenalty)))

  let stage: VitalityStage = 'seedling'
  if (score >= FLOURISHING_THRESHOLD) stage = 'flourishing'
  else if (score >= THRIVING_THRESHOLD) stage = 'thriving'
  else if (score >= SPROUT_THRESHOLD) stage = 'sprout'

  return { stage, score, onTimeRate, pestResolutionRate, careActivityRate }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(1, Math.max(0, n))
}
