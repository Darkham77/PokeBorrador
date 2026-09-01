import { describe, it, expect } from 'vitest'
import { calculateButtonHoverEnterVars } from '@/logic/hover/hoverEnterChildren'

describe('hoverEnterChildren', () => {
  it('calculates hover vars for standard button', () => {
    const btn = document.createElement('button')
    const vars = calculateButtonHoverEnterVars(btn)

    expect(vars.scale).toBe(1.03)
    expect(vars.y).toBe(-1)
  })

  it('calculates hover vars for modal close button', () => {
    const closeBtn = document.createElement('button')
    closeBtn.className = 'modal-close-btn'
    const vars = calculateButtonHoverEnterVars(closeBtn)

    expect(vars.scale).toBe(1.1)
    expect(vars.y).toBe(0)
  })

  it('calculates hover vars for accordion toggle (no scale)', () => {
    const toggleBtn = document.createElement('button')
    toggleBtn.className = 'accordion-toggle'
    const vars = calculateButtonHoverEnterVars(toggleBtn)

    expect(vars.scale).toBe(1)
    expect(vars.y).toBe(0)
  })
})
