import { describe, it, expect } from 'vitest'
import {
  toISODate,
  parseISODate,
  daysBetween,
  addDays,
  isFuture,
  isSameDay,
  isValidISODate,
  formatDate,
} from '../dates'

describe('toISODate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toISODate(new Date('2024-08-10T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('pads single-digit months and days', () => {
    const d = new Date(2024, 0, 5) // Jan 5, 2024
    expect(toISODate(d)).toBe('2024-01-05')
  })
})

describe('parseISODate', () => {
  it('parses a valid ISO date string', () => {
    const d = parseISODate('2024-08-10')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2024)
  })

  it('returns null for invalid string', () => {
    expect(parseISODate('not-a-date')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseISODate('')).toBeNull()
  })
})

describe('daysBetween', () => {
  it('calculates positive difference', () => {
    const from = new Date('2024-08-01')
    const to = new Date('2024-08-10')
    expect(daysBetween(from, to)).toBe(9)
  })

  it('calculates negative difference', () => {
    const from = new Date('2024-08-10')
    const to = new Date('2024-08-01')
    expect(daysBetween(from, to)).toBe(-9)
  })

  it('returns 0 for same day', () => {
    const d = new Date('2024-08-10')
    expect(daysBetween(d, d)).toBe(0)
  })
})

describe('addDays', () => {
  it('adds days correctly', () => {
    const base = new Date('2024-08-10')
    const result = addDays(base, 7)
    expect(result.getDate()).toBe(17)
  })

  it('handles month boundary', () => {
    const base = new Date('2024-08-30')
    const result = addDays(base, 5)
    expect(result.getMonth()).toBe(8) // September (0-indexed)
    expect(result.getDate()).toBe(4)
  })

  it('does not mutate original date', () => {
    const base = new Date('2024-08-10')
    const original = base.getDate()
    addDays(base, 7)
    expect(base.getDate()).toBe(original)
  })
})

describe('isFuture', () => {
  it('returns false for a past date', () => {
    const past = new Date('2020-01-01')
    expect(isFuture(past)).toBe(false)
  })

  it('returns false for today', () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    expect(isFuture(d)).toBe(false)
  })
})

describe('isSameDay', () => {
  it('returns true for same date', () => {
    expect(isSameDay(new Date('2024-08-10'), new Date('2024-08-10'))).toBe(true)
  })

  it('returns false for different dates', () => {
    expect(isSameDay(new Date('2024-08-10'), new Date('2024-08-11'))).toBe(false)
  })
})

describe('isValidISODate', () => {
  it('accepts valid ISO date', () => {
    expect(isValidISODate('2024-08-10')).toBe(true)
  })

  it('rejects non-ISO format', () => {
    expect(isValidISODate('08/10/2024')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidISODate('')).toBe(false)
  })

  it('rejects invalid date values', () => {
    expect(isValidISODate('2024-13-45')).toBe(false)
  })
})

describe('formatDate', () => {
  it('formats a valid date', () => {
    const result = formatDate('2024-08-10')
    expect(result).toContain('Aug')
    expect(result).toContain('10')
    expect(result).toContain('2024')
  })

  it('returns empty string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('')
  })
})
