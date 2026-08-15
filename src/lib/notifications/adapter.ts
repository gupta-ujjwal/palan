import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { AppSettings, Plant } from '../types/plant'
import { addDays, today } from '../utils/dates'
import { getTodayTasks } from '../utils/schedule'
import { buildBundleNotification, isInQuietHours } from '../engagement/notifications'

export interface NotificationAdapter {
  syncScheduledNotifications(plants: Plant[], settings: AppSettings): Promise<void>
  cancelAll(): Promise<void>
}

// Browser path intentionally no-ops: the 15-minute poll in startNotificationTimer
// already keeps the browser's reminder surface fresh, so there's genuinely no
// ahead-of-time "pending schedule" to maintain on the web. This adapter only
// exists so the native path can plug into the same call sites.
const webAdapter: NotificationAdapter = {
  async syncScheduledNotifications() {},
  async cancelAll() {},
}

const MAX_WINDOW_DAYS = 14
const NOTIFICATION_ID_BASE = 1000

function buildFireDateTime(day: Date, notificationTime: string): Date {
  const [hh, mm] = notificationTime.split(':').map(Number)
  const result = new Date(day)
  result.setHours(Number.isNaN(hh) ? 9 : hh, Number.isNaN(mm) ? 0 : mm, 0, 0)
  return result
}

const nativeAdapter: NotificationAdapter = {
  async cancelAll() {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length === 0) return
    await LocalNotifications.cancel({ notifications: pending.notifications })
  },

  async syncScheduledNotifications(plants: Plant[], settings: AppSettings) {
    if (!settings.notificationsEnabled) {
      await this.cancelAll()
      return
    }

    await this.cancelAll()

    const muted = new Set(settings.mutedPlantIds ?? [])
    const batch: {
      id: number
      title: string
      body: string
      schedule: { at: Date }
    }[] = []

    for (let i = 0; i < MAX_WINDOW_DAYS; i++) {
      const day = addDays(today(), i)
      const dueTasks = getTodayTasks(plants, day).filter((t) => !muted.has(t.plantId))
      if (dueTasks.length === 0) continue

      const fireAt = buildFireDateTime(day, settings.notificationTime)
      if (isInQuietHours(settings, fireAt)) continue

      const { title, body } = buildBundleNotification(dueTasks)
      batch.push({
        id: NOTIFICATION_ID_BASE + i,
        title,
        body,
        schedule: { at: fireAt },
      })
    }

    if (batch.length > 0) {
      await LocalNotifications.schedule({ notifications: batch })
    }
    localStorage.setItem('lastNotificationSync', new Date().toISOString())
  },
}

export function getNotificationAdapter(): NotificationAdapter {
  return Capacitor.isNativePlatform() ? nativeAdapter : webAdapter
}
