
/**
 * tests/unit/map_card.spec.js
 */
import { describe, it, expect } from 'vitest'
import { normalizeFaction, checkPlayerWinner, calculateSpawnGrid, isMapExtortable } from '@/logic/map/mapCardHelper'

describe('MapCard Helper Logic', () => {
  describe('normalizeFaction', () => {
    it('should normalize Spanish and English faction names', () => {
      expect(normalizeFaction('PODER')).toBe('power')
      expect(normalizeFaction('power')).toBe('power')
      expect(normalizeFaction('UNIÓN')).toBe('union')
      expect(normalizeFaction('union')).toBe('union')
      expect(normalizeFaction('Neutral')).toBe('neutral')
      expect(normalizeFaction(null)).toBe('')
    })
  })

  describe('checkPlayerWinner', () => {
    it('should return true when factions match (any language)', () => {
      expect(checkPlayerWinner('power', 'poder')).toBe(true)
      expect(checkPlayerWinner('union', 'UNIÓN')).toBe(true)
      expect(checkPlayerWinner('poder', 'power')).toBe(true)
    })

    it('should return false when factions do not match', () => {
      expect(checkPlayerWinner('power', 'union')).toBe(false)
      expect(checkPlayerWinner('none', 'power')).toBe(false)
      expect(checkPlayerWinner(null, 'power')).toBe(false)
    })
  })

  describe('calculateSpawnGrid', () => {
    it('should return 2x3 grid for small counts (<= 6)', () => {
      const grid = calculateSpawnGrid(4)
      expect(grid.rows).toBe(2)
      expect(grid.cols).toBe(3)
      expect(grid.totalSlots).toBe(6)
    })

    it('should return dynamic grid for larger counts', () => {
      // 9 pokemons -> sqrt(9) = 3 -> 3x3
      const grid9 = calculateSpawnGrid(9)
      expect(grid9.rows).toBe(3)
      expect(grid9.cols).toBe(3)

      // 10 pokemons -> sqrt(10) ~ 3.16 -> 4 cols -> 3 rows (4x3=12 slots)
      const grid10 = calculateSpawnGrid(10)
      expect(grid10.cols).toBe(4)
      expect(grid10.rows).toBe(3)
      expect(grid10.totalSlots).toBe(12)
    })
    
    it('should handle zero spawns', () => {
      const grid = calculateSpawnGrid(0)
      expect(grid.totalSlots).toBe(0)
    })
  })

  describe('isMapExtortable', () => {
    it('should return true for a valid wild encounter map like route or forest', () => {
      const mockMap = {
        id: 'route1',
        name: 'Bosque Viridian',
        wild: { morning: ['pikachu'] }
      }
      expect(isMapExtortable(mockMap as unknown as Parameters<typeof isMapExtortable>[0])).toBe(true)
    })

    it('should return false for cities, gyms, and leagues', () => {
      const cityMap = { id: 'pallet_town', wild: { morning: ['pikachu'] } }
      const gymMap = { id: 'pewter_gym', wild: { morning: ['pikachu'] } }
      const leagueMap = { id: 'indigo_plateau_league', wild: { morning: ['pikachu'] } }
      
      expect(isMapExtortable(cityMap as unknown as Parameters<typeof isMapExtortable>[0])).toBe(false)
      expect(isMapExtortable(gymMap as unknown as Parameters<typeof isMapExtortable>[0])).toBe(false)
      expect(isMapExtortable(leagueMap as unknown as Parameters<typeof isMapExtortable>[0])).toBe(false)
    })

    it('should return false if map has no wild spawns', () => {
      const noWildMap = { id: 'route1', wild: {} }
      expect(isMapExtortable(noWildMap as unknown as Parameters<typeof isMapExtortable>[0])).toBe(false)
    })
  })
})
