import type { Plant } from '../types/plant'
import { getDueTasks } from '../utils/schedule'
import { CARE_TYPE_ICONS, CARE_TYPE_LABELS } from '../types/plant'

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

export function checkAndNotify(plants: Plant[]): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const dueTasks = getDueTasks(plants)
  if (dueTasks.length === 0) return

  const lastSent = localStorage.getItem('lastNotificationDate')
  const todayStr = new Date().toISOString().slice(0, 10)
  if (lastSent === todayStr) return

  const taskList = dueTasks
    .map(
      (t) =>
        `${t.plantNickname || t.plantName} needs ${CARE_TYPE_LABELS[t.careType].toLowerCase()}`,
    )
    .join(', ')

  const title = `Palan: ${dueTasks.length} task${dueTasks.length > 1 ? 's' : ''} today`

  try {
    new Notification(title, {
      body: taskList,
      icon: '/palan/favicon.svg',
      tag: 'plant-care-daily',
    })
    localStorage.setItem('lastNotificationDate', todayStr)
  } catch {
    // Notification might not work in all contexts
  }
}

let timerId: ReturnType<typeof setInterval> | null = null

export function startNotificationTimer(getPlants: () => Plant[]): void {
  stopNotificationTimer()
  timerId = setInterval(
    () => {
      checkAndNotify(getPlants())
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
