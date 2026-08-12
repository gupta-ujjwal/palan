import type { CareType, Plant } from '../types/plant'
import { CARE_TYPES } from '../types/plant'
import { addDays, daysBetween, toISODate, parseISODate } from '../utils/dates'

export type DayStatus = 'perfect' | 'grace' | 'missed'

export interface DayRecord {
  date: string
  status: DayStatus
  tasksDue: number
}

export interface StreakResult {
  currentStreak: number
  longestStreak: number
  days: DayRecord[]
  graceTokensAvailable: number
  graceWindowDays: number
}

export interface StreakOptions {
  now?: Date
  windowDays?: number
  graceWindowDays?: number
  maxGracePerWindow?: number
}

interface DueEvent {
  date: Date
  plantId: string
  careType: CareType
  windowStart: Date
}

function normDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function reconstructDueDates(plant: Plant, rangeStart: Date, rangeEnd: Date): DueEvent[] {
  const events: DueEvent[] = []
  const log = plant.healthLog ?? []

  for (const careType of CARE_TYPES) {
    const entry = plant.careSchedule[careType]
    if (!entry || typeof entry.frequencyDays !== 'number' || entry.frequencyDays <= 0) continue

    const rawCompletions = log
      .filter((l) => l.action === careType)
      .map((l) => parseISODate(l.date))
      .filter((d): d is Date => d !== null)
      .map((d) => normDay(d).getTime())
      .sort((a, b) => a - b)
    const completions = rawCompletions.filter((t, i) => i === 0 || t !== rawCompletions[i - 1])

    const startIso = entry.lastDone ?? plant.acquiredDate
    const startParsed = startIso ? parseISODate(startIso) : null
    if (!startParsed) continue
    let cursor = normDay(startParsed)

    const horizon = rangeEnd.getTime()
    let consumed = 0
    while (consumed < completions.length && completions[consumed] < cursor.getTime()) {
      consumed++
    }
    let lastEmitted = -1

    while (true) {
      const due = addDays(cursor, entry.frequencyDays)
      const dueTime = due.getTime()
      if (dueTime > horizon) break

      if (dueTime >= rangeStart.getTime() && dueTime !== lastEmitted) {
        events.push({
          date: normDay(due),
          plantId: plant.id,
          careType,
          windowStart: cursor,
        })
        lastEmitted = dueTime
      }

      const nextCompletion = consumed < completions.length ? completions[consumed] : undefined
      if (nextCompletion !== undefined && nextCompletion <= dueTime) {
        cursor = new Date(nextCompletion)
        consumed++
      } else {
        cursor = due
      }
    }
  }

  return events
}

export function computeStreak(plants: Plant[], options: StreakOptions = {}): StreakResult {
  const now = normDay(options.now ?? new Date())
  const graceWindowDays = options.graceWindowDays ?? 7
  const maxGracePerWindow = options.maxGracePerWindow ?? 1

  const empty: StreakResult = {
    currentStreak: 0,
    longestStreak: 0,
    days: [],
    graceTokensAvailable: maxGracePerWindow,
    graceWindowDays,
  }
  if (plants.length === 0) return empty

  const earliest = plants.reduce<Date>((acc, p) => {
    const candidates = [
      p.careSchedule.watering.lastDone,
      p.acquiredDate,
      p.healthLog?.[0]?.date,
    ]
    for (const c of candidates) {
      if (!c) continue
      const d = parseISODate(c)
      if (d && normDay(d).getTime() < acc.getTime()) return normDay(d)
    }
    return acc
  }, now)

  const windowDays = options.windowDays ?? daysBetween(earliest, now)
  if (windowDays <= 0) return empty

  const rangeStart = addDays(now, -windowDays)
  const allEvents = plants.flatMap((p) => reconstructDueDates(p, rangeStart, now))

  const eventsByDay = new Map<string, DueEvent[]>()
  for (const e of allEvents) {
    const key = toISODate(e.date)
    const arr = eventsByDay.get(key) ?? []
    arr.push(e)
    eventsByDay.set(key, arr)
  }

  const days: DayRecord[] = []
  const graceUsedDates: string[] = []

  for (let i = windowDays; i >= 0; i--) {
    const day = addDays(now, -i)
    const iso = toISODate(day)
    const due = eventsByDay.get(iso) ?? []
    if (due.length === 0) continue

    const allDone = due.every((e) => {
      const plant = plants.find((p) => p.id === e.plantId)
      if (!plant?.healthLog) return false
      return plant.healthLog.some((l) => {
        if (l.action !== e.careType) return false
        const d = parseISODate(l.date)
        if (!d) return false
        const t = normDay(d).getTime()
        return t > e.windowStart.getTime() && t <= e.date.getTime()
      })
    })

    if (allDone) {
      days.push({ date: iso, status: 'perfect', tasksDue: due.length })
      continue
    }

    const isToday = daysBetween(day, now) === 0
    if (isToday) continue

    const recentGraces = graceUsedDates.filter((d) => {
      const parsed = parseISODate(d)
      return parsed !== null && daysBetween(parsed, day) < graceWindowDays
    })
    const canUseGrace = recentGraces.length < maxGracePerWindow

    if (canUseGrace) {
      graceUsedDates.push(iso)
      days.push({ date: iso, status: 'grace', tasksDue: due.length })
    } else {
      days.push({ date: iso, status: 'missed', tasksDue: due.length })
    }
  }

  let currentStreak = 0
  let longestStreak = 0
  let running = 0
  for (const d of days) {
    if (d.status === 'missed') {
      running = 0
    } else {
      running++
      if (running > longestStreak) longestStreak = running
    }
  }
  currentStreak = running

  const recentGraces = graceUsedDates.filter((d) => {
    const parsed = parseISODate(d)
    return parsed !== null && daysBetween(parsed, now) < graceWindowDays
  })
  const graceTokensAvailable = maxGracePerWindow - recentGraces.length

  return { currentStreak, longestStreak, days, graceTokensAvailable, graceWindowDays }
}
