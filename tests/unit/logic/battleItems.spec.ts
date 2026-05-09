import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleItemUsage } from '@/logic/battle/battleItems'
import { gameBus } from '@/logic/gameBus'
import type { Pokemon } from '@/types/pokemon'

vi.mock('@/logic/gameBus', () => ({
  gameBus: {
    emit: vi.fn()
  }
}))

describe('battleItems.js', () => {
  let mockOptions: Parameters<typeof handleItemUsage>[3]

  beforeEach(() => {
    vi.clearAllMocks()
    mockOptions = {
      addLog: vi.fn(),
      audio: { ballHit: vi.fn(), wobble: vi.fn(), caught: vi.fn() },
      consumeItem: vi.fn(),
      eventStore: { globalMultipliers: { catch: 1 } }
    } as unknown as Parameters<typeof handleItemUsage>[3]
  })

  it('should trigger gameBus animations when throwing a pokeball', async () => {
    vi.useFakeTimers()
    const p = { id: '25' } as unknown as Pokemon
    const e = { id: '16', hp: 10, maxHp: 20, catchRate: 255 } as unknown as Pokemon
    
    // We expect PLAY_CATCH_ENERGY to be emitted
    const promise = handleItemUsage('Poke Ball', p, e, mockOptions)
    await vi.runAllTimersAsync()
    await promise
    
    expect(gameBus.emit).toHaveBeenCalledWith('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: 'Poke Ball' })
    vi.useRealTimers()
  })
});
