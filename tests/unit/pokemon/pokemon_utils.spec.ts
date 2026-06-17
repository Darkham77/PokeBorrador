/**
 * tests/unit/pokemon_utils.spec.ts
 */
import { describe, it, expect, vi } from 'vitest'
import { getTypeEffectivenessMsg, getMoveDescription, generateRandomIVs } from '@/logic/pokemon/pokemonUtils'

import type { MoveBaseData } from '@/types/system/database'

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
      const mockStatusMove = { cat: 'status' } as unknown as MoveBaseData
      expect(getMoveDescription('growl', mockStatusMove)).toBe('Un movimiento que causa un efecto de estado o alteración.')
    })
  })

  describe('generateRandomIVs', () => {
    it('should return random IVs between 0 and 31 for all stats', () => {
      const ivs = generateRandomIVs()
      expect(ivs).toBeDefined()
      const stats: (keyof typeof ivs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
      stats.forEach(stat => {
        expect(ivs[stat]).toBeGreaterThanOrEqual(0)
        expect(ivs[stat]).toBeLessThanOrEqual(31)
        expect(Number.isInteger(ivs[stat])).toBe(true)
      })
    })
  })
})
