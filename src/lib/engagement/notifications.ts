import type { AppSettings, CareTask } from '../types/plant'
import { CARE_TYPE_LABELS } from '../types/plant'

export function isInQuietHours(settings: AppSettings, now: Date): boolean {
  if (!settings.quietHoursEnabled) return false
  const start = settings.quietHoursStart
  const end = settings.quietHoursEnd
  if (!start || !end) return false

  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if (Number.isNaN(sh) || Number.isNaN(eh)) return false

  const minutes = now.getHours() * 60 + now.getMinutes()
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em

  if (startMin <= endMin) {
    return minutes >= startMin && minutes < endMin
  }
  return minutes >= startMin || minutes < endMin
}

export interface BundleNotification {
  title: string
  body: string
}

const MAX_LISTED = 10

export function buildBundleNotification(tasks: CareTask[]): BundleNotification {
  const title = `Palan: ${tasks.length} task${tasks.length === 1 ? '' : 's'} today`

  const listed = tasks.slice(0, MAX_LISTED)
  const extra = tasks.length - listed.length

  const lines = listed.map((t) => {
    const name = t.plantNickname ?? t.plantName
    const label = CARE_TYPE_LABELS[t.careType]
    const stale =
      t.isOverdue && t.daysUntilDue < 0
        ? ` (${Math.abs(t.daysUntilDue)} day${Math.abs(t.daysUntilDue) === 1 ? '' : 's'} overdue)`
        : ''
    return `${name} — ${label}${stale}`
  })

  if (extra > 0) {
    lines.push(`+${extra} more`)
  }

  return { title, body: lines.join('\n') }
}
