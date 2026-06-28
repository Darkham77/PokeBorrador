import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import '../../helpers/battleMockSetup'
import { executeTurn } from '@/logic/battle/battleTurn'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'

const mockExecuteTurn = vi.hoisted(() => vi.fn().mockResolvedValue({ logs: [], isOver: false, winner: null }))

vi.mock('@/logic/battle/orchestrator', () => ({
  showdownWorker: {}, // Truthy worker to trigger the showdown flow
  executeTurnInWorker: mockExecuteTurn
}))

describe('NPC Item Usage & Turn Skipping', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should evaluate and use NPC item if enemy HP is low, and trigger turn skipping in Showdown worker', async () => {
    const player = {
      uid: 'p-active',
      name: 'Charizard',
      hp: 100,
      maxHp: 100,
      moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPp: 35, power: 40, type: 'normal', cat: 'physical' }]
    } as unknown as Pokemon

    const enemy = {
      uid: 'e-active',
      name: 'Pikachu',
      hp: 10, // < 25% of maxHp (50)
      maxHp: 50,
      moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPp: 35, power: 40, type: 'normal', cat: 'physical' }]
    } as unknown as Pokemon

    const activeBattle = ref({
      player,
      enemy,
      isTrainer: true,
      over: false,
      locationId: 'route1',
      enemyInventory: {
        'super_potion': 1
      },
      playerUsedItem: false,
      enemyUsedItem: false
    })

    const fsm = {
      currentState: { value: BATTLE_STATES.ACTIVE_BATTLE } as { value: string },
      currentSubState: { value: BATTLE_SUBSTATES.WAIT_INPUT } as { value: string | null },
      transition: vi.fn(async (s: string, sub?: string) => {
        (fsm.currentState as { value: string }).value = s
        if (sub) (fsm.currentSubState as { value: string | null }).value = sub
      })
    }

    const enemyStages = ref<BattleStages>({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    })

    const mockCtx = {
      activeBattle,
      fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      enemyStages,
      playerStages: ref({}),
      gs: {
        state: {
          team: [player]
        }
      },
      addLog: vi.fn(),
      clearVolatileStatus: vi.fn()
    } as unknown as BattleContext

    // Execute the turn selecting the first move (index 0)
    await executeTurn(mockCtx, 0)

    // 1. Should have detected low health and used the super_potion (healing Pikachu from 10 to 50)
    expect(enemy.hp).toBe(50) // healed by 50 hp (super_potion)
    expect(activeBattle.value.enemyInventory['super_potion']).toBeUndefined() // consumed

    // 2. Should have flagged the item usage on the battle state
    expect(activeBattle.value.enemyUsedItem).toBe(true)

    // 3. Should have called the showdown worker with p2Skip = true
    expect(mockExecuteTurn).toHaveBeenCalledWith(
      expect.stringContaining('move'), // player choice
      expect.stringContaining('struggle'), // NPC choice is defaulted/struggle because of skip
      expect.any(Array),
      expect.any(Array),
      expect.any(Array),
      expect.any(Array),
      false, // p1Skip
      true // p2Skip (NPC used item)
    )
  })
})
