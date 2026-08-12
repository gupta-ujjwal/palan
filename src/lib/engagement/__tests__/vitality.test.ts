import { describe, it, expect } from 'vitest'
import type { Plant } from '../../types/plant'
import { computeVitality, type VitalityStage } from '../vitality'

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    name: 'Fern',
    type: 'Fern',
    careSchedule: { watering: { frequencyDays: 3, lastDone: '2025-06-01' } },
    acquiredDate: '2025-05-01',
    ...overrides,
  }
}

const NOW = new Date(2025, 5, 15)

describe('computeVitality', () => {
  it('a brand-new plant with no history starts as a seedling', () => {
    const result = computeVitality(makePlant({ healthLog: [], pestTracking: [] }), NOW)
    expect(result.stage).toBe('seedling')
    expect(result.score).toBe(0)
  })

  it('a plant with consistent recent care and no pests is thriving or flourishing', () => {
    const healthLog = [
      { date: '2025-06-04', action: 'watering' as const },
      { date: '2025-06-07', action: 'watering' as const },
      { date: '2025-06-10', action: 'watering' as const },
      { date: '2025-06-13', action: 'watering' as const },
    ]
    const result = computeVitality(
      makePlant({
        healthLog,
        careSchedule: { watering: { frequencyDays: 7, lastDone: '2025-05-20' } },
      }),
      NOW,
    )
    expect(['thriving', 'flourishing']).toContain(result.stage)
  })

  it('unresolved pests pull the score down', () => {
    const healthLog = [
      { date: '2025-06-04', action: 'watering' as const },
      { date: '2025-06-07', action: 'watering' as const },
      { date: '2025-06-10', action: 'watering' as const },
      { date: '2025-06-13', action: 'watering' as const },
    ]
    const plant = makePlant({
      healthLog,
      pestTracking: [{ date: '2025-06-12', pest: 'mealybug', resolved: false }],
    })
    const result = computeVitality(plant, NOW)
    const clean = computeVitality(makePlant({ healthLog }), NOW)
    expect(result.score).toBeLessThan(clean.score)
  })

  it('score is bounded within [0, 100]', () => {
    const extreme = makePlant({
      careSchedule: {
        watering: { frequencyDays: 1, lastDone: '2025-01-01' },
        fertilizing: { frequencyDays: 1, lastDone: '2025-01-01' },
      },
      healthLog: [],
      pestTracking: [
        { date: '2025-06-01', pest: 'aphid', resolved: false },
        { date: '2025-06-02', pest: 'scale', resolved: false },
        { date: '2025-06-03', pest: 'mite', resolved: false },
      ],
    })
    const result = computeVitality(extreme, NOW)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('a plant with no scheduled tasks (other than watering, which is required) never errors', () => {
    expect(() => computeVitality(makePlant(), NOW)).not.toThrow()
  })

  it('resolved pests do not drag the score as much as open ones', () => {
    const base = makePlant({
      healthLog: [{ date: '2025-06-13', action: 'watering' as const }],
    })
    const withOpen = makePlant({
      healthLog: base.healthLog,
      pestTracking: [{ date: '2025-06-10', pest: 'mite', resolved: false }],
    })
    const withResolved = makePlant({
      healthLog: base.healthLog,
      pestTracking: [
        { date: '2025-06-10', pest: 'mite', resolved: true, resolvedDate: '2025-06-12' },
      ],
    })
    const openScore = computeVitality(withOpen, NOW).score
    const resolvedScore = computeVitality(withResolved, NOW).score
    expect(resolvedScore).toBeGreaterThan(openScore)
  })

  it('returns one of the four named stages', () => {
    const stages: VitalityStage[] = ['seedling', 'sprout', 'thriving', 'flourishing']
    const result = computeVitality(makePlant(), NOW)
    expect(stages).toContain(result.stage)
  })
})
