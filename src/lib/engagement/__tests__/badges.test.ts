import { describe, it, expect } from 'vitest'
import type { Plant } from '../../types/plant'
import {
  computeUnlockedBadges,
  BADGE_DEFINITIONS,
  type UnlockedBadgeRecord,
} from '../badges'
import type { GardenState } from '../../types/plant'

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 'p' + Math.random().toString(36).slice(2, 8),
    name: 'Fern',
    type: 'Fern',
    careSchedule: { watering: { frequencyDays: 3, lastDone: '2025-05-01' } },
    acquiredDate: '2025-05-01',
    ...overrides,
  }
}

const NOW = new Date(2025, 5, 15)

const EMPTY_GARDEN: GardenState = {
  id: 'garden',
  graceTokenLastGranted: '',
  graceTokensUsed: [],
  unlockedBadges: [],
}

describe('computeUnlockedBadges', () => {
  it('grants first-plant the first time a garden exists', () => {
    const out = computeUnlockedBadges([makePlant()], EMPTY_GARDEN, NOW)
    const ids = out.newlyUnlocked.map((b) => b.id)
    expect(ids).toContain('first-plant')
  })

  it('does not re-grant an already-unlocked badge', () => {
    const garden: GardenState = {
      ...EMPTY_GARDEN,
      unlockedBadges: [{ id: 'first-plant', unlockedAt: '2025-05-01' }],
    }
    const out = computeUnlockedBadges([makePlant()], garden, NOW)
    expect(out.newlyUnlocked.find((b) => b.id === 'first-plant')).toBeUndefined()
  })

  it('grants streak-7 at a 7-day current streak', () => {
    // log one entry per day for the 7 days ending yesterday so the current streak is 7
    const log = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2025, 5, 13 - i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return { date: iso, action: 'watering' as const }
    })
    const plant = makePlant({
      careSchedule: { watering: { frequencyDays: 1, lastDone: '2025-06-06' } },
      healthLog: log,
    })
    const out = computeUnlockedBadges([plant], EMPTY_GARDEN, NOW)
    const ids = out.newlyUnlocked.map((b) => b.id)
    expect(ids).toContain('streak-7')
  })

  it('does not grant streak-30 below 30 days', () => {
    const log = Array.from({ length: 20 }, (_, i) => {
      const d = new Date(2025, 4, i + 1)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return { date: iso, action: 'watering' as const }
    })
    const plant = makePlant({
      careSchedule: { watering: { frequencyDays: 1, lastDone: '2025-05-01' } },
      healthLog: log,
    })
    const out = computeUnlockedBadges([plant], EMPTY_GARDEN, NOW)
    expect(out.newlyUnlocked.find((b) => b.id === 'streak-30')).toBeUndefined()
  })

  it('grants pest-free-30 when 30 days passed with no unresolved pest', () => {
    const plant = makePlant({
      acquiredDate: '2025-04-15',
      healthLog: [{ date: '2025-05-01', action: 'watering' }],
      pestTracking: [],
    })
    const out = computeUnlockedBadges([plant], EMPTY_GARDEN, NOW)
    expect(out.newlyUnlocked.find((b) => b.id === 'pest-free-30')).toBeDefined()
  })

  it('does not grant pest-free-30 when a pest is still unresolved', () => {
    const plant = makePlant({
      acquiredDate: '2025-04-15',
      pestTracking: [{ date: '2025-05-10', pest: 'mite', resolved: false }],
    })
    const out = computeUnlockedBadges([plant], EMPTY_GARDEN, NOW)
    expect(out.newlyUnlocked.find((b) => b.id === 'pest-free-30')).toBeUndefined()
  })

  it('grants ten-plants when garden reaches 10 plants', () => {
    const plants = Array.from({ length: 10 }, () => makePlant())
    const out = computeUnlockedBadges(plants, EMPTY_GARDEN, NOW)
    expect(out.newlyUnlocked.find((b) => b.id === 'ten-plants')).toBeDefined()
  })

  it('returns stable output given same inputs (no timestamp drift between calls)', () => {
    const plant = makePlant()
    const a = computeUnlockedBadges([plant], EMPTY_GARDEN, NOW)
    const b = computeUnlockedBadges([plant], EMPTY_GARDEN, NOW)
    expect(a).toEqual(b)
  })
})

describe('BADGE_DEFINITIONS', () => {
  it('every BadgeId in the type union has a definition', () => {
    const ids = ['first-plant', 'streak-7', 'streak-30', 'streak-100', 'pest-free-30', 'full-garden-water', 'ten-plants', 'first-rescue']
    for (const id of ids) {
      expect(BADGE_DEFINITIONS.find((b) => b.id === id)).toBeDefined()
    }
  })
})
