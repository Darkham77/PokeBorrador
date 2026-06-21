/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBoxStore } from '@/stores/box'
import { useGameStore } from '@/stores/game'
import { calculateRocketSellPrice } from '@/logic/pokemon/pokemonUtils'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Black Market (Team Rocket) Sales Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const gs = useGameStore()
    Object.assign(gs.state, {
      money: 1000,
      box: [
        // Pidgey Lv 10, IVs: 10 each = 60 total
        { id: 'pidgey', name: 'Pidgey', level: 10, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } },
        // Rattata Lv 5, IVs: 31 each = 186 total (Perfect)
        { id: 'rattata', name: 'Rattata', level: 5, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } },
        // Mewtwo Lv 100, IVs: 31 each = 186 total
        { id: 'mewtwo', name: 'Mewtwo', level: 100, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }
      ],
      team: [
        // Bulbasaur Lv 50, IVs: 0 each = 0 total
        { id: 'bulbasaur', name: 'Bulbasaur', level: 50, ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }
      ],
      playerClass: 'rocket',
      classData: { blackMarketSales: 0 }
    })
    gs.save = vi.fn()
  })

  describe('calculateRocketSellPrice Utility', () => {
    it('should calculate correct price for average pokemon', () => {
      const p = { level: 10, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } } as unknown as Pokemon
      // Formula: floor((10 * 50 + (60 / 186) * 500) * 0.8)
      // (500 + 161.29) * 0.8 = 661.29 * 0.8 = 529.03 -> 529
      expect(calculateRocketSellPrice(p)).toBe(529)
    })

    it('should calculate correct price for perfect level 5 pokemon', () => {
      const p = { level: 5, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } } as unknown as Pokemon
      // Formula: floor((5 * 50 + (186 / 186) * 500) * 0.8)
      // (250 + 500) * 0.8 = 750 * 0.8 = 600
      expect(calculateRocketSellPrice(p)).toBe(600)
    })

    it('should calculate correct price for max level perfect pokemon', () => {
      const p = { level: 100, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } } as unknown as Pokemon
      // Formula: floor((100 * 50 + (186 / 186) * 500) * 0.8)
      // (5000 + 500) * 0.8 = 5500 * 0.8 = 4400
      expect(calculateRocketSellPrice(p)).toBe(4400)
    })
  })

  describe('Mass Selection Logic in BoxStore', () => {
    it('should calculate correct total value for multiple selection', () => {
      const box = useBoxStore()
      box.boxRocketSelected = [0, 1] // Pidgey (529) + Rattata (600) = 1129
      expect(box.getRocketSellValue()).toBe(1129)
    })

    it('should execute mass sell and update player money and stats', () => {
      const box = useBoxStore()
      const gs = useGameStore()
      
      box.boxRocketSelected = [0, 1]
      const totalValue = box.getRocketSellValue()
      const initialMoney = gs.state.money
      
      const res = box.doBoxRocketSell()
      
      expect(res.value).toBe(totalValue)
      expect(res.count).toBe(2)
      expect(gs.state.money).toBe(initialMoney + totalValue)
      expect(gs.state.classData.blackMarketSales).toBe(2)
      expect(gs.state.box.length).toBe(1) // Only Mewtwo remains
      const mewtwo = gs.state.box[0] as Pokemon
      expect(mewtwo.name).toBe('Mewtwo')
    })
  })

  describe('Single Sale parity (Team/Manual)', () => {
    it('should match price when selling from team', () => {
      const gs = useGameStore()
      
      const selected = [0] // Bulbasaur Lv 50, IV 0
      // Price: floor((50 * 50 + 0) * 0.8) = 2500 * 0.8 = 2000
      
      let totalGain = 0
      selected.forEach((i: number) => {
        totalGain += calculateRocketSellPrice(gs.state.team[i] as Pokemon)
      })
      expect(totalGain).toBe(2000)
    })
  })
})
