import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleItemUsage } from '@/logic/battle/battleItems'
import { gameBus } from '@/logic/gameBus'

vi.mock('@/logic/gameBus', () => ({
  gameBus: {
    emit: vi.fn()
  }
}))

describe('battleItems.js', () => {
  let mockOptions

  beforeEach(() => {
    vi.clearAllMocks()
    mockOptions = {
      addLog: vi.fn(),
      audio: { ballHit: vi.fn(), wobble: vi.fn(), caught: vi.fn() },
      consumeItem: vi.fn(),
      eventStore: { globalMultipliers: { catch: 1 } }
    }
  })

  it('should trigger gameBus animations when throwing a pokeball', async () => {
    const p = { id: 25 }
    const e = { id: 16, hp: 10, maxHP: 20, catchRate: 255 }
    
    // We expect PLAY_CATCH_ENERGY to be emitted
    await handleItemUsage('Poke Ball', p, e, mockOptions)
    expect(gameBus.emit).toHaveBeenCalledWith('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: 'Poke Ball' })
  })
});
