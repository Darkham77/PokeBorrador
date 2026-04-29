import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleItemUsage } from '@/logic/battle/battleItems'
import { phaserBridge } from '@/logic/phaserBridge'

vi.mock('@/logic/phaserBridge', () => ({
  phaserBridge: {
    sendCommand: vi.fn()
  }
}))

describe('battleItems.js', () => {
  let mockOptions

  beforeEach(() => {
    vi.clearAllMocks()
    mockOptions = {
      addLog: vi.fn(),
      eventStore: { globalMultipliers: { catch: 1 } }
    }
  })

  it('should trigger phaser commands when throwing a pokeball', async () => {
    const p = { id: 25 }
    const e = { id: 16, hp: 10, maxHP: 20, catchRate: 255 }
    
    // We expect PLAY_CATCH_ENERGY to be called
    await handleItemUsage('Poke Ball', p, e, mockOptions)
    expect(phaserBridge.sendCommand).toHaveBeenCalledWith('BattleScene', 'PLAY_CATCH_ENERGY', { side: 'enemy' })
  })
})
