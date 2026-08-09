import { describe, it, expect } from 'vitest'
import type { Plant } from '../../types/plant'
import {
  getNextDueDate,
  getTaskStatus,
  getAllTasks,
  getDueTasks,
  getOverdueTasks,
  getTodayTasks,
  getUpcomingTasks,
  sortTasksByUrgency,
} from '../schedule'

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 'test-1',
    name: 'Test Plant',
    type: 'Tropical',
    careSchedule: {
      watering: { frequencyDays: 7, lastDone: '2024-08-01' },
      ...overrides.careSchedule,
    },
    ...overrides,
  }
}

const REFERENCE_NOW = new Date('2024-08-10T00:00:00')

describe('getNextDueDate', () => {
  it('calculates next due from lastDone + frequencyDays', () => {
    const plant = makePlant()
    const due = getNextDueDate(plant, 'watering')
    expect(due).not.toBeNull()
    expect(due!.getDate()).toBe(8) // Aug 1 + 7 = Aug 8
  })

  it('returns null when frequencyDays is missing', () => {
    const plant = makePlant({
      careSchedule: {
        watering: { frequencyDays: 7, lastDone: '2024-08-01' },
        fertilizing: { frequencyDays: 0 },
      },
    })
    expect(getNextDueDate(plant, 'fertilizing')).toBeNull()
  })

  it('returns null when care type is not in schedule', () => {
    const plant = makePlant()
    expect(getNextDueDate(plant, 'pruning')).toBeNull()
  })

  it('uses acquiredDate when lastDone is missing', () => {
    const plant = makePlant({
      acquiredDate: '2024-08-05',
      careSchedule: {
        watering: { frequencyDays: 7 },
      },
    })
    const due = getNextDueDate(plant, 'watering')
    expect(due).not.toBeNull()
    expect(due!.getDate()).toBe(12) // Aug 5 + 7 = Aug 12
  })

  it('uses today when both lastDone and acquiredDate are missing', () => {
    const plant = makePlant({
      careSchedule: {
        watering: { frequencyDays: 7 },
      },
    })
    const due = getNextDueDate(plant, 'watering')
    expect(due).not.toBeNull()
    // nextDue should be today + 7
    const expected = new Date()
    expected.setDate(expected.getDate() + 7)
    expect(due!.getDate()).toBe(expected.getDate())
  })

  it('treats future lastDone as today', () => {
    const plant = makePlant({
      careSchedule: {
        watering: { frequencyDays: 7, lastDone: '2099-01-01' },
      },
    })
    const due = getNextDueDate(plant, 'watering')
    expect(due).not.toBeNull()
    const expected = new Date()
    expected.setDate(expected.getDate() + 7)
    expect(due!.getDate()).toBe(expected.getDate())
  })
})

describe('getTaskStatus', () => {
  it('returns overdue status', () => {
    const plant = makePlant() // lastDone Aug 1, freq 7 → due Aug 8, now Aug 10
    const status = getTaskStatus(plant, 'watering', REFERENCE_NOW)
    expect(status).not.toBeNull()
    expect(status!.isOverdue).toBe(true)
    expect(status!.daysUntilDue).toBe(-2)
  })

  it('returns due-today status', () => {
    const plant = makePlant({
      careSchedule: {
        watering: { frequencyDays: 7, lastDone: '2024-08-03' },
      },
    })
    const status = getTaskStatus(plant, 'watering', REFERENCE_NOW)
    expect(status).not.toBeNull()
    expect(status!.isOverdue).toBe(false)
    expect(status!.daysUntilDue).toBe(0)
  })

  it('returns upcoming status', () => {
    const plant = makePlant({
      careSchedule: {
        watering: { frequencyDays: 7, lastDone: '2024-08-05' },
      },
    })
    const status = getTaskStatus(plant, 'watering', REFERENCE_NOW)
    expect(status).not.toBeNull()
    expect(status!.isOverdue).toBe(false)
    expect(status!.daysUntilDue).toBe(2)
  })

  it('returns null for care type with no schedule', () => {
    const plant = makePlant()
    expect(getTaskStatus(plant, 'pruning', REFERENCE_NOW)).toBeNull()
  })
})

