/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

describe('Item Effects & Dynamic Items', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const gs = useGameStore()
    Object.assign(gs.state, {
      inventory: { 'Poción': 5, 'TM06': 1, 'Subida de PP': 1, 'Parche de naturaleza': 1 },
      team: [
        { id: 'bulbasaur', name: 'Bulbasaur', level: 5, maxHp: 20, hp: 5, moves: [{ name: 'Tackle', pp: 0, maxPP: 35 }] }
      ]
    })
    gs.save = vi.fn()
  })

  it('should apply healing items instantly', () => {
    const inv = useInventoryStore()
    const gs = useGameStore()
    
    inv.useItem('Poción', 'team', 0)
    expect(gs.state.team[0].hp).toBe(20)
    expect(gs.state.inventory['Poción']).toBe(4)
  })

  it('should handle TMs as deferred learn_move results', () => {
    const inv = useInventoryStore()
    const ui = useUIStore()
    const gs = useGameStore()
    
    // MT06 (Toxic) is compatible with Bulbasaur
    const res = inv.useItem('MT06', 'team', 0)
    expect(res.success).toBe(true)
    expect(gs.state.team[0].moves.some(m => m.name === 'Tóxico')).toBe(true)
    expect(gs.state.inventory['MT06']).toBeUndefined()
  })

  it('should handle Nature Patch as deferred result', () => {
    const inv = useInventoryStore()
    const ui = useUIStore()
    
    inv.useItem('Parche de naturaleza', 'team', 0)
    expect(ui.isNaturePatchOpen).toBe(true)
    expect(ui.activePokemonForNature.name).toBe('Bulbasaur')
  })

  it('should handle PP Up as deferred result', () => {
    const inv = useInventoryStore()
    const ui = useUIStore()
    
    inv.useItem('Subida de PP', 'team', 0)
    expect(ui.isPPUpOpen).toBe(true)
    expect(ui.activePokemonForPPUp.name).toBe('Bulbasaur')
  })
})
