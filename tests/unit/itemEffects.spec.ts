
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInventoryStore } from '@/stores/inventory'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import type { Pokemon } from '@/types/pokemon'

describe('Item Effects & Dynamic Items', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const gs = useGameStore()
    Object.assign(gs.state, {
      inventory: { 'potion': 5, 'tm06': 1, 'pp_up': 1, 'nature_patch': 1 },
      team: [
        { id: 'bulbasaur', name: 'Bulbasaur', level: 5, maxHp: 20, hp: 5, moves: [{ name: 'Tackle', pp: 0, maxPP: 35 }] } as unknown as Pokemon
      ]
    })
    gs.save = vi.fn()
  })

  it('should apply healing items instantly', () => {
    const inv = useInventoryStore()
    const gs = useGameStore()
    
    inv.useItem('potion', 'team', 0)
    expect(gs.state.team[0]!.hp).toBe(20)
    expect(gs.state.inventory['potion']).toBe(4)
  })

  it('should handle TMs as deferred learn_move results', () => {
    const inv = useInventoryStore()
    const gs = useGameStore()
    
    // MT06 (Toxic) is compatible with Bulbasaur
    const res = inv.useItem('tm06', 'team', 0)
    expect(res.success).toBe(true)
    expect(gs.state.team[0]!.moves.some(m => m?.name === 'Tóxico')).toBe(true)
    expect(gs.state.inventory['tm06']).toBeUndefined()
  })

  it('should handle Nature Patch as deferred result', () => {
    const inv = useInventoryStore()
    const ui = useUIStore()
    
    inv.useItem('nature_patch', 'team', 0)
    expect(ui.isNaturePatchOpen).toBe(true)
    expect(ui.activePokemonForNature!.name).toBe('Bulbasaur')
  })

  it('should handle PP Up as deferred result', () => {
    const inv = useInventoryStore()
    const ui = useUIStore()
    
    inv.useItem('pp_up', 'team', 0)
    expect(ui.isPPUpOpen).toBe(true)
    expect(ui.activePokemonForPPUp!.name).toBe('Bulbasaur')
  })
})
