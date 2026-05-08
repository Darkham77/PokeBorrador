/**
 * tests/unit/pokemon_utils.spec.ts
 */
import { describe, it, expect, vi } from 'vitest'
import { getTypeEffectivenessMsg, getMoveDescription } from '@/logic/pokemonUtils'

// Mock de pokemonDataProvider
vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getPokemonData: vi.fn(),
    getMoveData: vi.fn((name: string) => {
      if (name === 'tackle') return { pp: 35, type: 'normal', power: 40 }
      if (name === 'explosion') return { selfKO: true, power: 250 }
      return null
    })
  }
}))

describe('Pokemon Utils Logic', () => {
  describe('getTypeEffectivenessMsg', () => {
    it('should return correct messages for multipliers', () => {
      expect(getTypeEffectivenessMsg(0)).toBe('¡No afecta!')
      expect(getTypeEffectivenessMsg(2)).toBe('¡Es muy eficaz!')
      expect(getTypeEffectivenessMsg(4)).toBe('¡Es muy eficaz!')
      expect(getTypeEffectivenessMsg(0.5)).toBe('No es muy eficaz...')
      expect(getTypeEffectivenessMsg(0.25)).toBe('No es muy eficaz...')
      expect(getTypeEffectivenessMsg(1)).toBe(null)
    })
  })

  describe('getMoveDescription', () => {
    it('should return specific messages for effects', () => {
      expect(getMoveDescription('explosion')).toContain('debilita')
      expect(getMoveDescription('non-existent')).toBe('Causa daño al oponente sin efectos secundarios adicionales.')
    })
    
    it('should return default message for normal status move', () => {
      const mockStatusMove: any = { cat: 'status' }
      expect(getMoveDescription('growl', mockStatusMove)).toBe('Un movimiento que causa un efecto de estado o alteración.')
    })
  })
})
