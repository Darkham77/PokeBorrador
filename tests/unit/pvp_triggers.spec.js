/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/box'

describe('PvP Emergency Triggers', () => {
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

  it('should trigger PvP auto-fill when team length increases (watch trigger)', async () => {
    const gs = useGameStore()
    
    // Initial state: empty
    expect(gs.state.pvpTeam).toHaveLength(0)

    // Add pokemon directly to team (bypassing addPokemon to test the watch)
    gs.state.team.push({ uid: 'p1', name: 'P1' })
    
    // We need to wait for the next tick for the watcher
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(gs.state.pvpTeam).toHaveLength(1)
    expect(gs.state.pvpTeam[0]).toBe('p1')
  })

  it('should fill PvP team from box if slots are available and team grows', async () => {
    const gs = useGameStore()
    gs.state.box = [{ uid: 'b1', name: 'B1' }]
    
    // Add to team
    gs.state.team.push({ uid: 'p1', name: 'P1' })
    
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Should have both p1 and b1 in pvpTeam (up to 3)
    expect(gs.state.pvpTeam).toContain('p1')
    expect(gs.state.pvpTeam).toContain('b1')
    expect(gs.state.pvpTeam).toHaveLength(2)
  })

  it('should trigger auto-fill when moving from box to team via boxStore', () => {
    const gs = useGameStore()
    const bs = useBoxStore()
    
    gs.state.box = [{ uid: 'b1', name: 'B1' }]
    
    // Move from box to team
    bs.moveBoxToTeam(0)
    
    expect(gs.state.team).toHaveLength(1)
    expect(gs.state.team[0].uid).toBe('b1')
    expect(gs.state.pvpTeam).toHaveLength(1)
    expect(gs.state.pvpTeam[0]).toBe('b1')
  })

  it('should trigger auto-fill when swapping box with team via boxStore', () => {
    const gs = useGameStore()
    const bs = useBoxStore()
    
    // Setup: Team [p1], Box [b1], PvP [p1]
    gs.state.team = [{ uid: 'p1', name: 'P1', maxHp: 10, hp: 10 }]
    gs.state.box = [{ uid: 'b1', name: 'B1' }]
    gs.state.pvpTeam = ['p1']
    
    // Swap p1 with b1
    bs.swapBoxWithTeam(0, 0)
    
    // Team should be [b1], Box [p1]
    expect(gs.state.team[0].uid).toBe('b1')
    expect(gs.state.box[0].uid).toBe('p1')
    
    // PvP should now contain both b1 and p1 (because it fills empty slots and p1 is still in collection)
    expect(gs.state.pvpTeam).toContain('b1')
    expect(gs.state.pvpTeam).toContain('p1')
    expect(gs.state.pvpTeam).toHaveLength(2)
  })
})
