import { describe, it, expect } from 'vitest'
import { validatePlant, normalizePlant, parseJSON, isDuplicatePlant } from '../jsonImporter'
import type { Plant } from '../../types/plant'

const validPlant = {
  name: 'Monstera',
  type: 'Tropical',
  careSchedule: {
    watering: { frequencyDays: 7, lastDone: '2024-08-01' },
  },
}

const fixedId = 'fixed-uuid'
const idGen = () => fixedId

describe('validatePlant', () => {
  it('validates a correct plant object', () => {
    const result = validatePlant(validPlant)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('reports missing name', () => {
    const result = validatePlant({ ...validPlant, name: undefined })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing required field: name')
  })

  it('reports missing type', () => {
    const result = validatePlant({ ...validPlant, type: undefined })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing required field: type')
  })

  it('reports missing careSchedule', () => {
    const result = validatePlant({ name: 'Test', type: 'Tropical' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing required field: careSchedule')
  })

  it('reports missing watering schedule', () => {
    const result = validatePlant({
      name: 'Test',
      type: 'Tropical',
      careSchedule: { fertilizing: { frequencyDays: 30 } },
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('careSchedule.watering is required')
  })

  it('reports invalid frequencyDays', () => {
    const result = validatePlant({
      name: 'Test',
      type: 'Tropical',
      careSchedule: { watering: { frequencyDays: -5 } },
    })
    expect(result.valid).toBe(false)
  })

  it('warns on invalid date format', () => {
    const result = validatePlant({
      ...validPlant,
      acquiredDate: '08/10/2024',
    })
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('detects unknown fields', () => {
    const result = validatePlant({
      ...validPlant,
      customField: 'hello',
      anotherUnknown: 42,
    })
    expect(result.unknownFields).toContain('customField')
    expect(result.unknownFields).toContain('anotherUnknown')
  })

  it('rejects non-object input', () => {
    const result = validatePlant('not an object')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Invalid JSON')
  })

  it('warns on pestTracking with missing date', () => {
    const result = validatePlant({
      ...validPlant,
      pestTracking: [{ pest: 'Spider mites' }],
    })
    expect(result.warnings.some((w) => w.includes('pestTracking[0].date'))).toBe(true)
  })
})

describe('normalizePlant', () => {
  it('generates an ID if missing', () => {
    const plant = normalizePlant(validPlant, idGen)
    expect(plant.id).toBe(fixedId)
  })

  it('preserves existing ID', () => {
    const plant = normalizePlant({ ...validPlant, id: 'existing-id' }, idGen)
    expect(plant.id).toBe('existing-id')
  })

  it('moves unknown fields to metadata', () => {
    const plant = normalizePlant({ ...validPlant, customField: 'hello' }, idGen)
    expect(plant.metadata).toBeDefined()
    expect(plant.metadata!['customField']).toBe('hello')
    expect((plant as unknown as Record<string, unknown>)['customField']).toBeUndefined()
  })

  it('does not create metadata when no unknown fields', () => {
    const plant = normalizePlant(validPlant, idGen)
    expect(plant.metadata).toBeUndefined()
  })

  it('initializes healthLog as empty array if missing', () => {
    const plant = normalizePlant(validPlant, idGen)
    expect(plant.healthLog).toEqual([])
  })

  it('clamps future lastDone to today', () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const plant = normalizePlant(
      {
        ...validPlant,
        careSchedule: {
          watering: { frequencyDays: 7, lastDone: '2099-01-01' },
        },
      },
      idGen,
    )
    expect(plant.careSchedule.watering.lastDone).toBe(todayStr)
  })
})

describe('parseJSON', () => {
  it('parses valid JSON', () => {
    const result = parseJSON('{"name": "test"}')
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>)['name']).toBe('test')
    }
  })

  it('returns error for invalid JSON', () => {
    const result = parseJSON('{invalid json}')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
  })
})

describe('isDuplicatePlant', () => {
  it('detects duplicate by name + species', () => {
    const existing: Plant[] = [
      {
        id: '1',
        name: 'Monstera',
        species: 'Monstera deliciosa',
        type: 'Tropical',
        careSchedule: { watering: { frequencyDays: 7 } },
      },
    ]
    const newPlant: Plant = {
      id: '2',
      name: 'monstera', // case-insensitive
      species: 'Monstera Deliciosa',
      type: 'Tropical',
      careSchedule: { watering: { frequencyDays: 7 } },
    }
    expect(isDuplicatePlant(existing, newPlant)).toBe(true)
  })

  it('does not flag different plants', () => {
    const existing: Plant[] = [
      {
        id: '1',
        name: 'Monstera',
        species: 'Monstera deliciosa',
        type: 'Tropical',
        careSchedule: { watering: { frequencyDays: 7 } },
      },
    ]
    const newPlant: Plant = {
      id: '2',
      name: 'Snake Plant',
      species: 'Sansevieria',
      type: 'Succulent',
      careSchedule: { watering: { frequencyDays: 14 } },
    }
    expect(isDuplicatePlant(existing, newPlant)).toBe(false)
  })

  it('handles missing species', () => {
    const existing: Plant[] = [
      {
        id: '1',
        name: 'Monstera',
        type: 'Tropical',
        careSchedule: { watering: { frequencyDays: 7 } },
      },
    ]
    const newPlant: Plant = {
      id: '2',
      name: 'Monstera',
      type: 'Tropical',
      careSchedule: { watering: { frequencyDays: 7 } },
    }
    expect(isDuplicatePlant(existing, newPlant)).toBe(true)
  })
})
