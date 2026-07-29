import { describe, it, expect } from 'vitest'
import { constructPokemonId, deconstructPokemonId } from '@/components/battle/debugActionPanelHelpers'

describe('DebugActionPanel ID Helpers', () => {
  it('correctly constructs pokemon ID from baseId, variant, and gender', () => {
    expect(constructPokemonId('pikachu', '', '')).toBe('pikachu')
  })

  it('correctly deconstructs pokemon ID into baseId, variant, and gender', () => {
    const res = deconstructPokemonId('25_shiny_m')
    expect(res.baseId).toBe('25')
    expect(res.variant).toBe('shiny')
    expect(res.gender).toBe('m')
  })
})
