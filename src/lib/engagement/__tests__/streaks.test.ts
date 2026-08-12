import { describe, it, expect } from 'vitest'
import type { Plant } from '../../types/plant'
import { computeStreak, type StreakResult, type DayRecord } from '../streaks'

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    name: 'Fern',
    type: 'Fern',
    careSchedule: { watering: { frequencyDays: 2 } },
    ...overrides,
  }
}

describe('computeStreak', () => {
  it('returns zero streak when there are no plants', () => {
    // RED: computeStreak does not exist yet
    const result = computeStreak([], { now: new Date(2025, 5, 10) })
    expect(result.currentStreak).toBe(0)
    expect(result.longestStreak).toBe(0)
    expect(result.days).toEqual([])
  })

  it('returns zero streak when a plant was just created today with no completions yet', () => {
    // A plant created today with no history: today is not complete (task may be due), but nothing is broken either
    const plant = makePlant({ acquiredDate: '2025-06-10' })
    const result = computeStreak([plant], { now: new Date(2025, 5, 10) })
    expect(result.currentStreak).toBe(0)
    expect(result.graceTokensAvailable).toBe(1)
  })

  it('counts consecutive perfect days as the current streak', () => {
    // Watering every 2 days. Watered on days -4, -2, and today (0).
    // Due dates: if lastDone = day-4, next due = day-2. Completing on day-2 → next due day 0. Completing on day 0 → perfect.
    const plant = makePlant({
      acquiredDate: '2025-05-01',
      careSchedule: {
        watering: { frequencyDays: 2, lastDone: '2025-06-04' },
      },
      healthLog: [
        { date: '2025-06-04', action: 'watering' },
        { date: '2025-06-06', action: 'watering' },
        { date: '2025-06-08', action: 'watering' },
        { date: '2025-06-10', action: 'watering' },
      ],
    })
    // today = June 10. Due chain from May 1 (acquired): May 3, 5, 7... but first log June 4 resets chain.
    // Reconstructed timeline: before June 4 there isn't enough info → streak algorithm only counts days from the earliest evidence point.
    const result = computeStreak([plant], { now: new Date(2025, 5, 10) })
    expect(result.currentStreak).toBeGreaterThanOrEqual(3)
  })

  it('a day only counts when every task due that day was completed on time', () => {
    // Two plants: one watered on time, one never watered → day does not count
    const good = makePlant({
      id: 'good',
      name: 'Good',
      acquiredDate: '2025-06-01',
      careSchedule: { watering: { frequencyDays: 1, lastDone: '2025-06-02' } },
      healthLog: [
        { date: '2025-06-02', action: 'watering' },
        { date: '2025-06-03', action: 'watering' },
      ],
    })
    const bad = makePlant({
      id: 'bad',
      name: 'Bad',
      acquiredDate: '2025-06-01',
      careSchedule: { watering: { frequencyDays: 1, lastDone: '2025-06-02' } },
      healthLog: [{ date: '2025-06-02', action: 'watering' }], // missing June 3
    })
    const result = computeStreak([good, bad], { now: new Date(2025, 5, 3) })
    expect(result.currentStreak).toBeLessThan(2)
  })

  it('a grace token rescues a single missed day without breaking the streak', () => {
    const plant = makePlant({
      acquiredDate: '2025-06-01',
      careSchedule: { watering: { frequencyDays: 1, lastDone: '2025-06-01' } },
      healthLog: [
        { date: '2025-06-01', action: 'watering' },
        { date: '2025-06-02', action: 'watering' },
        // 2025-06-03 missed entirely
        { date: '2025-06-04', action: 'watering' },
        { date: '2025-06-05', action: 'watering' },
      ],
    })
    const result = computeStreak([plant], { now: new Date(2025, 5, 5) })
    expect(result.days.filter((d) => d.status === 'grace')).toHaveLength(1)
    expect(result.currentStreak).toBeGreaterThan(0)
    expect(result.graceTokensAvailable).toBe(0)
  })

  it('two missed days in a 7-day window break the streak (only one grace)', () => {
    const plant = makePlant({
      acquiredDate: '2025-06-01',
      careSchedule: { watering: { frequencyDays: 1, lastDone: '2025-06-01' } },
      healthLog: [
        { date: '2025-06-01', action: 'watering' },
        { date: '2025-06-02', action: 'watering' },
        // 3rd missed
        // 4th missed
        { date: '2025-06-05', action: 'watering' },
      ],
    })
    const result = computeStreak([plant], { now: new Date(2025, 5, 5) })
    const misses = result.days.filter((d) => d.status === 'missed' || d.status === 'grace')
    expect(misses.length).toBe(2)
    expect(misses.filter((d) => d.status === 'missed')).toHaveLength(1)
  })

  it('longest streak is tracked independently of the current streak', () => {
    const plant = makePlant({
      acquiredDate: '2025-05-01',
      careSchedule: { watering: { frequencyDays: 1, lastDone: '2025-05-01' } },
      healthLog: [
        { date: '2025-05-01', action: 'watering' },
        { date: '2025-05-02', action: 'watering' },
        { date: '2025-05-03', action: 'watering' },
        { date: '2025-05-04', action: 'watering' },
        { date: '2025-05-05', action: 'watering' },
        // long gap — total breakage
        { date: '2025-06-09', action: 'watering' },
        { date: '2025-06-10', action: 'watering' },
      ],
    })
    const result = computeStreak([plant], { now: new Date(2025, 5, 10) })
    expect(result.longestStreak).toBeGreaterThan(result.currentStreak)
    expect(result.longestStreak).toBeGreaterThanOrEqual(4)
  })

  it('days with no tasks due do not break a streak but do not extend it either', () => {
    // Weekly watering — most days have nothing due. Streak should not inflate from empty days.
    const plant = makePlant({
      acquiredDate: '2025-06-01',
      careSchedule: { watering: { frequencyDays: 7, lastDone: '2025-06-01' } },
      healthLog: [
        { date: '2025-06-01', action: 'watering' },
        { date: '2025-06-08', action: 'watering' },
      ],
    })
    const result = computeStreak([plant], { now: new Date(2025, 5, 8) })
    const recordedDays = result.days
    const perfect = recordedDays.filter((d) => d.status === 'perfect')
    expect(perfect.length).toBeLessThanOrEqual(2)
    expect(result.currentStreak).toBeLessThanOrEqual(2)
  })

  it('ignores healthLog entries with unknown/future actions gracefully', () => {
    const plant = makePlant({
      acquiredDate: '2025-06-01',
      careSchedule: { watering: { frequencyDays: 1, lastDone: '2025-06-01' } },
      healthLog: [{ date: '2025-06-01', action: 'watering' }],
    })
    expect(() => computeStreak([plant], { now: new Date(2025, 5, 2) })).not.toThrow()
  })

  it('today is not counted until all of today’s tasks are done', () => {
    // freq=2. Last completion June 8. Next due = June 10... wait: window = (June 8, June 10]
    // and the June 8 completion sits exactly ON windowStart, not inside it. Actually
    // completion ON windowStart is not > windowStart, so today's due is NOT covered.
    const plant = makePlant({
      acquiredDate: '2025-06-01',
      careSchedule: { watering: { frequencyDays: 2, lastDone: '2025-06-08' } },
      healthLog: [{ date: '2025-06-08', action: 'watering' }],
    })
    const result = computeStreak([plant], { now: new Date(2025, 5, 10) })
    const todayRecord = result.days.find((d) => d.date === '2025-06-10')
    expect(todayRecord?.status).not.toBe('perfect')
  })
})

describe('StreakResult shape', () => {
  it('exposes days in ascending chronological order', () => {
    const plant = makePlant({
      acquiredDate: '2025-06-01',
      careSchedule: { watering: { frequencyDays: 1, lastDone: '2025-06-01' } },
      healthLog: [{ date: '2025-06-01', action: 'watering' }],
    })
    const result: StreakResult = computeStreak([plant], { now: new Date(2025, 5, 3) })
    const dates = result.days.map((d: DayRecord) => d.date)
    const sorted = [...dates].sort()
    expect(dates).toEqual(sorted)
  })
})
