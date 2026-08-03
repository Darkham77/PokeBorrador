import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleItemUsage } from '@/logic/battle/battleItems'
import { gameBus } from '@/logic/events/gameBus'
import type { Pokemon } from '@/types/pokemon/pokemon'

vi.mock('@/logic/events/gameBus', () => ({
  gameBus: {
    emit: vi.fn()
  }
}))

vi.mock('gsap', () => {
  return {
    default: {
      delayedCall: vi.fn((_delay, callback) => {
        if (callback) callback();
        return {
          then: (cb?: () => void) => { if (cb) cb(); }
        };
      })
    }
  }
})

vi.mock('@/logic/utils/gsapHelpers', () => ({
  awaitAnimation: vi.fn(() => Promise.resolve())
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
    const p = { id: '25' } as unknown as Pokemon
    const e = { id: '16', hp: 10, maxHp: 20, catchRate: 255 } as unknown as Pokemon
    
    // We expect PLAY_CATCH_ENERGY to be emitted
    await handleItemUsage('pokeball', p, e, mockOptions)
    
    expect(gameBus.emit).toHaveBeenCalledWith('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: 'pokeball' })
  })
});
