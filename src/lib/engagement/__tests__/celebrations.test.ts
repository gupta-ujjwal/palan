import { describe, it, expect } from 'vitest'
import { rollCelebration, PLANT_FACTS, type Celebration } from '../celebrations'

describe('rollCelebration', () => {
  it('returns null roughly 70% of the time (quiet checkmark)', () => {
    // Sample a deterministic LCG so this is stable
    let quiet = 0
    let total = 1000
    let seed = 42
    const lcg = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    for (let i = 0; i < total; i++) {
      if (rollCelebration(lcg) === null) quiet++
    }
    const rate = quiet / total
    expect(rate).toBeGreaterThan(0.6)
    expect(rate).toBeLessThan(0.8)
  })

  it('is reproducible for a fixed RNG sequence', () => {
    let seed = 7
    const make = () => {
      seed = (seed * 48271) % 2147483647
      return seed / 2147483647
    }
    const a = rollCelebration(make)
    seed = 7
    const b = rollCelebration(make)
    expect(a).toEqual(b)
  })

  it('returns a fact celebration with a non-empty fact string', () => {
    const calls: number[] = [0.93, 0.5]
    let i = 0
    const rng = () => calls[i++ % calls.length]
    const result = rollCelebration(rng)
    expect(result?.type).toBe('fact')
    if (result?.type === 'fact') {
      expect(result.fact.length).toBeGreaterThan(0)
    }
  })

  it('returns a bloom celebration when rolled', () => {
    const calls: number[] = [0.8]
    let i = 0
    const rng = () => calls[i++]
    const result = rollCelebration(rng)
    expect(result?.type).toBe('bloom')
  })

  it('returns a badge celebration when rolled', () => {
    const calls: number[] = [0.99, 0.3]
    let i = 0
    const rng = () => calls[i++ % calls.length]
    const result = rollCelebration(rng)
    expect(result?.type).toBe('badge')
  })

  it('facts are drawn from a varied pool', () => {
    // Stub the index-drawing call directly across the whole [0,1) range.
    const seen = new Set<string>()
    for (let k = 0; k < 20; k++) {
      const second = k / 20 + 0.001
      const calls = [0.93, second]
      let i = 0
      const rng = () => calls[i++]
      const r = rollCelebration(rng)
      if (r?.type === 'fact') seen.add(r.fact)
    }
    expect(seen.size).toBeGreaterThan(3)
  })
})

describe('PLANT_FACTS pool', () => {
  it('contains at least 8 distinct facts', () => {
    expect(PLANT_FACTS.length).toBeGreaterThanOrEqual(8)
    expect(new Set(PLANT_FACTS).size).toBe(PLANT_FACTS.length)
  })
})
