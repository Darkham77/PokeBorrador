import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleItemUsage } from '@/logic/battle/battleItems'
import { gameBus } from '@/logic/events/gameBus'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'

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
    const p = makePokemon('pikachu', 5)!
    const e = makePokemon('pidgey', 5)!
    
    // We expect PLAY_CATCH_ENERGY to be emitted
    await handleItemUsage('pokeball', p, e, mockOptions)
    
    expect(gameBus.emit).toHaveBeenCalledWith('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: 'pokeball' })
  })
});
