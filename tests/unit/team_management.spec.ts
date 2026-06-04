/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon'

describe('Team Management Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const gs = useGameStore()
    Object.assign(gs.state, {
      team: [],
      box: [],
      pvpTeam: []
    })
    gs.save = vi.fn()
  })

  const populateTeam = (count = 4) => {
    const gs = useGameStore()
    for (let i = 1; i <= count; i++) {
      gs.addPokemon({ uid: `p${i}`, name: `P${i}` } as unknown as Pokemon, { notify: false })
    }
  }

  it('should auto-fill PVP team when adding pokemons', () => {
    const gs = useGameStore()
    
    // Add 1st pokemon
    gs.addPokemon({ uid: 'p1', name: 'P1' } as unknown as Pokemon, { notify: false })
    expect(gs.state.pvpTeam).toHaveLength(1)
    expect(gs.state.pvpTeam[0]).toBe('p1')

    // Add 2nd and 3rd
    gs.addPokemon({ uid: 'p2', name: 'P2' } as unknown as Pokemon, { notify: false })
    gs.addPokemon({ uid: 'p3', name: 'P3' } as unknown as Pokemon, { notify: false })
    expect(gs.state.pvpTeam).toHaveLength(3)
    expect(gs.state.pvpTeam).toEqual(['p1', 'p2', 'p3'])

    // Add 4th (should not exceed 3)
    gs.addPokemon({ uid: 'p4', name: 'P4' } as unknown as Pokemon, { notify: false })
    expect(gs.state.pvpTeam).toHaveLength(3)
    expect(gs.state.pvpTeam).toEqual(['p1', 'p2', 'p3'])
  })

  it('should maintain PVP team size after sending to box', () => {
    const gs = useGameStore()
    
    // Fill team (6)
    for (let i = 1; i <= 6; i++) {
      gs.addPokemon({ uid: `p${i}`, name: `P${i}`, maxHp: 10, hp: 10 } as unknown as Pokemon, { notify: false })
    }
    
    expect(gs.state.pvpTeam).toEqual(['p1', 'p2', 'p3'])

    // Send p1 to box (should still be in pvpTeam because allPokes includes box)
    gs.sendToBox(0)
    expect(gs.state.pvpTeam).toEqual(['p1', 'p2', 'p3'])
    expect(gs.state.box[0]!.uid).toBe('p1')
  })

  it('should auto-fill empty slots if a PVP pokemon is removed', () => {
    const gs = useGameStore()
    
    // Have 4 pokemons (p1, p2, p3 in pvpTeam, p4 is reserve)
    populateTeam()

    // Remove p2 (one of the PVP pokes)
    gs.removePokemon('p2')
    
    expect(gs.state.pvpTeam).toHaveLength(3)
    // p4 should have taken a spot
    expect(gs.state.pvpTeam).toContain('p1')
    expect(gs.state.pvpTeam).toContain('p3')
    expect(gs.state.pvpTeam).toContain('p4')
  })

  it('should swap slots correctly', () => {
    const gs = useGameStore()
    
    populateTeam()

    // Current: [p1, p2, p3]
    // Swap slot 1 (p2) for p4
    gs.swapPvpSlot(1, 'p4')
    
    expect(gs.state.pvpTeam).toEqual(['p1', 'p4', 'p3'])
  })

  it('should not allow duplicates in PVP team via swap', () => {
    const gs = useGameStore()
    
    populateTeam()

    // Current: [p1, p2, p3]
    // Try to swap slot 1 (p2) for p1 (already in)
    gs.swapPvpSlot(1, 'p1')
    
    expect(gs.state.pvpTeam).toEqual(['p1', 'p2', 'p3']) // No change
  })
})
