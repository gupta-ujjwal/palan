import type { Plant } from '../types/plant'
import { isValidISODate } from './dates'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  unknownFields: string[]
}

export function validatePlant(raw: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const unknownFields: string[] = []

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Invalid JSON: expected an object'], warnings, unknownFields }
  }

  const obj = raw as Record<string, unknown>

  if (!obj['name'] || typeof obj['name'] !== 'string') {
    errors.push('Missing required field: name')
  }

  if (!obj['type'] || typeof obj['type'] !== 'string') {
    errors.push('Missing required field: type')
  }

  if (!obj['careSchedule'] || typeof obj['careSchedule'] !== 'object') {
    errors.push('Missing required field: careSchedule')
  } else {
    const cs = obj['careSchedule'] as Record<string, unknown>
    if (!cs['watering'] || typeof cs['watering'] !== 'object') {
      errors.push('careSchedule.watering is required')
    } else {
      const w = cs['watering'] as Record<string, unknown>
      if (typeof w['frequencyDays'] !== 'number' || w['frequencyDays'] <= 0) {
        errors.push('careSchedule.watering.frequencyDays must be a positive number')
      }
    }
  }

  if (obj['acquiredDate'] && !isValidISODate(obj['acquiredDate'] as string)) {
    warnings.push('acquiredDate is not a valid ISO date (YYYY-MM-DD)')
  }

  if (obj['careSchedule'] && typeof obj['careSchedule'] === 'object') {
    const cs = obj['careSchedule'] as Record<string, unknown>
    for (const key of ['watering', 'fertilizing', 'repotting', 'pruning']) {
      const entry = cs[key]
      if (entry && typeof entry === 'object') {
        const e = entry as Record<string, unknown>
        if (e['lastDone'] && !isValidISODate(e['lastDone'] as string)) {
          warnings.push(`careSchedule.${key}.lastDone is not a valid ISO date`)
        }
        if (
          e['frequencyDays'] !== undefined &&
          (typeof e['frequencyDays'] !== 'number' || e['frequencyDays'] <= 0)
        ) {
          warnings.push(`careSchedule.${key}.frequencyDays should be a positive number`)
        }
      }
    }
  }

  if (obj['pestTracking'] && Array.isArray(obj['pestTracking'])) {
    for (let i = 0; i < obj['pestTracking'].length; i++) {
      const entry = obj['pestTracking'][i] as Record<string, unknown>
      if (!entry['date'] || !isValidISODate(entry['date'] as string)) {
        warnings.push(`pestTracking[${i}].date is missing or invalid`)
      }
      if (!entry['pest'] || typeof entry['pest'] !== 'string') {
        warnings.push(`pestTracking[${i}].pest is missing`)
      }
    }
  }

  const knownFields = new Set([
    'id',
    'name',
    'nickname',
    'species',
    'type',
    'acquiredDate',
    'location',
    'images',
    'careSchedule',
    'environment',
    'pestTracking',
    'healthLog',
    'notes',
  ])

  for (const key of Object.keys(obj)) {
    if (!knownFields.has(key)) {
      unknownFields.push(key)
    }
  }

  return { valid: errors.length === 0, errors, warnings, unknownFields }
}

export function normalizePlant(raw: unknown, generateId: () => string): Plant {
  const obj = { ...(raw as Record<string, unknown>) }
  const knownFields = new Set([
    'id',
    'name',
    'nickname',
    'species',
    'type',
    'acquiredDate',
    'location',
    'images',
    'careSchedule',
    'environment',
    'pestTracking',
    'healthLog',
    'notes',
  ])

  const metadata: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (!knownFields.has(key)) {
      metadata[key] = obj[key]
      delete obj[key]
    }
  }

  const plant: Plant = {
    id: (obj['id'] as string) || generateId(),
    name: obj['name'] as string,
    nickname: obj['nickname'] as string | undefined,
    species: obj['species'] as string | undefined,
    type: obj['type'] as string,
    acquiredDate: obj['acquiredDate'] as string | undefined,
    location: obj['location'] as string | undefined,
    images: (obj['images'] as Plant['images']) || undefined,
    careSchedule: obj['careSchedule'] as Plant['careSchedule'],
    environment: (obj['environment'] as Plant['environment']) || undefined,
    pestTracking: (obj['pestTracking'] as Plant['pestTracking']) || undefined,
    healthLog: (obj['healthLog'] as Plant['healthLog']) || [],
    notes: (obj['notes'] as string | undefined) || undefined,
  }

  if (Object.keys(metadata).length > 0) {
    plant.metadata = metadata
  }

  if (
    plant.careSchedule?.watering?.lastDone &&
    isFutureDateString(plant.careSchedule.watering.lastDone)
  ) {
    const todayStr = new Date().toISOString().slice(0, 10)
    plant.careSchedule.watering.lastDone = todayStr
  }

  return plant
}

function isFutureDateString(iso: string): boolean {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date.getTime() > today.getTime()
}

export function parseJSON(
  text: string,
): { success: true; data: unknown } | { success: false; error: string } {
  try {
    return { success: true, data: JSON.parse(text) }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown parse error' }
  }
}

export function isDuplicatePlant(existing: Plant[], newPlant: Plant): boolean {
  return existing.some(
    (p) =>
      p.name.toLowerCase() === newPlant.name.toLowerCase() &&
      (p.species || '').toLowerCase() === (newPlant.species || '').toLowerCase(),
  )
}