describe('getAllTasks', () => {
  it('generates tasks for all care types with schedules', () => {
    const plant = makePlant({
      careSchedule: {
        watering: { frequencyDays: 7, lastDone: '2024-08-03' },
        fertilizing: { frequencyDays: 30, lastDone: '2024-07-15' },
      },
    })
    const tasks = getAllTasks([plant], REFERENCE_NOW)
    expect(tasks).toHaveLength(2)
    expect(tasks.map((t) => t.careType).sort()).toEqual(['fertilizing', 'watering'])
  })

  it('includes plant info in task', () => {
    const plant = makePlant({ name: 'Monsty', nickname: 'Monsty Boy' })
    const tasks = getAllTasks([plant], REFERENCE_NOW)
    expect(tasks[0].plantName).toBe('Monsty')
    expect(tasks[0].plantNickname).toBe('Monsty Boy')
    expect(tasks[0].plantId).toBe('test-1')
  })
})

describe('getDueTasks', () => {
  it('filters to overdue and today only', () => {
    const plants = [
      makePlant({
        id: 'overdue',
        careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-01' } },
      }),
      makePlant({
        id: 'today',
        careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-03' } },
      }),
      makePlant({
        id: 'upcoming',
        careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-05' } },
      }),
    ]
    const due = getDueTasks(plants, REFERENCE_NOW)
    expect(due).toHaveLength(2)
    expect(due.map((t) => t.plantId).sort()).toEqual(['overdue', 'today'])
  })
})

describe('getOverdueTasks', () => {
  it('filters to overdue only', () => {
    const plants = [
      makePlant({
        id: 'overdue',
        careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-01' } },
      }),
      makePlant({
        id: 'today',
        careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-03' } },
      }),
    ]
    const overdue = getOverdueTasks(plants, REFERENCE_NOW)
    expect(overdue).toHaveLength(1)
    expect(overdue[0].plantId).toBe('overdue')
  })
})

describe('getTodayTasks', () => {
  it('filters to today only', () => {
    const plants = [
      makePlant({
        id: 'overdue',
        careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-01' } },
      }),
      makePlant({
        id: 'today',
        careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-03' } },
      }),
    ]
    const today = getTodayTasks(plants, REFERENCE_NOW)
    expect(today).toHaveLength(1)
    expect(today[0].plantId).toBe('today')
  })
})

describe('getUpcomingTasks', () => {
  it('filters to upcoming within N days', () => {
    const plants = [
      makePlant({
        id: 'due-soon',
        careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-05' } },
      }),
      makePlant({
        id: 'due-later',
        careSchedule: { watering: { frequencyDays: 30, lastDone: '2024-08-01' } },
      }),
    ]
    const upcoming = getUpcomingTasks(plants, 3, REFERENCE_NOW)
    expect(upcoming).toHaveLength(1)
    expect(upcoming[0].plantId).toBe('due-soon')
  })
})

describe('sortTasksByUrgency', () => {
  it('sorts overdue first, then by daysUntilDue', () => {
    const tasks = getAllTasks(
      [
        makePlant({
          id: 'upcoming',
          careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-05' } },
        }),
        makePlant({
          id: 'overdue',
          careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-01' } },
        }),
        makePlant({
          id: 'today',
          careSchedule: { watering: { frequencyDays: 7, lastDone: '2024-08-03' } },
        }),
      ],
      REFERENCE_NOW,
    )
    const sorted = sortTasksByUrgency(tasks)
    expect(sorted[0].plantId).toBe('overdue')
    expect(sorted[1].plantId).toBe('today')
    expect(sorted[2].plantId).toBe('upcoming')
  })
})
