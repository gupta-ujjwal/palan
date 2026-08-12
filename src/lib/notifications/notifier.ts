import type { AppSettings, Plant } from '../types/plant'
import { getDueTasks } from '../utils/schedule'
import { CARE_TYPE_ICONS } from '../types/plant'
import { buildBundleNotification, isInQuietHours } from '../engagement/notifications'

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  return await Notification.requestPermission()
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/palan/sw.js')
    return reg
  } catch {
    return null
  }
}

export function checkAndNotify(plants: Plant[], settings?: AppSettings): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  if (settings && isInQuietHours(settings, new Date())) return

  const muted = new Set(settings?.mutedPlantIds ?? [])
  const dueTasks = getDueTasks(plants).filter((t) => !muted.has(t.plantId))
  if (dueTasks.length === 0) return

  const lastSent = localStorage.getItem('lastNotificationDate')
  const todayStr = new Date().toISOString().slice(0, 10)
  if (lastSent === todayStr) return

  const { title, body } = buildBundleNotification(dueTasks)

  try {
    new Notification(title, {
      body,
      icon: '/palan/favicon.svg',
      tag: 'plant-care-daily',
    })
    localStorage.setItem('lastNotificationDate', todayStr)
  } catch {
    // Notification might not work in all contexts
  }
}

let timerId: ReturnType<typeof setInterval> | null = null

export function startNotificationTimer(
  getPlants: () => Plant[],
  getSettings?: () => AppSettings | undefined,
): void {
  stopNotificationTimer()
  timerId = setInterval(
    () => {
      checkAndNotify(getPlants(), getSettings?.())
    },
    15 * 60 * 1000, // 15 minutes
  )
}

export function stopNotificationTimer(): void {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}

export function getCareIcon(careType: string): string {
  return CARE_TYPE_ICONS[careType as keyof typeof CARE_TYPE_ICONS] || '🌿'
}
