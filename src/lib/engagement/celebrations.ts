export type CelebrationType = 'bloom' | 'fact' | 'badge'

export type Celebration =
  | { type: 'bloom' }
  | { type: 'fact'; fact: string }
  | { type: 'badge'; badgeLabel: string; badgeIcon: string }

export const PLANT_FACTS: string[] = [
  'Spider plants are nearly indestructible — perfect for beginners.',
  'Pothos can grow in water alone, no soil needed.',
  'Peace lilies wilt dramatically when thirsty, then bounce back within hours of watering.',
  'Snake plants release oxygen at night, unlike most plants.',
  'Monstera leaves develop holes (fenestrations) as the plant matures.',
  'Many succulents propagate from a single fallen leaf.',
  'Overwatering kills more houseplants than underwatering.',
  'Grouping plants together raises local humidity for all of them.',
  'Dust on leaves blocks light — a gentle wipe helps photosynthesis.',
  'Roots need oxygen as much as water; soggy soil suffocates them.',
  'Plants can sense gravity and reorient growth within hours.',
  'Some ferns reproduced asexually for millions of years before flowering plants existed.',
]

const BADGE_POOL: { label: string; icon: string }[] = [
  { label: 'Green Thumb', icon: '👍' },
  { label: 'Water Whisperer', icon: '💧' },
  { label: 'Plant Parent', icon: '🌿' },
  { label: 'Steady Hand', icon: '🧤' },
  { label: 'Photosynthesis Pro', icon: '☀️' },
]

const QUIET_WEIGHT = 0.7
const BLOOM_WEIGHT = 0.2
const FACT_WEIGHT = 0.07

export function rollCelebration(rng: () => number = Math.random): Celebration | null {
  const roll = rng()

  if (roll < QUIET_WEIGHT) return null

  if (roll < QUIET_WEIGHT + BLOOM_WEIGHT) {
    return { type: 'bloom' }
  }

  if (roll < QUIET_WEIGHT + BLOOM_WEIGHT + FACT_WEIGHT) {
    const idx = Math.min(PLANT_FACTS.length - 1, Math.floor(rng() * PLANT_FACTS.length))
    return { type: 'fact', fact: PLANT_FACTS[idx] }
  }

  const idx = Math.min(BADGE_POOL.length - 1, Math.floor(rng() * BADGE_POOL.length))
  const badge = BADGE_POOL[idx]
  return { type: 'badge', badgeLabel: badge.label, badgeIcon: badge.icon }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
