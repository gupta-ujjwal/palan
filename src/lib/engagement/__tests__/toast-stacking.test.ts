import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const celebrationSrc = readFileSync(
  resolve(here, '../../components/Celebration.svelte'),
  'utf-8',
)
const dashboardSrc = readFileSync(
  resolve(here, '../../../routes/Dashboard.svelte'),
  'utf-8',
)

function extractBottomPx(css: string, selector: string): number | null {
  // Match e.g. ".celebration.stack-above { ... bottom: 156px; ... }"
  const escaped = selector.replace(/\./g, '\\.')
  const re = new RegExp(`${escaped.replace(/ /g, '\\s*')}\\s*\\{[^}]*bottom:\\s*(\\d+)px`, 's')
  const m = css.match(re)
  return m ? parseInt(m[1], 10) : null
}

describe('toast stacking (Celebration vs Dashboard undo toast)', () => {
  it('Celebration exposes a stackAbove prop and a .stack-above CSS variant', () => {
    expect(celebrationSrc).toMatch(/stackAbove\?: boolean/)
    expect(celebrationSrc).toMatch(/class:stack-above=\{stackAbove\}/)
    expect(celebrationSrc).toMatch(/\.celebration\.stack-above/)
  })

  it('.celebration.stack-above renders strictly above Dashboard .undo-toast', () => {
    const basePx = extractBottomPx(celebrationSrc, '.celebration')
    const stackedPx = extractBottomPx(celebrationSrc, '.celebration.stack-above')
    const undoPx = extractBottomPx(dashboardSrc, '.undo-toast')
    expect(basePx).not.toBeNull()
    expect(stackedPx).not.toBeNull()
    expect(undoPx).not.toBeNull()
    // Invariant: stacked celebration clears the undo toast entirely.
    // (Undo toast height in practice is 48-56px; require at least 40px of clearance.)
    expect(stackedPx!).toBeGreaterThan(undoPx! + 40)
    expect(basePx).toBe(undoPx) // base celebration == undo anchor when alone
  })

  it('Dashboard passes stackAbove={pendingUndo !== null} to Celebration', () => {
    expect(dashboardSrc).toMatch(/stackAbove=\{pendingUndo !== null\}/)
  })
})
