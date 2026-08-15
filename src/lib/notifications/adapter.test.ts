import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getNotificationAdapter } from './adapter'
import type { AppSettings, Plant } from '../types/plant'

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    getPending: vi.fn(),
    cancel: vi.fn(),
    schedule: vi.fn(),
  },
}))

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const mockIsNativePlatform = vi.mocked(Capacitor.isNativePlatform)
const mockGetPending = vi.mocked(LocalNotifications.getPending)
const mockCancel = vi.mocked(LocalNotifications.cancel)
const mockSchedule = vi.mocked(LocalNotifications.schedule)

const localStorageMock = (() => {
  let store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

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

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function makePlant(overrides: Partial<Plant> = {}): Plant {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return {
    id: 'p1',
    name: 'Fern',
    type: 'houseplant',
    careSchedule: {
      watering: { frequencyDays: 1, lastDone: toISODate(yesterday) },
    },
    ...overrides,
  }
}

describe('getNotificationAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns the web (no-op) adapter when not on a native platform', async () => {
    mockIsNativePlatform.mockReturnValue(false)
    const adapter = getNotificationAdapter()
    await adapter.syncScheduledNotifications([], makeSettings())
    await adapter.cancelAll()
    expect(mockSchedule).not.toHaveBeenCalled()
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('returns the native adapter when on a native platform', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    mockGetPending.mockResolvedValue({ notifications: [] })
    mockCancel.mockResolvedValue(undefined)
    mockSchedule.mockResolvedValue({ notifications: [] })
    const adapter = getNotificationAdapter()
    await adapter.syncScheduledNotifications([], makeSettings())
    expect(mockGetPending).toHaveBeenCalled()
    expect(mockSchedule).not.toHaveBeenCalled()
  })

  it('writes lastNotificationSync timestamp on native sync', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    mockGetPending.mockResolvedValue({ notifications: [] })
    mockCancel.mockResolvedValue(undefined)
    mockSchedule.mockResolvedValue({ notifications: [] })
    const adapter = getNotificationAdapter()
    expect(localStorage.getItem('lastNotificationSync')).toBeNull()
    await adapter.syncScheduledNotifications([], makeSettings())
    expect(localStorage.getItem('lastNotificationSync')).not.toBeNull()
  })
})

describe('native adapter — syncScheduledNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockIsNativePlatform.mockReturnValue(true)
    mockGetPending.mockResolvedValue({ notifications: [] })
    mockCancel.mockResolvedValue(undefined)
    mockSchedule.mockResolvedValue({ notifications: [] })
  })

  it('cancels and schedules nothing when notificationsEnabled is false', async () => {
    mockGetPending.mockResolvedValue({ notifications: [{ id: 42, title: 't', body: 'b' }] })
    const adapter = getNotificationAdapter()
    await adapter.syncScheduledNotifications(
      [makePlant()],
      makeSettings({ notificationsEnabled: false }),
    )
    expect(mockCancel).toHaveBeenCalled()
    expect(mockSchedule).not.toHaveBeenCalled()
  })

  it('caps at ≤14 scheduled notifications even when every day has a due task', async () => {
    // Build 20 plants each due on a distinct day in the next 20 days. The
    // adapter's 14-day loop must stop at day 14 even though days 14..19 also
    // had tasks due — this is the iOS 64-cap regression guard.
    const plants = Array.from({ length: 20 }, (_, i) => {
      const lastDone = new Date()
      lastDone.setDate(lastDone.getDate() - 1)
      const plant = makePlant({
        id: `p${i}`,
        name: `Plant${i}`,
        careSchedule: {
          watering: { frequencyDays: i + 1, lastDone: toISODate(lastDone) },
        },
      })
      return plant
    })
    const adapter = getNotificationAdapter()
    await adapter.syncScheduledNotifications(plants, makeSettings())
    expect(mockSchedule).toHaveBeenCalledTimes(1)
    const scheduled = mockSchedule.mock.calls[0][0].notifications
    expect(scheduled.length).toBe(14)
    expect(scheduled.length).toBeLessThanOrEqual(14)
  })

  it('respects mutedPlantIds — muted plants never appear in scheduled notifications', async () => {
    const plants = [makePlant({ id: 'p1', name: 'Fern' }), makePlant({ id: 'p2', name: 'Cactus' })]
    const adapter = getNotificationAdapter()
    await adapter.syncScheduledNotifications(plants, makeSettings({ mutedPlantIds: ['p1'] }))
    expect(mockSchedule).toHaveBeenCalledTimes(1)
    const scheduled = mockSchedule.mock.calls[0][0].notifications
    for (const notif of scheduled) {
      expect(notif.body).not.toContain('Fern')
    }
  })

  it('skips every day when the configured notificationTime falls inside quiet hours', async () => {
    const settings = makeSettings({
      quietHoursEnabled: true,
      quietHoursStart: '08:00',
      quietHoursEnd: '10:00',
    })
    const adapter = getNotificationAdapter()
    await adapter.syncScheduledNotifications([makePlant()], settings)
    // Batch is empty (every per-day fire time lands inside 08:00-10:00 quiet
    // window), so the adapter skips the schedule call entirely.
    expect(mockSchedule).not.toHaveBeenCalled()
    // Sync timestamp still stamped so the Settings status line stays fresh.
    expect(localStorage.getItem('lastNotificationSync')).not.toBeNull()
  })

  it('produces bundled notifications only on days that actually have due tasks', async () => {
    const adapter = getNotificationAdapter()
    await adapter.syncScheduledNotifications([makePlant()], makeSettings())
    expect(mockSchedule).toHaveBeenCalledTimes(1)
    const scheduled = mockSchedule.mock.calls[0][0].notifications
    expect(scheduled.length).toBeGreaterThan(0)
    expect(scheduled.length).toBeLessThanOrEqual(14)
    for (const notif of scheduled) {
      expect(notif.title).toMatch(/Palan: \d+ task today/)
      expect(notif.body).toContain('Fern')
      expect(notif.body).toContain('Watering')
    }
  })

  it('cancelAll calls cancel with pending notifications when they exist', async () => {
    const pending = [
      { id: 1, title: 'a', body: 'x' },
      { id: 2, title: 'b', body: 'y' },
    ]
    mockGetPending.mockResolvedValue({ notifications: pending })
    const adapter = getNotificationAdapter()
    await adapter.cancelAll()
    expect(mockCancel).toHaveBeenCalledWith({ notifications: pending })
  })

  it('cancelAll skips cancel call when there are no pending notifications', async () => {
    mockGetPending.mockResolvedValue({ notifications: [] })
    const adapter = getNotificationAdapter()
    await adapter.cancelAll()
    expect(mockCancel).not.toHaveBeenCalled()
  })
})
