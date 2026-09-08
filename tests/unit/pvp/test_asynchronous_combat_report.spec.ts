/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLivePvPStore } from '@/stores/livePvP'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'

describe('Asynchronous Combat Report Recording', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('records passive battle result when battleState.config.isAsynchronous is true', async () => {
    const livePvP = useLivePvPStore()
    const gameStore = useGameStore()
    const authStore = useAuthStore()

    authStore.user = { id: 'usr-attacker', user_metadata: { username: 'Attacker' } } as any
    gameStore.state.trainer = 'Attacker'
    gameStore.state.starterChosen = true

    let rpcCalled = false
    let rpcParams: Record<string, unknown> = {}

    gameStore.db = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      }),
      rpc: vi.fn().mockImplementation((name: string, params: Record<string, unknown>) => {
        if (name === 'record_passive_battle_result') {
          rpcCalled = true
          rpcParams = params
        }
        return Promise.resolve({ data: { ok: true, success: true }, error: null })
      })
    } as any

    livePvP.battleState.active = true
    livePvP.battleState.isRanked = true
    livePvP.battleState.opponentId = 'sim-offline-rival-id'
    livePvP.battleState.config = {
      format: '3v3',
      levelRule: 'flat50',
      arena: { gymId: 'celadon' },
      mode: 'ranked',
      isAsynchronous: true
    }

    await (livePvP as any).endBattle(true, 'Victoria')

    expect(rpcCalled).toBe(true)
    expect(rpcParams.p_defender_id).toBe('sim-offline-rival-id')
  })
})
