import { describe, it, expect } from 'vitest'
import { isInQuietHours, buildBundleNotification } from '../notifications'
import type { AppSettings, CareTask } from '../../types/plant'

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    id: 'settings',
    notificationsEnabled: true,
    notificationTime: '09:00',
    mutedPlantIds: [],
    quietHoursEnabled: false,
    quietHoursStart: '21:00',
    quietHoursEnd: '08:00',
    ...overrides,
  }
}

function task(overrides: Partial<CareTask> = {}): CareTask {
  return {
    plantId: 'p1',
    plantName: 'Fern',
    plantNickname: undefined,
    plantImage: undefined,
    careType: 'watering',
    nextDue: new Date(2025, 5, 10),
    isOverdue: false,
    daysUntilDue: 0,
    ...overrides,
  }
}

describe('isInQuietHours', () => {
  it('returns false when quiet hours are disabled', () => {
    const s = makeSettings({ quietHoursEnabled: false })
    expect(isInQuietHours(s, new Date(2025, 5, 10, 23, 0))).toBe(false)
  })

  it('returns false when times missing', () => {
    const s = makeSettings({
      quietHoursEnabled: true,
      quietHoursStart: undefined,
      quietHoursEnd: undefined,
    })
    expect(isInQuietHours(s, new Date(2025, 5, 10, 23, 0))).toBe(false)
  })

  it('detects late-night quiet hours for an overnight range', () => {
    const s = makeSettings({
      quietHoursEnabled: true,
      quietHoursStart: '21:00',
      quietHoursEnd: '08:00',
    })
    expect(isInQuietHours(s, new Date(2025, 5, 10, 22, 0))).toBe(true)
    expect(isInQuietHours(s, new Date(2025, 5, 10, 23, 59))).toBe(true)
    expect(isInQuietHours(s, new Date(2025, 5, 11, 2, 0))).toBe(true)
    expect(isInQuietHours(s, new Date(2025, 5, 11, 7, 59))).toBe(true)
  })

  it('returns false outside an overnight quiet hours range', () => {
    const s = makeSettings({
      quietHoursEnabled: true,
      quietHoursStart: '21:00',
      quietHoursEnd: '08:00',
    })
    expect(isInQuietHours(s, new Date(2025, 5, 10, 21, 0))).toBe(true)
    expect(isInQuietHours(s, new Date(2025, 5, 10, 20, 59))).toBe(false)
    expect(isInQuietHours(s, new Date(2025, 5, 11, 8, 0))).toBe(false)
    expect(isInQuietHours(s, new Date(2025, 5, 11, 12, 0))).toBe(false)
  })

  it('handles a same-day quiet range', () => {
    const s = makeSettings({
      quietHoursEnabled: true,
      quietHoursStart: '12:00',
      quietHoursEnd: '14:00',
    })
    expect(isInQuietHours(s, new Date(2025, 5, 10, 12, 30))).toBe(true)
    expect(isInQuietHours(s, new Date(2025, 5, 10, 13, 59))).toBe(true)
    expect(isInQuietHours(s, new Date(2025, 5, 10, 11, 59))).toBe(false)
    expect(isInQuietHours(s, new Date(2025, 5, 10, 14, 0))).toBe(false)
  })
})

describe('buildBundleNotification', () => {
  it('names plants rather than counting them', () => {
    const tasks = [
      task({ plantName: 'Fern', careType: 'watering' }),
      task({ plantId: 'p2', plantName: 'Cactus', careType: 'fertilizing' }),
    ]
    const bundle = buildBundleNotification(tasks)
    expect(bundle.body).toContain('Fern')
    expect(bundle.body).toContain('Cactus')
    expect(bundle.body).toContain('Watering')
    expect(bundle.body).toContain('Fertilizing')
  })

  it('uses the nickname when present', () => {
    const bundle = buildBundleNotification([
      task({ plantName: 'Epipremnum aureum', plantNickname: 'Money' }),
    ])
    expect(bundle.body).toContain('Money')
    expect(bundle.body).not.toContain('Epipremnum')
  })

  it('includes an overdue marker', () => {
    const bundle = buildBundleNotification([
      task({ plantName: 'Fern', isOverdue: true, daysUntilDue: -2 }),
      task({ plantId: 'p2', plantName: 'Palm', isOverdue: false, daysUntilDue: 0 }),
    ])
    expect(bundle.body).toMatch(/Fern.*overdue/i)
  })

  it('uses singular title for a single task, plural for many', () => {
    expect(buildBundleNotification([task()]).title).toBe('Palan: 1 task today')
    expect(buildBundleNotification([task(), task()]).title).toBe('Palan: 2 tasks today')
  })

  it('caps listed plants so the body stays short for large gardens', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      task({ plantId: `p${i}`, plantName: `Plant${i}` }),
    )
    const bundle = buildBundleNotification(many)
    expect(bundle.body).toContain('+2 more')
  })
})
