/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBoxStore } from '@/stores/boxStore'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

describe('BoxStore Modernization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const gs = useGameStore()
    Object.assign(gs.state, {
      money: 1000,
      box: [
        { id: 'pidgey', name: 'Pidgey', level: 10, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, maxHp: 30, hp: 10, moves: [{ name: 'Tackle', pp: 0, maxPP: 35 }] },
        { id: 'rattata', name: 'Rattata', level: 5, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, maxHp: 20, hp: 20 }
      ],
      team: [
        { id: 'bulbasaur', name: 'Bulbasaur', level: 5, maxHp: 20, hp: 5, moves: [{ name: 'Tackle', pp: 0, maxPP: 35 }] },
        { id: 'pidgey-team', name: 'Pidgey', level: 5, maxHp: 20, hp: 20 }
      ],
      boxCount: 4,
      playerClass: 'rocket'
    })
    gs.save = vi.fn()
  })

  it('should toggle tags correctly', () => {
    const box = useBoxStore()
    const gs = useGameStore()
    
    box.togglePokeTag(0, 'fav')
    expect(gs.state.box[0].tags).toContain('fav')
    
    box.togglePokeTag(0, 'fav')
    expect(gs.state.box[0].tags).not.toContain('fav')
  })

  it('should calculate Rocket Sell value with legacy formula', () => {
    const box = useBoxStore()
    box.boxRocketSelected = [0] // Pidgey Lv 10, IV Total 60
    
    // Formula: floor((10 * 50 + (60 / 186) * 500) * 0.8)
    // 60/186 = 0.3225
    // 0.3225 * 500 = 161.29
    // 500 + 161.29 = 661.29
    // 661.29 * 0.8 = 529.03 -> 529
    const val = box.getRocketSellValue()
    expect(val).toBe(529)
  })

  it('should heal pokemon when sent to box', () => {
    const gs = useGameStore()
    const bulbasaur = gs.state.team[0]
    
    // Bulbasaur has 5/20 HP and 0 PP
    gs.sendToBox(0)
    
    expect(bulbasaur.hp).toBe(bulbasaur.maxHp)
    expect(bulbasaur.moves[0].pp).toBe(35)
    expect(gs.state.box).toContain(bulbasaur)
  })

  it('should move pokemon between boxes', () => {
    const box = useBoxStore()
    const gs = useGameStore()
    
    // Reset box
    gs.state.box = [
      { id: 'pidgey', name: 'Pidgey', level: 10, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, moves: [{ name: 'Tackle', pp: 35, maxPP: 35 }] }
    ]
    
    box.movePokemonToBox(0, 1) // Move Pidgey to Box 2 (start index 50)
    
    expect(gs.state.box[50].name).toBe('Pidgey')
    expect(gs.state.box[0]).toBeNull()
  })
})
