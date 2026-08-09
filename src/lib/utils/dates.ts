export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseISODate(iso: string): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  if (isNaN(date.getTime())) return null
  return date
}

export function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const fromNorm = new Date(from)
  fromNorm.setHours(0, 0, 0, 0)
  const toNorm = new Date(to)
  toNorm.setHours(0, 0, 0, 0)
  return Math.round((toNorm.getTime() - fromNorm.getTime()) / msPerDay)
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function isFuture(date: Date): boolean {
  return date.getTime() > today().getTime()
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatDate(iso: string): string {
  const date = parseISODate(iso)
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function isValidISODate(iso: string): boolean {
  if (!iso || typeof iso !== 'string') return false
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(iso)) return false
  const date = new Date(iso)
  return !isNaN(date.getTime())
}
